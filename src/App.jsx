import React, { useState, useRef } from 'react';

const getStyles = (isDark) => {
  const colors = isDark ? {
    bgMain: '#111827', bgSidebar: '#1f2937', bgHeader: '#1f2937', bgCard: '#374151',
    textMain: '#f9fafb', textMuted: '#9ca3af', border: '#4b5563',
    buttonBg: '#374151', buttonHover: '#4b5563', buttonText: '#f3f4f6',
    logBg: '#0f172a', logText: '#e2e8f0', accent: '#818cf8',
    tableHeader: '#374151', tableBorder: '#4b5563',
    success: '#10b981', warning: '#f59e0b', error: '#ef4444',
    cardBg: '#1e293b'
  } : {
    bgMain: '#f9fafb', bgSidebar: '#f3f4f6', bgHeader: 'white', bgCard: 'white',
    textMain: '#1f2937', textMuted: '#6b7280', border: '#e5e7eb',
    buttonBg: 'white', buttonHover: '#eff6ff', buttonText: '#374151',
    logBg: '#f9fafb', logText: '#374151', accent: '#6366f1',
    tableHeader: '#f3f4f6', tableBorder: '#e5e7eb',
    success: '#059669', warning: '#d97706', error: '#dc2626',
    cardBg: '#ffffff'
  };

  return {
    container: { display: 'flex', height: '100vh', fontFamily: 'Segoe UI, system-ui, sans-serif', backgroundColor: colors.bgMain, overflow: 'hidden', color: colors.textMain },
    sidebar: { width: '380px', backgroundColor: colors.bgSidebar, borderRight: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', padding: '20px', boxSizing: 'border-box', overflowY: 'auto', boxShadow: '2px 0 10px rgba(0,0,0,0.05)', zIndex: 10 },
    main: { flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: colors.bgMain, overflow: 'hidden' },
    header: { height: '70px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', backgroundColor: colors.bgHeader },
    title: { fontSize: '20px', fontWeight: '800', color: colors.textMain, margin: 0, letterSpacing: '-0.5px' },
    subtitle: { fontSize: '12px', color: colors.accent, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px', fontWeight: '600' },
    sectionLabel: { fontSize: '12px', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginTop: '24px', marginBottom: '12px', paddingLeft: '4px', letterSpacing: '0.5px' },
    button: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 16px', marginBottom: '12px', backgroundColor: colors.buttonBg, border: `1px solid ${colors.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: colors.buttonText, transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    buttonDisabled: { opacity: 0.6, cursor: 'not-allowed', filter: 'grayscale(100%)', transform: 'none', boxShadow: 'none' },
    icon: { marginRight: '10px', fontSize: '16px' },
    logArea: { flex: 1, padding: '24px', overflowY: 'auto', backgroundColor: colors.bgMain },
    logContent: { width: '100%', backgroundColor: colors.logBg, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '20px', fontFamily: 'Consolas, monospace', fontSize: '12px', whiteSpace: 'pre-wrap', color: colors.logText, boxSizing: 'border-box', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '0', color: colors.textMain, backgroundColor: colors.cardBg, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    th: { textAlign: 'left', padding: '12px 16px', borderBottom: `2px solid ${colors.tableBorder}`, backgroundColor: colors.tableHeader, fontWeight: '700', color: colors.textMain },
    td: { padding: '10px 16px', borderBottom: `1px solid ${colors.tableBorder}`, verticalAlign: 'top' },
    statTitle: { fontSize: '16px', fontWeight: '800', marginTop: '24px', marginBottom: '16px', color: colors.textMain },
    clearBtn: { padding: '6px 16px', fontSize: '13px', fontWeight: '600', color: colors.error, backgroundColor: 'transparent', border: `1px solid ${colors.error}`, borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' },
    toggleBtn: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '8px', borderRadius: '50%', color: colors.textMain, transition: 'transform 0.2s' },
    sliderContainer: { marginBottom: '16px', padding: '0 4px' },
    slider: { width: '100%', cursor: 'pointer', accentColor: colors.accent, height: '6px', borderRadius: '4px' },
    fileTag: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', backgroundColor: colors.bgCard, border: `1px solid ${colors.accent}`, borderRadius: '6px', fontSize: '12px', color: colors.accent, fontWeight: '600', marginBottom: '12px' },
    select: { width: '100%', padding: '10px', borderRadius: '6px', border: `1px solid ${colors.border}`, backgroundColor: colors.bgCard, color: colors.textMain, marginBottom: '12px', fontSize: '13px' },
    divider: { textAlign: 'center', fontSize: '11px', color: colors.textMuted, margin: '10px 0', textTransform: 'uppercase', fontWeight: 'bold' },
    colors
  };
};

const calculateDetailedStats = (values, rowsCount) => {
    if (values.length === 0) return { min: 0, max: 0, avg1: 0, avg2: 0 };
    return { 
        min: Math.min(...values), 
        max: Math.max(...values), 
        avg1: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2), 
        avg2: (values.reduce((a, b) => a + b, 0) / rowsCount).toFixed(2) 
    };
};

const formatRuleString = (rule) => {
    const conditionsStr = rule.conditions.map(c => `<span style="color: #6366f1; font-weight: bold">${c.attribute}</span> ${c.value}`).join(" <span style='color: #9ca3af'>ORAZ</span> ");
    return `JEŚLI ${conditionsStr} TO <span style="color: #10b981; font-weight: bold">${rule.decision}</span>`;
};

export default function DecisionTableApp() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const styles = getStyles(isDarkMode);

const PREDEFINED_DATASETS = [
      "", 
      "modified_balance-scale.csv",
      "modified_breast-cancer.csv",
      "modified_cars.csv",
      "modified_house-votes.csv",
      "modified_lymphography.csv",
      "modified_mushroom.csv",
      "modified_nursery.csv",
      "modified_tic-tac-toe.csv"
  ];

  const [fileLogs, setFileLogs] = useState("Krok 1: Wybierz gotowy zbiór danych lub wgraj własny plik CSV.\n");
  const [processLogs, setProcessLogs] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [splitRatio, setSplitRatio] = useState(70);
  const [isLoading, setIsLoading] = useState(false);

  const [treeStatsTable, setTreeStatsTable] = useState([]);
  const [algorithmAResults, setAlgorithmAResults] = useState([]);
  const [forestSize, setForestSize] = useState(10);
  const [trainRows, setTrainRows] = useState(0);
  const [evalStats, setEvalStats] = useState(null);

  const fileInputRef = useRef(null);
  const logFile = (text) => setFileLogs((prev) => prev + text + "\n");
  const logProcess = (text) => setProcessLogs((prev) => prev + text + "\n");
  const refreshPage = () => window.location.reload();

  const processSelectedFile = (file) => {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').map(l => l.trim()).filter(l => l);
          if (lines.length === 0) throw new Error("Pusty plik");
          const headers = lines[0].split(',').map(h => h.trim());
          setSelectedTarget(headers[headers.length - 1]);

          setTreeStatsTable([]); setAlgorithmAResults([]); setProcessLogs(""); setEvalStats(null);
          
          setFileLogs(`📂 Aktywny zbiór danych: ${file.name}\n   Wykryta kolumna decyzyjna: ${headers[headers.length - 1]}\n`);
        } catch (err) { setFileLogs(`❌ Błąd odczytu: ${err.message}\n`); }
      };
      reader.readAsText(file);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
        document.getElementById("datasetSelect").value = ""; 
        processSelectedFile(file);
    }
  };

  const handleDatasetSelect = async (event) => {
      const filename = event.target.value;
      if (!filename) return;
      
      setFileLogs(`Pobieranie zbioru ${filename}...\n`);
      try {
          const response = await fetch(`/data/${filename}`);
          if (!response.ok) throw new Error(`Nie znaleziono pliku w /public/data/${filename}`);
          
          const text = await response.text();
          const file = new File([text], filename, { type: "text/csv" });
          processSelectedFile(file);
      } catch (err) {
          setFileLogs(`❌ Błąd pobierania: ${err.message}\nUpewnij się, że plik jest w folderze public/data/\n`);
      }
  };

  const runPythonBackend = async () => {
      if (!selectedFile) return;
      setIsLoading(true);
      logProcess("\n🚀 Uruchamiam silnik Python (Scikit-Learn)...");

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("splitRatio", splitRatio);
      formData.append("targetAttr", selectedTarget);

      try {
          const response = await fetch("http://localhost:8000/process", { method: "POST", body: formData });
          if (!response.ok) throw new Error(`Błąd serwera: ${response.statusText}`);
          const data = await response.json();

          setTreeStatsTable(data.treeStatsTable);
          setAlgorithmAResults(data.algorithmAResults);
          setForestSize(data.forestSize);
          setTrainRows(data.trainRows);
          setEvalStats(data.evalStats);

          data.logs.forEach(msg => logProcess(msg));
          logProcess(`\n✅ Przetwarzanie zakończone sukcesem.`);
      } catch (error) {
          logProcess(`❌ Błąd: ${error.message} (Upewnij się, że serwer FastAPI działa)`);
      } finally {
          setIsLoading(false);
      }
  };

  const DashboardMetrics = ({ stats, totalRules, optimizedRules }) => (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: styles.colors.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${styles.colors.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '13px', color: styles.colors.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Trafność Modelu (Acc)</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: styles.colors.success, marginTop: '8px' }}>{stats.accuracy.toFixed(2)}%</div>
          </div>
          <div style={{ backgroundColor: styles.colors.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${styles.colors.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '13px', color: styles.colors.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Jakość (Macro F1)</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: styles.colors.accent, marginTop: '8px' }}>{stats.macroF1.toFixed(4)}</div>
          </div>
          <div style={{ backgroundColor: styles.colors.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${styles.colors.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '13px', color: styles.colors.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Wszystkie Reguły</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: styles.colors.textMain, marginTop: '8px' }}>{totalRules}</div>
          </div>
          <div style={{ backgroundColor: styles.colors.cardBg, padding: '20px', borderRadius: '12px', border: `1px solid ${styles.colors.border}`, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '13px', color: styles.colors.textMuted, fontWeight: '700', textTransform: 'uppercase' }}>Silne Reguły ({'>'}1)</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: styles.colors.warning, marginTop: '8px' }}>{optimizedRules}</div>
          </div>
      </div>
  );

  const SupportLevelAnalysis = ({ rules, forestSize, trainRows }) => {
      const groups = [];
      for(let i=forestSize; i>=1; i--) {
          const rulesAtLevel = rules.filter(r => r.supportCount === i);
          if (rulesAtLevel.length > 0) {
              const lengths = rulesAtLevel.map(r => r.conditions.length);
              groups.push({ level: i, rules: rulesAtLevel, stats: calculateDetailedStats(lengths, trainRows) });
          }
      }
      const maxRules = Math.max(...groups.map(g => g.rules.length));

      return (
          <div style={{marginTop: '30px'}}>
              <div style={styles.statTitle}>Wykryte Wzorce Globalne (Analiza Współczynnika Wsparcia)</div>
              {groups.map((group) => (
                  <div key={group.level} style={{marginBottom: '20px', border: `1px solid ${styles.colors.border}`, padding: '20px', borderRadius: '10px', backgroundColor: styles.colors.cardBg, boxShadow: '0 2px 5px rgba(0,0,0,0.02)'}}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                          <div style={{fontWeight: '800', color: styles.colors.textMain, fontSize: '16px'}}>
                              Wsparcie: {group.level} / {forestSize} drzew 
                              <span style={{ fontSize: '13px', color: styles.colors.textMuted, fontWeight: 'normal', marginLeft: '10px' }}>({group.rules.length} reguł)</span>
                          </div>
                          
                          <div style={{ width: '150px', height: '10px', backgroundColor: styles.colors.bgMain, borderRadius: '5px', overflow: 'hidden' }}>
                              <div style={{ width: `${(group.rules.length / maxRules) * 100}%`, height: '100%', backgroundColor: group.level === 1 ? styles.colors.error : styles.colors.accent, transition: 'width 0.5s ease-out' }}></div>
                          </div>
                      </div>
                      
                      <table style={{...styles.table, width: '100%', boxShadow: 'none', border: `1px solid ${styles.colors.border}`}}>
                          <thead>
                              <tr>
                                  <th style={{...styles.th, width: '40px', backgroundColor: styles.colors.bgMain}}>#</th>
                                  <th style={{...styles.th, backgroundColor: styles.colors.bgMain}}>Najlepsze reguły dla tego poziomu</th>
                              </tr>
                          </thead>
                          <tbody>
                              {group.rules.slice(0, 5).map((r, i) => (
                                  <tr key={i}>
                                      <td style={{...styles.td, fontWeight: 'bold', color: styles.colors.textMuted}}>{i+1}</td>
                                      <td style={{...styles.td, fontFamily: 'monospace', fontSize: '12.5px', lineHeight: '1.6'}} dangerouslySetInnerHTML={{ __html: formatRuleString(r) }}></td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              ))}
          </div>
      );
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={styles.title}>Global Rules AI</h1>
          <div style={styles.subtitle}>Optymalizacja Reguł Decyzyjnych</div>
        </div>

        <div style={styles.sectionLabel}>1. Źródło Danych</div>
        
        {/* NOWY ELEMENT: Wybór z gotowej listy */}
        <select id="datasetSelect" onChange={handleDatasetSelect} style={styles.select}>
            <option value="" disabled selected>-- Wybierz gotowy zbiór --</option>
            {PREDEFINED_DATASETS.filter(d => d).map(dataset => (
                <option key={dataset} value={dataset}>{dataset}</option>
            ))}
        </select>
        
        <div style={styles.divider}>lub</div>

        {/* Stary przycisk wgrania własnego pliku */}
        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
        <button onClick={() => fileInputRef.current?.click()} style={{...styles.button, backgroundColor: styles.colors.cardBg, color: styles.colors.textMain}}>
            <span style={styles.icon}>📂</span> Wgraj własny plik CSV
        </button>

        {selectedFile && (
            <div style={{...styles.fileTag, marginTop: '12px'}}>📄 Wybrano: {selectedFile.name}</div>
        )}

        <div style={styles.sectionLabel}>2. Parametry Eksperymentu</div>
        <div style={styles.sliderContainer}>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', fontWeight: '600', marginBottom:'8px'}}>
                <span style={{ color: styles.colors.accent }}>Trening: {splitRatio}%</span>
                <span>Test: {100-splitRatio}%</span>
            </div>
            <input type="range" min="10" max="90" value={splitRatio} onChange={(e)=>setSplitRatio(parseInt(e.target.value))} style={styles.slider} />
        </div>
        
        <div style={styles.sectionLabel}>3. Optymalizacja (Moshkov)</div>
        <button 
            onClick={runPythonBackend} 
            disabled={!selectedFile || isLoading} 
            style={{
                ...styles.button, 
                ...((!selectedFile || isLoading) ? styles.buttonDisabled : {backgroundColor: styles.colors.accent, color: 'white', border: 'none'}),
                padding: '16px'
            }}>
            <span style={styles.icon}>{isLoading ? '⏳' : '🚀'}</span>
            {isLoading ? 'Python przetwarza dane...' : 'Rozpocznij Analizę'}
        </button>
      </div>

      <div style={styles.main}>
        <div style={styles.header}>
            <h2 style={{ fontSize: '16px', fontWeight: '700' }}>Panel Analityczny</h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setIsDarkMode(!isDarkMode)} style={styles.toggleBtn}>{isDarkMode ? '☀️' : '🌙'}</button>
              <button onClick={refreshPage} style={styles.clearBtn}>Zresetuj</button>
            </div>
        </div>
        <div style={styles.logArea}>
            
            {evalStats && (
                <DashboardMetrics 
                    stats={evalStats} 
                    totalRules={algorithmAResults.length} 
                    optimizedRules={algorithmAResults.filter(r => r.supportCount > 1).length} 
                />
            )}

            <div style={styles.logContent}>
                <div style={{marginBottom: algorithmAResults.length > 0 ? '30px' : '0', whiteSpace: 'pre-wrap'}}>{fileLogs}</div>
                {processLogs && <div style={{whiteSpace: 'pre-wrap', color: styles.colors.success}}>{processLogs}</div>}
            </div>

            {algorithmAResults.length > 0 && <SupportLevelAnalysis rules={algorithmAResults} forestSize={forestSize} trainRows={trainRows} />}
            
        </div>
      </div>
    </div>
  );
}