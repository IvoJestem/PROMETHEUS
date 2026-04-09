from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import io
import time
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.post("/process")
async def process_data(
    file: UploadFile = File(...),
    splitRatio: int = Form(...),
    targetAttr: str = Form(...),
    nTrees: int = Form(...),
    maxDepth: int = Form(...)
):
    # --- PRZYGOTOWANIE DANYCH ---
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    df.columns = [c.strip() for c in df.columns]
    targetAttr = targetAttr.strip()
    
    df = df[df[targetAttr].astype(str).str.strip().str.lower() != 'c'].copy()
    df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x).dropna()

    X = df.drop(columns=[targetAttr])
    y = df[targetAttr].astype(str)
    feature_names = list(X.columns)

    # Zapisujemy encodery, żeby potem "odkodować" tekst dla człowieka
    X_encoded = X.copy()
    label_encoders = {}
    for col in X.columns:
        le = LabelEncoder()
        X_encoded[col] = le.fit_transform(X[col].astype(str))
        label_encoders[col] = le

    le_y = LabelEncoder()
    y_encoded = le_y.fit_transform(y)
    class_names = [str(c) for c in le_y.classes_]

    X_train, X_test, y_train, y_test = train_test_split(
        X_encoded, y_encoded, test_size=(100 - splitRatio) / 100, random_state=42
    )

    # --- ETAP 1: MODEL LOKALNY (LAS LOSOWY) ---
    start_forest_time = time.time()
    
    clf = RandomForestClassifier(n_estimators=int(nTrees), max_depth=int(maxDepth), random_state=42)
    clf.fit(X_train, y_train)

    y_pred_forest = clf.predict(X_test)
    y_test_labels = le_y.inverse_transform(y_test)
    y_pred_forest_labels = le_y.inverse_transform(y_pred_forest)
    
    forest_acc = accuracy_score(y_test_labels, y_pred_forest_labels) * 100
    forest_prec = precision_score(y_test_labels, y_pred_forest_labels, average='macro', zero_division=0) * 100
    forest_rec = recall_score(y_test_labels, y_pred_forest_labels, average='macro', zero_division=0) * 100
    forest_f1 = f1_score(y_test_labels, y_pred_forest_labels, average='macro', zero_division=0) * 100

    forest_rules_sets = [] 
    all_unique_rules = {} 

    for tree_idx, tree_model in enumerate(clf.estimators_):
        tree_ = tree_model.tree_
        def recurse(node, current_conds):
            if tree_.feature[node] != -2:
                attr = feature_names[tree_.feature[node]]
                threshold = round(float(tree_.threshold[node]), 3)
                recurse(tree_.children_left[node], current_conds + ((attr, "<=", threshold),))
                recurse(tree_.children_right[node], current_conds + ((attr, ">", threshold),))
            else:
                class_idx = np.argmax(tree_.value[node])
                decision = class_names[class_idx]
                rule_key = (frozenset(current_conds), decision)
                if rule_key not in all_unique_rules:
                    all_unique_rules[rule_key] = {"conditions": current_conds, "decision": decision}
                tree_rules.append(rule_key)
        
        tree_rules = []
        recurse(0, tuple())
        forest_rules_sets.append(tree_rules)

    end_forest_time = time.time()
    forest_build_time = end_forest_time - start_forest_time 

    # --- ETAP 2: MODEL GLOBALNY (ALGORYTM A) ---
    start_alga_time = time.time()
    
    optimized_results = []
    for r_key, r_val in all_unique_rules.items():
        cond_set, decision = r_key
        sup = sum(1 for t_rules in forest_rules_sets if any(tc.issubset(cond_set) and td == decision for tc, td in t_rules))
        
        # --- TŁUMACZ REGUŁ (XAI) ---
        # 1. Konsolidacja przedziałów (usuwanie powtórzeń)
        bounds = {}
        for attr, op, val in r_val['conditions']:
            if attr not in bounds: 
                bounds[attr] = {'min': -float('inf'), 'max': float('inf')}
            if op == "<=": 
                bounds[attr]['max'] = min(bounds[attr]['max'], val)
            elif op == ">": 
                bounds[attr]['min'] = max(bounds[attr]['min'], val)
                
        # 2. Odkodowanie na wartości tekstowe dla Frontendu
        display_conds = []
        for attr, b in bounds.items():
            min_v, max_v = b['min'], b['max']
            le = label_encoders.get(attr)
            
            if le:
                # Szukamy, jakie etykiety tekstowe mieszczą się w tym przedziale
                valid_classes = [str(c) for i, c in enumerate(le.classes_) if min_v < i <= max_v]
                if len(valid_classes) == 1:
                    display_conds.append({"attribute": attr, "op": "=", "val": valid_classes[0]})
                elif len(valid_classes) > 1 and len(valid_classes) < len(le.classes_):
                    display_conds.append({"attribute": attr, "op": "IN", "val": "[" + ", ".join(valid_classes) + "]"})
            else:
                # Jeśli kolumna była czysto liczbowa (niekodowana)
                if min_v > -float('inf') and max_v < float('inf'):
                    display_conds.append({"attribute": attr, "op": "∈", "val": f"({round(min_v, 2)}, {round(max_v, 2)}]"})
                elif min_v > -float('inf'):
                    display_conds.append({"attribute": attr, "op": ">", "val": round(min_v, 2)})
                elif max_v < float('inf'):
                    display_conds.append({"attribute": attr, "op": "<=", "val": round(max_v, 2)})

        rule_data = {
            "conditions": display_conds, # Czyste reguły wysyłane do Reacta
            "_raw_conditions": r_val['conditions'], # Surowe reguły zostawione dla funkcji predict()
            "decision": decision,
            "supportCount": sup
        }
        optimized_results.append(rule_data)

