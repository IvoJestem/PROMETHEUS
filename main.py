from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score
from sklearn.preprocessing import LabelEncoder
import io
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_rules(tree_model, feature_names, class_names):
    tree_ = tree_model.tree_
    feature = tree_.feature
    threshold = tree_.threshold
    value = tree_.value
    children_left = tree_.children_left
    children_right = tree_.children_right
    rules = []

    def recurse(node, current_conditions):
        if children_left[node] == children_right[node]: 
            class_idx = np.argmax(value[node])
            decision = str(class_names[class_idx])
            rules.append({
                "conditions": current_conditions, 
                "decision": decision, 
                "rowSupport": int(np.sum(value[node]))
            })
        else: 
            name = feature_names[feature[node]]
            th = round(threshold[node], 4)
            recurse(children_left[node], current_conditions + [{"attribute": name, "op": "<=", "val": th, "value": f"<= {th}"}])
            recurse(children_right[node], current_conditions + [{"attribute": name, "op": ">", "val": th, "value": f"> {th}"}])
            
    recurse(0, [])
    return rules

def is_subset(inner_conditions, candidate_conditions):
    inner_set = {f"{c['attribute']}:{c['value']}" for c in inner_conditions}
    candidate_set = {f"{c['attribute']}:{c['value']}" for c in candidate_conditions}
    return inner_set.issubset(candidate_set)

def calculate_stats(values, train_rows):
    if not values: return {"min": 0, "max": 0, "avg1": 0, "avg2": 0}
    return {
        "min": float(np.min(values)),
        "max": float(np.max(values)),
        "avg1": round(float(np.mean(values)), 4),
        "avg2": round(float(np.sum(values) / train_rows), 4) if train_rows else 0
    }

@app.post("/process")
async def process_data(
    file: UploadFile = File(...), 
    splitRatio: int = Form(...), 
    targetAttr: str = Form(...)
):
    start_time = time.time()
    logs = []
    
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    logs.append(f"📦 Python: Wczytano {len(df)} wierszy.")

    label_encoders = {}
    for col in df.columns:
        if df[col].dtype == 'object':
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            label_encoders[col] = le

    X = df.drop(columns=[targetAttr, '_id'], errors='ignore')
    y = df[targetAttr]
    
    if targetAttr in label_encoders:
        class_names = label_encoders[targetAttr].classes_
    else:
        class_names = np.unique(y).astype(str)

    test_size = (100 - splitRatio) / 100.0
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)
    logs.append(f"✂️ Python: Podział Train ({len(X_train)}), Test ({len(X_test)}).")

    FOREST_SIZE = 10
    rf = RandomForestClassifier(n_estimators=FOREST_SIZE, max_depth=10, random_state=42)
    rf.fit(X_train, y_train)
    logs.append(f"🌲 Python: Zbudowano Las Losowy ({FOREST_SIZE} drzew).")

    forest_structure = []
    tree_stats_table = []
    
    for i, tree in enumerate(rf.estimators_):
        rules = extract_rules(tree, X.columns, class_names)
        forest_structure.append(rules)
        lengths = [len(r['conditions']) for r in rules]
        supports = [r['rowSupport'] for r in rules]
        tree_stats_table.append({
            "id": i + 1, "count": len(rules),
            "len": calculate_stats(lengths, len(X_train)),
            "sup": calculate_stats(supports, len(X_train))
        })

    all_rules = [r for tree_rules in forest_structure for r in tree_rules]
    unique_rules_dict = {}
    
    for r in all_rules:
        sorted_conds = tuple(sorted([f"{c['attribute']}:{c['value']}" for c in r['conditions']]))
        key = (sorted_conds, r['decision'])
        if key not in unique_rules_dict:
            unique_rules_dict[key] = r

    unique_rules = list(unique_rules_dict.values())
    logs.append(f"🔍 Python: Rozpoczęto Algorytm A dla {len(unique_rules)} unikalnych reguł.")
    
    algorithm_a_results = []
    for candidate in unique_rules:
        supporting_trees = []
        for tree_idx, tree_rules in enumerate(forest_structure):
            for inner in tree_rules:
                if inner['decision'] == candidate['decision'] and is_subset(inner['conditions'], candidate['conditions']):
                    supporting_trees.append(f"tree{tree_idx + 1}")
                    break
        algorithm_a_results.append({
            "conditions": candidate['conditions'],
            "decision": candidate['decision'],
            "supportCount": len(supporting_trees),
            "supportedTrees": supporting_trees
        })
        
    algorithm_a_results.sort(key=lambda x: x['supportCount'], reverse=True)

    y_pred_rf = rf.predict(X_test)
    acc_rf = accuracy_score(y_test, y_pred_rf) * 100
    logs.append(f"📊 Baseline: Las Losowy (pełny) - Accuracy: {acc_rf:.2f}%")

    optimized_rules = [r for r in algorithm_a_results if r['supportCount'] > 1]
    
    logs.append(f"✂️ Optymalizacja: Odrzucono reguły ze wsparciem 1. Pozostało: {len(optimized_rules)} silnych reguł.")

    fallback_idx = y_train.mode()[0]
    fallback_decision = str(class_names[fallback_idx])

    def predict_with_rules(row):
        votes = []
        for rule in optimized_rules:
            matches = True
            for cond in rule['conditions']:
                attr = cond['attribute']
                if cond['op'] == '<=' and not (row[attr] <= cond['val']):
                    matches = False
                    break
                elif cond['op'] == '>' and not (row[attr] > cond['val']):
                    matches = False
                    break
            if matches:
                votes.append(rule['decision'])
        
        if len(votes) > 0:
            return max(set(votes), key=votes.count)
            
        return fallback_decision

    y_pred_rules = X_test.apply(predict_with_rules, axis=1)

    y_test_str = [str(class_names[val]) for val in y_test]

    acc_rules = accuracy_score(y_test_str, y_pred_rules) * 100
    f1_rules = f1_score(y_test_str, y_pred_rules, average='macro')

    logs.append(f"🎯 TWOJA METODA: Model zoptymalizowany - Accuracy: {acc_rules:.2f}%")
    logs.append(f"⚡ Python: Czas całkowity: {round(time.time() - start_time, 2)}s.")

    return {
        "treeStatsTable": tree_stats_table,
        "algorithmAResults": algorithm_a_results,
        "evalStats": { "accuracy": acc_rules, "macroF1": f1_rules }, 
        "logs": logs,
        "forestSize": FOREST_SIZE,
        "trainRows": len(X_train)
    }