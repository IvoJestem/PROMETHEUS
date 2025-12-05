import React, { useState, useRef } from 'react';

// --- STYLES ---
const getStyles = (isDark) => {
  const colors = isDark ? {
    bgMain: '#111827', bgSidebar: '#1f2937', bgHeader: '#1f2937', bgCard: '#374151',
    textMain: '#f9fafb', textMuted: '#9ca3af', border: '#4b5563',
    buttonBg: '#374151', buttonHover: '#4b5563', buttonText: '#f3f4f6',
    logBg: '#0f172a', logText: '#e2e8f0', accent: '#818cf8',
    tableHeader: '#374151', tableBorder: '#4b5563'
  } : {
    bgMain: '#f9fafb', bgSidebar: '#f3f4f6', bgHeader: 'white', bgCard: 'white',
    textMain: '#1f2937', textMuted: '#6b7280', border: '#e5e7eb',
    buttonBg: 'white', buttonHover: '#eff6ff', buttonText: '#374151',
    logBg: '#f9fafb', logText: '#374151', accent: '#6366f1',
    tableHeader: '#f3f4f6', tableBorder: '#e5e7eb'
  };

  return {
    container: { display: 'flex', height: '100vh', fontFamily: 'Segoe UI, sans-serif', backgroundColor: colors.bgMain, overflow: 'hidden', color: colors.textMain },
    sidebar: { width: '360px', backgroundColor: colors.bgSidebar, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', padding: '16px', boxSizing: 'border-box', overflowY: 'auto' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: colors.bgMain, overflow: 'hidden' },
    header: { height: '60px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', backgroundColor: colors.bgHeader },
    titleBox: { textAlign: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${colors.border}` },
    title: { fontSize: '18px', fontWeight: 'bold', color: colors.textMain, margin: 0 },
    subtitle: { fontSize: '11px', color: colors.accent, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' },
    sectionLabel: { fontSize: '11px', fontWeight: 'bold', color: colors.textMuted, textTransform: 'uppercase', marginTop: '16px', marginBottom: '8px', paddingLeft: '4px' },
    button: { width: '100%', display: 'flex', alignItems: 'center', padding: '10px 14px', marginBottom: '8px', backgroundColor: colors.buttonBg, border: `1px solid ${colors.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: colors.buttonText, textAlign: 'left', transition: 'all 0.2s' },
    buttonDisabled: { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(100%)' },
    icon: { marginRight: '10px', fontSize: '14px' },
    logArea: { flex: 1, padding: '20px', overflow: 'hidden', backgroundColor: colors.bgMain },
    logContent: { width: '100%', height: '100%', backgroundColor: colors.logBg, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '16px', overflow: 'auto', fontFamily: 'Consolas, monospace', fontSize: '12px', whiteSpace: 'pre-wrap', color: colors.logText, boxSizing: 'border-box' },
    sliderContainer: { marginBottom: '12px', padding: '0 4px' },
    slider: { width: '100%', cursor: 'pointer', accentColor: colors.accent },
    footer: { marginTop: 'auto', paddingTop: '20px', borderTop: `1px solid ${colors.border}`, textAlign: 'center', fontSize: '11px', color: colors.textMuted },
    toggleBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '8px', borderRadius: '50%', color: colors.textMain },
    clearBtn: { padding: '4px 12px', fontSize: '11px', color: '#ef4444', backgroundColor: 'transparent', border: '1px solid #ef4444', borderRadius: '12px', cursor: 'pointer' },
    
    // Table Styles
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '10px', color: colors.textMain },
    th: { textAlign: 'left', padding: '6px', borderBottom: `1px solid ${colors.tableBorder}`, backgroundColor: colors.tableHeader, fontWeight: '600' },
    td: { padding: '6px', borderBottom: `1px solid ${colors.tableBorder}` },
    statTitle: { fontSize: '12px', fontWeight: 'bold', marginTop: '10px', marginBottom: '5px', color: colors.accent }
  };
};

// --- LOGIC HELPERS ---

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

const buildTree = (data, attributes, targetAttr, maxDepth = 15, currentDepth = 0) => {
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

  if (!bestAttr || maxGain <= 0.0001) {
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

  const counts = {};
  let fallbackMode = uniqueTargets[0];
  let maxFallback = 0;
  data.forEach(r => {
      const v = r[targetAttr];
      counts[v] = (counts[v]||0)+1;
      if(counts[v] > maxFallback) { maxFallback = counts[v]; fallbackMode = v; }
  });

  return { type: 'node', attribute: bestAttr, branches, fallback: fallbackMode };
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

// Avg1 = na kolumnę, Avg2 = na wiersz
const calculateStats = (values, rowsCount, colsCount) => {
    if (values.length === 0) return { min: 0, max: 0, avg1: 0, avg2: 0 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg1 = (sum / colsCount).toFixed(4); // Średnia względem liczby kolumn
    const avg2 = (sum / rowsCount).toFixed(4); // Średnia względem liczby wierszy
    return { min, max, avg1, avg2 };
};

// --- KOMPONENT GŁÓWNY ---

export default function DecisionTableApp() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const styles = getStyles(isDarkMode);

  // Dane
  const [fileLogs, setFileLogs] = useState("Witaj. Załaduj plik CSV.\n"); // Logi dot. pliku (zawsze na górze)
  const [processLogs, setProcessLogs] = useState(""); // Logi operacyjne (pod tabelą)
  const [allData, setAllData] = useState([]); 
  const [columns, setColumns] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState("");
  
  // Konfiguracja
  const [splitRatio, setSplitRatio] = useState(70);

  // Model Analizy (Button 2)
  const [forestRules, setForestRules] = useState([]);
  const [optimizedRules, setOptimizedRules] = useState([]);
  const [treeStats, setTreeStats] = useState([]);
  const [statsRowCount, setStatsRowCount] = useState(0);

  // Model Walidacji (Button 3 & 4)
  const [validationRules, setValidationRules] = useState([]);
  const [validationTestData, setValidationTestData] = useState([]);
  const [validationFallback, setValidationFallback] = useState(null);

  const fileInputRef = useRef(null);
  
  // Funkcje pomocnicze do logowania
  const logFile = (text) => setFileLogs((prev) => prev + text + "\n");
  const logProcess = (text) => setProcessLogs((prev) => prev + text + "\n");
  
  // ZMODYFIKOWANA FUNKCJA CZYSZCZENIA (Odświeżenie strony)
  const refreshPage = () => {
    window.location.reload();
  };

  // 1. Wczytywanie i Analiza Spójności
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length === 0) throw new Error("Pusty plik");
        const headers = lines[0].split(',').map(h => h.trim());
        const parsed = lines.slice(1).map((line, idx) => {
          const vals = line.split(',').map(v => v.trim());
          const row = { _id: idx };
          headers.forEach((h, i) => row[h] = vals[i]);
          return row;
        });
        
        setAllData(parsed);
        setColumns(headers);
        const targetAttr = headers[headers.length - 1];
        setSelectedTarget(targetAttr);
        
        // Reset stanów, ale BEZ czyszczenia logów pliku (nadpisujemy je)
        setForestRules([]); setOptimizedRules([]); setTreeStats([]);
        setValidationRules([]); setValidationTestData([]);
        setProcessLogs(""); // Czyścimy stare procesy
        
        setFileLogs(""); // Reset logów pliku przed nowym wpisem
        logFile(`📂 Wczytano plik: ${file.name}`);

        // --- STATYSTYKI PODSTAWOWE (ZMODYFIKOWANE) ---
        // Zamiast listy klas, pokazujemy nazwę kolumny decyzyjnej
        logFile(`\n📊 Statystyki Podstawowe:`);
        logFile(`   Liczba wierszy: ${parsed.length}`);
        logFile(`   Liczba kolumn: ${headers.length}`);
        logFile(`   Klasa decyzyjna: ${targetAttr}`);
        // -----------------
        
        checkConsistency(parsed, headers[headers.length - 1], headers);

      } catch (err) {
        setFileLogs(`❌ Błąd: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const checkConsistency = (data, target, headers) => {
      const conditionAttrs = headers.filter(h => h !== target && h !== '_id');
      const uniqueRows = new Set();
      data.forEach(row => {
          const rowKey = headers.map(h => row[h]).join("|");
          uniqueRows.add(rowKey);
      });
      const duplicatesCount = data.length - uniqueRows.size;

      const groups = {};
      let conflicts = 0;
      data.forEach(row => {
          const key = conditionAttrs.map(a => row[a]).join("|");
          if (!groups[key]) groups[key] = new Set();
          groups[key].add(row[target]);
      });
      Object.values(groups).forEach(decisions => {
          if (decisions.size > 1) conflicts++;
      });

      logFile(`\n🔍 Analiza Spójności Danych:`);
      logFile(`   Liczba pełnych duplikatów (cały wiersz): ${duplicatesCount}`);
      if (conflicts > 0) {
          logFile(`⚠️ KONFLIKTY: Znaleziono ${conflicts} grup sprzecznych.`);
      } else {
          logFile(`✅ Brak konfliktów decyzyjnych (dane spójne względem atrybutów).`);
      }
  };

  // 2. Generowanie Lasu (Na wszystkich danych) - ANALIZA
  const generateForestOnFullData = () => {
      if (allData.length === 0) return;
      
      const features = columns.filter(c => c !== selectedTarget && c !== '_id');
      const FOREST_SIZE = 10;
      const allExtractedRules = [];
      const statsPerTree = [];

      logProcess(`\n🌲 Generowanie Lasu (10 drzew)...`);

      for(let i=0; i<FOREST_SIZE; i++) {
          const sample = [];
          for(let j=0; j<allData.length; j++){
              sample.push(allData[Math.floor(Math.random() * allData.length)]);
          }

          const tree = buildTree(sample, features, selectedTarget);
          const rules = extractRulesFromTree(tree);
          
          const rulesWithStats = rules.map(r => {
             const len = r.conditions.length;
             const support = allData.filter(row => ruleMatchesRow(r, row) && String(row[selectedTarget]) === String(r.decision)).length;
             return { ...r, length: len, support, treeId: i+1 };
          });
          
          allExtractedRules.push(...rulesWithStats);

          const lengths = rulesWithStats.map(r => r.length);
          const supports = rulesWithStats.map(r => r.support);
          
          statsPerTree.push({ 
              id: i+1, 
              count: rules.length,
              len: calculateStats(lengths, allData.length, columns.length),
              sup: calculateStats(supports, allData.length, columns.length)
          });
      }

      setForestRules(allExtractedRules);
      setTreeStats(statsPerTree);
      setStatsRowCount(allData.length);
      
      const uniqueRules = new Map();
      allExtractedRules.forEach(r => {
          const sortedConds = [...r.conditions].sort((a,b) => a.attribute.localeCompare(b.attribute));
          const key = sortedConds.map(c => `${c.attribute}:${c.value}`).join("&") + "=>" + r.decision;
          if (!uniqueRules.has(key)) uniqueRules.set(key, r);
      });

      const optimized = Array.from(uniqueRules.values()).sort((a,b) => b.support - a.support);
      setOptimizedRules(optimized);
      
      logProcess(`   Wygenerowano łącznie: ${optimized.length} unikalnych reguł.`);
      logProcess(`   Koniec Generowania.`);
  };

  // 3. Train & Test (Etap 1: Split & Train)
  const performSplitAndTrain = () => {
    if (!allData.length) return;
    
    // Podział
    const groups = {};
    allData.forEach(row => {
      const dec = row[selectedTarget];
      if (!groups[dec]) groups[dec] = [];
      groups[dec].push(row);
    });

    let train = [];
    let test = [];
    
    Object.keys(groups).forEach(key => {
        const groupRows = [...groups[key]];
        for (let i = groupRows.length - 1; i > 0; i--) { 
            const j = Math.floor(Math.random() * (i + 1));
            [groupRows[i], groupRows[j]] = [groupRows[j], groupRows[i]];
        }
        const splitIdx = Math.floor(groupRows.length * (splitRatio / 100));
        train.push(...groupRows.slice(0, splitIdx));
        test.push(...groupRows.slice(splitIdx));
    });

    if(train.length === 0 || test.length === 0) return logProcess("⚠️ Błąd podziału.");

    logProcess(`\n✂️ Podział Stratyfikowany (${splitRatio}/${100-splitRatio}):`);
    logProcess(`   Train: ${train.length}, Test: ${test.length}`);
    
    const counts = {};
    let mode = null;
    let maxC = 0;
    train.forEach(r => {
        const d = r[selectedTarget];
        counts[d] = (counts[d]||0)+1;
        if(counts[d] > maxC) { maxC = counts[d]; mode = d; }
    });
    logProcess(`   Moda Train (Fallback): ${mode}`);

    logProcess(`\n🌲 Generowanie Lasu Walidacyjnego (10 drzew)...`);

    const features = columns.filter(c => c !== selectedTarget && c !== '_id');
    const FOREST_SIZE = 10;
    const validationRulesRaw = [];

    for(let i=0; i<FOREST_SIZE; i++) {
        const sample = [];
        for(let j=0; j<train.length; j++){
            sample.push(train[Math.floor(Math.random() * train.length)]);
        }
        const tree = buildTree(sample, features, selectedTarget);
        const rules = extractRulesFromTree(tree);
        const rulesWithStats = rules.map(r => {
            const support = train.filter(row => ruleMatchesRow(r, row) && String(row[selectedTarget]) === String(r.decision)).length;
            return { ...r, support };
        });
        validationRulesRaw.push(...rulesWithStats);
    }
    
    const uniqueValRules = new Map();
    validationRulesRaw.forEach(r => {
          const sortedConds = [...r.conditions].sort((a,b) => a.attribute.localeCompare(b.attribute));
          const key = sortedConds.map(c => `${c.attribute}:${c.value}`).join("&") + "=>" + r.decision;
          if (!uniqueValRules.has(key)) uniqueValRules.set(key, r);
    });
    const optimizedValRules = Array.from(uniqueValRules.values()).sort((a,b) => b.support - a.support);

    // Zapisujemy model do stanu
    setValidationRules(optimizedValRules);
    setValidationTestData(test);
    setValidationFallback(mode);

    logProcess(`   Koniec Generowania Modelu. Przejdź do Ewaluacji.`);
  };

  // 4. Ewaluacja (Etap 2: Test)
  const performEvaluation = () => {
    if (validationRules.length === 0 || validationTestData.length === 0) return logProcess("⚠️ Najpierw wytrenuj model (Przycisk 3).");

    logProcess(`\n🎯 Testowanie (Zbiór Testowy: ${validationTestData.length})...`);
    
    let correct = 0;
    const classes = [...new Set(allData.map(r => r[selectedTarget]))];
    const matrix = {};
    classes.forEach(c => matrix[c] = { tp: 0, fp: 0, fn: 0 });

    validationTestData.forEach(row => {
        const actual = String(row[selectedTarget]);
        const matches = validationRules.filter(r => ruleMatchesRow(r, row));
        
        let predicted = null;
        if (matches.length > 0) {
            matches.sort((a,b) => b.support - a.support);
            predicted = String(matches[0].decision);
        } else {
            predicted = String(validationFallback);
        }

        if (predicted === actual) {
            correct++;
            matrix[actual].tp++;
        } else {
            matrix[actual].fn++;
            if(matrix[predicted]) matrix[predicted].fp++;
        }
    });

    let macroPrec = 0, macroRec = 0, macroF1 = 0, validClasses = 0;
    classes.forEach(c => {
        const { tp, fp, fn } = matrix[c];
        if (tp+fp+fn === 0) return;
        const p = tp + fp > 0 ? tp / (tp + fp) : 0;
        const r = tp + fn > 0 ? tp / (tp + fn) : 0;
        const f1 = (p + r) > 0 ? 2 * (p * r) / (p + r) : 0;
        macroPrec += p; macroRec += r; macroF1 += f1;
        validClasses++;
    });

    if (validClasses > 0) {
      macroPrec /= validClasses; macroRec /= validClasses; macroF1 /= validClasses;
    }

    const acc = (correct / validationTestData.length) * 100;
    const wrong = validationTestData.length - correct;

    logProcess(`--- Wyniki Całościowe ---`);
    logProcess(`Dobrze sklasyfikowane: ${correct}`);
    logProcess(`Źle sklasyfikowane: ${wrong}`);
    logProcess(`--- Statystyki Globalne ---`);
    logProcess(`Accuracy: ${acc.toFixed(2)}%`);
    logProcess(`Macro Precision: ${macroPrec.toFixed(4)}`);
    logProcess(`Macro Recall: ${macroRec.toFixed(4)}`);
    logProcess(`Macro F1: ${macroF1.toFixed(4)}`);
  };

  // Komponent Tabeli Statystyk
  const StatsTable = ({ stats, title }) => (
    <div style={{marginTop: '10px'}}>
        <div style={styles.statTitle}>{title}</div>
        <table style={styles.table}>
            <thead>
                <tr>
                    <th style={styles.th}>Drzewo</th>
                    <th style={styles.th}>L.Reguł</th>
                    <th style={styles.th}>Min L</th>
                    <th style={styles.th}>Avg1 L</th>
                    <th style={styles.th}>Avg2 L</th>
                    <th style={styles.th}>Max L</th>
                    <th style={styles.th}>Min S</th>
                    <th style={styles.th}>Avg1 S</th>
                    <th style={styles.th}>Avg2 S</th>
                    <th style={styles.th}>Max S</th>
                </tr>
            </thead>
            <tbody>
                {stats.map(s => (
                    <tr key={s.id}>
                        <td style={styles.td}>#{s.id}</td>
                        <td style={styles.td}>{s.count}</td>
                        <td style={styles.td}>{s.len.min}</td>
                        <td style={styles.td}>{s.len.avg1}</td>
                        <td style={styles.td}>{s.len.avg2}</td>
                        <td style={styles.td}>{s.len.max}</td>
                        <td style={styles.td}>{s.sup.min}</td>
                        <td style={styles.td}>{s.sup.avg1}</td>
                        <td style={styles.td}>{s.sup.avg2}</td>
                        <td style={styles.td}>{s.sup.max}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );

  const GlobalStats = () => {
     if(!optimizedRules.length) return null;
     const lengths = optimizedRules.map(r => r.length);
     const supports = optimizedRules.map(r => r.support);
     const sLen = calculateStats(lengths, statsRowCount, columns.length);
     const sSup = calculateStats(supports, statsRowCount, columns.length);
     
     return (
         <div style={{marginTop: '10px', padding: '10px', border: `1px solid ${styles.table.color}`, borderRadius: '6px'}}>
             <div style={styles.statTitle}>Statystyki Całościowe (Po optymalizacji)</div>
             <div style={{fontSize: '12px'}}>
                 <div><strong>Długość (L):</strong> Min={sLen.min}, Avg1={sLen.avg1}, Avg2={sLen.avg2}, Max={sLen.max}</div>
                 <div><strong>Wsparcie (S):</strong> Min={sSup.min}, Avg1={sSup.avg1}, Avg2={sSup.avg2}, Max={sSup.max}</div>
             </div>
         </div>
     );
  };

  const Button = ({ onClick, children, disabled = false, icon }) => (
    <button onClick={onClick} disabled={disabled} style={{ ...styles.button, ...(disabled ? styles.buttonDisabled : {}) }}
      onMouseOver={(e) => !disabled && (e.currentTarget.style.backgroundColor = styles.buttonHover)}
      onMouseOut={(e) => !disabled && (e.currentTarget.style.backgroundColor = styles.buttonBg)}>
      <span style={styles.icon}>{icon}</span>{children}
    </button>
  );

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.titleBox}>
          <h1 style={styles.title}>Analizator Danych</h1>
          <div style={styles.subtitle}>Las Losowy v5.0</div>
        </div>

        <div style={styles.sectionLabel}>1. Dane</div>
        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
        <Button onClick={() => fileInputRef.current?.click()} icon="📂">Wczytaj CSV</Button>

        <div style={styles.sectionLabel}>2. Generowanie Lasu (Analiza)</div>
        <div style={{fontSize: '10px', color: styles.textMuted, marginBottom:'5px'}}>Tworzy las na wszystkich danych (do statystyk)</div>
        <Button onClick={generateForestOnFullData} icon="🌲" disabled={!allData.length}>Generuj Las (10 drzew)</Button>

        <div style={styles.sectionLabel}>3. Walidacja (Train)</div>
        <div style={{fontSize: '10px', color: styles.textMuted, marginBottom:'5px'}}>Dzieli dane i trenuje model</div>
        <div style={styles.sliderContainer}>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px', marginBottom:'4px'}}>
                <span>Train: {splitRatio}%</span><span>Test: {100-splitRatio}%</span>
            </div>
            <input type="range" min="10" max="90" value={splitRatio} onChange={(e)=>setSplitRatio(parseInt(e.target.value))} style={styles.slider} />
        </div>
        <Button onClick={performSplitAndTrain} icon="⚙️" disabled={!allData.length}>3. Trenuj Model (Split & Train)</Button>

        <div style={styles.sectionLabel}>4. Walidacja (Test)</div>
        <div style={{fontSize: '10px', color: styles.textMuted, marginBottom:'5px'}}>Sprawdza wyniki na zbiorze testowym</div>
        <Button onClick={performEvaluation} icon="🎯" disabled={!validationRules.length}>4. Ewaluacja (Test)</Button>
      </div>

      <div style={styles.main}>
        <div style={styles.header}>
            <h2 style={{ fontSize: '15px', fontWeight: 'bold' }}>Raporty i Statystyki</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setIsDarkMode(!isDarkMode)} style={styles.toggleBtn}>{isDarkMode ? '☀️' : '🌙'}</button>
              <button onClick={refreshPage} style={styles.clearBtn}>Odśwież (Reset)</button>
            </div>
        </div>
        <div style={styles.logArea}>
            <div style={styles.logContent}>
                {/* 1. Logi plików (ZAWSZE na górze) */}
                <div style={{marginBottom: '20px', whiteSpace: 'pre-wrap'}}>{fileLogs}</div>
                
                {/* 2. Tabele ze statystykami (pojawiają się POD informacjami o pliku) */}
                {treeStats.length > 0 && (
                  <div style={{borderTop: '1px solid #4b5563', paddingTop: '20px'}}>
                    <StatsTable stats={treeStats} title="Statystyki Drzew (Avg1=na kolumnę, Avg2=na wiersz)" />
                  </div>
                )}
                {optimizedRules.length > 0 && <GlobalStats />}

                {/* 3. Logi procesów (Train/Test) - ZAWSZE na samym dole */}
                <div style={{marginTop: '20px', whiteSpace: 'pre-wrap', borderTop: processLogs ? '1px solid #4b5563' : 'none', paddingTop: processLogs ? '20px' : '0'}}>{processLogs}</div>
            </div>
        </div>
      </div>
    </div>
  );
}