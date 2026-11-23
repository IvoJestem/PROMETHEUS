import ast
import math
import time
from analytics import run_inconsistency_data_generation
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import ShuffleSplit, StratifiedShuffleSplit


class ID3Node:

  def __init__(
      self, attribute=None, branches=None, is_leaf=False, decision=None
  ):
    self.attribute = attribute
    self.branches = branches if branches is not None else {}
    self.is_leaf = is_leaf
    self.decision = decision


def _parse_gd_set(val):
  s = str(val).strip()
  if s.startswith('[') and s.endswith(']'):
    try:
      parsed = ast.literal_eval(s)
      if isinstance(parsed, (list, set, tuple)):
        return {str(x).strip().lower() for x in parsed}
    except Exception:
      pass
  return {s.strip('\'"').strip().lower()}


def calculate_entropy(target_series):
  total = len(target_series)
  if total <= 1:
    return 0.0
  counts = target_series.value_counts()
  probs = counts / total
  return -float(np.sum(probs * np.log2(probs)))


def calculate_information_gain(df, feature, target_attr):
  total_entropy = calculate_entropy(df[target_attr])
  total_rows = len(df)
  if total_rows == 0:
    return 0.0

  subset_entropy = 0.0
  for _, group in df.groupby(feature, dropna=False):
    subset_entropy += (len(group) / total_rows) * calculate_entropy(
        group[target_attr]
    )
  return total_entropy - subset_entropy


def rank_attributes_by_ig(df, target_attr):
  """Sortuje atrybuty warunkowe malejąco wg Information Gain."""
  cond_attrs = [c for c in df.columns if c != target_attr]
  gains = [
      (attr, calculate_information_gain(df, attr, target_attr))
      for attr in cond_attrs
  ]
  gains.sort(key=lambda x: (-x[1], x[0]))
  return [attr for attr, _ in gains]


def build_id3_tree(X_train, y_train, feature_names, max_depth=10, depth=0):
  if len(y_train) == 0:
    return ID3Node(is_leaf=True, decision='Brak')

  unique_classes, counts = np.unique(y_train, return_counts=True)
  majority_decision = unique_classes[np.argmax(counts)]

  if len(unique_classes) == 1 or depth >= max_depth or not feature_names:
    return ID3Node(is_leaf=True, decision=majority_decision)

  df_local = X_train.copy()
  df_local['_target_'] = y_train

  gains = [
      calculate_information_gain(df_local, f, '_target_') for f in feature_names
  ]
  best_feat_idx = int(np.argmax(gains))
  best_feat = feature_names[best_feat_idx]

  if gains[best_feat_idx] <= 1e-12:
    return ID3Node(is_leaf=True, decision=majority_decision)

  node = ID3Node(attribute=best_feat, is_leaf=False)
  remaining_feats = [f for f in feature_names if f != best_feat]

  for val, group in df_local.groupby(best_feat, dropna=False):
    child = build_id3_tree(
        group[remaining_feats],
        group['_target_'].values,
        remaining_feats,
        max_depth=max_depth,
        depth=depth + 1,
    )
    node.branches[str(val).strip()] = child

  return node


def count_tree_stats(node):
  if node is None:
    return 0, 0
  if node.is_leaf:
    return 0, 1

  nodes = 1
  leaves = 0
  for child in node.branches.values():
    c_nodes, c_leaves = count_tree_stats(child)
    nodes += c_nodes
    leaves += c_leaves
  return nodes, leaves


def extract_rules_from_id3(node, current_conditions=None, tree_id=0):
  if current_conditions is None:
    current_conditions = {}

  if node.is_leaf:
    cond_list = [
        {'attribute': k, 'op': '=', 'val': v, 'value': v}
        for k, v in current_conditions.items()
    ]
    return [{
        'treeId': tree_id,
        'conditions': cond_list,
        '_raw_conditions': current_conditions.copy(),
        'decision': node.decision,
    }]

  rules = []
  for val, child in node.branches.items():
    next_cond = current_conditions.copy()
    next_cond[node.attribute] = str(val).strip()
    rules.extend(extract_rules_from_id3(child, next_cond, tree_id))
  return rules


