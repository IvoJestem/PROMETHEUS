import React, { useState, useRef } from 'react';

// --- STYLES ---
const getStyles = (isDark) => {
  const colors = isDark ? {
    bgMain: '#111827', bgSidebar: '#1f2937', bgHeader: '#1f2937', bgCard: '#374151',
    textMain: '#f9fafb', textMuted: '#9ca3af', border: '#4b5563',
    buttonBg: '#374151', buttonHover: '#4b5563', buttonText: '#f3f4f6',
    logBg: '#0f172a', logText: '#e2e8f0', accent: '#818cf8',
    tableHeader: '#374151', tableBorder: '#4b5563',
    success: '#10b981', warning: '#f59e0b', error: '#ef4444'
  } : {
    bgMain: '#f9fafb', bgSidebar: '#f3f4f6', bgHeader: 'white', bgCard: 'white',
    textMain: '#1f2937', textMuted: '#6b7280', border: '#e5e7eb',
    buttonBg: 'white', buttonHover: '#eff6ff', buttonText: '#374151',
    logBg: '#f9fafb', logText: '#374151', accent: '#6366f1',
    tableHeader: '#f3f4f6', tableBorder: '#e5e7eb',
    success: '#059669', warning: '#d97706', error: '#dc2626'
  };

  return {
    container: { display: 'flex', height: '100vh', fontFamily: 'Segoe UI, sans-serif', backgroundColor: colors.bgMain, overflow: 'hidden', color: colors.textMain },
    sidebar: { width: '380px', backgroundColor: colors.bgSidebar, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', padding: '16px', boxSizing: 'border-box', overflowY: 'auto' },
    main: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: colors.bgMain, overflow: 'hidden' },
    header: { height: '60px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', backgroundColor: colors.bgHeader },
    title: { fontSize: '18px', fontWeight: 'bold', color: colors.textMain, margin: 0 },
    subtitle: { fontSize: '11px', color: colors.accent, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' },
    sectionLabel: { fontSize: '11px', fontWeight: 'bold', color: colors.textMuted, textTransform: 'uppercase', marginTop: '16px', marginBottom: '8px', paddingLeft: '4px' },
    button: { width: '100%', display: 'flex', alignItems: 'center', padding: '10px 14px', marginBottom: '8px', backgroundColor: colors.buttonBg, border: `1px solid ${colors.border}`, borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: colors.buttonText, textAlign: 'left', transition: 'all 0.2s' },
    buttonDisabled: { opacity: 0.5, cursor: 'not-allowed', filter: 'grayscale(100%)' },
    icon: { marginRight: '10px', fontSize: '14px' },
    logArea: { flex: 1, padding: '20px', overflow: 'hidden', backgroundColor: colors.bgMain },
    logContent: { width: '100%', height: '100%', backgroundColor: colors.logBg, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '16px', overflow: 'auto', fontFamily: 'Consolas, monospace', fontSize: '12px', whiteSpace: 'pre-wrap', color: colors.logText, boxSizing: 'border-box' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '0', color: colors.textMain },
    th: { textAlign: 'left', padding: '8px', borderBottom: `1px solid ${colors.tableBorder}`, backgroundColor: colors.tableHeader, fontWeight: '600' },
    td: { padding: '8px', borderBottom: `1px solid ${colors.tableBorder}`, verticalAlign: 'top' },
    statTitle: { fontSize: '14px', fontWeight: 'bold', marginTop: '15px', marginBottom: '10px', color: colors.accent },
    clearBtn: { padding: '4px 12px', fontSize: '11px', color: colors.error, backgroundColor: 'transparent', border: `1px solid ${colors.error}`, borderRadius: '12px', cursor: 'pointer' },
    toggleBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '8px', borderRadius: '50%', color: colors.textMain },
    sliderContainer: { marginBottom: '12px', padding: '0 4px' },
    slider: { width: '100%', cursor: 'pointer', accentColor: colors.accent },
    colors
  };
};

