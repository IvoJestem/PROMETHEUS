import pandas as pd
import numpy as np
import time
import ast
from sklearn.ensemble import RandomForestClassifier 
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

def run_xai_pipeline(df, splitRatio, targetAttr, nTrees, maxDepth, criterion="gini", is_baseline_mode=False):
    """
    Zoptymalizowany potok badawczy oparty na Lesie Losowym CART (kryterium Gini).
    is_baseline_mode=True: Buduje surowy klasyfikator na oryginalnych danych i pomija Algorytm A.
    """
    df.columns = [c.strip() for c in df.columns]
    targetAttr = targetAttr.strip()
    
    df = df[df[targetAttr].astype(str).str.strip().str.lower() != 'c'].copy()
    df = df.apply(lambda x: x.str.strip() if x.dtype == "object" else x).dropna()

    X = df.drop(columns=[targetAttr])
    y = df[targetAttr].astype(str)
    feature_names = list(X.columns)

    is_mvd_mode = y.str.startswith('[').any() and y.str.endswith(']').any() and not is_baseline_mode

    X_encoded = X.copy()
    label_encoders = {}
    for col in X.columns:
        le = LabelEncoder()
        X_encoded[col] = le.fit_transform(X[col].astype(str))
        label_encoders[col] = le

    if is_mvd_mode:
        def pick_first_decision(val):
            try:
                parsed = ast.literal_eval(val)
                return str(parsed[0]) if isinstance(parsed, list) else str(val)
            except:
                return str(val)
        y_for_forest = y.apply(pick_first_decision)
        le_y = LabelEncoder()
        y_encoded = le_y.fit_transform(y_for_forest)
    else:
        le_y = LabelEncoder()
        y_encoded = le_y.fit_transform(y)
        
    class_names = [str(c) for i, c in enumerate(le_y.classes_)]

    X_train, X_test, y_train, y_test = train_test_split(
        X_encoded, y_encoded, 
        test_size=(100 - splitRatio) / 100, 
        random_state=42,
        stratify=y_encoded
    )

    y_test_real_labels = y.loc[X_test.index].tolist()

    def calculate_custom_metrics(preds, trues):
        correct = 0
        for p, t in zip(preds, trues):
            if is_mvd_mode:
                try:
                    allowed_set = ast.literal_eval(t)
                    if p in allowed_set: correct += 1
                except:
                    if p == t: correct += 1
            else:
                if p == t: correct += 1
        return (correct / len(trues)) * 100 if trues else 0

    start_forest_time = time.time()

    clf = RandomForestClassifier(
        n_estimators=int(nTrees),
        max_depth=int(maxDepth), 
        criterion="gini", 
        random_state=42
    )
    clf.fit(X_train, y_train)
    forest_build_time = time.time() - start_forest_time 

    if is_baseline_mode:
        y_pred_baseline = clf.predict(X_test)
        y_pred_labels = le_y.inverse_transform(y_pred_baseline).tolist()
        y_test_text_labels = le_y.inverse_transform(y_test).tolist()
        
        base_acc = calculate_custom_metrics(y_pred_labels, y_test_real_labels)

        total_nodes = sum(t.tree_.node_count for t in clf.estimators_)
        leaves = sum(sum(1 for f in t.tree_.feature if f == -2) for t in clf.estimators_)
        avg_depth = np.mean([t.tree_.max_depth for t in clf.estimators_])
        
        return {
            "forestStats": {
                "nTrees": int(nTrees),
                "totalNodes": total_nodes,
                "workingNodes": total_nodes - leaves,
                "leaves": leaves,
                "avgDepth": round(float(avg_depth), 2)
            },
            "evalStats": {
                "accuracy": round(base_acc, 2),
                "precision": round(precision_score(y_test_text_labels, y_pred_labels, average='macro', zero_division=0) * 100, 2),
                "recall": round(recall_score(y_test_text_labels, y_pred_labels, average='macro', zero_division=0) * 100, 2),
                "f1": round(f1_score(y_test_text_labels, y_pred_labels, average='macro', zero_division=0) * 100, 2),
                "customTime": round(forest_build_time, 2),
                "avgRuleLength": 0,
                "avgSubtableAccuracy": round(base_acc, 2),
                "maxSubtableAccuracy": round(base_acc, 2),
                "forestAccuracy": round(base_acc, 2),
                "forestTime": round(forest_build_time, 2)
            },
            "algorithmAResults": [],
            "totalRulesGenerated": 0
        }

    total_nodes = sum(t.tree_.node_count for t in clf.estimators_)
    leaves = sum(sum(1 for f in t.tree_.feature if f == -2) for t in clf.estimators_)
    total_working_nodes = total_nodes - leaves
    avg_depth = np.mean([t.tree_.max_depth for t in clf.estimators_])

    forest_rules_sets = [] 
    all_unique_rules = {} 
    
    for tree_model in clf.estimators_:
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

    start_alga_time = time.time()
    optimized_results = []
    
    for r_key, r_val in all_unique_rules.items():
        cond_set, decision = r_key
        sup = sum(1 for t_rules in forest_rules_sets if any(tc.issubset(cond_set) and td == decision for tc, td in t_rules))
        
        bounds = {}
        for attr, op, val in r_val['conditions']:
            if attr not in bounds: 
                bounds[attr] = {'min': -float('inf'), 'max': float('inf')}
            if op == "<=": 
                bounds[attr]['max'] = min(bounds[attr]['max'], val)
            elif op == ">": 
                bounds[attr]['min'] = max(bounds[attr]['min'], val)
                
        display_conds = []
        for attr, b in bounds.items():
            min_v, max_v = b['min'], b['max']
            le = label_encoders.get(attr)
            if le:
                valid_classes = [str(c) for i, c in enumerate(le.classes_) if min_v < i <= max_v]
                if len(valid_classes) == 1:
                    display_conds.append({"attribute": attr, "op": "=", "val": valid_classes[0]})
                elif len(valid_classes) > 1 and len(valid_classes) < len(le.classes_):
                    display_conds.append({"attribute": attr, "op": "IN", "val": "[" + ", ".join(valid_classes) + "]"})
            else:
                if min_v > -float('inf') and max_v < float('inf'):
                    display_conds.append({"attribute": attr, "op": "∈", "val": f"({round(min_v, 2)}, {round(max_v, 2)}]"})
                elif min_v > -float('inf'):
                    display_conds.append({"attribute": attr, "op": ">", "val": round(min_v, 2)})
                elif max_v < float('inf'):
                    display_conds.append({"attribute": attr, "op": "<=", "val": round(max_v, 2)})

        rule_data = {
            "conditions": display_conds, 
            "_raw_conditions": r_val['conditions'], 
            "decision": decision,
            "supportCount": sup
        }
        optimized_results.append(rule_data)

    final_rules = [r for r in optimized_results if r['supportCount'] > 1]
    if not final_rules: final_rules = optimized_results

    final_rules.sort(key=lambda x: (
        -x['supportCount'], 
        len(x['conditions']), 
        len(str(x['conditions'])), 
        str(x['conditions'])
    ))

    if len(final_rules) > 0:
        final_rules[0]['isBestRule'] = True 

    fallback = class_names[pd.Series(y_train).mode()[0]]
    
    def predict_row(row):
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

    y_pred_custom = X_test.apply(predict_row, axis=1).tolist()
    custom_acc = calculate_custom_metrics(y_pred_custom, y_test_real_labels)
    avg_rule_length = np.mean([len(r['conditions']) for r in final_rules]) if final_rules else 0

    num_subtables = min(int(nTrees), len(X_test))
    shuffled_indices = np.random.permutation(len(X_test))
    subtable_splits = np.array_split(shuffled_indices, num_subtables)
    
    subtable_accuracies = []
    for idx_group in subtable_splits:
        if len(idx_group) == 0: continue
        X_sub = X_test.iloc[idx_group]
        y_sub_true = [y_test_real_labels[i] for i in idx_group]
        
        y_sub_pred = X_sub.apply(predict_row, axis=1).tolist()
        subtable_accuracies.append(calculate_custom_metrics(y_sub_pred, y_sub_true))

    avg_subtable_acc = np.mean(subtable_accuracies) if subtable_accuracies else 0
    max_subtable_acc = np.max(subtable_accuracies) if subtable_accuracies else 0

    alga_build_time = time.time() - start_alga_time
    forest_acc = calculate_custom_metrics(le_y.inverse_transform(clf.predict(X_test)), y_test_real_labels)

    return {
        "forestStats": {
            "nTrees": int(nTrees),
            "totalNodes": total_nodes,
            "workingNodes": total_working_nodes,
            "leaves": leaves,
            "avgDepth": round(float(avg_depth), 2)
        },
        "evalStats": {
            "accuracy": round(custom_acc, 2),
            "precision": round(custom_acc, 2) if is_mvd_mode else round(precision_score(le_y.inverse_transform(y_test), y_pred_custom, average='macro', zero_division=0) * 100, 2),
            "recall": round(custom_acc, 2) if is_mvd_mode else round(recall_score(le_y.inverse_transform(y_test), y_pred_custom, average='macro', zero_division=0) * 100, 2),
            "f1": round(custom_acc, 2) if is_mvd_mode else round(f1_score(le_y.inverse_transform(y_test), y_pred_custom, average='macro', zero_division=0) * 100, 2),
            "customTime": round(alga_build_time, 2),
            "avgRuleLength": round(float(avg_rule_length), 2),
            
            "avgSubtableAccuracy": round(avg_subtable_acc, 2),
            "maxSubtableAccuracy": round(max_subtable_acc, 2),
            
            "forestAccuracy": round(forest_acc, 2),
            "forestTime": round(forest_build_time, 2)
        },
        "algorithmAResults": final_rules,
        "totalRulesGenerated": len(optimized_results)
    }