def optimize_rules_algorithm_a(raw_rules, total_trees=30, n_folds=5):
  unique_rules = {}
  for r in raw_rules:
    if not r.get('conditions'):
      continue
    r_key = (frozenset(r['_raw_conditions'].items()), str(r['decision']))
    if r_key not in unique_rules:
      unique_rules[r_key] = {
          'conditions': r['conditions'],
          '_raw_conditions': r['_raw_conditions'],
          'decision': r['decision'],
          'totalHits': 0,
      }
    unique_rules[r_key]['totalHits'] += 1

  for r in unique_rules.values():
    r['supportCount'] = min(
        int(total_trees), max(1, int(round(r['totalHits'] / max(1, n_folds))))
    )

  filtered = [r for r in unique_rules.values() if r['supportCount'] > 1]
  if not filtered:
    filtered = list(unique_rules.values())

  filtered.sort(key=lambda x: (-x['supportCount'], len(x['conditions'])))
  for idx, r in enumerate(filtered):
    r['isBestRule'] = idx == 0
  return filtered


def _predict_tree_nav(node, row):
  if node.is_leaf:
    return node.decision
  val = str(row.get(node.attribute)).strip()
  if val in node.branches:
    return _predict_tree_nav(node.branches[val], row)
  return None


def evaluate_pipeline(
    forest, test_df, target_attr, fallback_dec='Brak', is_gd=False
):
  X_test = test_df.drop(columns=[target_attr])
  y_test = test_df[target_attr].astype(str).values

  def predict_forest(row):
    votes = [
        t.decision if t.is_leaf else _predict_tree_nav(t, row) for t in forest
    ]
    votes = [v for v in votes if v is not None and v != 'Brak']
    if not votes:
      return fallback_dec
    vals, cnts = np.unique(votes, return_counts=True)
    return vals[np.argmax(cnts)]

  y_pred = X_test.apply(predict_forest, axis=1).tolist()

  cleaned_true = []
  cleaned_pred = []
  for t, p in zip(y_test, y_pred):
    t_set = _parse_gd_set(t)
    p_set = _parse_gd_set(p)
    if is_gd:
      if p_set.issubset(t_set) or (len(t_set.intersection(p_set)) > 0):
        v = list(t_set.intersection(p_set))[0]
        cleaned_true.append(v)
        cleaned_pred.append(v)
      else:
        cleaned_true.append(list(t_set)[0])
        cleaned_pred.append(list(p_set)[0])
    else:
      cleaned_true.append(str(t).strip().lower())
      cleaned_pred.append(str(p).strip().lower())

  acc = float(accuracy_score(cleaned_true, cleaned_pred) * 100)
  prec = float(
      precision_score(
          cleaned_true, cleaned_pred, average='weighted', zero_division=0
      )
      * 100
  )
  rec = float(
      recall_score(
          cleaned_true, cleaned_pred, average='weighted', zero_division=0
      )
      * 100
  )
  f1 = float(
      f1_score(cleaned_true, cleaned_pred, average='weighted', zero_division=0)
      * 100
  )

  return {
      'Dokladnosc_Klasyfikacji': acc,
      'precision': prec,
      'recall': rec,
      'f1': f1,
  }