// --- LOGIKA DRZEW (ID3) ---
const calculateEntropy = (data, targetAttr) => {
  const counts = {};
  data.forEach(row => { const val = row[targetAttr]; counts[val] = (counts[val] || 0) + 1; });
  let entropy = 0; const total = data.length;
  Object.values(counts).forEach(count => { const p = count / total; entropy -= p * Math.log2(p); });
  return entropy;
};

const splitData = (data, attr) => {
  const groups = {};
  data.forEach(row => { const val = row[attr]; if (!groups[val]) groups[val] = []; groups[val].push(row); });
  return groups;
};

const buildTree = (data, attributes, targetAttr, maxDepth = 15, currentDepth = 0) => {
  const uniqueTargets = [...new Set(data.map(r => r[targetAttr]))];
  if (uniqueTargets.length === 1) return { type: 'leaf', value: uniqueTargets[0], count: data.length };
  
  if (attributes.length === 0 || currentDepth >= maxDepth) {
    const counts = {}; let mode = uniqueTargets[0]; let maxCount = 0;
    data.forEach(r => { const val = r[targetAttr]; counts[val] = (counts[val] || 0) + 1; if (counts[val] > maxCount) { maxCount = counts[val]; mode = val; } });
    return { type: 'leaf', value: mode, count: data.length };
  }

  let bestAttr = null; let maxGain = -1; const currentEntropy = calculateEntropy(data, targetAttr);
  attributes.forEach(attr => {
    const groups = splitData(data, attr); let splitEntropy = 0;
    Object.values(groups).forEach(group => { splitEntropy += (group.length / data.length) * calculateEntropy(group, targetAttr); });
    const gain = currentEntropy - splitEntropy; if (gain > maxGain) { maxGain = gain; bestAttr = attr; }
  });

  if (!bestAttr || maxGain <= 0.0001) {
     const counts = {}; let mode = uniqueTargets[0]; let maxCount = 0;
     data.forEach(r => { const val = r[targetAttr]; counts[val] = (counts[val] || 0) + 1; if (counts[val] > maxCount) { maxCount = counts[val]; mode = val; } });
     return { type: 'leaf', value: mode, count: data.length };
  }

  const groups = splitData(data, bestAttr); const branches = {}; const remainingAttrs = attributes.filter(a => a !== bestAttr);
  Object.keys(groups).forEach(val => { branches[val] = buildTree(groups[val], remainingAttrs, targetAttr, maxDepth, currentDepth + 1); });
  
  // Fallback node stats
  return { type: 'node', attribute: bestAttr, branches, count: data.length };
};

const extractRulesFromTree = (node, currentConditions = []) => {
  if (node.type === 'leaf') return [{ conditions: currentConditions, decision: node.value, rowSupport: node.count }];
  let rules = [];
  Object.keys(node.branches).forEach(val => {
    const newConditions = [...currentConditions, { attribute: node.attribute, value: val }];
    rules = [...rules, ...extractRulesFromTree(node.branches[val], newConditions)];
  });
  return rules;
};

// --- LOGIKA MOSHKOVA ---
const isSubsetConditions = (innerRule, candidateRule) => {
    return innerRule.conditions.every(c1 => 
        candidateRule.conditions.some(c2 => c2.attribute === c1.attribute && String(c2.value) === String(c1.value))
    );
};

// Zwraca listę ID drzew
const checkTreeSupportDetailed = (candidateRule, forestStructure) => {
    const supportingTrees = [];
    forestStructure.forEach((treeRules, index) => {
        const isTrue = treeRules.some(innerRule => 
            String(innerRule.decision) === String(candidateRule.decision) && 
            isSubsetConditions(innerRule, candidateRule)
        );
        if (isTrue) supportingTrees.push(`tree${index + 1}`);
    });
    return supportingTrees;
};

const ruleMatchesRow = (rule, row) => {
  return rule.conditions.every(cond => String(row[cond.attribute]) === String(cond.value));
};

