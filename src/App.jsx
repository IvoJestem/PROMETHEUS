import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  Database,
  Grid,
  Play,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { colors } from './constants/theme';
import MatrixTab from './components/tabs/MatrixTab';
import MetricsTab from './components/tabs/MetricsTab';
import RulesTab from './components/tabs/RulesTab';
import ResearchTab from './components/tabs/ResearchTab';
import EtEasterEgg from './components/EtEasterEgg';

const datasetFiles = Object.keys(import.meta.glob('/public/data/*.csv')).map(
  (path) => path.split('/').pop() || ''
);

export default function PrometheusDashboard() {
  const [inconsistencyMatrix, setInconsistencyMatrix] = useState(null);
  const [topCombinations, setTopCombinations] = useState([]);
  const [topCombinationsMeta, setTopCombinationsMeta] = useState(null);
  const [forceExactScan, setForceExactScan] = useState(false);
  const [isMatrixLoading, setIsMatrixLoading] = useState(false);
  const [availableAttributes, setAvailableAttributes] = useState([]);
  const [selectedAttrToRemove, setSelectedAttrToRemove] = useState('');
  const [numAttrsToRemove, setNumAttrsToRemove] = useState(1);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [selectedTarget, setSelectedTarget] = useState('');
  const [integratedResults, setIntegratedResults] = useState(null);

  const [splitRatio, setSplitRatio] = useState(70);
  const [nTrees, setNTrees] = useState(30);
  const [maxDepth, setMaxDepth] = useState(10);
  const [entropyThreshold, setEntropyThreshold] = useState(0.85);

  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('MATRIX');
  const [selectedRulesMethod, setSelectedRulesMethod] = useState('CUSTOM');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [timer, setTimer] = useState('0.00');
  const timerRef = useRef(null);
  const [secretEnabled, setSecretEnabled] = useState(false);
  const [etFlying, setEtFlying] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const triggerEtFlight = () => {
    if (!secretEnabled || etFlying) return;
    setEtFlying(true);
    setTimeout(() => setEtFlying(false), 4500);
  };

  const fetchMatrixData = async (fileObj, exactFlag = false) => {
    if (!fileObj) return;
    try {
      setIsMatrixLoading(true);
      const matrixFormData = new FormData();
      matrixFormData.append('file', fileObj);
      matrixFormData.append('force_exact', exactFlag ? 'true' : 'false');

      const matrixRes = await fetch(
        'http://localhost:8000/calculate-full-inconsistency-matrix',
        { method: 'POST', body: matrixFormData }
      );
      if (matrixRes.ok) {
        const matrixData = await matrixRes.json();
        setInconsistencyMatrix(matrixData.matrix || []);
        setTopCombinations(matrixData.top_combinations || []);
        setTopCombinationsMeta(matrixData.top_combinations_meta || null);
      }
    } catch (err) {
      console.error('Błąd podczas ładowania macierzy:', err);
    } finally {
      setIsMatrixLoading(false);
    }
  };

  const handleFileChange = async (fileName) => {
    setSelectedFileName(fileName);
    setIsDropdownOpen(false);
    setForceExactScan(false);

    if (!fileName) {
      setTopCombinations([]);
      setTopCombinationsMeta(null);
      return;
    }

    try {
      setIsMatrixLoading(true);
      const res = await fetch(`/data/${fileName}`);
      const text = await res.text();
      const fileObj = new File([text], fileName, { type: 'text/csv' });

      setSelectedFile(fileObj);

      const firstLine = text.split('\n')[0];
      const delimiter = firstLine.includes(';') ? ';' : ',';
      const headers = firstLine
        .split(delimiter)
        .map((h) => h.trim())
        .filter(Boolean);
      setSelectedTarget(headers[headers.length - 1]);
      setIntegratedResults(null);
      setTopCombinations([]);
      setTopCombinationsMeta(null);

      const attrFormData = new FormData();
      attrFormData.append('file', fileObj);
      const attrRes = await fetch('http://localhost:8000/get-attributes', {
        method: 'POST',
        body: attrFormData,
      });
      if (attrRes.ok) {
        const attrData = await attrRes.json();
        const attrs = attrData.attributes || [];
        setAvailableAttributes(attrs);
        setNumAttrsToRemove(1);
        setSelectedAttrToRemove(attrs[0] || '');
      }

      await fetchMatrixData(fileObj, false);
    } catch (err) {
      console.error('Błąd podczas ładowania pliku i macierzy:', err);
      setIsMatrixLoading(false);
    }
  };

  const handleForceExactToggle = async () => {
    const nextExact = !forceExactScan;
    setForceExactScan(nextExact);
    if (selectedFile) {
      await fetchMatrixData(selectedFile, nextExact);
    }
  };

  const handleKChange = (newK) => {
    const kVal = parseInt(newK, 10);
    setNumAttrsToRemove(kVal);
    const attrsList = availableAttributes.slice(0, kVal);
    setSelectedAttrToRemove(attrsList.join(', '));
  };

  const runIntegratedAnalysis = async () => {
    if (!selectedFile || !selectedAttrToRemove) {
      alert('Wybierz plik i liczbę atrybutów do usunięcia!');
      return;
    }

    setIntegratedResults(null);
    setTimer('0.00');
    const start = Date.now();
    timerRef.current = setInterval(
      () => setTimer(((Date.now() - start) / 1000).toFixed(2)),
      100
    );
    setIsLoading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('splitRatio', splitRatio);
    formData.append('targetAttr', selectedTarget);
    formData.append('nTrees', nTrees);
    formData.append('maxDepth', maxDepth);
    formData.append('attrToRemove', selectedAttrToRemove);
    formData.append('entropyThreshold', entropyThreshold);

    try {
      const response = await fetch('http://localhost:8000/analyze-integrated', {
        method: 'POST',
        body: formData,
      });
      const stdData = await response.json();

      if (stdData.status === 'success') {
        setIntegratedResults(stdData);
        setSelectedRulesMethod('CUSTOM');
        setExpandedGroups({});
        setActiveTab('METRICS');

        setIsLoading(false);
        clearInterval(timerRef.current);

        const resResponse = await fetch(
          'http://localhost:8000/run-research-experiment',
          { method: 'POST', body: formData }
        );

        if (resResponse.ok) {
          const resData = await resResponse.json();
          setIntegratedResults((prevData) => ({
            ...prevData,
            research_grid: resData.results,
          }));

          const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(resData, null, 2)
          )}`;
          const downloadAnchor = document.createElement('a');
          downloadAnchor.setAttribute('href', jsonString);
          downloadAnchor.setAttribute(
            'download',
            `badania_PROMETHEUS_k${numAttrsToRemove}_tau${entropyThreshold}_S10-30-50.json`
          );
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          downloadAnchor.remove();
        }
      }
    } catch (error) {
      console.error('Błąd potoku PROMETHEUS:', error);
      alert('Błąd połączenia z API (sprawdź terminal Pythona).');
    } finally {
      setIsLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const navItems = [
    { id: 'MATRIX', label: 'Macierz Podatności', icon: Grid },
    { id: 'METRICS', label: 'Metryki & Bento', icon: Activity },
    { id: 'RULES', label: 'Reguły Globalne', icon: BookOpen },
    { id: 'RESEARCH', label: 'Raport Siatki S', icon: BarChart3 },
  ];

  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        background: `radial-gradient(circle at 15% 0%, rgba(16, 185, 129, 0.08), transparent 45%), radial-gradient(circle at 85% 5%, rgba(6, 182, 212, 0.07), transparent 45%), ${colors.bg}`,
        color: colors.text,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        html, body, #root {
          height: 100%;
          max-width: 100vw;
          overflow: hidden;
          background-color: ${colors.bg};
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        html::-webkit-scrollbar, body::-webkit-scrollbar, *::-webkit-scrollbar {
          width: 0px;
          height: 0px;
          background: transparent;
        }
        img { border: 0; outline: none; background: transparent; }
        .num-tabular { font-variant-numeric: tabular-nums; }
        input[type="range"] { -webkit-appearance: none; width: 100%; background: transparent; }
        input[type="range"]:focus { outline: none; }
        input[type="range"]::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: #27272a; border-radius: 999px; }
        input[type="range"]::-webkit-slider-thumb { height: 13px; width: 13px; border-radius: 50%; background: #10b981; cursor: pointer; -webkit-appearance: none; margin-top: -4.5px; box-shadow: 0 0 8px rgba(16, 185, 129, 0.55); transition: transform 0.12s ease; }
        input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.18); background: #34d399; }
        @keyframes pulseSecret { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.35); opacity: 0.7; } }
      `}</style>

      <EtEasterEgg etFlying={etFlying} />

      <header
        style={{
          flexShrink: 0,
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: 'rgba(20, 20, 23, 0.9)',
          backdropFilter: 'blur(12px)',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap',
          position: 'relative',
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src="/logo1.png"
            alt="PROMETHEUS"
            onClick={() => setSecretEnabled(!secretEnabled)}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
            title="Kliknij, aby przełączyć tryb ukryty"
            style={{
              width: '28px',
              height: '28px',
              objectFit: 'contain',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              cursor: 'pointer',
              filter: secretEnabled
                ? `drop-shadow(0 0 10px ${colors.custom})`
                : 'none',
              animation: secretEnabled ? 'pulseSecret 2.2s infinite' : 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '-0.02em' }}>
              PROMETHEUS
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '999px',
                backgroundColor: 'rgba(16, 185, 129, 0.14)',
                color: colors.custom,
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              ROUGH SETS & XAI
            </span>
          </div>
        </div>

        <nav
          style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: colors.bg,
            padding: '3px',
            borderRadius: '10px',
            border: `1px solid ${colors.border}`,
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11.5px',
                  fontWeight: active ? 700 : 600,
                  backgroundColor: active ? colors.cardSecondary : 'transparent',
                  color: active ? colors.custom : colors.muted,
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={13} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                minWidth: '195px',
                backgroundColor: colors.bg,
                border: `1px solid ${
                  isDropdownOpen ? colors.custom : colors.border
                }`,
                boxShadow: isDropdownOpen
                  ? '0 0 0 2px rgba(16, 185, 129, 0.18)'
                  : 'none',
                borderRadius: '10px',
                padding: '7px 12px',
                color: selectedFileName ? colors.text : colors.muted,
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <Database
                  size={13}
                  color={selectedFileName ? colors.custom : colors.muted}
                />
                <span>{selectedFileName || 'Wybierz zbiór CSV...'}</span>
              </span>
              <ChevronDown
                size={14}
                color={colors.muted}
                style={{
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.15s ease',
                }}
              />
            </button>

            {isDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  right: 0,
                  minWidth: '220px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  backgroundColor: 'rgba(20, 20, 23, 0.96)',
                  backdropFilter: 'blur(14px)',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '12px',
                  padding: '5px',
                  boxShadow: '0 16px 36px rgba(0, 0, 0, 0.55)',
                  zIndex: 50,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                {datasetFiles.length === 0 ? (
                  <div
                    style={{
                      padding: '10px 12px',
                      fontSize: '11.5px',
                      color: colors.muted,
                    }}
                  >
                    Brak plików w public/data/
                  </div>
                ) : (
                  datasetFiles.map((fileName) => {
                    const isActive = selectedFileName === fileName;
                    return (
                      <button
                        key={fileName}
                        type="button"
                        onClick={() => handleFileChange(fileName)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: isActive
                            ? 'rgba(16, 185, 129, 0.14)'
                            : 'transparent',
                          color: isActive ? colors.custom : colors.text,
                          fontSize: '12px',
                          fontWeight: isActive ? 700 : 500,
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'background-color 0.12s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive)
                            e.currentTarget.style.backgroundColor =
                              colors.cardSecondary;
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive)
                            e.currentTarget.style.backgroundColor =
                              'transparent';
                        }}
                      >
                        <span>{fileName}</span>
                        {isActive && <Check size={13} color={colors.custom} />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <button
            onClick={runIntegratedAnalysis}
            disabled={isLoading || !selectedFile || !selectedAttrToRemove}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '9px',
              border: 'none',
              cursor:
                isLoading || !selectedFile || !selectedAttrToRemove
                  ? 'not-allowed'
                  : 'pointer',
              backgroundColor:
                isLoading || !selectedFile || !selectedAttrToRemove
                  ? '#27272a'
                  : colors.custom,
              color:
                isLoading || !selectedFile || !selectedAttrToRemove
                  ? colors.muted
                  : colors.bg,
              fontWeight: 800,
              fontSize: '11.5px',
              boxShadow:
                !isLoading && selectedFile && selectedAttrToRemove
                  ? '0 0 16px rgba(16, 185, 129, 0.28)'
                  : 'none',
            }}
          >
            <Play size={12} fill="currentColor" />
            {isLoading ? `${timer}s` : `Uruchom (k=${numAttrsToRemove})`}
          </button>
        </div>
      </header>

      <section
        style={{
          flexShrink: 0,
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: 'rgba(14, 14, 17, 0.75)',
          padding: '8px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(120px, 1fr))',
          gap: '14px',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '4px' }}>
            <span style={{ color: colors.muted, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sliders size={11} color={colors.custom} /> Cechy (k)
            </span>
            <span className="num-tabular" style={{ color: colors.custom, fontWeight: 800 }}>
              {numAttrsToRemove}/{Math.max(1, availableAttributes.length - 1)}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max={Math.max(1, availableAttributes.length - 1)}
            disabled={availableAttributes.length <= 1}
            value={numAttrsToRemove}
            onChange={(e) => handleKChange(e.target.value)}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '4px' }}>
            <span style={{ color: colors.muted, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={11} color={colors.custom} /> Entropia (τ)
            </span>
            <span className="num-tabular" style={{ color: colors.custom, fontWeight: 800 }}>
              {Number(entropyThreshold).toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.30"
            max="1.00"
            step="0.05"
            value={entropyThreshold}
            onChange={(e) => setEntropyThreshold(parseFloat(e.target.value))}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '4px' }}>
            <span style={{ color: colors.muted, fontWeight: 700 }}>Drzewa (S)</span>
            <span className="num-tabular" style={{ color: colors.text, fontWeight: 700 }}>{nTrees}</span>
          </div>
          <input
            type="range"
            min="1"
            max="100"
            value={nTrees}
            onChange={(e) => setNTrees(parseInt(e.target.value, 10))}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '4px' }}>
            <span style={{ color: colors.muted, fontWeight: 700 }}>Głębokość</span>
            <span className="num-tabular" style={{ color: colors.text, fontWeight: 700 }}>{maxDepth}</span>
          </div>
          <input
            type="range"
            min="1"
            max="30"
            value={maxDepth}
            onChange={(e) => setMaxDepth(parseInt(e.target.value, 10))}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', marginBottom: '4px' }}>
            <span style={{ color: colors.muted, fontWeight: 700 }}>Train / Test</span>
            <span className="num-tabular" style={{ color: colors.text, fontWeight: 700 }}>
              {splitRatio}/{100 - splitRatio}
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="90"
            step="5"
            value={splitRatio}
            onChange={(e) => setSplitRatio(parseInt(e.target.value, 10))}
          />
        </div>

        <div
          style={{
            backgroundColor: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: '7px',
            padding: '5px 9px',
            fontSize: '10.5px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={selectedAttrToRemove || 'Brak wybranych cech'}
        >
          <span style={{ color: colors.muted, fontWeight: 700 }}>Usuwane: </span>
          <span style={{ color: colors.custom, fontWeight: 700 }}>
            {selectedAttrToRemove || '—'}
          </span>
        </div>
      </section>

      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '16px 24px',
          maxWidth: '1600px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {activeTab === 'MATRIX' && (
          <MatrixTab
            isMatrixLoading={isMatrixLoading}
            inconsistencyMatrix={inconsistencyMatrix}
            topCombinations={topCombinations}
            topCombinationsMeta={topCombinationsMeta}
            forceExactScan={forceExactScan}
            onForceExactToggle={handleForceExactToggle}
            selectedAttrToRemove={selectedAttrToRemove}
            setSelectedAttrToRemove={setSelectedAttrToRemove}
            numAttrsToRemove={numAttrsToRemove}
            setNumAttrsToRemove={setNumAttrsToRemove}
            integratedResults={integratedResults}
          />
        )}

        {integratedResults ? (
          <>
            {activeTab === 'METRICS' && (
              <MetricsTab integratedResults={integratedResults} />
            )}

            {activeTab === 'RULES' && (
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

            {activeTab === 'RESEARCH' && (
              <ResearchTab integratedResults={integratedResults} />
            )}
          </>
        ) : (
          activeTab !== 'MATRIX' && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                border: `1px dashed ${colors.border}`,
                borderRadius: '14px',
                backgroundColor: 'rgba(20, 20, 23, 0.45)',
                color: colors.muted,
                fontSize: '13px',
              }}
            >
              <Activity size={24} color={colors.custom} />
              <div>
                Wybierz zbiór CSV na górze i kliknij{' '}
                <strong style={{ color: colors.text }}>
                  Uruchom (k={numAttrsToRemove})
                </strong>
                .
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}