
import io
import pandas as pd
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware

from xai_service import run_xai_pipeline
from analytics import run_inconsistency_data_generation

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.post("/get-attributes")
async def get_attributes(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    df.columns = [c.strip() for c in df.columns]
    cond_attrs = list(df.columns[:-1])
    return {"attributes": cond_attrs}

@app.post("/analyze-integrated")
async def analyze_integrated(
    file: UploadFile = File(...),
    splitRatio: int = Form(...),
    targetAttr: str = Form(...),
    nTrees: int = Form(...),
    maxDepth: int = Form(...),
    attrToRemove: str = Form(...)  
):
    contents = await file.read()

    df_base = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    df_base.columns = [c.strip() for c in df_base.columns]
    targetAttr = targetAttr.strip()
    attrToRemove = attrToRemove.strip()
    
    df_base = df_base[df_base[targetAttr].astype(str).str.strip().str.lower() != 'c'].copy()
    df_base = df_base.apply(lambda x: x.str.strip() if x.dtype == "object" else x).dropna()
 
    datasets = run_inconsistency_data_generation(df_base, targetAttr, attrToRemove)
    
    results = {}
    for mode in ["MVD", "MCD", "CUSTOM"]:
        df_variant = datasets[mode]
        if df_variant is not None and not df_variant.empty:
            results[mode] = run_xai_pipeline(df_variant, splitRatio, targetAttr, nTrees, maxDepth, "gini")
        else:
            results[mode] = None

    results["BASELINE"] = run_xai_pipeline(
        df=df_base.copy(),
        splitRatio=splitRatio,
        targetAttr=targetAttr,
        nTrees=nTrees,
        maxDepth=maxDepth,
        criterion="gini",
        is_baseline_mode=True
    )
            
    return {
        "status": "success",
        "removed_attribute": attrToRemove,
        "results": results
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)