def run_xai_pipeline(
    df_base,
    split_ratio,
    target_attr,
    n_trees,
    max_depth,
    mode='BASELINE',
    attr_to_remove='',
    entropy_threshold=0.75,
):
  """Uczciwy potok XAI:

  - Dzieli dane zgodnie z suwakiem split_ratio (np. 70% train / 30% test w 5
  losowaniach),
  - Rozwiązuje niespójności (GD / MCD / CUSTOM) wyłącznie na zbiorze
  treningowym,
  - Ewaluuje na wspólnym, nieprzefiltrowanym zbiorze testowym.
  """
  target_attr = target_attr.strip()
  test_size = min(0.5, max(0.1, 1.0 - (float(split_ratio) / 100.0)))

  if isinstance(attr_to_remove, str):
    cols_to_drop = [
        a.strip()
        for a in attr_to_remove.split(',')
        if a.strip() in df_base.columns and a.strip() != target_attr
    ]
  else:
    cols_to_drop = [
        str(a).strip()
        for a in attr_to_remove
        if str(a).strip() in df_base.columns and str(a).strip() != target_attr
    ]

  y_strat = df_base[target_attr].astype(str)
  _, counts = np.unique(y_strat, return_counts=True)

  n_splits = 5
  if len(counts) > 1 and np.min(counts) >= 2:
    splitter = StratifiedShuffleSplit(
        n_splits=n_splits, test_size=test_size, random_state=42
    )
    splits = list(splitter.split(df_base, y_strat))
  else:
    splitter = ShuffleSplit(
        n_splits=n_splits, test_size=test_size, random_state=42
    )
    splits = list(splitter.split(df_base))

  rng = np.random.default_rng(42)
  accs, f1s, times = [], [], []
  total_nodes, total_leaves = [], []
  raw_rules_all = []

  for train_idx, test_idx in splits:
    start_t = time.time()
    train_raw = df_base.iloc[train_idx].copy()
    test_raw = df_base.iloc[test_idx].copy()

    if mode == 'BASELINE':
      train_df = train_raw
      test_df = test_raw
    else:
      variants = run_inconsistency_data_generation(
          train_raw,
          target_attr,
          cols_to_drop,
          entropy_threshold=entropy_threshold,
      )
      train_df = variants.get(mode)
      test_df = test_raw.drop(columns=cols_to_drop).copy()

    if train_df is None or train_df.empty:
      continue

    X_tr = train_df.drop(columns=[target_attr])
    y_tr = train_df[target_attr].astype(str).values
    feature_names = list(X_tr.columns)
    n_sub = max(1, int(math.sqrt(len(feature_names))))

    u_cls, u_cnts = np.unique(y_tr, return_counts=True)
    fallback_dec = u_cls[np.argmax(u_cnts)] if len(u_cls) > 0 else 'Brak'

    forest = []
    for t_i in range(int(n_trees)):
      boot_idx = rng.choice(len(X_tr), size=len(X_tr), replace=True)
      sub_feats = list(rng.choice(feature_names, size=n_sub, replace=False))
      t = build_id3_tree(
          X_tr.iloc[boot_idx], y_tr[boot_idx], sub_feats, max_depth=int(max_depth)
      )
      forest.append(t)
      raw_rules_all.extend(extract_rules_from_id3(t, {}, t_i))

      nodes, leaves = count_tree_stats(t)
      total_nodes.append(nodes)
      total_leaves.append(leaves)

    eval_res = evaluate_pipeline(
        forest,
        test_df,
        target_attr,
        fallback_dec=fallback_dec,
        is_gd=(mode == 'GD'),
    )
    accs.append(eval_res['Dokladnosc_Klasyfikacji'])
    f1s.append(eval_res['f1'])
    times.append(time.time() - start_t)

  optimized_rules = optimize_rules_algorithm_a(
      raw_rules_all, total_trees=int(n_trees), n_folds=n_splits
  )

  dokladnosc = round(float(np.mean(accs)), 2) if accs else 0.0
  dokladnosc_odchylenie = round(float(np.std(accs)), 2) if accs else 0.0
  f1_mean = round(float(np.mean(f1s)), 2) if f1s else 0.0
  czas_sr = round(float(np.mean(times)), 3) if times else 0.0
  czas_odch = round(float(np.std(times)), 3) if times else 0.0

  return {
      'Dokladnosc_Klasyfikacji': dokladnosc,
      'Dokladnosc_Odchylenie': dokladnosc_odchylenie,
      'f1': f1_mean,
      'Czas_Sredni': czas_sr,
      'Czas_Odchylenie': czas_odch,
      'evalStats': {
          'Dokladnosc_Klasyfikacji': dokladnosc,
          'Dokladnosc_Odchylenie': dokladnosc_odchylenie,
          'f1': f1_mean,
          'Czas_Sredni': czas_sr,
          'Czas_Odchylenie': czas_odch,
      },
      'Struktura_Bazowa': {
          'Liczba_Drzew': int(n_trees),
          'Srednia_Glebokosc': int(max_depth),
          'Liczba_Wezlow': int(np.mean(total_nodes)) if total_nodes else 0,
          'Liczba_Lisci': int(np.mean(total_leaves)) if total_leaves else 0,
      },
      'Optymalizacja_Regul': {
          'Liczba_Regul_Przed': len(raw_rules_all) // max(1, n_splits),
          'Liczba_Regul_Po': len(optimized_rules),
      },
      'Reguly_Globalne': optimized_rules,
  }