import ast
import math
import time
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import KFold, StratifiedKFold


class ID3Node:

  def __init__(
      self, attribute=None, branches=None, is_leaf=False, decision=None
  ):
    self.attribute = attribute
    self.branches = branches if branches is not None else {}
    self.is_leaf = is_leaf
    self.decision = decision


def _parse_gd_set(val):
  """Parsuje pojedynczą klasę decyzyjną lub zbiór uogólniony w formacie listy/napisu."""
  s = str(val).strip()
  if s.startswith('[') and s.endswith(']'):
    try:
      parsed = ast.literal_eval(s)
      if isinstance(parsed, (list, set, tuple)):
        return {str(x).strip().lower() for x in parsed}
    except:
      pass
  return {s.strip('\'"').strip().lower()}


def calculate_entropy(target_series):
  total = len(target_series)
  if total <= 1:
    return 0.0
  counts = target_series.value_counts()
  probs = counts / total
  return -float(np.sum(probs * np.log2(probs + 1e-9)))


def calculate_information_gain(df, feature, target_attr):
  total_entropy = calculate_entropy(df[target_attr])
  total_rows = len(df)
  if total_rows == 0:
    return 0.0

  subset_entropy = 0.0
  for _, group in df.groupby(feature):
    subset_entropy += (len(group) / total_rows) * calculate_entropy(
        group[target_attr]
    )
  return total_entropy - subset_entropy


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

  if gains[best_feat_idx] <= 0:
    return ID3Node(is_leaf=True, decision=majority_decision)

  node = ID3Node(attribute=best_feat, is_leaf=False)
  remaining_feats = [f for f in feature_names if f != best_feat]

  for val, group in df_local.groupby(best_feat):
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
        {'attribute': k, 'value': v} for k, v in current_conditions.items()
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
  """Algorytm A: Agreguje unikalne reguły, normalizuje wsparcie do pojedynczego lasu S

  i odrzuca reguły o wsparciu <= 1.
  """
  unique_rules = {}
  for r in raw_rules:
    r_key = (frozenset(r['_raw_conditions'].items()), str(r['decision']))
    if r_key not in unique_rules:
      unique_rules[r_key] = {
          'conditions': r['conditions'],
          '_raw_conditions': r['_raw_conditions'],
          'decision': r['decision'],
          'totalHits': 0,
      }
    unique_rules[r_key]['totalHits'] += 1

  # Normalizacja: liczymy średnią liczbę wystąpień w 1 lesie
  for r in unique_rules.values():
    r['supportCount'] = max(1, int(round(r['totalHits'] / n_folds)))

  filtered = [r for r in unique_rules.values() if r['supportCount'] > 1]
  if not filtered:
    filtered = list(unique_rules.values())

  filtered.sort(key=lambda x: (-x['supportCount'], len(x['conditions'])))
  return filtered


def _predict_tree_nav(node, row):
  if node.is_leaf:
    return node.decision
  val = str(row.get(node.attribute)).strip()
  if val in node.branches:
    return _predict_tree_nav(node.branches[val], row)
  return None


def evaluate_pipeline(forest, test_df, target_attr, is_gd=False):
  X_test = test_df.drop(columns=[target_attr])
  y_test = test_df[target_attr].astype(str).values

  def predict_forest(row):
    votes = [
        t.decision if t.is_leaf else _predict_tree_nav(t, row) for t in forest
    ]
    votes = [v for v in votes if v is not None and v != 'Brak']
    if not votes:
      return 'Brak'
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
        v = list(p_set)[0]
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


def evaluate_rules_pipeline(rules, test_df, target_attr, is_gd=False):
  X_test = test_df.drop(columns=[target_attr])
  y_test = test_df[target_attr].astype(str).values

  def predict_rules(row):
    for r in rules:
      match = True
      for attr, val in r['_raw_conditions'].items():
        if str(row.get(attr)).strip().lower() != str(val).strip().lower():
          match = False
          break
      if match:
        return r['decision']
    return 'Brak'

  y_pred = X_test.apply(predict_rules, axis=1).tolist()

  cleaned_true = []
  cleaned_pred = []
  for t, p in zip(y_test, y_pred):
    t_set = _parse_gd_set(t)
    p_set = _parse_gd_set(p)
    if is_gd:
      if p_set.issubset(t_set) or (len(t_set.intersection(p_set)) > 0):
        v = list(p_set)[0]
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
    df,
    split_ratio,
    target_attr,
    n_trees,
    max_depth,
    criterion='entropy',
    is_baseline_mode=False,
):
  target_attr = target_attr.strip()
  X = df.drop(columns=[target_attr])
  y = df[target_attr].astype(str)
  feature_names = list(X.columns)

  def pick_first(v):
    s = _parse_gd_set(v)
    return list(s)[0] if s else str(v)

  y_strat = y.apply(pick_first).astype(str)

  # Zabezpieczenie przed błędem singletonów w StratifiedKFold
  _, counts = np.unique(y_strat, return_counts=True)
  if len(counts) > 1 and np.min(counts) >= 5:
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    splits = list(skf.split(X, y_strat))
  else:
    skf = KFold(n_splits=5, shuffle=True, random_state=42)
    splits = list(skf.split(X))

  accs, f1s, times = [], [], []
  total_nodes, total_leaves = [], []

  raw_rules_all = []
  n_sub = max(1, int(math.sqrt(len(feature_names))))

  for train_idx, test_idx in splits:
    start_t = time.time()
    X_tr, X_te = X.iloc[train_idx], X.iloc[test_idx]
    y_tr, y_te = y.iloc[train_idx].values, y.iloc[test_idx].values

    forest = []
    for t_i in range(int(n_trees)):
      boot_idx = np.random.choice(len(X_tr), size=len(X_tr), replace=True)
      sub_feats = list(
          np.random.choice(feature_names, size=n_sub, replace=False)
      )
      t = build_id3_tree(
          X_tr.iloc[boot_idx], y_tr[boot_idx], sub_feats, max_depth=int(max_depth)
      )
      forest.append(t)
      raw_rules_all.extend(extract_rules_from_id3(t, {}, t_i))

      nodes, leaves = count_tree_stats(t)
      total_nodes.append(nodes)
      total_leaves.append(leaves)

    te_df = pd.concat(
        [X_te, pd.Series(y_te, index=X_te.index, name=target_attr)], axis=1
    )
    eval_res = evaluate_pipeline(
        forest, te_df, target_attr, is_gd=('[' in ''.join(y))
    )

    accs.append(eval_res['Dokladnosc_Klasyfikacji'])
    f1s.append(eval_res['f1'])
    times.append(time.time() - start_t)

  optimized_rules = optimize_rules_algorithm_a(
      raw_rules_all, total_trees=int(n_trees), n_folds=5
  )

  dokladnosc = round(float(np.mean(accs)), 2)
  dokladnosc_odchylenie = round(float(np.std(accs)), 2)
  f1_mean = round(float(np.mean(f1s)), 2)
  czas_sr = round(float(np.mean(times)), 3)
  czas_odch = round(float(np.std(times)), 3)

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
          'Liczba_Regul_Przed': len(raw_rules_all),
          'Liczba_Regul_Po': len(optimized_rules),
      },
      'Reguly_Globalne': optimized_rules,
  }