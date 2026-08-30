import React, { useState, useRef, useEffect } from 'react';
import { colors } from './constants/theme';
import Sidebar from './components/Sidebar';
import MatrixTab from './components/tabs/MatrixTab';
import MetricsTab from './components/tabs/MetricsTab';
import RulesTab from './components/tabs/RulesTab';
import ResearchTab from './components/tabs/ResearchTab';
import EtEasterEgg from './components/EtEasterEgg';

export default function PrometheusDashboard() {
  const [inconsistencyMatrix, setInconsistencyMatrix] = useState(null);
  const [isMatrixLoading, setIsMatrixLoading] = useState(false);
  const [availableAttributes, setAvailableAttributes] = useState([]);
  const [selectedAttrToRemove, setSelectedAttrToRemove] = useState("");
  const [numAttrsToRemove, setNumAttrsToRemove] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState("");
  const [integratedResults, setIntegratedResults] = useState(null);
  
  const [splitRatio, setSplitRatio] = useState(70);
  const [nTrees, setNTrees] = useState(30);
  const [maxDepth, setMaxDepth] = useState(10);

  const [isLoading, setIsLoading] = useState(false);
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

  const triggerEtFlight = () => {
    if (!secretEnabled || etFlying) return;
    setEtFlying(true);
    setTimeout(() => setEtFlying(false), 4500);
  };

  const runIntegratedAnalysis = async () => {
    if (!selectedFile || !selectedAttrToRemove) {
      alert("Wybierz plik i liczbę atrybutów do usunięcia!");
      return;
    }
    
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
      const stdData = await response.json();
      
      if (stdData.status === "success") {
        setIntegratedResults(stdData);
        setSelectedRulesMethod("CUSTOM");
        setExpandedGroups({});
        setActiveTab("MATRIX");
        
        setIsLoading(false);
        clearInterval(timerRef.current);

        console.log("⏳ PROMETHEUS: Uruchamiam obliczenia siatki badawczej w tle...");
        const resResponse = await fetch("http://localhost:8000/run-research-experiment", { method: "POST", body: formData });
        
        if (resResponse.ok) {
          const resData = await resResponse.json();
          console.log("✅ PROMETHEUS: Siatka przeliczona!");

          setIntegratedResults(prevData => ({
            ...prevData,
            research_grid: resData.results
          }));

          const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(resData, null, 2))}`;
          const downloadAnchor = document.createElement('a');
          downloadAnchor.setAttribute("href", jsonString);
          downloadAnchor.setAttribute("download", `badania_PROMETHEUS_k${numAttrsToRemove}_S10-30-50.json`);
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          downloadAnchor.remove();
        }
      }
    } catch (error) {
      console.error("Błąd potoku PROMETHEUS:", error);
      alert("Błąd połączenia z API (sprawdź terminal Pythona).");
    } finally {
      setIsLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

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
        @keyframes pulseSecret { 0%, 100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 2px #10b981); } 50% { transform: scale(1.4); opacity: 0.7; filter: drop-shadow(0 0 8px #10b981); } }
      `}</style>
      <EtEasterEgg etFlying={etFlying} />
      <Sidebar
        selectedFile={selectedFile} setSelectedFile={setSelectedFile}
        setSelectedTarget={setSelectedTarget} setIntegratedResults={setIntegratedResults}
        setInconsistencyMatrix={setInconsistencyMatrix} setIsMatrixLoading={setIsMatrixLoading}
        availableAttributes={availableAttributes} setAvailableAttributes={setAvailableAttributes}
        selectedAttrToRemove={selectedAttrToRemove} setSelectedAttrToRemove={setSelectedAttrToRemove}
        numAttrsToRemove={numAttrsToRemove} setNumAttrsToRemove={setNumAttrsToRemove}
        nTrees={nTrees} setNTrees={setNTrees}
        maxDepth={maxDepth} setMaxDepth={setMaxDepth}
        splitRatio={splitRatio} setSplitRatio={setSplitRatio}
        runIntegratedAnalysis={runIntegratedAnalysis} isLoading={isLoading} timer={timer}
        secretEnabled={secretEnabled} setSecretEnabled={setSecretEnabled}
      />

      <main style={{ flex: 1, padding: '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', zIndex: 5 }}>

        <div style={{ 
          display: 'flex', 
          backgroundColor: colors.card, 
          border: `1px solid ${colors.border}`, 
          borderRadius: '10px', 
          padding: '4px', 
          marginBottom: '28px', 
          width: '100%' 
        }}>
          {[
            { id: "MATRIX", label: "Macierz Analizy Wpływu Atrybutów" },
            { id: "METRICS", label: "Panel Metryk i Struktur" },
            { id: "RULES", label: "Eksplorator Reguł Globalnych" },
            { id: "RESEARCH", label: "Raport Badawczy (Siatka S)" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, 
                padding: '12px 8px', 
                fontSize: '13px', 
                fontWeight: '800', 
                cursor: 'pointer', 
                border: 'none', 
                borderRadius: '7px',
                backgroundColor: activeTab === tab.id ? '#1c1c21' : 'transparent',
                color: activeTab === tab.id ? colors.custom : colors.muted,
                borderBottom: activeTab === tab.id ? `2px solid ${colors.custom}` : '2px solid transparent',
                transition: 'all 0.2s ease', 
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "MATRIX" && (
          <MatrixTab
            isMatrixLoading={isMatrixLoading}
            inconsistencyMatrix={inconsistencyMatrix}
            selectedAttrToRemove={selectedAttrToRemove}
            setSelectedAttrToRemove={setSelectedAttrToRemove}
            numAttrsToRemove={numAttrsToRemove}
            setNumAttrsToRemove={setNumAttrsToRemove}
            integratedResults={integratedResults}
          />
        )}

        {integratedResults ? (
          <>
            {activeTab === "METRICS" && (
              <MetricsTab 
                integratedResults={integratedResults} 
              />
            )}

            {activeTab === "RULES" && (
              <RulesTab
                integratedResults={integratedResults}
                selectedRulesMethod={selectedRulesMethod}
                setSelectedRulesMethod={setSelectedRulesMethod}
                expandedGroups={expandedGroups}
                setExpandedGroups={setExpandedGroups}
                nTrees={nTrees}
                triggerEtFlight={triggerEtFlight}
              />
            )}

            {activeTab === "RESEARCH" && (
              <ResearchTab
                integratedResults={integratedResults}
              />
            )}
          </>
        ) : activeTab !== "MATRIX" && (
          <div style={{ 
            height: '70vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            border: `2px dashed ${colors.border}`, 
            borderRadius: '20px', 
            color: colors.muted, 
            fontSize: '14px',
            textAlign: 'center',
            padding: '20px'
          }}>
            Skonfiguruj liczbę usuwanych cech (k) w panelu po lewej i kliknij <b>„🚀 URUCHOM POTOK DLA k = {numAttrsToRemove}”</b>.
          </div>
        )}

      </main>
    </div>
  );
}