// --- STATYSTYKI ---
// Avg1 = na regułę (Suma / Liczba Reguł)
// Avg2 = na wiersz (Suma / Liczba Wierszy w Train)
const calculateDetailedStats = (values, rowsCount) => {
    if (values.length === 0) return { min: 0, max: 0, avg1: 0, avg2: 0 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg1 = (sum / values.length).toFixed(4); 
    const avg2 = (sum / rowsCount).toFixed(4);     
    return { min, max, avg1, avg2 };
};

const formatRuleString = (rule) => {
    const conditionsStr = rule.conditions.map(c => `${c.attribute}:${c.value}`).join(" ");
    return `${conditionsStr} d:${rule.decision}`;
};

// --- KOMPONENT GŁÓWNY ---

export default function DecisionTableApp() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const styles = getStyles(isDarkMode);

  // Dane
  const [fileLogs, setFileLogs] = useState("Krok 1: Wczytaj plik CSV.\n");
  const [processLogs, setProcessLogs] = useState("");
  const [allData, setAllData] = useState([]); 
  const [columns, setColumns] = useState([]);
  const [selectedTarget, setSelectedTarget] = useState("");
  
  // Podział
  const [splitRatio, setSplitRatio] = useState(70);
  const [trainData, setTrainData] = useState([]);
  const [testData, setTestData] = useState([]);
  const [trainMode, setTrainMode] = useState(null);

  const [forestStructure, setForestStructure] = useState([]); 
  const [treeStatsTable, setTreeStatsTable] = useState([]);
  const [algorithmAResults, setAlgorithmAResults] = useState([]);

  const fileInputRef = useRef(null);
  const logFile = (text) => setFileLogs((prev) => prev + text + "\n");
  const logProcess = (text) => setProcessLogs((prev) => prev + text + "\n");
  const refreshPage = () => window.location.reload();

  // 1. Wczytywanie i Spójność
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length === 0) throw new Error("Pusty plik");
        const headers = lines[0].split(',').map(h => h.trim());
        const parsed = lines.slice(1).map((l, i) => {
          const vals = l.split(',').map(v => v.trim());
          const row = { _id: i };
          headers.forEach((h, idx) => row[h] = vals[idx]);
          return row;
        });
        
        setAllData(parsed);
        setColumns(headers);
        const targetAttr = headers[headers.length - 1];
        setSelectedTarget(targetAttr);
        
        setForestStructure([]); setAlgorithmAResults([]); setTreeStatsTable([]);
        setTrainData([]); setTestData([]);
        setFileLogs(""); setProcessLogs("");
        
        logFile(`📂 Wczytano plik: ${file.name}`);
        logFile(`\n📊 Statystyki Podstawowe:`);
        logFile(`   Liczba wierszy: ${parsed.length}`);
        logFile(`   Liczba kolumn: ${headers.length}`);
        logFile(`   Klasa decyzyjna: ${targetAttr}`);

        checkConsistency(parsed, headers[headers.length - 1], headers);

      } catch (err) { setFileLogs(`❌ Błąd: ${err.message}`); }
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

  // 2. Podział i Budowa Lasu (S)
  const performTrainAndBuildS = () => {
      if (allData.length === 0) return;
      
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

      setTrainData(train);
      setTestData(test);

      const counts = {}; let mode = null; let maxC = 0;
      train.forEach(r => {
          const d = r[selectedTarget];
          counts[d] = (counts[d]||0)+1;
          if(counts[d] > maxC) { maxC = counts[d]; mode = d; }
      });
      setTrainMode(mode);

      logProcess(`\n✂️ Podział Stratyfikowany (${splitRatio}/${100-splitRatio}):`);
      logProcess(`   Train: ${train.length}, Test: ${test.length}`);
      logProcess(`   Fallback (Moda Train): ${mode}`);

      const features = columns.filter(c => c !== selectedTarget && c !== '_id');
      const FOREST_SIZE = 10; 
      const forestStruct = [];
      const stats = [];

      logProcess(`\n🌲 Konstrukcja zbioru S (${FOREST_SIZE} drzew) na danych treningowych...`);
      
      for(let i=0; i<FOREST_SIZE; i++) {
          const sample = [];
          for(let j=0; j<train.length; j++){
              sample.push(train[Math.floor(Math.random() * train.length)]);
          }
          const tree = buildTree(sample, features, selectedTarget);
          const innerRules = extractRulesFromTree(tree);
          
          const lengths = innerRules.map(r => r.conditions.length);
          const supports = innerRules.map(r => r.rowSupport);

          stats.push({
              id: i + 1,
              count: innerRules.length,
              len: calculateDetailedStats(lengths, train.length),
              sup: calculateDetailedStats(supports, train.length)
          });

          forestStruct.push(innerRules);
      }
      
      setForestStructure(forestStruct);
      setTreeStatsTable(stats);
      logProcess(`   Las zbudowany. Uruchom Algorytm A, aby zobaczyć reguły.`);
  };

  const runAlgorithmA = () => {
      if (forestStructure.length === 0) return logProcess("⚠️ Najpierw zbuduj zbiór S (Krok 2).");
      
      logProcess(`\n🔍 Algorytm A: Obliczanie wsparcia dla wszystkich reguł...`);
      
      const allInnerRules = forestStructure.flat();
      const uniqueInnerRules = [];
      const seen = new Set();
      
      allInnerRules.forEach(r => {
          const sorted = [...r.conditions].sort((a,b) => a.attribute.localeCompare(b.attribute));
          const key = sorted.map(c => `${c.attribute}:${c.value}`).join("&") + "=>" + r.decision;
          if(!seen.has(key)) {
              seen.add(key);
              uniqueInnerRules.push(r);
          }
      });

      const globalRulesWithSupport = uniqueInnerRules.map(rule => {
          const supportedTrees = checkTreeSupportDetailed(rule, forestStructure);
          return { ...rule, supportCount: supportedTrees.length, supportedTrees };
      });

      // Sortuj malejąco po wsparciu drzew
      const sortedRules = globalRulesWithSupport.sort((a,b) => b.supportCount - a.supportCount);
      setAlgorithmAResults(sortedRules);
      
      logProcess(`   Obliczenia zakończone. Wygenerowano ${sortedRules.length} unikalnych reguł.`);
  };

  const evaluateModel = () => {
      if (algorithmAResults.length === 0 || testData.length === 0) return logProcess("⚠️ Brak modelu lub danych testowych.");

      logProcess(`\n🎯 Ewaluacja (na zbiorze testowym)...`);
      
      let correct = 0;
      const classes = [...new Set(allData.map(r => r[selectedTarget]))];
      const matrix = {};
      classes.forEach(c => matrix[c] = { tp: 0, fp: 0, fn: 0 });

      // Używamy reguł z algorytmu A
      const predictionRules = algorithmAResults; 

      testData.forEach(row => {
          const actual = String(row[selectedTarget]);
          const matchingRules = predictionRules.filter(r => ruleMatchesRow(r, row));
          
          let predicted = null;
          if (matchingRules.length > 0) {
              matchingRules.sort((a,b) => b.supportCount - a.supportCount);
              predicted = String(matchingRules[0].decision);
          } else {
              predicted = String(trainMode);
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

      const acc = (correct / testData.length) * 100;
      const wrong = testData.length - correct;

      logProcess(`--- Wyniki Ewaluacji ---`);
      logProcess(`Dobrze: ${correct}, Źle: ${wrong}`);
      logProcess(`Accuracy: ${acc.toFixed(2)}%`);
      logProcess(`Macro F1: ${macroF1.toFixed(4)}`);
  };

  // --- STATYSTYKI DRZEW (TABELA) ---
  const StatsTable = ({ stats }) => (
      <div style={{marginTop: '20px', overflowX: 'auto'}}>
          <div style={styles.statTitle}>Statystyki dla Każdego Drzewa</div>
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

  // --- ANALIZA POZIOMÓW WSPARCIA ---
  const SupportLevelAnalysis = ({ rules, forestSize, trainRows }) => {
      // Grupujemy reguły według wsparcia (10...1)
      const groups = [];
      for(let i=forestSize; i>=1; i--) {
          const rulesAtLevel = rules.filter(r => r.supportCount === i);
          if (rulesAtLevel.length > 0) {
              const lengths = rulesAtLevel.map(r => r.conditions.length);
              const stats = calculateDetailedStats(lengths, trainRows);
              groups.push({ level: i, rules: rulesAtLevel, stats });
          }
      }

      return (
          <div style={{marginTop: '30px'}}>
              <div style={styles.statTitle}>Analiza Reguł wg Poziomu Wsparcia (Tree Support)</div>
              {groups.map((group) => (
                  <div key={group.level} style={{marginBottom: '20px', border: `1px solid ${styles.colors.border}`, padding: '10px', borderRadius: '6px', backgroundColor: styles.colors.bgCard}}>
                      <div style={{fontWeight: 'bold', color: styles.colors.accent, marginBottom: '5px'}}>
                          Poziom Wsparcia: {group.level} / {forestSize} (Liczba reguł: {group.rules.length})
                      </div>
                      
                      {/* Statystyki dla tej grupy reguł */}
                      <div style={{fontSize: '11px', marginBottom: '10px', color: styles.colors.textMuted}}>
                          <strong>Długość (L) reguł w tej grupie:</strong> Min={group.stats.min}, Avg1(na regułę)={group.stats.avg1}, Avg2(na wiersz)={group.stats.avg2}, Max={group.stats.max}
                      </div>

                      {/* Top 5 dla tej grupy */}
                      <table style={{...styles.table, width: '100%'}}>
                          <thead>
                              <tr>
                                  <th style={{...styles.th, width: '30px'}}>#</th>
                                  <th style={styles.th}>Top 5 Rules (z grupy support={group.level})</th>
                                  <th style={styles.th}>*tree</th>
                              </tr>
                          </thead>
                          <tbody>
                              {group.rules.slice(0, 5).map((r, i) => (
                                  <tr key={i}>
                                      <td style={styles.td}>{i+1}</td>
                                      <td style={{...styles.td, fontFamily: 'monospace', fontSize: '11px'}}>
                                          {formatRuleString(r)}
                                      </td>
                                      <td style={{...styles.td, fontSize: '10px'}}>{'{' + r.supportedTrees.join(',') + '}'}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              ))}
          </div>
      );
  };

  // --- PODSUMOWANIE CAŁOŚCIOWE ---
  const GlobalSummary = ({ rules, trainRows }) => {
      const top5 = rules.slice(0, 5);
      // Globalne statystyki dla WSZYSTKICH unikalnych reguł
      const lengths = rules.map(r => r.conditions.length);
      const globalStats = calculateDetailedStats(lengths, trainRows);

      return (
          <div style={{marginTop: '30px', borderTop: '2px solid #6366f1', paddingTop: '20px'}}>
              <div style={{...styles.statTitle, fontSize: '16px'}}>PODSUMOWANIE CAŁOŚCIOWE (GLOBALNE)</div>
              
              <div style={{marginBottom: '15px'}}>
                  <div style={{fontWeight: 'bold', marginBottom: '5px'}}>Statystyki dla wszystkich {rules.length} unikalnych reguł:</div>
                  <div style={{fontSize: '12px'}}>
                      Długość (L): Min={globalStats.min}, Avg1={globalStats.avg1}, Avg2={globalStats.avg2}, Max={globalStats.max}
                  </div>
              </div>

              <div style={{fontWeight: 'bold', marginBottom: '5px', fontSize: '13px'}}>Global Top 5 Rules (Bez podziału na poziomy):</div>
              <table style={styles.table}>
                  <thead>
                      <tr>
                          <th style={styles.th}>#</th>
                          <th style={styles.th}>Rule</th>
                          <th style={styles.th}>Support</th>
                      </tr>
                  </thead>
                  <tbody>
                      {top5.map((r, i) => (
                          <tr key={i}>
                              <td style={styles.td}>{i+1}</td>
                              <td style={{...styles.td, fontFamily: 'monospace', fontSize: '12px', color: styles.colors.success}}>
                                  {formatRuleString(r)}
                              </td>
                              <td style={{...styles.td, fontWeight: 'bold'}}>{r.supportCount}/10</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      );
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.titleBox}>
          <h1 style={styles.title}>Moshkov Detailed</h1>
          <div style={styles.subtitle}>Analysis by Support</div>
        </div>

        <div style={styles.sectionLabel}>1. Dane</div>
        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
        <button onClick={() => fileInputRef.current?.click()} style={styles.button}><span style={styles.icon}>📂</span>Wczytaj CSV</button>

        <div style={styles.sectionLabel}>2. Trenowanie i S</div>
        <div style={styles.sliderContainer}>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px', marginBottom:'4px'}}>
                <span>Train: {splitRatio}%</span><span>Test: {100-splitRatio}%</span>
            </div>
            <input type="range" min="10" max="90" value={splitRatio} onChange={(e)=>setSplitRatio(parseInt(e.target.value))} style={styles.slider} />
        </div>
        <button onClick={performTrainAndBuildS} disabled={!allData.length} style={{...styles.button, ...(allData.length ? {} : styles.buttonDisabled)}}><span style={styles.icon}>🌲</span>Generuj Las</button>

        <div style={styles.sectionLabel}>3. Analiza Reguł</div>
        <button onClick={runAlgorithmA} disabled={!forestStructure.length} style={{...styles.button, ...(forestStructure.length ? {} : styles.buttonDisabled)}}><span style={styles.icon}>🔍</span>Algorytm A</button>

        <div style={styles.sectionLabel}>4. Testowanie</div>
        <button onClick={evaluateModel} disabled={!algorithmAResults.length} style={{...styles.button, ...(algorithmAResults.length ? {} : styles.buttonDisabled)}}><span style={styles.icon}>🎯</span>Ewaluacja</button>
      </div>

      <div style={styles.main}>
        <div style={styles.header}>
            <h2 style={{ fontSize: '15px', fontWeight: 'bold' }}>Raporty Szczegółowe</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setIsDarkMode(!isDarkMode)} style={styles.toggleBtn}>{isDarkMode ? '☀️' : '🌙'}</button>
              <button onClick={refreshPage} style={styles.clearBtn}>Reset</button>
            </div>
        </div>
        <div style={styles.logArea}>
            <div style={styles.logContent}>
                <div style={{marginBottom: '20px', whiteSpace: 'pre-wrap'}}>{fileLogs}</div>
                
                {/* 1. Statystyki Drzew (zostawione) */}
                {treeStatsTable.length > 0 && <StatsTable stats={treeStatsTable} />}
                
                {/* 2. Analiza wg Poziomów Wsparcia */}
                {algorithmAResults.length > 0 && (
                    <SupportLevelAnalysis rules={algorithmAResults} forestSize={forestStructure.length} trainRows={trainData.length} />
                )}
                
                {/* 3. Podsumowanie Globalne */}
                {algorithmAResults.length > 0 && (
                    <GlobalSummary rules={algorithmAResults} trainRows={trainData.length} />
                )}

                <div style={{marginTop: '30px', whiteSpace: 'pre-wrap', borderTop: processLogs ? '1px solid #4b5563' : 'none', paddingTop: '20px'}}>{processLogs}</div>
            </div>
        </div>
      </div>
    </div>
  );
}