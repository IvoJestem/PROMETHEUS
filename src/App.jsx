import React, { useState, useRef, useEffect } from 'react';

const colors = {
  bg: '#09090b', 
  card: '#141417', 
  cardSecondary: '#1c1c21',
  border: '#27272a', 
  text: '#f4f4f5',
  muted: '#a1a1aa',
  baseline: '#fbbf24', 
  mvd: '#a855f7',      
  mcd: '#06b6d4',      
  custom: '#10b981',   
  danger: '#ef4444'
};

const RulePill = ({ attr, op, val, accentColor }) => (
  <span style={{ 
    display: 'inline-flex', 
    alignItems: 'center', 
    backgroundColor: '#1c1c21', 
    border: `1px solid ${colors.border}`, 
    borderRadius: '6px', 
    padding: '3px 10px', 
    margin: '3px', 
    fontSize: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  }}>
    <span style={{ color: accentColor, marginRight: '6px', fontWeight: '600' }}>{attr}</span>
    <span style={{ color: colors.muted, marginRight: '6px' }}>{op}</span>
    <span style={{ color: colors.text, fontWeight: '500' }}>{val}</span>
  </span>
);

const renderStatRow = (label, value) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px dashed ${colors.border}`, fontSize: '13px' }}>
    <span style={{ color: colors.muted }}>{label}</span>
    <strong style={{ color: colors.text }}>{value}</strong>
  </div>
);

const renderSectionHeader = (title, color) => (
  <h5 style={{ color: color, margin: '20px 0 10px 0', fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{title}</h5>
);

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

export default function PrometheusDashboard() {
  const [availableAttributes, setAvailableAttributes] = useState([]);
  const [selectedAttrToRemove, setSelectedAttrToRemove] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [integratedResults, setIntegratedResults] = useState(null);

  const [splitRatio, setSplitRatio] = useState(70);
  const [nTrees, setNTrees] = useState(30);
  const [maxDepth, setMaxDepth] = useState(10);
  
  const [activeTab, setActiveTab] = useState("METRICS"); 
  const [selectedRulesMethod, setSelectedRulesMethod] = useState("CUSTOM");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [timer, setTimer] = useState("0.00");
  const timerRef = useRef(null);

  const [secretEnabled, setSecretEnabled] = useState(false);
  const [etFlying, setEtFlying] = useState(false);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const toggleGroup = (sup) => setExpandedGroups(p => ({ ...p, [sup]: !p[sup] }));

  const triggerEtFlight = () => {
    if (!secretEnabled || etFlying) return;
    setEtFlying(true);
    setTimeout(() => {
      setEtFlying(false);
    }, 4500); 
  };

  const runIntegratedAnalysis = async () => {
    if (!selectedFile || !selectedAttrToRemove) return;
    setIntegratedResults(null);
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
    formData.append("attrToRemove", selectedAttrToRemove);

    try {
      const response = await fetch("http://localhost:8000/analyze-integrated", { method: "POST", body: formData });
      const data = await response.json();
      if (data.status === "success") {
        setIntegratedResults(data);
        setSelectedRulesMethod("CUSTOM");
        setExpandedGroups({});
        setActiveTab("METRICS");
      }
    } catch (error) { 
      console.error("Błąd potoku PROMETHEUS:", error);
      alert("Błąd połączenia z API"); 
    } finally {
      setIsLoading(false); 
      clearInterval(timerRef.current); 
    }
  };

  const getMethodColor = (m) => {
    if (m === "BASELINE") return colors.baseline;
    if (m === "MVD") return colors.mvd;
    if (m === "MCD") return colors.mcd;
    return colors.custom;
  };

  const activeMethodData = integratedResults?.results?.[selectedRulesMethod];
  const activeAccent = getMethodColor(selectedRulesMethod);

  return (
    <div style={{ backgroundColor: colors.bg, color: colors.text, minHeight: '100vh', fontFamily: "'Inter', sans-serif", display: 'flex', overflow: 'hidden', position: 'relative' }}>
      
      <style>{`
        input[type="range"] { -webkit-appearance: none; width: 100%; background: transparent; }
        input[type="range"]:focus { outline: none; }
        input[type="range"]::-webkit-slider-runnable-track { width: 100%; height: 6px; cursor: pointer; background: #27272a; border-radius: 4px; border: none; }
        input[type="range"]::-webkit-slider-thumb { height: 16px; width: 16px; border-radius: 50%; background: #10b981; cursor: pointer; -webkit-appearance: none; margin-top: -5px; box-shadow: 0 0 8px rgba(16, 185, 129, 0.5); transition: transform 0.1s ease; }
        input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.2); background: #34d399; }
        input[type="range"]::-moz-range-track { width: 100%; height: 6px; cursor: pointer; background: #27272a; border-radius: 4px; }
        input[type="range"]::-moz-range-thumb { height: 16px; width: 16px; border-radius: 50%; background: #10b981; cursor: pointer; border: none; box-shadow: 0 0 8px rgba(16, 185, 129, 0.5); }
        
        @keyframes pulseSecret {
          0% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 2px #10b981); }
          50% { transform: scale(1.4); opacity: 0.7; filter: drop-shadow(0 0 8px #10b981); }
          100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 2px #10b981); }
        }

        /* --- NOWA ANIMACJA: LOT OD LEWEJ DO PRAWEJ --- */
        @keyframes flyET {
          0% {
            transform: translate(-20vw, 30vh) scale(0.6) rotate(5deg);
            opacity: 0;
          }
          10% { opacity: 1; }
          /* Punkt szczytowy lotu na tle księżyca */
          50% {
            transform: translate(50vw, 12vh) scale(1.1) rotate(0deg);
          }
          90% { opacity: 1; }
          100% {
            transform: translate(110vw, 40vh) scale(0.7) rotate(-5deg);
            opacity: 0;
          }
        }
      `}</style>

      {etFlying && (
        <div style={{ position: 'fixed', zIndex: 9999, pointerEvents: 'none', animation: 'flyET 4.5s linear forwards', width: '160px', height: '130px' }}>
          {/* NOWE KOLOROWE SVG W STYLU ODWOŁUJĄCYM SIĘ DO FILMU */}
          <svg viewBox="0 0 100 75" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 16px rgba(254, 252, 232, 0.4))' }}>
            <defs>
              {/* Gradient dla bladoróżowego/żółtego księżyca w tle */}
              <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="#fefce8" stopOpacity="0.4" />
                <stop offset="70%" stopColor="#fef3c7" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#09090b" stopOpacity="0.0" />
              </radialGradient>
              
              {/* Gradient dla czerwono-brązowej ramy roweru */}
              <linearGradient id="bikeFrame" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#b91c1c" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>

              {/* Gradient dla skóry E.T. (brązowy) */}
              <linearGradient id="etSkin" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#92400e" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
            </defs>

            {/* Subtelna tarcza księżyca w tle */}
            <circle cx="50" cy="35" r="30" fill="url(#moonGlow)" stroke="rgba(254, 252, 232, 0.15)" strokeWidth="1" strokeDasharray="5 3" />

            {/* Opony (Ciemnoszare) z czerwonym obrysem */}
            <circle cx="25" cy="55" r="11.5" stroke="#ef4444" strokeWidth="2.5" fill="#1c1c21" />
            <circle cx="25" cy="55" r="7" stroke="rgba(244, 244, 245, 0.3)" strokeWidth="1" fill="none" />
            
            <circle cx="75" cy="55" r="11.5" stroke="#ef4444" strokeWidth="2.5" fill="#1c1c21" />
            <circle cx="75" cy="55" r="7" stroke="rgba(244, 244, 245, 0.3)" strokeWidth="1" fill="none" />

            {/* Rama roweru - gradient czerwono-brązowy */}
            <path d="M 25 55 L 46 55 L 64 36 L 75 55 M 46 55 L 55 30 L 64 36 M 55 30 L 36 38 L 25 55" stroke="url(#bikeFrame)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* Kierownica */}
            <path d="M 64 36 L 61 19 L 56 21" stroke="#a1a1aa" strokeWidth="2.8" strokeLinecap="round" />

            {/* Koszyk - półprzezroczysty z cieniowaniem */}
            <rect x="63" y="16" width="16" height="12" rx="2" fill="rgba(244, 244, 245, 0.1)" stroke="#e4e4e7" strokeWidth="1.5" />
            <line x1="69" y1="16" x2="69" y2="28" stroke="rgba(244, 244, 245, 0.2)" strokeWidth="1" />
            <line x1="74" y1="16" x2="74" y2="28" stroke="rgba(244, 244, 245, 0.2)" strokeWidth="1" />

            {/* Kocyk i E.T. (Dodane kolory) */}
            <path d="M 67 15 C 65 6, 77 6, 75 15 Z" fill="#fafafa" stroke="#d1d5db" strokeWidth="0.5" /> {/* Kocyk zewnętrzny - biały */}
            <circle cx="71" cy="12" r="4.5" fill="url(#etSkin)" /> {/* Głowa E.T. - brązowa */}
            <circle cx="70" cy="11.5" r="1.2" fill="#fafafa" /> {/* Oczko - białko */}
            <circle cx="70" cy="11.5" r="0.5" fill="#09090b" /> {/* Oczko - źrenica */}
            <path d="M 69 16 C 69 11, 74 11, 74 16 Z" fill="#f4f4f5" stroke="#e4e4e7" strokeWidth="0.5" /> {/* Kocyk wewnętrzny */}

            {/* Elliott (chłopiec) - Czerwona bluza z kapturem */}
            <circle cx="47" cy="21" r="5" fill="#ef4444" stroke="#fafafa" strokeWidth="1.5" /> {/* Głowa/Kaptur - Czerwony */}
            <path d="M 41 28 C 41 21, 55 21, 55 28 L 52 40 L 43 40 Z" fill="#ef4444" stroke="#fafafa" strokeWidth="1.5" /> {/* Tułów/Bluza - Czerwony */}
            
            {/* Ręce trzymające kierownicę */}
            <path d="M 48 28 L 58 23" stroke="#f4f4f5" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}
      
      {/* PANEL BOCZNY STEROWANIA */}
      <aside style={{ width: '340px', borderRight: `1px solid ${colors.border}`, padding: '28px', backgroundColor: colors.card, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: colors.text, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                width: '10px', height: '10px', borderRadius: '50%', 
                backgroundColor: secretEnabled ? colors.custom : '#3f3f46',
                animation: secretEnabled ? 'pulseSecret 2s infinite ease-in-out' : 'none',
                transition: 'background-color 0.3s'
              }}></span>
              PROMETHEUS
            </div>
            <div style={{ fontSize: '11px', color: colors.muted, marginTop: '4px', lineHeight: '1.4' }}>
              System Ewaluacji Środowisk Wielodrzewiowych i Entropijnego Rozstrzygania Konfliktów XAI
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted, letterSpacing: '0.05em' }}>ZBIÓR DANYCH</label>
              <select 
                onChange={async (e) => {
                  if(!e.target.value) return;
                  try {
                    const res = await fetch(`/data/${e.target.value}`);
                    const text = await res.text();
                    const fileObj = new File([text], e.target.value);
                    setSelectedFile(fileObj);
                    setSelectedTarget(text.split('\n')[0].split(',').pop().trim());
                    setIntegratedResults(null);

                    const attrFormData = new FormData();
                    attrFormData.append("file", fileObj);
                    const attrRes = await fetch("http://localhost:8000/get-attributes", { method: "POST", body: attrFormData });
                    if (attrRes.ok) {
                      const attrData = await attrRes.json();
                      setAvailableAttributes(attrData.attributes || []);
                      setSelectedAttrToRemove(attrData.attributes?.[0] || "");
                    }
                  } catch (err) { console.error(err); }
                }} 
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text, marginTop: '6px', fontSize: '13px' }}
              >
                <option value="">Wybierz plik z repozytorium...</option>
                {["modified_balance-scale.csv", "modified_breast-cancer.csv", "modified_cars.csv", "modified_house-votes.csv", "modified_lymphography.csv", "modified_mushroom.csv","modified_nursery.csv","modified_tic-tac-toe.csv"].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {availableAttributes.length > 0 && (
              <div>
                <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted, letterSpacing: '0.05em' }}>1. ATRYBUT DO USUNIĘCIA (NIESPÓJNOŚĆ)</label>
                <select value={selectedAttrToRemove} onChange={e => setSelectedAttrToRemove(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text, marginTop: '6px', fontSize: '13px' }}>
                  {availableAttributes.map(attr => <option key={attr} value={attr}>{attr}</option>)}
                </select>
              </div>
            )}

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted, letterSpacing: '0.05em' }}>LICZBA DRZEW W LESIE</label>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.custom, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>{nTrees}</span>
              </div>
              <input type="range" min="1" max="100" value={nTrees} onChange={e => setNTrees(e.target.value)} style={{ marginTop: '10px' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted, letterSpacing: '0.05em' }}>MAKSYMALNA GŁĘBOKOŚĆ</label>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.custom, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>{maxDepth}</span>
              </div>
              <input type="range" min="1" max="100" value={maxDepth} onChange={e => setMaxDepth(e.target.value)} style={{ marginTop: '10px' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted, letterSpacing: '0.05em' }}>PROPOCJA PODZIAŁU (SPLIT)</label>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.custom, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>{splitRatio}%</span>
              </div>
              <input type="range" min="1" max="100" value={splitRatio} onChange={e => setSplitRatio(e.target.value)} style={{ marginTop: '10px' }} />
            </div>

            <button 
              onClick={runIntegratedAnalysis} 
              disabled={isLoading || !selectedFile || !selectedAttrToRemove} 
              style={{ 
                width: '100%', padding: '16px', borderRadius: '10px', backgroundColor: colors.custom, color: colors.bg, 
                border: 'none', fontWeight: '800', fontSize: '14px', cursor: 'pointer', marginTop: '14px',
                transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
            >
              {isLoading ? `PRZETWARZANIE (${timer}s)` : 'URUCHOM POTOK ANALITYCZNY'}
            </button>
          </div>
        </div>

        {/* LOGO SYSTEMU + CYTAT AVI */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '40px', marginTop: 'auto', width: '100%', gap: '16px' }}>
          <img 
            src="/logo1.png" 
            alt="Prometheus Graphic Balance" 
            onClick={() => setSecretEnabled(!secretEnabled)}
            style={{ 
              maxWidth: '85%', 
              maxHeight: '180px', 
              opacity: secretEnabled ? 0.55 : 0.25, 
              filter: secretEnabled ? `drop-shadow(0 0 16px ${colors.custom}80)` : `drop-shadow(0 0 12px ${colors.custom}40)`,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: secretEnabled ? 'scale(1.04)' : 'scale(1)'
            }}
            onMouseEnter={(e) => { if(!secretEnabled) e.currentTarget.style.opacity = '0.55'; }}
            onMouseLeave={(e) => { if(!secretEnabled) e.currentTarget.style.opacity = '0.25'; }}
          />
          <div style={{ textAlign: 'center', maxWidth: '90%', lineHeight: '1.5', userSelect: 'none' }}>
            <p style={{ margin: 0, fontSize: '10.5px', color: colors.muted, fontStyle: 'italic', letterSpacing: '0.02em' }}>
              "Sam jak Prometeusz, gdy daję ludziom ogień<br/>
              I to na tyle, jeśli chodzi o mitologię"
            </p>
            <span style={{ fontSize: '9px', color: colors.custom, fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '4px', display: 'block', opacity: 0.5 }}>
              — Avi
            </span>
          </div>
        </div>
      </aside>

      {/* GŁÓWNY PANEL WIZUALIZACJI Z ZAKŁADKAMI */}
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', zIndex: 5 }}>
        {integratedResults ? (
          <div>
            
            {/* GRUPA ZAKŁADEK NA SAMEJ GÓRZE STRONY (UKŁAD 50/50) */}
            <div style={{ 
              display: 'flex', 
              backgroundColor: colors.card, 
              border: `1px solid ${colors.border}`, 
              borderRadius: '10px', 
              padding: '4px', 
              marginBottom: '28px',
              width: '100%'
            }}>
              <button 
                onClick={() => setActiveTab("METRICS")}
                style={{
                  width: '50%',
                  padding: '12px 0', 
                  fontSize: '13px', 
                  fontWeight: '800', 
                  cursor: 'pointer', 
                  border: 'none', 
                  borderRadius: '7px',
                  backgroundColor: activeTab === "METRICS" ? '#1c1c21' : 'transparent',
                  color: activeTab === "METRICS" ? colors.custom : colors.muted,
                  borderBottom: activeTab === "METRICS" ? `2px solid ${colors.custom}` : '2px solid transparent',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.03em'
                }}
              >
                 Panel Metryk i Struktur
              </button>
              <button 
                onClick={() => setActiveTab("RULES")}
                style={{
                  width: '50%',
                  padding: '12px 0', 
                  fontSize: '13px', 
                  fontWeight: '800', 
                  cursor: 'pointer', 
                  border: 'none', 
                  borderRadius: '7px',
                  backgroundColor: activeTab === "RULES" ? '#1c1c21' : 'transparent',
                  color: activeTab === "RULES" ? colors.custom : colors.muted,
                  borderBottom: activeTab === "RULES" ? `2px solid ${colors.custom}` : '2px solid transparent',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.03em'
                }}
              >
                 Eksplorator Reguł Globalnych
              </button>
            </div>

            {/* ZAKŁADKA 1: PANEL METRYK (DASHBOARD 4 KOLUMN) */}
            {activeTab === "METRICS" && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                  <div style={{ backgroundColor: colors.card, borderTop: `4px solid ${colors.baseline}`, borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, borderRadius: '12px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                    <div style={{ fontSize: '15px', fontWeight: '900', color: colors.baseline }}>0.Czysty Baseline</div>
                    <div style={{ fontSize: '11px', color: colors.muted, marginBottom: '20px', marginTop: '2px' }}>Surowy las CART na oryginalnych danych</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                      <div style={{ backgroundColor: colors.cardSecondary, padding: '10px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: colors.baseline }}>{integratedResults.results.BASELINE.evalStats.accuracy}%</div>
                        <div style={{ fontSize: '10px', color: colors.muted, marginTop: '2px' }}>Accuracy</div>
                      </div>
                      <div style={{ backgroundColor: colors.cardSecondary, padding: '10px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: colors.text }}>{integratedResults.results.BASELINE.evalStats.f1}%</div>
                        <div style={{ fontSize: '10px', color: colors.muted, marginTop: '2px' }}>F1-Macro</div>
                      </div>
                    </div>
                    {renderSectionHeader("Optymalizacja XAI", colors.baseline)}
                    {renderStatRow("Zredukowane reguły:", "— (Brak)")}
                    {renderStatRow("Pierwotne reguły:", "— (Brak)")}
                    {renderSectionHeader("Walidacja Podtablic", colors.custom)}
                    {renderStatRow("Średnia dokładność:", `${integratedResults.results.BASELINE.evalStats.avgSubtableAccuracy}%`)}
                    {renderStatRow("Maksymalna dokładność:", `${integratedResults.results.BASELINE.evalStats.maxSubtableAccuracy || 0}%`)}
                    {renderStatRow("Długość reguły:", "— (Brak)")}
                    {renderSectionHeader("Struktura Bazowa", colors.muted)}
                    {renderStatRow("Węzły decyzyjne:", integratedResults.results.BASELINE.forestStats.workingNodes)}
                    {renderStatRow("Liście końcowe:", integratedResults.results.BASELINE.forestStats.leaves)}
                    {renderStatRow("Śr. głębokość:", integratedResults.results.BASELINE.forestStats.avgDepth)}
                  </div>

                  <div style={{ backgroundColor: colors.card, borderTop: `4px solid ${colors.mvd}`, borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, borderRadius: '12px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                    <div style={{ fontSize: '15px', fontWeight: '900', color: colors.mvd }}>1. Many-Valued Decisions</div>
                    <div style={{ fontSize: '11px', color: colors.muted, marginBottom: '20px', marginTop: '2px' }}>Wiersze sporne scalone w zbiory decyzji</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                      <div style={{ backgroundColor: colors.cardSecondary, padding: '10px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: colors.mvd }}>{integratedResults.results.MVD.evalStats.accuracy}%</div>
                        <div style={{ fontSize: '10px', color: colors.muted, marginTop: '2px' }}>Accuracy</div>
                      </div>
                      <div style={{ backgroundColor: colors.cardSecondary, padding: '10px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: colors.text }}>{integratedResults.results.MVD.evalStats.f1}%</div>
                        <div style={{ fontSize: '10px', color: colors.muted, marginTop: '2px' }}>F1-Macro</div>
                      </div>
                    </div>
                    {renderSectionHeader("Optymalizacja XAI", colors.mvd)}
                    {renderStatRow("Zredukowane reguły:", integratedResults.results.MVD.algorithmAResults.length)}
                    {renderStatRow("Pierwotne reguły:", integratedResults.results.MVD.totalRulesGenerated)}
                    {renderSectionHeader("Walidacja Podtablic", colors.custom)}
                    {renderStatRow("Średnia dokładność:", `${integratedResults.results.MVD.evalStats.avgSubtableAccuracy}%`)}
                    {renderStatRow("Maksymalna dokładność:", `${integratedResults.results.MVD.evalStats.maxSubtableAccuracy || 0}%`)}
                    {renderStatRow("Długość reguły:", integratedResults.results.MVD.evalStats.avgRuleLength)}
                    {renderSectionHeader("Struktura Bazowa", colors.muted)}
                    {renderStatRow("Węzły decyzyjne:", integratedResults.results.MVD.forestStats.workingNodes)}
                    {renderStatRow("Liście końcowe:", integratedResults.results.MVD.forestStats.leaves)}
                    {renderStatRow("Śr. głębokość:", integratedResults.results.MVD.forestStats.avgDepth)}
                  </div>

                  <div style={{ backgroundColor: colors.card, borderTop: `4px solid ${colors.mcd}`, borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, borderRadius: '12px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                    <div style={{ fontSize: '15px', fontWeight: '900', color: colors.mcd }}>2. Most Common Decision</div>
                    <div style={{ fontSize: '11px', color: colors.muted, marginBottom: '20px', marginTop: '2px' }}>Głosowanie większościowe (dominanta)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                      <div style={{ backgroundColor: colors.cardSecondary, padding: '10px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: colors.mcd }}>{integratedResults.results.MCD.evalStats.accuracy}%</div>
                        <div style={{ fontSize: '10px', color: colors.muted, marginTop: '2px' }}>Accuracy</div>
                      </div>
                      <div style={{ backgroundColor: colors.cardSecondary, padding: '10px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: colors.text }}>{integratedResults.results.MCD.evalStats.f1}%</div>
                        <div style={{ fontSize: '10px', color: colors.muted, marginTop: '2px' }}>F1-Macro</div>
                      </div>
                    </div>
                    {renderSectionHeader("Optymalizacja XAI", colors.mcd)}
                    {renderStatRow("Zredukowane reguły:", integratedResults.results.MCD.algorithmAResults.length)}
                    {renderStatRow("Pierwotne reguły:", integratedResults.results.MCD.totalRulesGenerated)}
                    {renderSectionHeader("Walidacja Podtablic", colors.custom)}
                    {renderStatRow("Średnia dokładność:", `${integratedResults.results.MCD.evalStats.avgSubtableAccuracy}%`)}
                    {renderStatRow("Maksymalna dokładność:", `${integratedResults.results.MCD.evalStats.maxSubtableAccuracy || 0}%`)}
                    {renderStatRow("Długość reguły:", integratedResults.results.MCD.evalStats.avgRuleLength)}
                    {renderSectionHeader("Struktura Bazowa", colors.muted)}
                    {renderStatRow("Węzły decyzyjne:", integratedResults.results.MCD.forestStats.workingNodes)}
                    {renderStatRow("Liście końcowe:", integratedResults.results.MCD.forestStats.leaves)}
                    {renderStatRow("Śr. głębokość:", integratedResults.results.MCD.forestStats.avgDepth)}
                  </div>

                  <div style={{ backgroundColor: colors.card, borderTop: `4px solid ${colors.custom}`, borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}`, borderRadius: '12px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                    <div style={{ fontSize: '15px', fontWeight: '900', color: colors.custom }}>3. Entropy Threshold</div>
                    <div style={{ fontSize: '11px', color: colors.muted, marginBottom: '20px', marginTop: '2px' }}>Entropijne usuwanie szumu informacyjnego</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                      <div style={{ backgroundColor: colors.cardSecondary, padding: '10px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: colors.custom }}>{integratedResults.results.CUSTOM.evalStats.accuracy}%</div>
                        <div style={{ fontSize: '10px', color: colors.muted, marginTop: '2px' }}>Accuracy</div>
                      </div>
                      <div style={{ backgroundColor: colors.cardSecondary, padding: '10px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
                        <div style={{ fontSize: '18px', fontWeight: '900', color: colors.text }}>{integratedResults.results.CUSTOM.evalStats.f1}%</div>
                        <div style={{ fontSize: '10px', color: colors.muted, marginTop: '2px' }}>F1-Macro</div>
                      </div>
                    </div>
                    {renderSectionHeader("Optymalizacja XAI", colors.custom)}
                    {renderStatRow("Zredukowane reguły:", integratedResults.results.CUSTOM.algorithmAResults.length)}
                    {renderStatRow("Pierwotne reguły:", integratedResults.results.CUSTOM.totalRulesGenerated)}
                    {renderSectionHeader("Walidacja Podtablic", colors.custom)}
                    {renderStatRow("Średnia dokładność:", `${integratedResults.results.CUSTOM.evalStats.avgSubtableAccuracy}%`)}
                    {renderStatRow("Maksymalna dokładność:", `${integratedResults.results.CUSTOM.maxSubtableAccuracy || 0}%`)}
                    {renderStatRow("Długość reguły:", integratedResults.results.CUSTOM.evalStats.avgRuleLength)}
                    {renderSectionHeader("Struktura Bazowa", colors.muted)}
                    {renderStatRow("Węzły decyzyjne:", integratedResults.results.CUSTOM.forestStats.workingNodes)}
                    {renderStatRow("Liście końcowe:", integratedResults.results.CUSTOM.forestStats.leaves)}
                    {renderStatRow("Śr. głębokość:", integratedResults.results.CUSTOM.forestStats.avgDepth)}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "RULES" && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '-0.02em' }}>Baza Reguł Wyjaśnialnych (PROMETHEUS Engine)</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: colors.muted }}>
                      Wybierz technikę usuwania niespójności, aby przeanalizować powtarzalność i semantykę reguł globalnych wyindukowanych przez Algorytmu A.
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '6px', backgroundColor: '#141417', padding: '6px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                    {[
                      { key: "BASELINE", label: "B.C", color: colors.baseline },
                      { key: "MVD", label: "M.V.D", color: colors.mvd },
                      { key: "MCD", label: "M.C.D", color: colors.mcd },
                      { key: "CUSTOM", label: "E.T", color: colors.custom }
                    ].map(m => {
                      const isSelected = selectedRulesMethod === m.key;
                      return (
                        <button
                          key={m.key}
                          onClick={() => { 
                            setSelectedRulesMethod(m.key); 
                            setExpandedGroups({}); 
                            if (m.key === "CUSTOM") triggerEtFlight();
                          }}
                          style={{
                            padding: '8px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', border: 'none',
                            backgroundColor: isSelected ? m.color : 'transparent',
                            color: isSelected ? colors.bg : colors.muted,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {activeMethodData && activeMethodData.algorithmAResults && activeMethodData.algorithmAResults.length > 0 ? (
                  Array.from({ length: int(nTrees) }, (_, i) => int(nTrees) - i).map(sup => {
                    const group = activeMethodData.algorithmAResults.filter(r => r.supportCount === sup);
                    if (group.length === 0) return null;
                    const isOpen = expandedGroups[sup];
                    
                    return (
                      <div key={sup} style={{ marginBottom: '10px', border: `1px solid ${isOpen ? activeAccent : colors.border}`, borderRadius: '10px', overflow: 'hidden' }}>
                        <div 
                          onClick={() => toggleGroup(sup)} 
                          style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', backgroundColor: colors.card, alignItems: 'center', userSelect: 'none' }}
                        >
                          <span style={{ fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: activeAccent }}></span>
                            Poziom Poparcia Przez Drzewa: {sup} z {nTrees} {sup === 1 ? ' <Lokalny szum logiczny odrzucony w agregacji>' : ''}
                          </span>
                          <span style={{ color: colors.muted, fontSize: '12px', fontWeight: '600' }}>{group.length} reguł {isOpen ? '▲' : '▼'}</span>
                        </div>
                        
                        {isOpen && (
                          <div style={{ padding: '20px', backgroundColor: '#0c0c0e', borderTop: `1px solid ${colors.border}` }}>
                            {group.slice(0, 40).map((r, i) => (
                              <div key={i} style={{ 
                                fontSize: '13px', marginBottom: '12px', padding: '16px', backgroundColor: colors.card, 
                                border: r.isBestRule ? `1px dashed ${activeAccent}` : `1px solid ${colors.border}`, borderRadius: '8px' 
                              }}>
                                {r.isBestRule && (
                                  <div style={{ color: activeAccent, fontWeight: '900', marginBottom: '12px', fontSize: '11px', letterSpacing: '0.05em' }}>
                                    👑 OPTYMALNY WZORZEC GLOBALNY (NAJWYŻSZE WSPARCIE W LESIE)
                                  </div>
                                )}
                                <span style={{ color: colors.muted, fontWeight: '700' }}>IF</span> {r.conditions.map((c, ci) => <RulePill key={ci} attr={c.attribute} op={c.op} val={c.val} accentColor={activeAccent} />)} 
                                <span style={{ color: colors.muted, fontWeight: '700' }}> THEN </span> <span style={{ color: colors.custom, fontWeight: 'bold' }}>{r.decision}</span>
                                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px dashed ${colors.border}`, color: colors.muted, fontStyle: 'italic', fontSize: '11px', lineHeight: '1.6' }}>
                                  🗣️ {generateRuleSentence(r.conditions, r.decision)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', color: colors.muted, border: `2px dashed ${colors.border}`, borderRadius: '12px', fontSize: '13px', backgroundColor: colors.card }}>
                    {selectedRulesMethod === "BASELINE" 
                      ? "Model referencyjny Baseline (surowy Las Losowy) reprezentuje strukturę typu 'czarna skrzynka' — nie podlega dekompozycji na zunifikowaną bazę reguł logicznych Algorytmu A." 
                      : "Wszystkie wygenerowane reguły dla tego wariantu zostały odrzucone przez próg selekcji wsparcia."}
                  </div>
                )}
              </div>
            )}

          </div>
        ) : (
          <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${colors.border}`, borderRadius: '20px', color: colors.muted, fontSize: '14px' }}>
            Skonfiguruj parametry wejściowe, wybierz cechę do usunięcia i uruchom zintegrowany potok badawczy systemu PROMETHEUS.
          </div>
        )}
      </main>
    </div>
  );
}

function int(val) { return parseInt(val, 10) || 0; }