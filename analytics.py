import pandas as pd
import numpy as np

def find_max_cardinality_attr(df, target_attr):
    """Pomocnicza funkcja szukająca atrybutu o największej liczbie unikalnych wartości."""
    cond_attrs = [c for c in df.columns if c != target_attr]
    max_attr = "Brak"
    max_val = 0
    
    for attr in cond_attrs:
        num_unique = df[attr].nunique()
        if num_unique > max_val:
            max_val = num_unique
            max_attr = attr
            
    return {"attribute": max_attr, "unique_values": int(max_val)}

def get_mvd_spectrum(df_reduced, target_attr, explicit_cond_attrs):
    """
    Wylicza spectrum rozkładu decyzji.
    Bezpieczna wersja dla tablic czystych oraz z wielowartościowymi decyzjami.
    """
    if not explicit_cond_attrs:
        return {
            "rows": len(df_reduced),
            "spectrum": {f"#{i}": 0 for i in range(1, 7)},
            "B_T": 0
        }
        
    is_already_set = df_reduced[target_attr].apply(lambda x: isinstance(x, (set, list, np.ndarray))).any()
    
    if is_already_set:
        sizes = df_reduced[target_attr].apply(len)
        spec = sizes.value_counts()
        return {
            "rows": len(df_reduced),
            "spectrum": {f"#{i}": int(spec.get(i, 0)) for i in range(1, 7)},
            "B_T": int(sum(1 for s in sizes if s > 1))
        }
    else:
        return {
            "rows": len(df_reduced),
            "spectrum": {
                "#1": len(df_reduced),
                "#2": 0, "#3": 0, "#4": 0, "#5": 0, "#6": 0
            },
            "B_T": 0
        }

def run_inconsistency_experiment(df, target_attr, attr_to_remove):
    """
    Główna funkcja eksperymentu. 
    Aplikuje 3 techniki zarządcze po usunięciu JAWNIE wskazanego atrybutu.
    """
    df.columns = [c.strip() for c in df.columns]
    target_attr = target_attr.strip()
    
    # Tabela niespójna powstaje z wybranego przez użytkownika atrybutu
    df_inconsistent = df.drop(columns=[attr_to_remove]).copy()
    remaining_cond_attrs = [c for c in df_inconsistent.columns if c != target_attr]
    
    results = {}

    # === TECHNIKA 1: MVD (Many-Valued Decisions) ===
    df_mvd = df_inconsistent.groupby(remaining_cond_attrs)[target_attr].apply(lambda x: set(x)).reset_index()
    results["MVD"] = {
        **get_mvd_spectrum(df_mvd, target_attr, remaining_cond_attrs),
        "max_cardinality": find_max_cardinality_attr(df_mvd, target_attr)
    }

    # Przygotowanie bazowej struktury grup (wyciągamy unikalne wiersze warunkowe)
    # i mapujemy je, aby wyznaczyć MCD i CUSTOM bez używania kłopotliwego .apply()
    df_unique_conds = df_inconsistent[remaining_cond_attrs].drop_duplicates().copy()

    # === TECHNIKA 2: MCD (Most Common Decision) ===
    mcd_rows = []
    for _, row in df_unique_conds.iterrows():
        # Szukamy podzbioru pasującego do unikalnej kombinacji cech
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
    results["MCD"] = {
        **get_mvd_spectrum(df_mcd, target_attr, remaining_cond_attrs),
        "max_cardinality": find_max_cardinality_attr(df_mcd, target_attr)
    }

    # === TECHNIKA 3: AUTORSKA (Proportional Threshold >= 60%) ===
    custom_rows = []
    for _, row in df_unique_conds.iterrows():
        mask = True
        for col in remaining_cond_attrs:
            mask = mask & (df_inconsistent[col] == row[col])
            
        matching_decisions = df_inconsistent[mask][target_attr]
        if not matching_decisions.empty:
            total_count = len(matching_decisions)
            dominant_decision = matching_decisions.mode()[0]
            dominant_count = (matching_decisions == dominant_decision).sum()
            
            # Warunek autorski: czy dominanta stanowi minimum 60% grupy?
            if (dominant_count / total_count) >= 0.60:
                new_row = row.to_dict()
                new_row[target_attr] = dominant_decision
                custom_rows.append(new_row)
                
    if custom_rows:
        df_custom = pd.DataFrame(custom_rows)
        results["CUSTOM"] = {
            **get_mvd_spectrum(df_custom, target_attr, remaining_cond_attrs),
            "max_cardinality": find_max_cardinality_attr(df_custom, target_attr)
        }
    else:
        results["CUSTOM"] = {
            "rows": 0, 
            "spectrum": {f"#{i}": 0 for i in range(1, 7)}, 
            "B_T": 0, 
            "max_cardinality": {"attribute": "Brak", "unique_values": 0}
        }

    return results