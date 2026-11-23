from itertools import combinations
import math
import numpy as np
import pandas as pd


def calculate_weighted_normalized_entropy(
    decisions_series, class_weights, num_classes
):
  """Oblicza znormalizowaną entropię Shannona [0, 1] z uwzględnieniem wag klas."""
  if num_classes <= 1 or len(decisions_series) <= 1:
    return 0.0

  counts = decisions_series.value_counts()
  if len(counts) <= 1:
    return 0.0

  weighted_counts = {
      str(cls): cnt * class_weights.get(str(cls), 1.0)
      for cls, cnt in counts.items()
  }
  total_weight = sum(weighted_counts.values())
  if total_weight <= 0:
    return 0.0

  probs = [w / total_weight for w in weighted_counts.values()]
  raw_entropy = -sum(p * math.log2(p) for p in probs if p > 0)
  max_entropy = math.log2(num_classes)
  return min(1.0, raw_entropy / max_entropy) if max_entropy > 0 else 0.0


def run_inconsistency_data_generation(
    df, target_attr, attr_to_remove, entropy_threshold=0.85
):
  df = df.copy()
  df.columns = [c.strip() for c in df.columns]
  target_attr = str(target_attr).strip()

  if isinstance(attr_to_remove, str):
    cols_to_drop = [a.strip() for a in attr_to_remove.split(",") if a.strip()]
  else:
    cols_to_drop = [str(a).strip() for a in attr_to_remove if str(a).strip()]

  cols_to_drop = [
      c for c in cols_to_drop if c in df.columns and c != target_attr
  ]
  df_inconsistent = df.drop(columns=cols_to_drop).copy()
  remaining_cond_attrs = [
      c for c in df_inconsistent.columns if c != target_attr
  ]

  if not remaining_cond_attrs:
    return {
        "GD": df_inconsistent,
        "MCD": df_inconsistent,
        "CUSTOM": df_inconsistent,
    }

  target_series_all = df_inconsistent[target_attr].astype(str)
  total_unique_classes = max(2, target_series_all.nunique())
  global_counts = target_series_all.value_counts()
  n_total = len(target_series_all)

  class_weights = {
      str(cls): math.sqrt(n_total / (total_unique_classes * cnt))
      for cls, cnt in global_counts.items()
  }

  gd_records = []
  mcd_records = []
  candidates = []

  for _, group in df_inconsistent.groupby(remaining_cond_attrs, dropna=False):
    base_row = group.iloc[0][remaining_cond_attrs].to_dict()
    decisions_series = group[target_attr].astype(str)
    unique_decisions = sorted(list(set(decisions_series)))

    # 1. Wariant GD (Generalized Decision)
    gd_row = base_row.copy()
    gd_row[target_attr] = (
        unique_decisions[0]
        if len(unique_decisions) == 1
        else str(unique_decisions)
    )
    gd_records.append(gd_row)

    counts = decisions_series.value_counts()
    max_freq = counts.max()
    raw_dominant = sorted(
        [str(k) for k, v in counts.items() if v == max_freq]
    )[0]

    # 2. Wariant MCD (Most Common Decision)
    mcd_row = base_row.copy()
    mcd_row[target_attr] = raw_dominant
    mcd_records.append(mcd_row)

    weighted_scores = {
        str(cls): cnt * class_weights.get(str(cls), 1.0)
        for cls, cnt in counts.items()
    }
    weighted_dominant = sorted(
        weighted_scores.items(), key=lambda x: (-x[1], x[0])
    )[0][0]

    norm_entropy = calculate_weighted_normalized_entropy(
        decisions_series, class_weights, total_unique_classes
    )
    candidates.append(
        (base_row, weighted_dominant, norm_entropy, len(decisions_series))
    )

  df_gd = pd.DataFrame(gd_records)
  df_mcd = pd.DataFrame(mcd_records)

  # 3. Wariant CUSTOM / ET: maksymalizujemy liczebność i minimalizujemy różnicę względem MCD/GD
  candidates_sorted = sorted(candidates, key=lambda x: (x[2], -x[3]))
  tau = float(entropy_threshold) if entropy_threshold is not None else 0.85

  selected = [c for c in candidates_sorted if c[2] <= tau]

  target_size = max(1, int(round(0.9 * len(candidates_sorted))))
  if len(selected) < target_size:
    selected_ids = {id(c) for c in selected}
    for cand in candidates_sorted:
      if id(cand) not in selected_ids:
        selected.append(cand)
        selected_ids.add(id(cand))
        if len(selected) >= target_size:
          break

  present_classes = {c[1] for c in selected}
  all_classes = {c[1] for c in candidates_sorted}
  missing_classes = all_classes - present_classes

  if missing_classes:
    selected_ids = {id(c) for c in selected}
    for m_cls in missing_classes:
      for cand in candidates_sorted:
        if cand[1] == m_cls and id(cand) not in selected_ids:
          selected.append(cand)
          selected_ids.add(id(cand))
          break

  custom_rows = []
  for base_row, dom_dec, _, _ in selected:
    row_copy = base_row.copy()
    row_copy[target_attr] = dom_dec
    custom_rows.append(row_copy)

  df_custom = (
      pd.DataFrame(custom_rows)
      if custom_rows
      else pd.DataFrame(columns=df_inconsistent.columns)
  )

  return {"GD": df_gd, "MCD": df_mcd, "CUSTOM": df_custom}


