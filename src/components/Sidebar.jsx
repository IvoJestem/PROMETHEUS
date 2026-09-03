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
    <aside style={{ width: '340px', borderRight: `1px solid ${colors.border}`, padding: '28px', backgroundColor: colors.card, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px', zIndex: 10 }}>
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
        <div style={{ fontSize: '11px', color: colors.muted, marginTop: '4px', lineHeight: '1.6', letterSpacing: '0.01em' }}>
          <span style={{ color: colors.custom, fontWeight: 'bold' }}>P</span>anel{' '}
          <span style={{ color: colors.custom, fontWeight: 'bold' }}>R</span>ozstrzygania{' '}
          <span style={{ color: colors.custom, fontWeight: 'bold' }}>O</span>bszarów{' '}
          <span style={{ color: colors.custom, fontWeight: 'bold' }}>M</span>etodycznych{' '}
          <span style={{ color: colors.custom, fontWeight: 'bold' }}>E</span>waluacji{' '}
          <span style={{ color: colors.custom, fontWeight: 'bold' }}>T</span>abelarycznych{' '}
          <span style={{ color: colors.custom, fontWeight: 'bold' }}>H</span>ipotez{' '}
          <span style={{ color: colors.custom, fontWeight: 'bold' }}>E</span>ntropijnych i{' '}
          <span style={{ color: colors.custom, fontWeight: 'bold' }}>U</span>jednoliconych{' '}
          <span style={{ color: colors.custom, fontWeight: 'bold' }}>S</span>ystemów
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted, letterSpacing: '0.05em' }}>ZBIÓR DANYCH</label>
          <select
            onChange={handleFileChange}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text, marginTop: '6px', fontSize: '13px' }}
          >
            <option value="">Wybierz plik z repozytorium...</option>
            {datasetFiles.map(fileName => (
              <option key={fileName} value={fileName}>{fileName}</option>
            ))}
          </select>
        </div>

        {availableAttributes.length > 1 && (
          <div style={{ backgroundColor: '#141417', padding: '14px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: colors.custom, letterSpacing: '0.05em' }}>
                LICZBA ATRYBUTÓW DO USUNIĘCIA (k)
              </label>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.custom, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                k = {numAttrsToRemove} z {availableAttributes.length}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={Math.max(1, availableAttributes.length - 1)}
              value={numAttrsToRemove}
              onChange={e => handleKChange(e.target.value)}
              style={{ marginTop: '10px', width: '100%' }}
            />
          </div>
        )}

        {availableAttributes.length > 0 && (
          <div>
            <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted, letterSpacing: '0.05em' }}>
              USUWANE CECHY ({numAttrsToRemove})
            </label>
            <div style={{ padding: '10px 12px', borderRadius: '8px', border: `1px solid ${colors.border}`, backgroundColor: '#141417', color: colors.custom, marginTop: '6px', fontSize: '12px', fontWeight: 'bold', wordBreak: 'break-all' }}>
              {selectedAttrToRemove || "Brak"}
            </div>
          </div>
        )}

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted, letterSpacing: '0.05em' }}>LICZBA DRZEW W LESIE (EKSPLORATOR)</label>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.custom, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>{nTrees}</span>
          </div>
          <input type="range" min="1" max="100" value={nTrees} onChange={e => setNTrees(e.target.value)} style={{ marginTop: '10px', width: '100%' }} />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted, letterSpacing: '0.05em' }}>MAKSYMALNA GŁĘBOKOŚĆ</label>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.custom, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>{maxDepth}</span>
          </div>
          <input type="range" min="1" max="100" value={maxDepth} onChange={e => setMaxDepth(e.target.value)} style={{ marginTop: '10px', width: '100%' }} />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '11px', fontWeight: '800', color: colors.muted, letterSpacing: '0.05em' }}>PROPORCJA PODZIAŁU (SPLIT)</label>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: colors.custom, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>{splitRatio}%</span>
          </div>
          <input type="range" min="1" max="100" value={splitRatio} onChange={e => setSplitRatio(e.target.value)} style={{ marginTop: '10px', width: '100%' }} />
        </div>

        <button
          onClick={runIntegratedAnalysis}
          disabled={isLoading || !selectedFile || !selectedAttrToRemove}
          style={{
            width: '100%', padding: '16px', borderRadius: '10px', backgroundColor: colors.custom, color: colors.bg,
            border: 'none', fontWeight: '800', fontSize: '13px', cursor: 'pointer', marginTop: '14px',
            transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)', letterSpacing: '0.02em'
          }}
        >
          {isLoading ? `PRZETWARZANIE (${timer}s)...` : `URUCHOM POTOK DLA k = ${numAttrsToRemove}`}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '12px', width: '100%', gap: '16px' }}>
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
          onMouseEnter={(e) => { if (!secretEnabled) e.currentTarget.style.opacity = '0.55'; }}
          onMouseLeave={(e) => { if (!secretEnabled) e.currentTarget.style.opacity = '0.25'; }}
        />
      </div>
    </aside>
  );
}