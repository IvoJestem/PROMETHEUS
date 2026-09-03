import math
import numpy as np
import pandas as pd


def calculate_entropy(probabilities):
  return -sum(p * math.log2(p) for p in probabilities if p > 0)


def run_inconsistency_data_generation(df, target_attr, attr_to_remove):
  df.columns = [c.strip() for c in df.columns]
  target_attr = str(target_attr).strip()

  if isinstance(attr_to_remove, str):
    cols_to_drop = [a.strip() for a in attr_to_remove.split(',') if a.strip()]
  else:
    cols_to_drop = [str(a).strip() for a in attr_to_remove if str(a).strip()]

  cols_to_drop = [c for c in cols_to_drop if c in df.columns]
  df_inconsistent = df.drop(columns=cols_to_drop).copy()
  remaining_cond_attrs = [
      c for c in df_inconsistent.columns if c != target_attr
  ]

  gd_records = []
  for name, group in df_inconsistent.groupby(remaining_cond_attrs):
    unique_decisions = sorted(list(set(group[target_attr].astype(str))))
    row_dict = group.iloc[0][remaining_cond_attrs].to_dict()

    if len(unique_decisions) == 1:
      row_dict[target_attr] = unique_decisions[0]
    else:
      row_dict[target_attr] = str(unique_decisions)

    gd_records.append(row_dict)

  df_gd = pd.DataFrame(gd_records)

  df_unique_conds = (
      df_inconsistent[remaining_cond_attrs].drop_duplicates().copy()
  )

  mcd_rows = []
  for _, row in df_unique_conds.iterrows():
    mask = pd.Series(True, index=df_inconsistent.index)
    for col in remaining_cond_attrs:
      mask = mask & (df_inconsistent[col] == row[col])

    matching_decisions = df_inconsistent[mask][target_attr]
    if not matching_decisions.empty:
      dominant_decision = matching_decisions.mode()[0]
      new_row = row.to_dict()
      new_row[target_attr] = str(dominant_decision)
      mcd_rows.append(new_row)

  df_mcd = pd.DataFrame(mcd_rows)

  custom_rows = []
  for _, row in df_unique_conds.iterrows():
    mask = pd.Series(True, index=df_inconsistent.index)
    for col in remaining_cond_attrs:
      mask = mask & (df_inconsistent[col] == row[col])

    matching_decisions = df_inconsistent[mask][target_attr]
    if not matching_decisions.empty:
      total_count = len(matching_decisions)
      counts = matching_decisions.value_counts()
      probs = [count / total_count for count in counts]
      group_entropy = calculate_entropy(probs)

      if group_entropy <= 0.85:
        dominant_decision = matching_decisions.mode()[0]
        new_row = row.to_dict()
        new_row[target_attr] = str(dominant_decision)
        custom_rows.append(new_row)

  df_custom = (
      pd.DataFrame(custom_rows)
      if custom_rows
      else pd.DataFrame(columns=df_inconsistent.columns)
  )

  return {"GD": df_gd, "MCD": df_mcd, "CUSTOM": df_custom}