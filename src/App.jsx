import React, { useState, useRef, useEffect } from 'react';

const colors = {
  bg: '#09090b', card: '#18181b', border: '#27272a', text: '#fafafa',
  muted: '#a1a1aa', accent: '#6366f1', success: '#10b981', danger: '#ef4444', secondary: '#27272a'
};

const RulePill = ({ attr, op, val }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#2d2d30', border: `1px solid ${colors.border}`, borderRadius: '6px', padding: '2px 8px', margin: '2px', fontSize: '12px' }}>
    <span style={{ color: colors.accent, marginRight: '4px' }}>{attr}</span>
    <span style={{ color: colors.muted, marginRight: '4px' }}>{op}</span>
    <span style={{ color: colors.text }}>{val}</span>
  </span>
);

const MetricCard = ({ title, forestVal, customVal, unit = "%", lowerIsBetter = false }) => {
  const diff = (customVal - forestVal).toFixed(2);
  const isGood = lowerIsBetter ? customVal <= forestVal : customVal >= forestVal;
  const diffSign = diff > 0 ? '+' : '';
  
  return (
    <div style={{ backgroundColor: colors.card, padding: '20px', borderRadius: '16px', border: `1px solid ${colors.border}` }}>
      <div style={{ fontSize: '11px', fontWeight: '800', color: colors.muted, marginBottom: '12px' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'end', gap: '12px', marginBottom: '12px' }}>
        <div style={{ fontSize: '28px', fontWeight: '900', color: colors.text }}>{customVal}{unit}</div>
        <div style={{ fontSize: '14px', fontWeight: '700', color: isGood ? colors.success : colors.danger, paddingBottom: '4px' }}>
          {diffSign}{diff}{unit}
        </div>
      </div>
      <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: colors.muted }}>
        <span>Baza (Las):</span>
        <span>{forestVal}{unit}</span>
      </div>
    </div>
  );
};

