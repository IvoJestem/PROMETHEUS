from itertools import combinations
import json
from pathlib import Path
import sys
import numpy as np
import pandas as pd

# Podpięcie katalogu src/scripts z Twojego projektu PROMETHEUS
BASE_DIR = Path(__file__).resolve().parent
SCRIPTS_DIR = BASE_DIR / "src" / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

from main import read_flexible_csv
from xai_service import rank_attributes_by_ig

DATA_DIR = BASE_DIR / "public" / "data"
OUTPUT_CSV = BASE_DIR / "ranking_zbiorow.csv"
OUTPUT_JSON = BASE_DIR / "ranking_zbiorow.json"


def evaluate_reduction(df: pd.DataFrame, target_attr: str, cols_to_drop: list[str], total_classes: int):
    df_reduced = df.drop(columns=cols_to_drop)
    cond_attrs = [c for c in df_reduced.columns if c != target_attr]
    if not cond_attrs:
        return None

    groups = df_reduced.groupby(cond_attrs, dropna=False)
    dec_counts = groups[target_attr].nunique()
    unique_rows = int(len(dec_counts))
    if unique_rows < 4:
        return None

    spectrum_raw = dec_counts.value_counts().to_dict()
    # Bierzemy pod uwagę poziomy #1 .. #K (gdzie K to liczba klas w zbiorze, maks. 6)
    max_level = min(6, max(2, total_classes))
    active_buckets = [int(spectrum_raw.get(lvl, 0)) for lvl in range(1, max_level + 1)]

    # Wymagamy, aby istniały przynajmniej 2 niezerowe grupy (np. #1 i #2)
    non_zero = [v for v in active_buckets if v > 0]
    if len(non_zero) < 2:
        return None

    mean_bucket = float(np.mean(active_buckets))
    std_bucket = float(np.std(active_buckets))
    # Miara wyrównania [0, 1]: 1.0 oznacza idealnie równe grupy (#1 == #2 == #3...)
    cv = std_bucket / mean_bucket if mean_bucket > 0 else 999.0
    balance_score = 1.0 / (1.0 + cv)

    # Premia za wypełnienie większej liczby kubełków (#1, #2, #3...)
    coverage_ratio = len(non_zero) / max_level

    # Łączny wynik: premiuje dużą liczbę wierszy (log/pierwiastek) + wysokie wyrównanie grup
    combined_score = (unique_rows ** 0.5) * (balance_score ** 1.5) * (0.5 + 0.5 * coverage_ratio)

    return {
        "rows_after": unique_rows,
        "retention_pct": round((unique_rows / len(df)) * 100, 1),
        "attr_left": len(cond_attrs),
        "k_removed": len(cols_to_drop),
        "removed_attrs": ", ".join(cols_to_drop),
        "spectrum": {f"#{i+1}": active_buckets[i] for i in range(max_level)},
        "spectrum_str": " | ".join(f"#{i+1}:{active_buckets[i]}" for i in range(max_level)),
        "B_T": int((dec_counts > 1).sum()),
        "balance_score": round(balance_score, 4),
        "combined_score": round(combined_score, 3),
    }


def scan_dataset(csv_path: Path):
    contents = csv_path.read_bytes()
    df = read_flexible_csv(contents)
    if df.empty or len(df.columns) < 3:
        return None

    target_attr = df.columns[-1]
    total_classes = int(df[target_attr].nunique())
    ranked_attrs = rank_attributes_by_ig(df, target_attr)
    n_attrs = len(ranked_attrs)

    candidates = []

    # 1. Sprawdzamy wszystkie k wg kolejności Information Gain (zgodne z PROMETHEUS UI)
    for k in range(1, n_attrs):
        res = evaluate_reduction(df, target_attr, ranked_attrs[:k], total_classes)
        if res:
            res["mode"] = "IG_ORDER"
            candidates.append(res)

    # 2. Dla zbiorów o <= 12 cechach sprawdzamy też dokładne kombinacje (k = 1..4),
    # żeby znaleźć jeszcze lepiej wyrównane spektrum i większą liczbę wierszy
    if n_attrs <= 12:
        for k in range(1, min(5, n_attrs)):
            for comb in combinations(ranked_attrs, k):
                comb_list = list(comb)
                if comb_list == ranked_attrs[:k]:
                    continue
                res = evaluate_reduction(df, target_attr, comb_list, total_classes)
                if res:
                    res["mode"] = "EXACT_COMB"
                    candidates.append(res)

    if not candidates:
        return None

    candidates.sort(key=lambda x: (-x["combined_score"], -x["rows_after"]))
    best = candidates[0]

    # Zwracamy też najlepszy wariant ściśle zgodny z kolejnością IG w interfejsie PROMETHEUS
    ig_only = [c for c in candidates if c["mode"] == "IG_ORDER"]
    best_ig = ig_only[0] if ig_only else best

    return {
        "dataset": csv_path.name,
        "orig_rows": int(len(df)),
        "orig_attrs": int(n_attrs),
        "classes": total_classes,
        "best_overall": best,
        "best_for_prometheus_ui": best_ig,
    }


def main():
    if not DATA_DIR.exists():
        print(f"Brak folderu z danymi: {DATA_DIR}")
        return

    csv_files = sorted(DATA_DIR.glob("*.csv"))
    if not csv_files:
        print(f"Nie znaleziono plików .csv w {DATA_DIR}")
        return

    results = []
    for f in csv_files:
        print(f"Analizuję: {f.name} ...")
        try:
            res = scan_dataset(f)
            if res:
                results.append(res)
            else:
                print(f"  -> Pominięto (za mało cech lub brak konfliktów).")
        except Exception as e:
            print(f"  -> Błąd w {f.name}: {e}")

    results.sort(key=lambda x: -x["best_for_prometheus_ui"]["combined_score"])

    rows_for_table = []
    for r in results:
        ui = r["best_for_prometheus_ui"]
        ov = r["best_overall"]
        rows_for_table.append({
            "Plik": r["dataset"],
            "Obiekty_Przed": r["orig_rows"],
            "Cechy_Przed": r["orig_attrs"],
            "Klasy": r["classes"],
            "UI_k": ui["k_removed"],
            "UI_Wiersze_Po": ui["rows_after"],
            "UI_Spektrum": ui["spectrum_str"],
            "UI_Balance": ui["balance_score"],
            "UI_Usuniete": ui["removed_attrs"],
            "Opt_k": ov["k_removed"],
            "Opt_Wiersze_Po": ov["rows_after"],
            "Opt_Spektrum": ov["spectrum_str"],
            "Opt_Balance": ov["balance_score"],
            "Opt_Usuniete": ov["removed_attrs"],
        })

    df_out = pd.DataFrame(rows_for_table)
    df_out.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
    OUTPUT_JSON.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")

    print("\n=== RANKING ZBIORÓW (NAJWIĘKSZE + NAJBARDZIEJ ZBLIŻONE GRUPY #1, #2, #3...) ===")
    if not df_out.empty:
        print(df_out[["Plik", "Obiekty_Przed", "Klasy", "UI_k", "UI_Wiersze_Po", "UI_Spektrum", "UI_Balance"]].to_string(index=False))
    print(f"\nZapisano pełny raport do:\n - {OUTPUT_CSV}\n - {OUTPUT_JSON}")


if __name__ == "__main__":
    main()