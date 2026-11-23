import ast
import math
from analytics import run_inconsistency_data_generation
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import ShuffleSplit, StratifiedShuffleSplit
from xai_service import build_id3_tree, extract_rules_from_id3


def _parse_decision_set(val):
  str_v = str(val).strip()
  if str_v.startswith("[") and str_v.endswith("]"):
    try:
      parsed = ast.literal_eval(str_v)
      if isinstance(parsed, (list, set, tuple)):
        return {str(x).strip().lower() for x in parsed}
    except Exception:
      pass
  return {str_v.strip("'\"").strip().lower()}


def _calculate_dataset_support(df_f, rules, target_attr, is_gd_mode=False):
  total_rows = len(df_f)
  if total_rows == 0 or not rules:
    return 0.0, 0.0

  supports = []
  for r in rules:
    conds = r.get("_raw_conditions", {})
    rule_dec_set = _parse_decision_set(r.get("decision", ""))

    if conds:
      mask = pd.Series([True] * total_rows, index=df_f.index)
      for attr, val in conds.items():
        if attr in df_f.columns:
          mask = mask & (
              df_f[attr].astype(str).str.strip().str.lower()
              == str(val).strip().lower()
          )
      matched_rows = df_f[mask]
    else:
      matched_rows = df_f

    if matched_rows.empty:
      supports.append(0)
      continue

    if is_gd_mode:
      correct_matches = matched_rows[target_attr].apply(
          lambda target_val: len(
              rule_dec_set.intersection(_parse_decision_set(target_val))
          )
          > 0
      )
      supports.append(correct_matches.sum())
    else:
      dec_str = str(r["decision"]).strip().lower()
      correct_matches = (
          matched_rows[target_attr].astype(str).str.strip().str.lower()
          == dec_str
      )
      supports.append(correct_matches.sum())

  if not supports:
    return 0.0, 0.0

  avg_sup_count = np.mean(supports)
  avg_sup_ratio = (avg_sup_count / total_rows) * 100 if total_rows > 0 else 0.0
  return round(float(avg_sup_count), 2), round(float(avg_sup_ratio), 2)


def _predict_by_rules(row, rules, fallback_decision):
  for r in rules:
    match = True
    conds = r.get("_raw_conditions", {})
    if not conds:
      continue
    for attr, val in conds.items():
      if str(row.get(attr)).strip().lower() != str(val).strip().lower():
        match = False
        break
    if match:
      return r["decision"]
  return fallback_decision


def _evaluate_predictions(y_true, y_preds, is_gd_mode):
  cleaned_true = []
  cleaned_pred = []

  for t, p in zip(y_true, y_preds):
    t_set = _parse_decision_set(t)
    p_set = _parse_decision_set(p)

    if is_gd_mode:
      if p_set.issubset(t_set) or (len(t_set.intersection(p_set)) > 0):
        chosen_val = list(t_set.intersection(p_set))[0]
        cleaned_true.append(chosen_val)
        cleaned_pred.append(chosen_val)
      else:
        cleaned_true.append(list(t_set)[0])
        cleaned_pred.append(list(p_set)[0])
    else:
      cleaned_true.append(list(t_set)[0])
      cleaned_pred.append(list(p_set)[0])

  acc = accuracy_score(cleaned_true, cleaned_pred) * 100
  prec = (
      precision_score(
          cleaned_true, cleaned_pred, average="weighted", zero_division=0
      )
      * 100
  )
  rec = (
      recall_score(
          cleaned_true, cleaned_pred, average="weighted", zero_division=0
      )
      * 100
  )
  f1 = (
      f1_score(cleaned_true, cleaned_pred, average="weighted", zero_division=0)
      * 100
  )

  return acc, prec, rec, f1