export default function MoshkovFinalDashboard() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  const [splitRatio, setSplitRatio] = useState(70);
  const [nTrees, setNTrees] = useState(30);
  const [maxDepth, setMaxDepth] = useState(10);
  
  const [timer, setTimer] = useState("0.00");
  const [expandedGroups, setExpandedGroups] = useState({});
  const timerRef = useRef(null);

  // 1. Zabezpieczenie przed wyciekiem pamięci
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const toggleGroup = (sup) => setExpandedGroups(p => ({ ...p, [sup]: !p[sup] }));

  // 2. Funkcja eksportu przeniesiona do wnętrza komponentu
  const exportResults = () => {
    if (!results) return;
    const report = {
      dataset: selectedTarget,
      parameters: { splitRatio, nTrees, maxDepth },
      metrics: results.evalStats,
      ruleCount: results.algorithmAResults.length,
      optimizedRuleCount: results.algorithmAResults.filter(r => r.supportCount > 1).length
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raport_moshkov_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runAnalysis = async () => {
    if (!selectedFile) return;
    setResults(null);
    setTimer("0.00");
    const start = Date.now();
    timerRef.current = setInterval(() => setTimer(((Date.now() - start) / 1000).toFixed(2)), 100);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("splitRatio", splitRatio);
    formData.append("targetAttr", selectedTarget);
    formData.append("nTrees", nTrees);
    formData.append("maxDepth", maxDepth);

    try {
      const response = await fetch("http://localhost:8000/process", { method: "POST", body: formData });
      const data = await response.json();
      setResults(data);
    } catch (e) { alert("Błąd serwera"); }
    finally { setIsLoading(false); clearInterval(timerRef.current); }
  };

  return (
    <div style={{ backgroundColor: colors.bg, color: colors.text, minHeight: '100vh', fontFamily: 'Inter, sans-serif', display: 'flex' }}>
      
      <aside style={{ width: '320px', borderRight: `1px solid ${colors.border}`, padding: '24px', backgroundColor: colors.card, overflowY: 'auto' }}>
        <div style={{ marginBottom: '30px' }}>
          <div style={{ fontSize: '22px', fontWeight: '900', color: colors.accent }}>MOSHKOV.AI</div>
          <div style={{ fontSize: '10px', color: colors.muted }}>LABORATORIUM BADAWCZE</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted }}>ZBIÓR DANYCH</label>
            <select onChange={async (e) => {
              const res = await fetch(`/data/${e.target.value}`);
              const text = await res.text();
              setSelectedFile(new File([text], e.target.value));
              setSelectedTarget(text.split('\n')[0].split(',').pop().trim());
            }} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text }}>
              <option value="">Wybierz plik...</option>
              {["modified_balance-scale.csv", "modified_breast-cancer.csv", "modified_cars.csv", "modified_house-votes.csv", "modified_lymphography.csv", "modified_mushroom.csv","modified_nursery.csv","modified_tic-tac-toe.csv"].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted }}>LICZBA DRZEW: {nTrees}</label>
            <input type="range" min="10" max="100" step="10" value={nTrees} onChange={e => setNTrees(e.target.value)} style={{ width: '100%', accentColor: colors.accent }} />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted }}>GŁĘBOKOŚĆ DRZEW: {maxDepth}</label>
            <input type="range" min="3" max="20" value={maxDepth} onChange={e => setMaxDepth(e.target.value)} style={{ width: '100%', accentColor: colors.accent }} />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted }}>SPLIT RATIO: {splitRatio}%</label>
            <input type="range" min="50" max="90" value={splitRatio} onChange={e => setSplitRatio(e.target.value)} style={{ width: '100%', accentColor: colors.accent }} />
          </div>

          <button onClick={runAnalysis} disabled={isLoading || !selectedFile} style={{ width: '100%', padding: '16px', borderRadius: '12px', backgroundColor: colors.accent, color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer' }}>
            {isLoading ? `LICZENIE (${timer}s)` : 'URUCHOM ANALIZĘ'}
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        {results ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div style={{ backgroundColor: colors.card, padding: '24px', borderRadius: '20px', border: `1px solid ${colors.border}` }}>
                <div style={{ color: colors.muted, fontSize: '11px', fontWeight: '800', marginBottom: '10px' }}>MODEL LOKALNY (LAS)</div>
                <div style={{ fontSize: '42px', fontWeight: '900' }}>{results.evalStats.forestAccuracy}%</div>
                <div style={{ color: colors.muted, fontSize: '12px', marginTop: '10px' }}>Liczba wszystkich wygenerowanych reguł: <b>{results.algorithmAResults.length}</b></div>
              </div>

              <div style={{ backgroundColor: colors.card, padding: '24px', borderRadius: '20px', border: `2px solid ${colors.accent}` }}>
                <div style={{ color: colors.accent, fontSize: '11px', fontWeight: '800', marginBottom: '10px' }}>MODEL GLOBALNY (ALGORYTM A)</div>
                <div style={{ fontSize: '42px', fontWeight: '900', color: colors.success }}>{results.evalStats.accuracy}%</div>
                <div style={{ color: colors.muted, fontSize: '12px', marginTop: '10px' }}>Reguły po optymalizacji (Sup {'>'} 1): <b>{results.algorithmAResults.filter(r => r.supportCount > 1).length}</b></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
              <MetricCard title="F1-SCORE (MACRO)" forestVal={results.evalStats.forestF1} customVal={results.evalStats.f1} />
              <MetricCard title="PRECYZJA (PRECISION)" forestVal={results.evalStats.forestPrecision} customVal={results.evalStats.precision} />
              <MetricCard title="CZUŁOŚĆ (RECALL)" forestVal={results.evalStats.forestRecall} customVal={results.evalStats.recall} />
              <MetricCard title="CZAS BUDOWY (OVERHEAD)" forestVal={results.evalStats.forestTime} customVal={results.evalStats.customTime} unit="s" lowerIsBetter={true} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>Szczegółowa Struktura Wsparcia</h3>
              <button 
                onClick={exportResults}
                style={{ 
                  backgroundColor: colors.secondary, color: colors.text, border: `1px solid ${colors.border}`, 
                  padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' 
                }}
              >
                📥 EKSPORTUJ RAPORT (.JSON)
              </button>
            </div>

            {Array.from({ length: results.forestSize }, (_, i) => results.forestSize - i).map(sup => {
              const group = results.algorithmAResults.filter(r => r.supportCount === sup);
              if (group.length === 0) return null;
              const isOpen = expandedGroups[sup];

              return (
                <div key={sup} style={{ marginBottom: '8px', border: `1px solid ${colors.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                  <div onClick={() => toggleGroup(sup)} style={{ padding: '12px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', backgroundColor: colors.card }}>
                    <span style={{ fontWeight: '700' }}>Poziom Wsparcia: {sup} {sup === 1 ? '(Szum Odrzucony)' : ''}</span>
                    <span style={{ color: colors.muted }}>{group.length} reguł {isOpen ? '▲' : '▼'}</span>
                  </div>
                  {isOpen && (
                    <div style={{ padding: '15px', backgroundColor: 'rgba(0,0,0,0.2)', borderTop: `1px solid ${colors.border}` }}>
                      {group.slice(0, 50).map((r, i) => (
                        <div key={i} style={{ 
                          fontSize: '12px', 
                          marginBottom: '8px',
                          // --- TUTAJ WCHODZI MAGIA TWOJEJ FLAGI ---
                          padding: r.isBestRule ? '12px' : '4px',
                          backgroundColor: r.isBestRule ? 'rgba(251, 191, 36, 0.05)' : 'transparent',
                          border: r.isBestRule ? '1px solid #fbbf24' : 'none',
                          borderRadius: '8px'
                        }}>
                          {/* --- NAGŁÓWEK DLA NAJLEPSZEJ REGUŁY --- */}
                          {r.isBestRule && (
                            <div style={{ 
                              color: '#fbbf24', 
                              fontWeight: 'bold', 
                              marginBottom: '8px', 
                              fontSize: '11px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px',
                              letterSpacing: '0.05em'
                            }}>
                              <span>👑</span> GŁÓWNY WZORZEC DECYZYJNY (NAJLEPSZA REGUŁA Z LASU)
                            </div>
                          )}
                          
                          <span style={{ color: colors.muted }}>IF</span> {r.conditions.map((c, ci) => <RulePill key={ci} attr={c.attribute} op={c.op} val={c.val} />)} 
                          <span style={{ color: colors.muted }}> THEN </span> <span style={{ color: colors.success, fontWeight: r.isBestRule ? 'bold' : 'normal' }}>{r.decision}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${colors.border}`, borderRadius: '20px', color: colors.muted }}>
            Skonfiguruj parametry i uruchom silnik.
          </div>
        )}
      </main>
    </div>
  );
}