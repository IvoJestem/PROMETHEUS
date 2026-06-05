import io
import pandas as pd
from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware

# Importy z Twoich osobnych modułów serwisowych
from xai_service import run_xai_pipeline
from analytics import run_inconsistency_experiment

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# --- ENDPOINT 1: POBIERANIE LISTY ATRYBUTÓW WARUNKOWYCH ---
@app.post("/get-attributes")
async def get_attributes(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    df.columns = [c.strip() for c in df.columns]
    
    # Zwracamy wszystkie kolumny oprócz ostatniej (decyzyjnej)
    cond_attrs = list(df.columns[:-1])
    return {"attributes": cond_attrs}

# --- ENDPOINT 2: SILNIK KLASYFIKACJI XAI (LAS LOSOWY + ALGORYTM A) ---
@app.post("/process")
async def process_data(
    file: UploadFile = File(...),
    splitRatio: int = Form(...),
    targetAttr: str = Form(...),
    nTrees: int = Form(...),
    maxDepth: int = Form(...)
):
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    
    # Wywołanie odizolowanego procesu klasyfikacji XAI
    results = run_xai_pipeline(df, splitRatio, targetAttr, nTrees, maxDepth)
    return results

# --- ENDPOINT 3: EKSPERYMENTY NIESPÓJNOŚCI (MVD / MCD / AUTORSKA) ---
@app.post("/analyze-inconsistency")
async def analyze_inconsistency(
    file: UploadFile = File(...),
    targetAttr: str = Form(...),
    attrToRemove: str = Form(...)  # Odbieramy wybrany przez użytkownika atrybut z Reacta
):
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    
    # Przekazujemy wybrany atrybut bezpośrednio do funkcji eksperymentu w analytics.py
    results = run_inconsistency_experiment(df, targetAttr, attrToRemove.strip())
    
    return {
        "status": "success",
        "removed_attribute_to_create_inconsistency": attrToRemove,
        "results": results
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)