# 1. Filtrujemy szum (zostawiamy > 1)
# 1. Filtrujemy szum (zostawiamy > 1)
    final_rules = [r for r in optimized_results if r['supportCount'] > 1]
    if not final_rules: final_rules = optimized_results

    # 2. TIE-BREAKER: Sortujemy listę (Najlepsza leci na samą górę)
    final_rules.sort(key=lambda x: (
        -x['supportCount'], 
        len(x['conditions']), 
        len(str(x['conditions'])), 
        str(x['conditions'])
    ))

    # --- 3. TWOJA INNOWACJA: Oznaczenie najlepszej reguły ---
    if len(final_rules) > 0:
        # Dodajemy specjalną flagę tylko do pierwszego elementu (indeks 0)
        final_rules[0]['isBestRule'] = True 
    # --------------------------------------------------------

    fallback = class_names[pd.Series(y_train).mode()[0]]
    def predict(row):
        # ... reszta kodu bez zmian ...
        for rule in final_rules:
            match = True
            for attr, op, val in rule['_raw_conditions']:
                if op == "<=" and not (row[attr] <= val + 0.001):
                    match = False; break
                elif op == ">" and not (row[attr] > val + 0.001):
                    match = False; break
            if match:
                return rule['decision']
        return fallback

    y_pred_custom = X_test.apply(predict, axis=1).tolist()
    y_true_labels = le_y.inverse_transform(y_test).tolist()
    
    custom_acc = accuracy_score(y_true_labels, y_pred_custom) * 100
    custom_prec = precision_score(y_true_labels, y_pred_custom, average='macro', zero_division=0) * 100
    custom_rec = recall_score(y_true_labels, y_pred_custom, average='macro', zero_division=0) * 100
    custom_f1 = f1_score(y_true_labels, y_pred_custom, average='macro', zero_division=0) * 100

    end_alga_time = time.time()
    alga_build_time = end_alga_time - start_alga_time

    return {
            "evalStats": {
                "accuracy": round(custom_acc, 2),
                "precision": round(custom_prec, 2),
                "recall": round(custom_rec, 2),
                "f1": round(custom_f1, 2),
                "customTime": round(alga_build_time, 2),
                
                "forestAccuracy": round(forest_acc, 2),
                "forestPrecision": round(forest_prec, 2),
                "forestRecall": round(forest_rec, 2),
                "forestF1": round(forest_f1, 2),
                "forestTime": round(forest_build_time, 2)
            },
            "algorithmAResults": final_rules, # <--- ZMIENIONE NA final_rules!
            "forestSize": nTrees
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)