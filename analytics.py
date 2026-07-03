
import pandas as pd
import numpy as np
import math

def calculate_entropy(probabilities):
    """Wylicza czystą entropię Shannona dla podanego rozkładu prawdopodobieństwa klas."""
    return -sum(p * math.log2(p) for p in probabilities if p > 0)

def run_inconsistency_data_generation(df, target_attr, attr_to_remove):
    """
    Zaawansowany generator zintegrowany.
    Wariant CUSTOM opiera się na Entropijnym Rozstrzyganiu Konfliktów (Entropy-Based Thresholding).
    """
    df_inconsistent = df.drop(columns=[attr_to_remove]).copy()
    remaining_cond_attrs = [c for c in df_inconsistent.columns if c != target_attr]
    
    df_mvd = df_inconsistent.groupby(remaining_cond_attrs)[target_attr].apply(lambda x: sorted(list(set(x)))).reset_index()
    df_mvd[target_attr] = df_mvd[target_attr].astype(str)
    
    df_unique_conds = df_inconsistent[remaining_cond_attrs].drop_duplicates().copy()

    mcd_rows = []
    for _, row in df_unique_conds.iterrows():
        mask = True
        for col in remaining_cond_attrs:
            mask = mask & (df_inconsistent[col] == row[col])
        
        matching_decisions = df_inconsistent[mask][target_attr]
        if not matching_decisions.empty:
            dominant_decision = matching_decisions.mode()[0]
            new_row = row.to_dict()
            new_row[target_attr] = dominant_decision
            mcd_rows.append(new_row)
            
    df_mcd = pd.DataFrame(mcd_rows)

    custom_rows = []
    for _, row in df_unique_conds.iterrows():
        mask = True
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
                new_row[target_attr] = dominant_decision
                custom_rows.append(new_row)
                
    if custom_rows:
        df_custom = pd.DataFrame(custom_rows)
    else:
        df_custom = pd.DataFrame(columns=df_inconsistent.columns)
        
    return {
        "MVD": df_mvd,
        "MCD": df_mcd,
        "CUSTOM": df_custom
    }