def _train_and_eval_single_split(
    train_df, test_df, target_attr, nTrees, maxDepth, is_gd_mode, rng
):
  X_train = train_df.drop(columns=[target_attr])
  y_train = train_df[target_attr].astype(str).values
  X_test = test_df.drop(columns=[target_attr])
  y_test = test_df[target_attr].astype(str).values
  feature_names = list(X_train.columns)

  forest_trees = []
  for _ in range(nTrees):
    boot_idx = rng.choice(len(X_train), size=len(X_train), replace=True)
    n_sub = max(1, int(math.sqrt(len(feature_names))))
    sub_feats = list(rng.choice(feature_names, size=n_sub, replace=False))
    tree = build_id3_tree(
        X_train.iloc[boot_idx], y_train[boot_idx], sub_feats, maxDepth
    )
    forest_trees.append(tree)

  raw_rules = []
  for t_idx, tree in enumerate(forest_trees):
    raw_rules.extend(extract_rules_from_id3(tree, {}, t_idx))

  unique_rules = {}
  for r in raw_rules:
    if not r.get("conditions"):
      continue
    r_key = (frozenset(r["_raw_conditions"].items()), str(r["decision"]))
    if r_key not in unique_rules:
      unique_rules[r_key] = {
          "conditions": r["conditions"],
          "_raw_conditions": r["_raw_conditions"],
          "decision": r["decision"],
          "supportCount": 0,
      }
    unique_rules[r_key]["supportCount"] += 1

  algo_a_rules = [r for r in unique_rules.values() if r["supportCount"] > 1]
  if not algo_a_rules:
    algo_a_rules = list(unique_rules.values())
  algo_a_rules.sort(key=lambda x: (-x["supportCount"], len(x["conditions"])))

  unique_cls, cnts = np.unique(y_train, return_counts=True)
  fallback_dec = unique_cls[np.argmax(cnts)] if len(y_train) > 0 else "Brak"

  def _predict_tree_nav(node, row):
    if node.is_leaf:
      return node.decision
    val = str(row.get(node.attribute)).strip()
    if val in node.branches:
      return _predict_tree_nav(node.branches[val], row)
    return None

  def predict_forest_wrapper(row):
    votes = [
        tree.decision if tree.is_leaf else _predict_tree_nav(tree, row)
        for tree in forest_trees
    ]
    votes = [v for v in votes if v is not None]
    if not votes:
      return fallback_dec
    vals, c_counts = np.unique(votes, return_counts=True)
    return vals[np.argmax(c_counts)]

  y_pred_trees = X_test.apply(predict_forest_wrapper, axis=1).tolist()
  y_pred_rules = X_test.apply(
      lambda row: _predict_by_rules(row, algo_a_rules, fallback_dec),
      axis=1,
  ).tolist()

  t_metrics = _evaluate_predictions(y_test, y_pred_trees, is_gd_mode)
  r_metrics = _evaluate_predictions(y_test, y_pred_rules, is_gd_mode)
  return t_metrics, r_metrics


