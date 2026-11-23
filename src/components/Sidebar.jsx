import React from 'react';
import { colors } from '../constants/theme';

const datasetFiles = Object.keys(import.meta.glob('/public/data/*.csv')).map(path => 
  path.split('/').pop() || ''
);

export default function Sidebar({
  selectedFile,
  setSelectedFile,
  setSelectedTarget,
  setIntegratedResults,
  setInconsistencyMatrix,
  setIsMatrixLoading,
  availableAttributes,
  setAvailableAttributes,
  selectedAttrToRemove,
  setSelectedAttrToRemove,
  numAttrsToRemove,
  setNumAttrsToRemove,
  nTrees,
  setNTrees,
  maxDepth,
  setMaxDepth,
  splitRatio,
  setSplitRatio,
  entropyThreshold,
  setEntropyThreshold,
  runIntegratedAnalysis,
  isLoading,
  timer,
  secretEnabled,
  setSecretEnabled
}) {
  const handleFileChange = async (e) => {
    const fileName = e.target.value;
    if (!fileName) return;

    try {
      setIsMatrixLoading(true);
      const res = await fetch(`/data/${fileName}`);
      const text = await res.text();
      const fileObj = new File([text], fileName, { type: "text/csv" });
      
      setSelectedFile(fileObj);

      const firstLine = text.split('\n')[0];
      const delimiter = firstLine.includes(';') ? ';' : ',';
      const headers = firstLine.split(delimiter).map(h => h.trim()).filter(Boolean);
      setSelectedTarget(headers[headers.length - 1]);
      setIntegratedResults(null);

      const attrFormData = new FormData();
      attrFormData.append("file", fileObj);
      const attrRes = await fetch("http://localhost:8000/get-attributes", { method: "POST", body: attrFormData });
      if (attrRes.ok) {
        const attrData = await attrRes.json();
        const attrs = attrData.attributes || [];
        setAvailableAttributes(attrs);
        setNumAttrsToRemove(1);
        setSelectedAttrToRemove(attrs[0] || "");
      }

      const matrixFormData = new FormData();
      matrixFormData.append("file", fileObj);
      const matrixRes = await fetch("http://localhost:8000/calculate-full-inconsistency-matrix", { method: "POST", body: matrixFormData });
      if (matrixRes.ok) {
        const matrixData = await matrixRes.json();
        setInconsistencyMatrix(matrixData.matrix || []);
      }
    } catch (err) {
      console.error("Błąd podczas ładowania pliku i macierzy:", err);
    } finally {
      setIsMatrixLoading(false);
    }
  };

  const handleKChange = (newK) => {
    const kVal = parseInt(newK, 10);
    setNumAttrsToRemove(kVal);
    const attrsList = availableAttributes.slice(0, kVal);
    setSelectedAttrToRemove(attrsList.join(", "));
  };

  return (
    <aside style={{ width: '360px', borderRight: `1px solid ${colors.border}`, padding: '32px', backgroundColor: colors.card, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', zIndex: 10 }}>
      <div>
        <div style={{ fontSize: '22px', fontWeight: '800', color: colors.text, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: secretEnabled ? colors.custom : colors.muted,
            boxShadow: secretEnabled ? '0 0 10px #10b981' : 'none',
            transition: 'all 0.3s'
          }}></span>
          PROMETHEUS
        </div>
        <div style={{ fontSize: '11px', color: colors.muted, marginTop: '8px', lineHeight: '1.5' }}>
          System Analizy i Usuwania Niespójności w Regułach Decyzyjnych (Rough Sets & XAI)
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: '600', color: colors.muted, letterSpacing: '0.04em' }}>ZBIÓR DANYCH</label>
          <select
            onChange={handleFileChange}
            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${colors.border}`, backgroundColor: colors.cardSecondary, color: colors.text, marginTop: '6px', fontSize: '13px', outline: 'none' }}
          >
            <option value="">Wybierz zbiór z UCI Repository...</option>
            {datasetFiles.map(fileName => (
              <option key={fileName} value={fileName}>{fileName}</option>
            ))}
          </select>
        </div>

        {availableAttributes.length > 1 && (
          <div style={{ backgroundColor: colors.cardSecondary, padding: '14px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: colors.custom, letterSpacing: '0.04em' }}>
                LICZBA ATRYBUTÓW (k)
              </label>
              <span style={{ fontSize: '12px', fontWeight: '600', color: colors.custom, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                k = {numAttrsToRemove}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={Math.max(1, availableAttributes.length - 1)}
              value={numAttrsToRemove}
              onChange={e => handleKChange(e.target.value)}
              style={{ marginTop: '12px', width: '100%' }}
            />
          </div>
        )}

        {availableAttributes.length > 0 && (
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: colors.muted, letterSpacing: '0.04em' }}>
              USUWANE CECHY ({numAttrsToRemove})
            </label>
            <div style={{ padding: '10px 14px', borderRadius: '10px', border: `1px solid ${colors.border}`, backgroundColor: colors.cardSecondary, color: colors.custom, marginTop: '6px', fontSize: '12px', fontWeight: '600', wordBreak: 'break-all' }}>
              {selectedAttrToRemove || "Brak"}
            </div>
          </div>
        )}

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: colors.muted, letterSpacing: '0.04em' }}>PRÓG ENTROPII (τ)</label>
            <span style={{ fontSize: '12px', fontWeight: '600', color: colors.custom, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>{Number(entropyThreshold).toFixed(2)}</span>
          </div>
          <input type="range" min="0.30" max="1.00" step="0.05" value={entropyThreshold} onChange={e => setEntropyThreshold(parseFloat(e.target.value))} style={{ marginTop: '10px', width: '100%' }} />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: colors.muted, letterSpacing: '0.04em' }}>LICZBA DRZEW (S)</label>
            <span style={{ fontSize: '12px', fontWeight: '600', color: colors.custom, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>{nTrees}</span>
          </div>
          <input type="range" min="1" max="100" value={nTrees} onChange={e => setNTrees(parseInt(e.target.value, 10))} style={{ marginTop: '10px', width: '100%' }} />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: colors.muted, letterSpacing: '0.04em' }}>MAKSYMALNA GŁĘBOKOŚĆ</label>
            <span style={{ fontSize: '12px', fontWeight: '600', color: colors.custom, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>{maxDepth}</span>
          </div>
          <input type="range" min="1" max="30" value={maxDepth} onChange={e => setMaxDepth(parseInt(e.target.value, 10))} style={{ marginTop: '10px', width: '100%' }} />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: colors.muted, letterSpacing: '0.04em' }}>PODZIAŁ (TRAIN / TEST)</label>
            <span style={{ fontSize: '12px', fontWeight: '600', color: colors.custom, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>{splitRatio}% / {100 - splitRatio}%</span>
          </div>
          <input type="range" min="50" max="90" step="5" value={splitRatio} onChange={e => setSplitRatio(parseInt(e.target.value, 10))} style={{ marginTop: '10px', width: '100%' }} />
        </div>

        <button
          onClick={runIntegratedAnalysis}
          disabled={isLoading || !selectedFile || !selectedAttrToRemove}
          style={{
            width: '100%', padding: '16px', borderRadius: '12px', backgroundColor: colors.custom, color: colors.bg,
            border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', marginTop: '8px',
            transition: 'all 0.2s ease', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)', letterSpacing: '0.02em'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {isLoading ? `PRZETWARZANIE (${timer}s)...` : `URUCHOM POTOK DLA k = ${numAttrsToRemove}`}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', width: '100%', paddingTop: '20px' }}>
        <img
          src="/logo1.png"
          alt="Prometheus Logo"
          onClick={() => setSecretEnabled(!secretEnabled)}
          style={{
            maxWidth: '70%',
            maxHeight: '130px',
            opacity: secretEnabled ? 0.7 : 0.25,
            filter: secretEnabled ? `drop-shadow(0 0 16px ${colors.custom}80)` : 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        />
      </div>
    </aside>
  );
}