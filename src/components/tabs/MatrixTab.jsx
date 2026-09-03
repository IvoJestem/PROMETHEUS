import React from 'react';
import { colors } from '../../constants/theme';

export default function MatrixTab({ 
  isMatrixLoading, 
  inconsistencyMatrix, 
  selectedAttrToRemove, 
  setSelectedAttrToRemove,
  numAttrsToRemove,
  setNumAttrsToRemove,
  integratedResults 
}) {
  const statsBefore = integratedResults?.dataset_stats?.BEFORE || {};
  const statsAfterGD = integratedResults?.dataset_stats?.AFTER?.GD || {};
  const statsAfterMCD = integratedResults?.dataset_stats?.AFTER?.MCD || {};
  const statsAfterCustom = integratedResults?.dataset_stats?.AFTER?.CUSTOM || {};

  const formatDistribution = (distObj) => {
    if (!distObj || typeof distObj !== 'object') return '-';
    try {
      return JSON.stringify(distObj).replace(/[{""}]/g, '').replace(/,/g, ', ');
    } catch {
      return '-';
    }
  };

  const handleRowClick = (row) => {
    if (setNumAttrsToRemove) setNumAttrsToRemove(row.k_removed);
    if (setSelectedAttrToRemove) setSelectedAttrToRemove(row.removed_attribute);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '-0.02em' }}>
            Pełna Macierz Podatności na Niespójności (Rough Sets Theory)
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: colors.muted }}>
            Charakterystyka tabel decyzyjnych Many-Valued Decisions po usunięciu 1, 2, 3, ... cech. <b>Kliknij wiersz</b>, aby wybrać stopień redukcji k do całego programu.
          </p>
        </div>

        {isMatrixLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: colors.custom, fontWeight: 'bold' }}>
            Generowanie macierzy wpływu...
          </div>
        ) : inconsistencyMatrix && Array.isArray(inconsistencyMatrix) && inconsistencyMatrix.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'center' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.border}`, color: colors.muted }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Decision table T</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Usunięte cechy (k)</th>
                  <th style={{ padding: '12px' }}>Rows</th>
                  <th style={{ padding: '12px' }}>Attr</th>
                  <th style={{ padding: '12px', backgroundColor: '#1c1c21', color: colors.custom }}>#1</th>
                  <th style={{ padding: '12px', backgroundColor: '#1c1c21' }}>#2</th>
                  <th style={{ padding: '12px', backgroundColor: '#1c1c21' }}>#3</th>
                  <th style={{ padding: '12px', backgroundColor: '#1c1c21' }}>#4</th>
                  <th style={{ padding: '12px', backgroundColor: '#1c1c21' }}>#5</th>
                  <th style={{ padding: '12px', backgroundColor: '#1c1c21' }}>#6</th>
                  <th style={{ padding: '12px', color: colors.danger, fontWeight: '900' }}>B(T) (Niespójne)</th>
                </tr>
              </thead>
              <tbody>
                {inconsistencyMatrix.map((row, idx) => {
                  const isSelected = numAttrsToRemove === row.k_removed;
                  return (
                    <tr 
                      key={idx} 
                      onClick={() => handleRowClick(row)}
                      style={{ 
                        borderBottom: `1px solid ${colors.border}`, 
                        backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '12px', textAlign: 'left', fontWeight: '800', color: isSelected ? colors.custom : colors.text }}>
                        {row.table_name || `k=${row.k_removed}`}
                        {isSelected && <span style={{ marginLeft: '8px', fontSize: '10px', color: colors.custom }}>● AKTYWNY (k={row.k_removed})</span>}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'left', color: colors.muted, fontSize: '12px' }}>
                        {row.removed_attribute}
                      </td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{row?.rows ?? 0}</td>
                      <td style={{ padding: '12px' }}>{row?.attr_count ?? 0}</td>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{row?.spectrum?.["1"] ?? 0}</td>
                      <td style={{ padding: '12px' }}>{row?.spectrum?.["2"] ?? 0}</td>
                      <td style={{ padding: '12px' }}>{row?.spectrum?.["3"] ?? 0}</td>
                      <td style={{ padding: '12px' }}>{row?.spectrum?.["4"] ?? 0}</td>
                      <td style={{ padding: '12px' }}>{row?.spectrum?.["5"] ?? 0}</td>
                      <td style={{ padding: '12px' }}>{row?.spectrum?.["6"] ?? 0}</td>
                      <td style={{ padding: '12px', fontWeight: '900', color: (row?.B_T > 0) ? colors.danger : colors.muted }}>
                        {row?.B_T ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '30px', textAlign: 'center', color: colors.muted }}>
            Wybierz plik ze zbioru danych w lewym panelu, aby załadować macierz.
          </div>
        )}
      </div>

      {integratedResults && integratedResults.dataset_stats && (
        <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
          <h4 style={{ color: colors.custom, margin: '0 0 14px 0', fontSize: '14px', fontWeight: '800', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            Charakterystyka struktury zbiorów danych dla redukcji k = {numAttrsToRemove}
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${colors.border}`, color: colors.muted }}>
                <th style={{ padding: '10px' }}>Wariant Badania</th>
                <th style={{ padding: '10px' }}>Usunięte Cechy ({numAttrsToRemove})</th>
                <th style={{ padding: '10px' }}>Liczba Obiektów (Wierszy)</th>
                <th style={{ padding: '10px' }}>Liczba Cech (Kolumn)</th>
                <th style={{ padding: '10px' }}>Rozkład Klas Decyzyjnych</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: '12px', fontWeight: 'bold', color: colors.baseline }}>0. Oryginalny Baseline</td>
                <td style={{ padding: '12px', color: colors.custom }}>Zachowany</td>
                <td style={{ padding: '12px' }}>{statsBefore.rows ?? '-'}</td>
                <td style={{ padding: '12px' }}>{statsBefore.cols ?? '-'}</td>
                <td style={{ padding: '12px', fontStyle: 'italic', color: colors.muted }}>
                  {formatDistribution(statsBefore.class_distribution)}
                </td>
              </tr>
              
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: '12px', fontWeight: 'bold', color: colors.gd }}>1. Wariant GD</td>
                <td style={{ padding: '12px', color: colors.danger }}>Usunięto {numAttrsToRemove}</td>
                <td style={{ padding: '12px' }}>{statsAfterGD.rows ?? '-'}</td>
                <td style={{ padding: '12px' }}>{statsAfterGD.cols ?? '-'}</td>
                <td style={{ padding: '12px', fontStyle: 'italic', color: colors.muted }}>
                  {formatDistribution(statsAfterGD.class_distribution)}
                </td>
              </tr>
              
              <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: '12px', fontWeight: 'bold', color: colors.mcd }}>2. Wariant MCD</td>
                <td style={{ padding: '12px', color: colors.danger }}>Usunięto {numAttrsToRemove}</td>
                <td style={{ padding: '12px' }}>{statsAfterMCD.rows ?? '-'}</td>
                <td style={{ padding: '12px' }}>{statsAfterMCD.cols ?? '-'}</td>
                <td style={{ padding: '12px', fontStyle: 'italic', color: colors.muted }}>
                  {formatDistribution(statsAfterMCD.class_distribution)}
                </td>
              </tr>
              
              <tr>
                <td style={{ padding: '12px', fontWeight: 'bold', color: colors.custom }}>3. Wariant Entropy Threshold</td>
                <td style={{ padding: '12px', color: colors.danger }}>Usunięto {numAttrsToRemove}</td>
                <td style={{ padding: '12px' }}>{statsAfterCustom.rows ?? '-'}</td>
                <td style={{ padding: '12px' }}>{statsAfterCustom.cols ?? '-'}</td>
                <td style={{ padding: '12px', fontStyle: 'italic', color: colors.muted }}>
                  {formatDistribution(statsAfterCustom.class_distribution)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}