def run_full_research_experiment(
    df_base,
    targetAttr,
    attrToRemove,
    maxDepth=10,
    splitRatio=70,
    entropyThreshold=0.75,
):
  df_base = df_base.copy()
  df_base.columns = [c.strip() for c in df_base.columns]
  targetAttr = targetAttr.strip()

  if isinstance(attrToRemove, str):
    attr_list = [a.strip() for a in attrToRemove.split(",") if a.strip()]
    attr_param = attr_list if len(attr_list) > 1 else attr_list[0]
  else:
    attr_list = list(attrToRemove)
    attr_param = attrToRemove

  df_base = df_base[
      df_base[targetAttr].astype(str).str.strip().str.lower() != "c"
  ].copy()
  df_base = df_base.apply(
      lambda x: x.str.strip() if x.dtype == "object" else x
  ).dropna()

  cols_to_drop = [
      c for c in attr_list if c in df_base.columns and c != targetAttr
  ]

  datasets_full = run_inconsistency_data_generation(
      df_base, targetAttr, attr_param, entropy_threshold=entropyThreshold
  )
  datasets_full["BASELINE"] = df_base.copy()

  S_values = [10, 30, 50]
  results_matrix = {}
  rng = np.random.default_rng(42)

  # FAZA 1: Reprezentacja wiedzy na pełnym zbiorze
  for mode_name, df_variant in datasets_full.items():
    if df_variant is None or df_variant.empty:
      continue

    results_matrix[mode_name] = {
        "dataset_metadata": {
            "rows_count": len(df_variant),
            "cols_count": len(df_variant.columns) - 1,
        },
        "FAZA_1_REPREZENTACJA_WIEDZY_BEZ_PODZIALU": {},
        "FAZA_2_KLASYFIKACJA_TRAIN_TEST_70_30": {},
    }

    X = df_variant.drop(columns=[targetAttr])
    y = df_variant[targetAttr].astype(str)
    feature_names = list(X.columns)
    is_gd_mode = mode_name == "GD"

    for nTrees in S_values:
      forest_trees = []
      for _ in range(nTrees):
        boot_idx = rng.choice(len(X), size=len(X), replace=True)
        n_sub = max(1, int(math.sqrt(len(feature_names))))
        sub_feats = list(rng.choice(feature_names, size=n_sub, replace=False))
        tree = build_id3_tree(
            X.iloc[boot_idx], y.iloc[boot_idx].values, sub_feats, maxDepth
        )
        forest_trees.append(tree)

      raw_rules = []
      for t_idx, tree in enumerate(forest_trees):
        raw_rules.extend(extract_rules_from_id3(tree, {}, t_idx))

      raw_rules_valid = [r for r in raw_rules if len(r.get("conditions", [])) > 0]
      if not raw_rules_valid:
        raw_rules_valid = raw_rules

      avg_len_raw = (
          np.mean([max(1, len(r.get("conditions", []))) for r in raw_rules_valid])
          if raw_rules_valid
          else 1.0
      )
      sup_c_raw, sup_r_raw = _calculate_dataset_support(
          df_variant, raw_rules_valid, targetAttr, is_gd_mode=is_gd_mode
      )

      unique_rules = {}
      for r in raw_rules_valid:
        r_key = (frozenset(r["_raw_conditions"].items()), str(r["decision"]))
        if r_key not in unique_rules:
          unique_rules[r_key] = {
              "conditions": r["conditions"],
              "_raw_conditions": r["_raw_conditions"],
              "decision": r["decision"],
              "supportCount": 0,
          }
        unique_rules[r_key]["supportCount"] += 1

      algo_a_rules = [
          r for r in unique_rules.values() if r["supportCount"] > 1
      ]
      if not algo_a_rules:
        algo_a_rules = list(unique_rules.values())
      algo_a_rules.sort(
          key=lambda x: (-x["supportCount"], len(x["conditions"]))
      )

      algo_a_valid = [r for r in algo_a_rules if len(r.get("conditions", [])) > 0]
      if not algo_a_valid:
        algo_a_valid = algo_a_rules

      avg_len_algo_a = (
          np.mean([max(1, len(r["conditions"])) for r in algo_a_valid])
          if algo_a_valid
          else 1.0
      )
      sup_c_algo_a, sup_r_algo_a = _calculate_dataset_support(
          df_variant, algo_a_valid, targetAttr, is_gd_mode=is_gd_mode
      )

      results_matrix[mode_name]["FAZA_1_REPREZENTACJA_WIEDZY_BEZ_PODZIALU"][
          f"S_{nTrees}"
      ] = {
          "liczba_regul_lasu_losowego": len(raw_rules_valid),
          "srednia_dlugosc_regul_lasu_losowego": round(float(avg_len_raw), 2),
          "srednie_wsparcie_regul_wiersze_lasu_losowego": sup_c_raw,
          "srednie_wsparcie_regul_procent_lasu_losowego": sup_r_raw,
          "liczba_regul_algorytm_A": len(algo_a_valid),
          "srednia_dlugosc_regul": round(float(avg_len_algo_a), 2),
          "srednia_dlugosc_wzgledem_liczby_wierszy": round(
              float(avg_len_algo_a / len(df_variant)), 5
          ),
          "srednie_wsparcie_regul_wiersze": sup_c_algo_a,
          "srednie_wsparcie_regul_procent": sup_r_algo_a,
          "stopien_kompresji_procent": (
              round((1.0 - (len(algo_a_valid) / len(raw_rules_valid))) * 100, 2)
              if raw_rules_valid
              else 0.0
          ),
      }

  # FAZA 2: Uczciwa klasyfikacja (podział PRZED rozwiązaniem niespójności)
  test_size = min(0.5, max(0.1, 1.0 - (float(splitRatio) / 100.0)))
  y_base_strat = df_base[targetAttr].astype(str)
  _, counts = np.unique(y_base_strat, return_counts=True)
  if len(counts) > 1 and np.min(counts) >= 2:
    splitter = StratifiedShuffleSplit(
        n_splits=5, test_size=test_size, random_state=42
    )
    splits = list(splitter.split(df_base, y_base_strat))
  else:
    splitter = ShuffleSplit(n_splits=5, test_size=test_size, random_state=42)
    splits = list(splitter.split(df_base))

  for nTrees in S_values:
    metrics_store = {
        m: {
            "tree": {"acc": [], "prec": [], "rec": [], "f1": []},
            "rule": {"acc": [], "prec": [], "rec": [], "f1": []},
        }
        for m in ["GD", "MCD", "CUSTOM", "BASELINE"]
    }

    for train_idx, test_idx in splits:
      train_base = df_base.iloc[train_idx].copy()
      test_base = df_base.iloc[test_idx].copy()

      train_variants = run_inconsistency_data_generation(
          train_base, targetAttr, attr_param, entropy_threshold=entropyThreshold
      )
      test_reduced = test_base.drop(columns=cols_to_drop).copy()

      for mode_name in ["GD", "MCD", "CUSTOM"]:
        tr_df = train_variants.get(mode_name)
        if tr_df is None or tr_df.empty:
          continue
        t_m, r_m = _train_and_eval_single_split(
            tr_df,
            test_reduced,
            targetAttr,
            nTrees,
            maxDepth,
            is_gd_mode=(mode_name == "GD"),
            rng=rng,
        )
        for idx_m, k_m in enumerate(["acc", "prec", "rec", "f1"]):
          metrics_store[mode_name]["tree"][k_m].append(t_m[idx_m])
          metrics_store[mode_name]["rule"][k_m].append(r_m[idx_m])

      t_m, r_m = _train_and_eval_single_split(
          train_base,
          test_base,
          targetAttr,
          nTrees,
          maxDepth,
          is_gd_mode=False,
          rng=rng,
      )
      for idx_m, k_m in enumerate(["acc", "prec", "rec", "f1"]):
        metrics_store["BASELINE"]["tree"][k_m].append(t_m[idx_m])
        metrics_store["BASELINE"]["rule"][k_m].append(r_m[idx_m])

    for mode_name in ["GD", "MCD", "CUSTOM", "BASELINE"]:
      if mode_name not in results_matrix:
        continue
      tm = metrics_store[mode_name]["tree"]
      rm = metrics_store[mode_name]["rule"]
      if not tm["acc"]:
        continue

      results_matrix[mode_name]["FAZA_2_KLASYFIKACJA_TRAIN_TEST_70_30"][
          f"S_{nTrees}"
      ] = {
          "DRZEWA_LAS_LOSOWY_AVG_5_RUNS": {
              "avg_accuracy": round(float(np.mean(tm["acc"])), 2),
              "avg_precision": round(float(np.mean(tm["prec"])), 2),
              "avg_recall": round(float(np.mean(tm["rec"])), 2),
              "avg_f1_score": round(float(np.mean(tm["f1"])), 2),
          },
          "REGULY_ALGORYTM_A_AVG_5_RUNS": {
              "avg_accuracy": round(float(np.mean(rm["acc"])), 2),
              "avg_precision": round(float(np.mean(rm["prec"])), 2),
              "avg_recall": round(float(np.mean(rm["rec"])), 2),
              "avg_f1_score": round(float(np.mean(rm["f1"])), 2),
          },
          "porownanie_roznica_accuracy_reguly_vs_drzewa": round(
              float(np.mean(rm["acc"]) - np.mean(tm["acc"])), 2
          ),
      }

  attr_label = (
      ", ".join(attr_param) if isinstance(attr_param, list) else str(attr_param)
  )

  return {
      "status": "success",
      "metodologia": (
          "Pełna zgodność bez wycieku danych: Faza 1 (cały zbiór) + Faza 2"
          f" (podział {splitRatio}/{100-int(splitRatio)} przed redukcją"
          " konfliktów, 5 powtórzeń)"
      ),
      "removed_attribute": attr_label,
      "results": results_matrix,
  }