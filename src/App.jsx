import React, { useState, useRef } from 'react';


const getStyles = (isDark) => {
  const colors = isDark ? {
    bgMain: '#111827',     
    bgSidebar: '#1f2937',  
    bgHeader: '#1f2937',   
    bgCard: '#1f2937',    
    textMain: '#f9fafb',  
    textMuted: '#9ca3af',  
    border: '#374151',     
    buttonBg: '#374151', 
    buttonHover: '#4b5563',
    buttonText: '#f3f4f6', 
    logBg: '#0f172a',      
    logText: '#e2e8f0',   
    accent: '#818cf8',    
  } : {
    bgMain: '#f9fafb',
    bgSidebar: '#f3f4f6',
    bgHeader: 'white',
    bgCard: 'white',
    textMain: '#1f2937',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    buttonBg: 'white',
    buttonHover: '#eff6ff',
    buttonText: '#374151',
    logBg: '#f9fafb',
    logText: '#374151',
    accent: '#6366f1',
  };

  return {
    container: { display: 'flex', height: '100vh', fontFamily: 'Segoe UI, sans-serif', backgroundColor: colors.bgMain, overflow: 'hidden', color: colors.textMain },
    sidebar: { width: '320px', backgroundColor: colors.bgSidebar, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', padding: '16px', boxSizing: 'border-box', overflowY: 'auto' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: colors.bgMain, overflow: 'hidden' },
    header: { height: '64px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', backgroundColor: colors.bgHeader },
    titleBox: { textAlign: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${colors.border}` },
    title: { fontSize: '20px', fontWeight: 'bold', color: colors.textMain, margin: 0 },
    subtitle: { fontSize: '12px', color: colors.accent, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' },
    sectionLabel: { fontSize: '11px', fontWeight: 'bold', color: colors.textMuted, textTransform: 'uppercase', marginTop: '24px', marginBottom: '8px', paddingLeft: '8px' },
    button: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      marginBottom: '8px',
      backgroundColor: colors.buttonBg,
      border: `1px solid ${colors.border}`,
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      color: colors.buttonText,
      textAlign: 'left',
      transition: 'background 0.2s, transform 0.1s',
    },
    buttonHoverBg: colors.buttonHover, 
    buttonNormalBg: colors.buttonBg,
    buttonDisabled: { backgroundColor: isDark ? '#2d3540' : '#f3f4f6', color: colors.textMuted, cursor: 'not-allowed', borderColor: colors.border, opacity: 0.6 },
    icon: { marginRight: '12px', fontSize: '16px' },
    logArea: { flex: 1, padding: '24px', overflow: 'hidden', backgroundColor: colors.bgMain },
    logContent: { width: '100%', height: '100%', backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '16px', overflow: 'auto', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'pre-wrap', color: colors.logText, boxSizing: 'border-box' },
    select: { width: '100%', padding: '8px', marginBottom: '12px', borderRadius: '4px', border: `1px solid ${colors.border}`, backgroundColor: colors.buttonBg, color: colors.textMain, outline: 'none' },
    clearBtn: { padding: '6px 16px', fontSize: '12px', color: '#ef4444', backgroundColor: 'transparent', border: '1px solid #ef4444', borderRadius: '20px', cursor: 'pointer', transition: '0.2s' },
    footer: { marginTop: 'auto', paddingTop: '20px', borderTop: `1px solid ${colors.border}`, textAlign: 'center', fontSize: '12px', color: colors.textMuted },
    toggleBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '8px', borderRadius: '50%', color: colors.textMain, display: 'flex', alignItems: 'center', justifyContent: 'center' }
  };
};

const calculateEntropy = (data, targetAttr) => {
  const counts = {};
  data.forEach(row => {
    const val = row[targetAttr];
    counts[val] = (counts[val] || 0) + 1;
  });
  let entropy = 0;
  const total = data.length;
  Object.values(counts).forEach(count => {
    const p = count / total;
    entropy -= p * Math.log2(p);
  });
  return entropy;
};

const splitData = (data, attr) => {
  const groups = {};
  data.forEach(row => {
    const val = row[attr];
    if (!groups[val]) groups[val] = [];
    groups[val].push(row);
  });
  return groups;
};

const buildTree = (data, attributes, targetAttr, maxDepth = 10, currentDepth = 0) => {
  const uniqueTargets = [...new Set(data.map(r => r[targetAttr]))];
  if (uniqueTargets.length === 1) return { type: 'leaf', value: uniqueTargets[0], count: data.length };
  
  if (attributes.length === 0 || currentDepth >= maxDepth) {
    const counts = {};
    let mode = uniqueTargets[0];
    let maxCount = 0;
    data.forEach(r => {
      const val = r[targetAttr];
      counts[val] = (counts[val] || 0) + 1;
      if (counts[val] > maxCount) { maxCount = counts[val]; mode = val; }
    });
    return { type: 'leaf', value: mode, count: data.length };
  }

  let bestAttr = null;
  let maxGain = -1;
  const currentEntropy = calculateEntropy(data, targetAttr);

  attributes.forEach(attr => {
    const groups = splitData(data, attr);
    let splitEntropy = 0;
    Object.values(groups).forEach(group => {
      splitEntropy += (group.length / data.length) * calculateEntropy(group, targetAttr);
    });
    const gain = currentEntropy - splitEntropy;
    if (gain > maxGain) { maxGain = gain; bestAttr = attr; }
  });

  if (!bestAttr || maxGain === 0) {
     const counts = {};
     let mode = uniqueTargets[0];
     let maxCount = 0;
     data.forEach(r => {
       const val = r[targetAttr];
       counts[val] = (counts[val] || 0) + 1;
       if (counts[val] > maxCount) { maxCount = counts[val]; mode = val; }
     });
     return { type: 'leaf', value: mode, count: data.length };
  }

  const groups = splitData(data, bestAttr);
  const branches = {};
  const remainingAttrs = attributes.filter(a => a !== bestAttr);
  Object.keys(groups).forEach(val => {
    branches[val] = buildTree(groups[val], remainingAttrs, targetAttr, maxDepth, currentDepth + 1);
  });

  return { type: 'node', attribute: bestAttr, branches, fallback: uniqueTargets[0] };
};

const extractRulesFromTree = (node, currentConditions = []) => {
  if (node.type === 'leaf') return [{ conditions: currentConditions, decision: node.value }];
  let rules = [];
  Object.keys(node.branches).forEach(val => {
    const newConditions = [...currentConditions, { attribute: node.attribute, value: val }];
    rules = [...rules, ...extractRulesFromTree(node.branches[val], newConditions)];
  });
  return rules;
};

const ruleMatchesRow = (rule, row) => {
  return rule.conditions.every(cond => String(row[cond.attribute]) === String(cond.value));
};

// --- MAIN COMPONENT ---

export default function DecisionTableApp() {
  const [isDarkMode, setIsDarkMode] = useState(true); // Domyślnie tryb ciemny
  const styles = getStyles(isDarkMode); // Pobierz style dla aktualnego trybu

  const [logs, setLogs] = useState("Witaj! Wczytaj plik CSV aby rozpocząć pracę.\n");
  const [data, setData] = useState(null); 
  const [columns, setColumns] = useState([]);
  const [decisionTables, setDecisionTables] = useState({});
  const [selectedDecisionAttr, setSelectedDecisionAttr] = useState("");
  
  const [generatedRules, setGeneratedRules] = useState([]);
  const [optimizedRules, setOptimizedRules] = useState([]);
  const [classificationResults, setClassificationResults] = useState(null);

  const fileInputRef = useRef(null);

  // Komponenty wewnętrzne (aby korzystały z dynamicznych stylów)
  const Button = ({ onClick, children, disabled = false, icon }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...styles.button, ...(disabled ? styles.buttonDisabled : {}) }}
      onMouseOver={(e) => !disabled && (e.currentTarget.style.backgroundColor = styles.buttonHoverBg)}
      onMouseOut={(e) => !disabled && (e.currentTarget.style.backgroundColor = styles.buttonNormalBg)}
    >
      <span style={styles.icon}>{icon}</span>
      {children}
    </button>
  );

  const SectionLabel = ({ text }) => (
    <div style={styles.sectionLabel}>{text}</div>
  );

  const log = (text) => {
    setLogs((prev) => prev + text + "\n");
  };

  const clearLogs = () => setLogs("");

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      try {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length === 0) throw new Error("Plik jest pusty");
        const headers = lines[0].split(',').map(h => h.trim());
        const parsedData = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const row = {};
          headers.forEach((h, i) => row[h] = values[i]);
          return row;
        });
        setData(parsedData);
        setColumns(headers);
        setDecisionTables({});
        setSelectedDecisionAttr(headers[headers.length - 1]); 
        setGeneratedRules([]);
        setOptimizedRules([]);
        setClassificationResults(null);
        clearLogs();
        log(`Wczytano plik: ${file.name}`);
        log(`Liczba wierszy: ${parsedData.length}, liczba atrybutów: ${headers.length}`);
        log(`Domyślny atrybut decyzyjny: ${headers[headers.length - 1]}`);
      } catch (error) {
        log(`Błąd wczytywania pliku: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  const transformAndCheckConsistency = () => {
    if (!data) return log("⚠️ Najpierw wczytaj plik.");
    log("\n=== Generowanie tablic i sprawdzanie spójności ===");
    const newTables = {};
    columns.forEach(decisionAttr => {
      const conditionAttrs = columns.filter(c => c !== decisionAttr);
      const rawRows = [...data];
      const groups = {};
      rawRows.forEach(row => {
        const key = conditionAttrs.map(attr => row[attr]).join("|||");
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      });
      const fixedRows = [];
      let inconsistencyCount = 0;
      Object.values(groups).forEach(group => {
        const decisions = group.map(r => r[decisionAttr]);
        const uniqueDecisions = [...new Set(decisions)];
        if (uniqueDecisions.length > 1) {
          inconsistencyCount++;
          const counts = {};
          let maxCount = 0;
          let mode = decisions[0];
          decisions.forEach(d => {
            counts[d] = (counts[d] || 0) + 1;
            if (counts[d] > maxCount) { maxCount = counts[d]; mode = d; }
          });
          fixedRows.push(...group.map(r => ({ ...r, [decisionAttr]: mode })));
        } else {
          fixedRows.push(...group);
        }
      });
      newTables[decisionAttr] = { decisionAttr, conditionAttrs, rows: fixedRows };
      if (inconsistencyCount > 0) {
        log(`Tablica dla '${decisionAttr}': Znaleziono i naprawiono ${inconsistencyCount} niespójnych grup.`);
      } else {
        log(`Tablica dla '${decisionAttr}': Spójna.`);
      }
    });
    setDecisionTables(newTables);
    log("Zakończono weryfikację spójności.");
  };

  const generateRandomForest = () => {
    if (!data || !decisionTables[selectedDecisionAttr]) return log("⚠️ Najpierw wczytaj dane i sprawdź spójność.");
    const table = decisionTables[selectedDecisionAttr];
    const cleanData = table.rows;
    const target = selectedDecisionAttr;
    const features = table.conditionAttrs;
    log(`\n=== Generowanie Lasu Losowego dla atrybutu: ${target} ===`);
    log("Parametry: 10 drzew, Bootstrap sampling.");
    const FOREST_SIZE = 10;
    const allRules = [];
    for (let i = 0; i < FOREST_SIZE; i++) {
      const sample = [];
      for (let j = 0; j < cleanData.length; j++) {
        const randIndex = Math.floor(Math.random() * cleanData.length);
        sample.push(cleanData[randIndex]);
      }
      const tree = buildTree(sample, features, target);
      const rules = extractRulesFromTree(tree);
      rules.forEach(r => r.treeId = i + 1);
      allRules.push(...rules);
      log(`Drzewo #${i + 1}: wygenerowano ${rules.length} reguł.`);
    }
    const rulesWithIds = allRules.map((r, idx) => ({ ...r, id: `R${idx}` }));
    setGeneratedRules(rulesWithIds);
    log(`\nŁącznie wygenerowano ${rulesWithIds.length} reguł z lasu.`);
  };

  const optimizeRules = () => {
    if (generatedRules.length === 0) return log("⚠️ Najpierw wygeneruj las losowy.");
    log("\n=== Optymalizacja Reguł ===");
    const table = decisionTables[selectedDecisionAttr];
    const rows = table.rows;
    const finalRuleSet = new Set();
    log("Obliczanie wsparcia dla wszystkich reguł...");
    const rulesWithStats = generatedRules.map(rule => {
      let support = 0;
      rows.forEach(row => {
        if (ruleMatchesRow(rule, row) && String(row[selectedDecisionAttr]) === String(rule.decision)) {
          support++;
        }
      });
      return { ...rule, support, length: rule.conditions.length };
    });
    let coveredRows = 0;
    rows.forEach(row => {
      const applicableRules = rulesWithStats.filter(r => 
        ruleMatchesRow(r, row) && String(row[selectedDecisionAttr]) === String(r.decision)
      );
      if (applicableRules.length > 0) {
        coveredRows++;
        applicableRules.sort((a, b) => {
          if (b.support !== a.support) return b.support - a.support;
          return a.length - b.length;
        });
        finalRuleSet.add(applicableRules[0]);
      }
    });
    const optimizedArray = Array.from(finalRuleSet);
    setOptimizedRules(optimizedArray);
    log(`Przypisano reguły do wierszy.`);
    log(`Pokrycie zbioru danych: ${coveredRows} / ${rows.length} wierszy.`);
    log(`Liczba unikalnych reguł po optymalizacji: ${optimizedArray.length}`);
  };

  const showClassifierStats = () => {
    if (optimizedRules.length === 0) return log("⚠️ Najpierw wykonaj optymalizację reguł.");
    log("\n=== Charakterystyka Utworzonego Klasyfikatora ===");
    const lengths = optimizedRules.map(r => r.length);
    const supports = optimizedRules.map(r => r.support);
    const minLen = Math.min(...lengths);
    const maxLen = Math.max(...lengths);
    const avgLen = (lengths.reduce((a,b) => a+b, 0) / lengths.length).toFixed(2);
    const minSup = Math.min(...supports);
    const maxSup = Math.max(...supports);
    const avgSup = (supports.reduce((a,b) => a+b, 0) / supports.length).toFixed(2);
    log(`Liczba reguł: ${optimizedRules.length}`);
    log(`Długość reguł: Min=${minLen}, Max=${maxLen}, Średnia=${avgLen}`);
    log(`Wsparcie reguł: Min=${minSup}, Max=${maxSup}, Średnia=${avgSup}`);
    log("\nPrzykładowe reguły (Top 5 wg wsparcia):");
    const sorted = [...optimizedRules].sort((a,b) => b.support - a.support).slice(0, 5);
    sorted.forEach((r, i) => {
      const condStr = r.conditions.map(c => `${c.attribute}=${c.value}`).join(" AND ");
      log(` ${i+1}. JEŻELI ${condStr} TO ${selectedDecisionAttr}=${r.decision} [Wsparcie: ${r.support}]`);
    });
  };

  const evaluateClassifier = () => {
    if (optimizedRules.length === 0) return log("⚠️ Brak zoptymalizowanych reguł do klasyfikacji.");
    const table = decisionTables[selectedDecisionAttr];
    const rows = table.rows;
    log("\n=== Ocena Jakości Klasyfikatora (Globalna Optymalizacja) ===");
    log("Testowanie modelu na zbiorze danych...");
    let correct = 0;
    let unclassified = 0;
    let wrong = 0;
    rows.forEach(row => {
        const matchingRules = optimizedRules.filter(r => ruleMatchesRow(r, row));
        if (matchingRules.length === 0) {
            unclassified++;
        } else {
            matchingRules.sort((a, b) => b.support - a.support);
            const prediction = matchingRules[0].decision;
            if (String(prediction) === String(row[selectedDecisionAttr])) {
                correct++;
            } else {
                wrong++;
            }
        }
    });
    const total = rows.length;
    const accuracy = ((correct / total) * 100).toFixed(2);
    const coverage = (((total - unclassified) / total) * 100).toFixed(2);
    log(`\nWyniki klasyfikacji:`);
    log(`Poprawnie sklasyfikowane: ${correct}`);
    log(`Błędnie sklasyfikowane: ${wrong}`);
    log(`Niesklasyfikowane (brak pasującej reguły): ${unclassified}`);
    log(`-------------------------------------------`);
    log(`Dokładność (Accuracy): ${accuracy}%`);
    log(`Pokrycie (Coverage): ${coverage}%`);
    setClassificationResults({ accuracy, coverage });
  };

  const saveResults = (extension) => {
    const blob = new Blob([logs], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wyniki_las.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    log(`\nZapisano wyniki do pliku wyniki_las.${extension}`);
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.titleBox}>
          <h1 style={styles.title}>Analiza Danych</h1>
          <p style={styles.subtitle}>Las Losowy & Reguły</p>
        </div>

        <SectionLabel text="1. Dane i Spójność" />
        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
        <Button onClick={() => fileInputRef.current?.click()} icon="📂">Wczytaj CSV</Button>
        <Button onClick={transformAndCheckConsistency} icon="✅">Sprawdź Spójność</Button>

        <SectionLabel text="2. Las Losowy" />
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: styles.sectionLabel.color, marginBottom: '4px' }}>Atrybut Decyzyjny:</label>
          <select 
            value={selectedDecisionAttr} 
            onChange={(e) => setSelectedDecisionAttr(e.target.value)}
            style={styles.select}
            disabled={!columns.length}
          >
            {columns.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Button onClick={generateRandomForest} icon="🌳">Generuj Las Losowy</Button>

        <SectionLabel text="3. Optymalizacja" />
        <Button onClick={optimizeRules} icon="⚡" disabled={generatedRules.length === 0}>Optymalizuj Reguły</Button>
        <Button onClick={showClassifierStats} icon="📊" disabled={optimizedRules.length === 0}>Statystyki Reguł</Button>

        <SectionLabel text="4. Klasyfikacja i Jakość" />
        <Button onClick={evaluateClassifier} icon="🎯" disabled={optimizedRules.length === 0}>Ocena Klasyfikatora</Button>

        <SectionLabel text="Eksport" />
        <Button onClick={() => saveResults('txt')} icon="💾">Zapisz Raport (TXT)</Button>

        <div style={styles.footer}>
          <div>Autor: Anonim</div>
          <div style={{ marginTop: '4px' }}>Wersja 2.1 - Klasyfikator</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={styles.main}>
        {/* Header */}
        <div style={styles.header}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: styles.title.color, display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '8px' }}>📝</span> 
              Logi Operacji
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button onClick={() => setIsDarkMode(!isDarkMode)} style={styles.toggleBtn} title="Przełącz tryb">
                {isDarkMode ? '☀️' : '🌙'}
              </button>
              <button onClick={clearLogs} style={styles.clearBtn}>
                  Wyczyść
              </button>
            </div>
        </div>

        {/* Log Area */}
        <div style={styles.logArea}>
            <div style={styles.logContent}>
                {logs}
            </div>
        </div>
      </div>
    </div>
  );
}