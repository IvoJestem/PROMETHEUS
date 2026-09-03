import io
import traceback
import pandas as pd
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from analytics import run_inconsistency_data_generation
from research_service import run_full_research_experiment
from xai_service import run_xai_pipeline

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def read_flexible_csv(contents: bytes) -> pd.DataFrame:
    """Wczytuje CSV, czyści spacje, usuwa braki oraz odrzuca rekordy kontrolne 'c'."""
    df = pd.read_csv(
        io.StringIO(contents.decode("utf-8", errors="ignore")),
        sep=None,
        engine="python"
    )
    df.columns = [str(c).strip() for c in df.columns]
    df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x).dropna()

    last_col = df.columns[-1]
    df = df[df[last_col].astype(str).str.strip().str.lower() != "c"].copy()
    return df


@app.post("/get-attributes")
async def get_attributes(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = read_flexible_csv(contents)
        cond_attrs = list(df.columns[:-1])
        return {"attributes": cond_attrs}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/run-research-experiment")
async def run_research_experiment_endpoint(
    file: UploadFile = File(...),
    targetAttr: str = Form(...),
    attrToRemove: str = Form(...),
    maxDepth: int = Form(10)
):
    try:
        contents = await file.read()
        df_base = read_flexible_csv(contents)

        experiment_results = run_full_research_experiment(
            df_base=df_base,
            targetAttr=targetAttr.strip(),
            attrToRemove=attrToRemove.strip(),
            maxDepth=maxDepth
        )
        return experiment_results
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-integrated")
async def analyze_integrated(
    file: UploadFile = File(...),
    splitRatio: int = Form(...),
    targetAttr: str = Form(...),
    nTrees: int = Form(...),
    maxDepth: int = Form(...),
    attrToRemove: str = Form(...)
):
    try:
        contents = await file.read()
        df_base = read_flexible_csv(contents)
        targetAttr = targetAttr.strip()
        attrToRemove = attrToRemove.strip()

        stats_before = {
            "rows": int(len(df_base)),
            "cols": int(len(df_base.columns) - 1),
            "class_distribution": {
                str(k): int(v) for k, v in df_base[targetAttr].value_counts().items()
            }
        }

        datasets = run_inconsistency_data_generation(df_base, targetAttr, attrToRemove)

        stats_after = {}
        for mode in ["GD", "MCD", "CUSTOM"]:
            df_variant = datasets.get(mode)
            if df_variant is not None and not df_variant.empty:
                stats_after[mode] = {
                    "rows": int(len(df_variant)),
                    "cols": int(len(df_variant.columns) - 1),
                    "class_distribution": {
                        str(k): int(v) for k, v in df_variant[targetAttr].value_counts().items()
                    }
                }
            else:
                stats_after[mode] = {"rows": 0, "cols": 0, "class_distribution": {}}

        results = {}
        for mode in ["GD", "MCD", "CUSTOM"]:
            df_variant = datasets.get(mode)
            if df_variant is not None and not df_variant.empty:
                results[mode] = run_xai_pipeline(
                    df=df_variant,
                    split_ratio=splitRatio,
                    target_attr=targetAttr,
                    n_trees=nTrees,
                    max_depth=maxDepth,
                    criterion="entropy",
                    is_baseline_mode=False
                )
            else:
                results[mode] = None

        results["BASELINE"] = run_xai_pipeline(
            df=df_base.copy(),
            split_ratio=splitRatio,
            target_attr=targetAttr,
            n_trees=nTrees,
            max_depth=maxDepth,
            criterion="entropy",
            is_baseline_mode=True
        )

        return {
            "status": "success",
            "removed_attribute": attrToRemove,
            "dataset_stats": {
                "BEFORE": stats_before,
                "AFTER": stats_after
            },
            "results": results
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/calculate-full-inconsistency-matrix")
async def calculate_full_inconsistency_matrix(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = read_flexible_csv(contents)

        target_attr = df.columns[-1]
        all_attributes = list(df.columns[:-1])

        raw_name = file.filename or "dataset.csv"
        dataset_name = raw_name.replace("modified_", "").replace(".csv", "")
        matrix_results = []

        max_k = max(1, len(all_attributes) - 1)
        for k in range(1, max_k + 1):
            attrs_to_remove = all_attributes[:k]
            df_reduced = df.drop(columns=attrs_to_remove)
            condition_attrs = [c for c in df_reduced.columns if c != target_attr]

            if not condition_attrs:
                continue

            groups = df_reduced.groupby(condition_attrs, dropna=False)
            decision_counts_per_group = groups[target_attr].nunique()

            spectrum_counts = decision_counts_per_group.value_counts().to_dict()
            spectrum_cleaned = {int(k_val): int(v_val) for k_val, v_val in spectrum_counts.items()}

            unique_rows_count = int(len(decision_counts_per_group))
            boundary_count = int((decision_counts_per_group > 1).sum())

            matrix_results.append({
                "k_removed": int(k),
                "table_name": f"{dataset_name}-{k}",
                "removed_attribute": ", ".join(attrs_to_remove),
                "rows": unique_rows_count,
                "attr_count": int(len(condition_attrs)),
                "spectrum": {
                    "1": spectrum_cleaned.get(1, 0),
                    "2": spectrum_cleaned.get(2, 0),
                    "3": spectrum_cleaned.get(3, 0),
                    "4": spectrum_cleaned.get(4, 0),
                    "5": spectrum_cleaned.get(5, 0),
                    "6": spectrum_cleaned.get(6, 0),
                },
                "B_T": boundary_count
            })

        return {
            "status": "success",
            "matrix": matrix_results
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)