def recommend_balanced_k(
    df, target_attr, ranked_attrs, max_k=None, entropy_threshold=0.85
):
  """Zwraca k dające duże zbiory o możliwie zbliżonej liczebności między wariantami."""
  cond_attrs = [a for a in ranked_attrs if a in df.columns and a != target_attr]
  limit_k = max(1, min(len(cond_attrs) - 1, max_k or len(cond_attrs) - 1))

  best_k = 1
  best_score = float("-inf")

  for k in range(1, limit_k + 1):
    dropped = cond_attrs[:k]
    variants = run_inconsistency_data_generation(
        df, target_attr, dropped, entropy_threshold=entropy_threshold
    )
    sizes = [
        len(variants[m])
        for m in ("GD", "MCD", "CUSTOM")
        if variants.get(m) is not None and not variants[m].empty
    ]
    if not sizes:
      continue
    mean_size = sum(sizes) / len(sizes)
    spread = max(sizes) - min(sizes)
    score = mean_size - (1.5 * spread)
    if score > best_score:
      best_score = score
      best_k = k

  return best_k


def _compute_spectrum_balance(buckets: list[int], rows_count: int):
  non_zero = [v for v in buckets if v > 0]
  if rows_count <= 0 or len(non_zero) < 2:
    return 0.0, 0

  total_nz = sum(non_zero)
  max_share = max(non_zero) / total_nz if total_nz > 0 else 1.0

  mean_nz = float(np.mean(non_zero))
  std_nz = float(np.std(non_zero))
  cv_nz = std_nz / mean_nz if mean_nz > 0 else 1.0
  raw_evenness = max(0.0, 1.0 - min(1.0, cv_nz))

  dominance_factor = max(0.05, 1.0 - max(0.0, (max_share - 0.5) * 1.6))
  effective_evenness = raw_evenness * dominance_factor

  balance_pct = int(round(effective_evenness * 100))
  return effective_evenness, balance_pct


def _evaluate_remaining_codes(
    coded_cols: dict[str, np.ndarray],
    target_codes: np.ndarray,
    rem_cond: list[str],
    max_level: int,
):
  """Szybkie wyznaczenie liczebności wierszy, spektrum #1..#max_level i B(T) na kodach liczbowych."""
  n_rows = len(target_codes)
  if n_rows == 0 or not rem_cond:
    return None

  # Łączymy kody kolumn warunkowych w pojedynczy klucz 64-bitowy lub strukturę DataFrame
  if len(rem_cond) == 1:
    group_codes = coded_cols[rem_cond[0]]
  else:
    # Tworzymy unikalny indeks grupy po krotkach kodów
    arrays = [coded_cols[col] for col in rem_cond]
    # Używamy MultiIndex z już zakodowanych tablic int32
    mi = pd.MultiIndex.from_arrays(arrays, names=rem_cond)
    group_codes, _ = pd.factorize(mi, sort=False)

  unique_rows = int(group_codes.max()) + 1 if len(group_codes) > 0 else 0
  if unique_rows < 3:
    return None

  # Zliczamy unikalne decyzje per group_code
  pairs_df = pd.DataFrame({"g": group_codes, "d": target_codes}).drop_duplicates()
  dec_counts_series = pairs_df.groupby("g", sort=False)["d"].count()

  spec_counts = dec_counts_series.value_counts().to_dict()
  buckets = [
      int(spec_counts.get(lvl, 0)) for lvl in range(1, max_level + 1)
  ]
  non_zero = [v for v in buckets if v > 0]
  if len(non_zero) < 2:
    return None

  evenness, balance_pct = _compute_spectrum_balance(buckets, unique_rows)
  diversity = 0.75 + 0.15 * min(4, len(non_zero))
  score = (unique_rows**0.45) * (evenness**1.5) * diversity

  return {
      "rows": unique_rows,
      "attr_count": len(rem_cond),
      "spectrum": {str(i + 1): buckets[i] for i in range(max_level)},
      "B_T": int((dec_counts_series > 1).sum()),
      "balance_pct": balance_pct,
      "score": round(float(score), 3),
  }


