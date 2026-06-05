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

const renderDiff = (newVal, oldVal, lowerIsBetter = false, isInt = false, percentageOnly = false) => {
  const diff = newVal - oldVal;
  if (diff === 0) return <span style={{ color: colors.muted }}>Bez zmian</span>;
  
  const isGood = lowerIsBetter ? diff < 0 : diff > 0;
  const sign = diff > 0 ? '+' : '';
  
  let displayText = "";
  if (percentageOnly && oldVal !== 0) {
    const percent = ((diff / oldVal) * 100).toFixed(1);
    displayText = `${sign}${percent}%`;
  } else {
    const formattedDiff = isInt ? diff : diff.toFixed(2);
    displayText = `${sign}${formattedDiff}`;
  }
  
  return (
    <span style={{ color: isGood ? colors.success : colors.danger, fontWeight: 'bold' }}>
      {displayText}
    </span>
  );
};

const generateRuleSentence = (conditions, decision) => {
  const translatedConditions = conditions.map(cond => {
    let textOp = "";
    switch (cond.op) {
      case "=": textOp = "wynosi"; break;
      case "<=": textOp = "nie przekracza"; break;
      case ">": textOp = "jest większe niż"; break;
      case "IN": textOp = "przyjmuje jedną z wartości"; break;
      case "∈": textOp = "mieści się w przedziale"; break;
      default: textOp = cond.op;
    }
    return `atrybut [${cond.attribute}] ${textOp} ${cond.val}`;
  });
  return `Jeśli ${translatedConditions.join(' oraz ')}, to system przewiduje klasę: "${decision}".`;
};