def find_top_balanced_combinations(
    df: pd.DataFrame,
    target_attr: str,
    top_n: int = 5,
    force_exact: bool = False,
):
  """Przegląda kombinacje usuwanych cech wg 3 progów złożoności:

  1) m <= 12: pełny przegląd wszystkich podzbiorów (z keszowaniem po pozostałych cechach),
  2) 13 <= m <= 15: podzbiory brzegowe (1..4 i m-3..m-1), chyba że force_exact=True,
  3) m > 15: szybki skan (1..3 i m-2..m-1), chyba że force_exact=True.
  """
  df = df.copy()
  df.columns = [str(c).strip() for c in df.columns]
  target_attr = str(target_attr).strip()
  cond_attrs = [c for c in df.columns if c != target_attr]

  m = len(cond_attrs)
  if m < 2 or len(df) == 0:
    return {
        "items": [],
        "mode_used": "NONE",
        "total_evaluated": 0,
        "is_exact": False,
    }

  total_classes = max(2, int(df[target_attr].astype(str).nunique()))
  max_level = min(6, total_classes)

  # Kodujemy kolumny raz na początku dla szybszego grupowania
  coded_cols = {
      col: pd.factorize(df[col].astype(str), sort=False)[0] for col in cond_attrs
  }
  target_codes = pd.factorize(df[target_attr].astype(str), sort=False)[0]

  if force_exact or m <= 12:
    subset_sizes = list(range(1, m))
    mode_used = "EXACT_ALL"
    is_exact = True
  elif m <= 15:
    low_sizes = list(range(1, min(5, m)))
    high_sizes = list(range(max(1, m - 3), m))
    subset_sizes = sorted(set(low_sizes + high_sizes))
    mode_used = "BOUNDED_13_15"
    is_exact = False
  else:
    low_sizes = list(range(1, min(4, m)))
    high_sizes = list(range(max(1, m - 2), m))
    subset_sizes = sorted(set(low_sizes + high_sizes))
    mode_used = "FAST_OVER_15"
    is_exact = False

  cache_by_remaining = {}
  scored = []
  evaluated_count = 0

  all_cond_set = set(cond_attrs)

  for r_size in subset_sizes:
    for comb in combinations(cond_attrs, r_size):
      evaluated_count += 1
      dropped_set = set(comb)
      rem_cond = [c for c in cond_attrs if c not in dropped_set]
      if not rem_cond:
        continue

      rem_key = tuple(sorted(rem_cond))
      if rem_key not in cache_by_remaining:
        cache_by_remaining[rem_key] = _evaluate_remaining_codes(
            coded_cols=coded_cols,
            target_codes=target_codes,
            rem_cond=list(rem_key),
            max_level=max_level,
        )

      eval_res = cache_by_remaining[rem_key]
      if eval_res is None:
        continue

      scored.append({
          "k_removed": len(comb),
          "removed_attribute": ", ".join(comb),
          **eval_res,
      })

  scored.sort(key=lambda x: (-x["score"], -x["rows"]))
  return {
      "items": scored[:top_n],
      "mode_used": mode_used,
      "total_evaluated": evaluated_count,
      "unique_remaining_evaluated": len(cache_by_remaining),
      "is_exact": is_exact,
      "cond_attr_count": m,
  }