export default function MoshkovFinalDashboard() {
  // Nawigacja między modułem głównym a modułem badań niespójności
  const [activeTab, setActiveTab] = useState("classification"); 

  // Dynamiczne pobieranie atrybutów z pliku
  const [availableAttributes, setAvailableAttributes] = useState([]);
  const [selectedAttrToRemove, setSelectedAttrToRemove] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  // State dla nowych badań niespójności
  const [inconsistencyData, setInconsistencyData] = useState(null);
  const [isIncLoading, setIsIncLoading] = useState(false);

  const [splitRatio, setSplitRatio] = useState(70);
  const [nTrees, setNTrees] = useState(30);
  const [maxDepth, setMaxDepth] = useState(10);
  
  const [timer, setTimer] = useState("0.00");
  const [expandedGroups, setExpandedGroups] = useState({});
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const toggleGroup = (sup) => setExpandedGroups(p => ({ ...p, [sup]: !p[sup] }));

  const exportResults = () => {
    if (!results) return;
    const report = {
      dataset: selectedTarget,
      parameters: { splitRatio, nTrees, maxDepth },
      metrics: { ...results.evalStats },
      ruleCount: results.totalRulesGenerated,
      optimizedRuleCount: results.algorithmAResults.length
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
    } catch (error) { 
      console.error("Szczegóły błędu połączenia:", error);
      alert("Błąd serwera - sprawdź konsolę przeglądarki"); 
    } finally {
      setIsLoading(false); 
      clearInterval(timerRef.current); 
    }
  };

  const runInconsistencyAnalysis = async () => {
    if (!selectedFile || !selectedAttrToRemove) return;
    setInconsistencyData(null);
    setIsIncLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("targetAttr", selectedTarget);
    formData.append("attrToRemove", selectedAttrToRemove);

    try {
      const response = await fetch("http://localhost:8000/analyze-inconsistency", { method: "POST", body: formData });
      const data = await response.json();
      if (data.status === "success") {
        setInconsistencyData(data);
      }
    } catch (error) {
      console.error("Błąd analizy niespójności:", error);
      alert("Błąd połączenia z modułem analizy niespójności.");
    } finally {
      setIsIncLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: colors.bg, color: colors.text, minHeight: '100vh', fontFamily: 'Inter, sans-serif', display: 'flex' }}>
      
      <aside style={{ width: '320px', borderRight: `1px solid ${colors.border}`, padding: '24px', backgroundColor: colors.card, overflowY: 'auto' }}>
        <div style={{ marginBottom: '30px' }}>
          <div style={{ fontSize: '22px', fontWeight: '900', color: colors.accent }}>Ace Of Trees</div>
          <div style={{ fontSize: '10px', color: colors.muted }}>System, który zawsze ma asa w rękawie przeciwko czarnej skrzynce lasu losowego</div>
        </div>

        {/* PRZEŁĄCZNIK ZAKŁADEK W MENU BOCZNYM */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: `1px solid ${colors.border}`, paddingBottom: '16px' }}>
          <button onClick={() => setActiveTab("classification")} style={{ flex: 1, padding: '8px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', border: 'none', backgroundColor: activeTab === "classification" ? colors.accent : colors.secondary, color: 'white' }}>
            KLASYFIKACJA XAI
          </button>
          <button onClick={() => setActiveTab("inconsistency")} style={{ flex: 1, padding: '8px', fontSize: '11px', fontWeight: 'bold', borderRadius: '6px', cursor: 'pointer', border: 'none', backgroundColor: activeTab === "inconsistency" ? colors.accent : colors.secondary, color: 'white' }}>
            BADANIA (MVD/MCD)
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted }}>ZBIÓR DANYCH</label>
            <select 
              onChange={async (e) => {
                if(!e.target.value) return;
                
                try {
                  const res = await fetch(`/data/${e.target.value}`);
                  const text = await res.text();
                  const fileObj = new File([text], e.target.value);
                  
                  setSelectedFile(fileObj);
                  const lines = text.split('\n');
                  const target = lines[0].split(',').pop().trim();
                  setSelectedTarget(target);
                  setResults(null);
                  setInconsistencyData(null);

                  // Bezpieczne odpytanie backendu
                  const attrFormData = new FormData();
                  attrFormData.append("file", fileObj);
                  
                  const attrRes = await fetch("http://localhost:8000/get-attributes", { method: "POST", body: attrFormData });
                  if (attrRes.ok) {
                    const attrData = await attrRes.json();
                    const attrs = attrData.attributes || [];
                    setAvailableAttributes(attrs);
                    setSelectedAttrToRemove(attrs[0] || "");
                  } else {
                    setAvailableAttributes([]);
                    setSelectedAttrToRemove("");
                  }
                } catch (err) {
                  console.error("Błąd pobierania atrybutów:", err);
                  setAvailableAttributes([]);
                  setSelectedAttrToRemove("");
                }
              }} 
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text }}
            >
              <option value="">Wybierz plik...</option>
              {["modified_balance-scale.csv", "modified_breast-cancer.csv", "modified_cars.csv", "modified_house-votes.csv", "modified_lymphography.csv", "modified_mushroom.csv","modified_nursery.csv","modified_tic-tac-toe.csv"].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* DYNAMICZNY SELECT: Pojawia się tylko w zakładce badań niespójności */}
          {activeTab === "inconsistency" && availableAttributes.length > 0 && (
            <div>
              <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted }}>ATRYBUT DO USUNIĘCIA</label>
              <select 
                value={selectedAttrToRemove} 
                onChange={e => setSelectedAttrToRemove(e.target.value)} 
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text }}
              >
                {availableAttributes.map(attr => <option key={attr} value={attr}>{attr}</option>)}
              </select>
            </div>
          )}

          {activeTab === "classification" ? (
            <>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted }}>LICZBA DRZEW: {nTrees}</label>
                <input type="range" min="1" max="100" value={nTrees} onChange={e => setNTrees(e.target.value)} style={{ width: '100%', accentColor: colors.accent }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted }}>GŁĘBOKOŚĆ DRZEW: {maxDepth}</label>
                <input type="range" min="1" max="100" value={maxDepth} onChange={e => setMaxDepth(e.target.value)} style={{ width: '100%', accentColor: colors.accent }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted }}>SPLIT RATIO: {splitRatio}%</label>
                <input type="range" min="1" max="100" value={splitRatio} onChange={e => setSplitRatio(e.target.value)} style={{ width: '100%', accentColor: colors.accent }} />
              </div>
              <button onClick={runAnalysis} disabled={isLoading || !selectedFile} style={{ width: '100%', padding: '16px', borderRadius: '12px', backgroundColor: colors.accent, color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer' }}>
                {isLoading ? `LICZENIE (${timer}s)` : 'URUCHOM ANALIZĘ'}
              </button>
            </>
          ) : (
            <button onClick={runInconsistencyAnalysis} disabled={isIncLoading || !selectedFile || !selectedAttrToRemove} style={{ width: '100%', padding: '16px', borderRadius: '12px', backgroundColor: colors.success, color: 'white', border: 'none', fontWeight: '800', cursor: 'pointer' }}>
              {isIncLoading ? 'BADANIE NIESPÓJNOŚCI...' : 'URUCHOM TESTY MVD/MCD'}
            </button>
          )}
        </div>
      </aside>

      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        
        {/* WIDOK 1: KLASYFIKACJA I REGUŁY GLOBALNE */}
        {activeTab === "classification" && (
          results ? (
            <>
              <div style={{ backgroundColor: colors.card, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden', marginBottom: '40px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#2d2d30', borderBottom: `2px solid ${colors.border}` }}>
                      <th style={{ padding: '16px', color: colors.muted, fontWeight: '800', fontSize: '11px', textTransform: 'uppercase' }}>Analizowana Metryka</th>
                      <th style={{ padding: '16px', color: colors.muted, fontWeight: '800', fontSize: '11px', textTransform: 'uppercase' }}>Las Losowy (Baza)</th>
                      <th style={{ padding: '16px', color: colors.accent, fontWeight: '800', fontSize: '11px', textTransform: 'uppercase' }}>Algorytm A (Zoptymalizowany)</th>
                      <th style={{ padding: '16px', color: colors.muted, fontWeight: '800', fontSize: '11px', textTransform: 'uppercase' }}>Zysk / Strata</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>Złożoność (Liczba Reguł)</td>
                      <td style={{ padding: '16px' }}>{results.totalRulesGenerated}</td>
                      <td style={{ padding: '16px', fontWeight: 'bold', color: colors.accent }}>{results.algorithmAResults.length}</td>
                      <td style={{ padding: '16px' }}>{renderDiff(results.algorithmAResults.length, results.totalRulesGenerated, true, true, true)}</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>Dokładność (Accuracy)</td>
                      <td style={{ padding: '16px' }}>{results.evalStats.forestAccuracy}%</td>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>{results.evalStats.accuracy}%</td>
                      <td style={{ padding: '16px' }}>{renderDiff(results.evalStats.accuracy, results.evalStats.forestAccuracy)} %</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>F1-Score (Macro)</td>
                      <td style={{ padding: '16px' }}>{results.evalStats.forestF1}%</td>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>{results.evalStats.f1}%</td>
                      <td style={{ padding: '16px' }}>{renderDiff(results.evalStats.f1, results.evalStats.forestF1)} %</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>Precyzja (Precision)</td>
                      <td style={{ padding: '16px' }}>{results.evalStats.forestPrecision}%</td>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>{results.evalStats.precision}%</td>
                      <td style={{ padding: '16px' }}>{renderDiff(results.evalStats.precision, results.evalStats.forestPrecision)} %</td>
                    </tr>
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>Czułość (Recall)</td>
                      <td style={{ padding: '16px' }}>{results.evalStats.forestRecall}%</td>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>{results.evalStats.recall}%</td>
                      <td style={{ padding: '16px' }}>{renderDiff(results.evalStats.recall, results.evalStats.forestRecall)} %</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>Czas Klasyfikacji</td>
                      <td style={{ padding: '16px' }}>{results.evalStats.forestTime} s</td>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>{results.evalStats.customTime} s</td>
                      <td style={{ padding: '16px' }}>{renderDiff(results.evalStats.customTime, results.evalStats.forestTime, true, false, true)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Szczegółowa Struktura Wsparcia</h3>
                <button onClick={exportResults} style={{ backgroundColor: colors.secondary, color: colors.text, border: `1px solid ${colors.border}`, padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
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
                          <div key={i} style={{ fontSize: '12px', marginBottom: '8px', padding: r.isBestRule ? '12px' : '4px', backgroundColor: r.isBestRule ? 'rgba(251, 191, 36, 0.05)' : 'transparent', border: r.isBestRule ? '1px solid #fbbf24' : 'none', borderRadius: '8px' }}>
                            {r.isBestRule && (
                              <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: '10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.05em' }}>
                                <span>👑</span> GŁÓWNY WZORZEC DECYZYJNY (NAJLEPSZA REGUŁA Z LASU)
                              </div>
                            )}
                            <span style={{ color: colors.muted }}>IF</span> {r.conditions.map((c, ci) => <RulePill key={ci} attr={c.attribute} op={c.op} val={c.val} />)} 
                            <span style={{ color: colors.muted }}> THEN </span> <span style={{ color: colors.success, fontWeight: r.isBestRule ? 'bold' : 'normal' }}>{r.decision}</span>
                            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px dashed ${r.isBestRule ? 'rgba(251, 191, 36, 0.3)' : colors.border}`, color: r.isBestRule ? '#fcd34d' : colors.muted, fontStyle: 'italic', fontSize: '11px', lineHeight: '1.5' }}>
                              🗣️ {generateRuleSentence(r.conditions, r.decision)}
                            </div>
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
              Skonfiguruj parametry po lewej stronie i uruchom silnik lasu losowego.
            </div>
          )
        )}

        {/* WIDOK 2: PROJEKT BADACZY OD PROMOTORKI (MVD, MCD, KARDYNALNOŚĆ) */}
        {activeTab === "inconsistency" && (
          inconsistencyData ? (
            <div>
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: `1px solid ${colors.danger}`, borderRadius: '12px' }}>
                <span style={{ fontWeight: 'bold', color: colors.danger }}>⚠️ Wywołano Sztuczną Niespójność:</span> Usunięto atrybut <strong>{inconsistencyData.removed_attribute_to_create_inconsistency}</strong> z tabeli decyzyjnej w celu zasymulowania konfliktów obiektów.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                
                {/* KARTA 1: MVD */}
                <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '24px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: colors.accent, marginBottom: '12px' }}>1. Many-Valued Decisions (MVD)</div>
                  <p style={{ fontSize: '13px', color: colors.muted, marginBottom: '20px' }}>Transformacja obiektów spornych w pojedyncze wiersze zawierające skończone zbiory decyzji.</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                    <div>Liczba wierszy (T_MVD): <strong>{inconsistencyData.results.MVD.rows}</strong></div>
                    <div>Liczba konfliktów B(T): <span style={{ color: colors.danger, fontWeight: 'bold' }}>{inconsistencyData.results.MVD.B_T}</span></div>
                    <div style={{ marginTop: '10px', padding: '10px', backgroundColor: colors.bg, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                      <span style={{ fontSize: '11px', color: colors.muted, display: 'block' }}>👑 NAJWYŻSZA KARDYNALNOŚĆ</span>
                      Atrybut: <strong style={{ color: colors.success }}>{inconsistencyData.results.MVD.max_cardinality.attribute}</strong> ({inconsistencyData.results.MVD.max_cardinality.unique_values} wartości)
                    </div>
                  </div>
                </div>

                {/* KARTA 2: MCD */}
                <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '24px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: colors.accent, marginBottom: '12px' }}>2. Most Common Decision (MCD)</div>
                  <p style={{ fontSize: '13px', color: colors.muted, marginBottom: '20px' }}>Rozstrzyganie sporów poprzez głosowanie większościowe i wybór dominującej decyzji.</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                    <div>Liczba wierszy (T_MCD): <strong>{inconsistencyData.results.MCD.rows}</strong></div>
                    <div>Liczba konfliktów B(T): <span style={{ color: colors.success, fontWeight: 'bold' }}>{inconsistencyData.results.MCD.B_T}</span> (Wyczyszczone)</div>
                    <div style={{ marginTop: '10px', padding: '10px', backgroundColor: colors.bg, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                      <span style={{ fontSize: '11px', color: colors.muted, display: 'block' }}>👑 NAJWYŻSZA KARDYNALNOŚĆ</span>
                      Atrybut: <strong style={{ color: colors.success }}>{inconsistencyData.results.MCD.max_cardinality.attribute}</strong> ({inconsistencyData.results.MCD.max_cardinality.unique_values} wartości)
                    </div>
                  </div>
                </div>

                {/* KARTA 3: AUTORSKA */}
                <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '16px', padding: '24px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: colors.success, marginBottom: '12px' }}>3. Proportional Threshold (Autorska)</div>
                  <p style={{ fontSize: '13px', color: colors.muted, marginBottom: '20px' }}>Zachowanie decyzji dominującej pod warunkiem, że stanowi minimum 60% głosów w grupie sprzecznej.</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
                    <div>Liczba wierszy (T_CUSTOM): <strong>{inconsistencyData.results.CUSTOM.rows}</strong></div>
                    <div>Liczba konfliktów B(T): <span style={{ color: colors.success, fontWeight: 'bold' }}>{inconsistencyData.results.CUSTOM.B_T}</span></div>
                    <div style={{ marginTop: '10px', padding: '10px', backgroundColor: colors.bg, borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                      <span style={{ fontSize: '11px', color: colors.muted, display: 'block' }}>👑 NAJWYŻSZA KARDYNALNOŚĆ</span>
                      Atrybut: <strong style={{ color: colors.success }}>{inconsistencyData.results.CUSTOM.max_cardinality.attribute}</strong> ({inconsistencyData.results.CUSTOM.max_cardinality.unique_values} wartości)
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${colors.border}`, borderRadius: '20px', color: colors.muted }}>
              Wybierz plik po lewej stronie i uruchom testy trzech metod zarządzania niespójnością.
            </div>
          )
        )}

      </main>
    </div>
  );
}