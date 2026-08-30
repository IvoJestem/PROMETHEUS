import React, { useState } from 'react';
import { colors } from '../../constants/theme';

export default function ResearchTab({ integratedResults }) {
  const [selectedMode, setSelectedMode] = useState('GD');

  const results = integratedResults?.research_grid || integratedResults?.results;

  if (!integratedResults || !results) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: colors.muted, border: `2px dashed ${colors.border}`, borderRadius: '12px' }}>
        Brak danych badawczych. Wybierz zbiór z panelu po lewej i kliknij przycisk <b style={{ color: colors.custom }}>"🚀 URUCHOM PEŁNY POTOK PROMETHEUS"</b>, aby wygenerować statystyki!
      </div>
    );
  }

  const modes = ['GD', 'MCD', 'CUSTOM', 'BASELINE'];
  const currentData = results[selectedMode];
  const isResearchData = currentData && (currentData.FAZA_1_REPREZENTACJA_WIEDZY_BEZ_PODZIALU || currentData.FAZA_2_KLASYFIKACJA_TRAIN_TEST_70_30);

  const getAccentColor = (m) => {
    if (m === 'GD') return colors.gd;
    if (m === 'MCD') return colors.mcd;
    if (m === 'CUSTOM') return colors.custom;
    return colors.baseline;
  };

  const activeAccent = getAccentColor(selectedMode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. NAGŁÓWEK I WYBÓR METODY NIESPÓJNOŚCI */}
      <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: colors.text }}>
              Raport z Badania Empirycznego (Siatka S: 10, 30, 50)
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: colors.muted }}>
              Usunięty atrybut (niespójność): <b style={{ color: colors.danger }}>{integratedResults.removed_attribute || "Brak"}</b> | Metodologia: 5x Stratified Shuffle Split 70/30
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px', backgroundColor: '#141417', padding: '6px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
            {modes.map((m) => {
              const isSelected = selectedMode === m;
              const color = getAccentColor(m);
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMode(m)}
                  style={{
                    padding: '8px 16px', borderRadius: '7px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', border: 'none',
                    backgroundColor: isSelected ? color : 'transparent',
                    color: isSelected ? colors.bg : colors.muted,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {m === 'CUSTOM' ? 'KONFLICT (ET)' : m}
                </button>
              );
            })}
          </div>
        </div>

        {/* METADANE ZBIORU */}
        {currentData?.dataset_metadata && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px dashed ${colors.border}`, display: 'flex', gap: '24px', fontSize: '13px' }}>
            <div>Obiekty (wiersze): <b style={{ color: colors.text }}>{currentData.dataset_metadata.rows_count}</b></div>
            <div>Cechy warunkowe: <b style={{ color: colors.text }}>{currentData.dataset_metadata.cols_count}</b></div>
            <div>Wariant: <b style={{ color: activeAccent }}>{selectedMode === 'CUSTOM' ? 'KONFLICT (ET)' : selectedMode}</b></div>
          </div>
        )}
      </div>

      {/* OSTRZEŻENIE JEŚLI DANE W TLE JESZCZE SIĘ LICZĄ */}
      {!isResearchData ? (
        <div style={{ 
          padding: '36px', 
          backgroundColor: 'rgba(251, 191, 36, 0.08)', 
          border: `1px dashed ${colors.baseline}`, 
          borderRadius: '12px', 
          textAlign: 'center', 
          lineHeight: '1.6' 
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: colors.baseline, fontSize: '16px' }}>Trwa przeliczanie siatki badawczej w tle...</h4>
          <p style={{ margin: 0, fontSize: '13px', color: colors.text }}>
            Obecnie w pamięci aplikacji znajdują się wyniki z szybkiej analizy suwaków.
            <br /><br />
            Serwer Pythona w tle przelicza pełną siatkę dla <b>S = 10, 30 i 50 drzew</b>. 
            Gdy tylko skończy, tabele zaktualizują się automatycznie!
          </p>
        </div>
      ) : (
        <>
          {/* 2. TABELA: REPREZENTACJA WIEDZY (Las Losowy vs Algorytm A) */}
          <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', color: activeAccent, fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              I. Reprezentacja Wiedzy – Porównanie Lasu Losowego i Algorytmu A (Bez podziału zbioru)
            </h4>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'center' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colors.border}`, color: colors.muted }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Liczba Drzew (S)</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Model</th>
                    <th style={{ padding: '12px' }}>Liczba Reguł</th>
                    <th style={{ padding: '12px' }}>Śr. Długość Reguły</th>
                    <th style={{ padding: '12px' }}>Długość Względna</th>
                    <th style={{ padding: '12px' }}>Śr. Wsparcie (Wiersze)</th>
                    <th style={{ padding: '12px', color: activeAccent }}>Śr. Wsparcie (%)</th>
                    <th style={{ padding: '12px', color: '#38bdf8' }}>Kompresja (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData?.FAZA_1_REPREZENTACJA_WIEDZY_BEZ_PODZIALU && 
                    Object.entries(currentData.FAZA_1_REPREZENTACJA_WIEDZY_BEZ_PODZIALU).map(([sKey, stats]) => (
                    <React.Fragment key={sKey}>
                      {/* Wiersz dla surowego Lasu Losowego */}
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}>
                        <td rowSpan={2} style={{ padding: '14px', textAlign: 'left', fontWeight: 'bold', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>
                          {sKey.replace('_', ' = ')} drzew
                        </td>
                        <td style={{ padding: '10px', textAlign: 'left', color: colors.muted }}>Las Losowy (Surowy)</td>
                        <td style={{ padding: '10px', color: colors.muted }}>{stats.liczba_regul_lasu_losowego ?? '-'}</td>
                        <td style={{ padding: '10px', color: colors.muted }}>{stats.srednia_dlugosc_regul_lasu_losowego ?? '-'}</td>
                        <td style={{ padding: '10px', color: colors.muted }}>-</td>
                        <td style={{ padding: '10px', color: colors.muted }}>{stats.srednie_wsparcie_regul_wiersze_lasu_losowego ?? '-'}</td>
                        <td style={{ padding: '10px', color: colors.muted }}>{stats.srednie_wsparcie_regul_procent_lasu_losowego ?? '-'}%</td>
                        <td rowSpan={2} style={{ padding: '14px', fontWeight: '900', color: '#38bdf8', borderBottom: `1px solid ${colors.border}` }}>
                          {stats.stopien_kompresji_procent ?? 0}%
                        </td>
                      </tr>
                      {/* Wiersz dla zoptymalizowanego Algorytmu A */}
                      <tr style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '10px', textAlign: 'left', color: activeAccent, fontWeight: 'bold' }}>Algorytm A (Zoptymalizowany)</td>
                        <td style={{ padding: '10px', fontWeight: '800', color: colors.text }}>{stats.liczba_regul_algorytm_A ?? '-'}</td>
                        <td style={{ padding: '10px', fontWeight: 'bold', color: colors.text }}>{stats.srednia_dlugosc_regul ?? '-'}</td>
                        <td style={{ padding: '10px', color: colors.muted }}>{stats.srednia_dlugosc_wzgledem_liczby_wierszy ?? '-'}</td>
                        <td style={{ padding: '10px', fontWeight: 'bold', color: colors.text }}>{stats.srednie_wsparcie_regul_wiersze ?? '-'}</td>
                        <td style={{ padding: '10px', fontWeight: '800', color: activeAccent }}>{stats.srednie_wsparcie_regul_procent ?? '-'}%</td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. TABELA: KLASYFIKACJA (PODZIAŁ 70/30 - 5 POWTÓRZEŃ) */}
          <div style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '24px' }}>
            <h4 style={{ margin: '0 0 16px 0', color: activeAccent, fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              II. Ewaluacja Klasyfikacji – Podział 70% Train / 30% Test (Średnia z 5 losowań stratyfikowanych)
            </h4>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'center' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colors.border}`, color: colors.muted }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Wielkość Lasu</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Klasyfikator</th>
                    <th style={{ padding: '12px' }}>Accuracy (%)</th>
                    <th style={{ padding: '12px' }}>Precision (%)</th>
                    <th style={{ padding: '12px' }}>Recall (%)</th>
                    <th style={{ padding: '12px' }}>F1-Score (%)</th>
                    <th style={{ padding: '12px', color: colors.custom }}>Różnica Acc (Reguły vs Drzewa)</th>
                  </tr>
                </thead>
                <tbody>
                  {currentData?.FAZA_2_KLASYFIKACJA_TRAIN_TEST_70_30 && 
                    Object.entries(currentData.FAZA_2_KLASYFIKACJA_TRAIN_TEST_70_30).map(([sKey, stats]) => {
                      const drzewa = stats.DRZEWA_LAS_LOSOWY_AVG_5_RUNS;
                      const reguly = stats.REGULY_ALGORYTM_A_AVG_5_RUNS;
                      const diff = stats.porownanie_roznica_accuracy_reguly_vs_drzewa;
                      
                      return (
                        <React.Fragment key={sKey}>
                          {/* Wiersz dla Drzew */}
                          <tr style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}>
                            <td rowSpan={2} style={{ padding: '14px', textAlign: 'left', fontWeight: 'bold', borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>
                              {sKey.replace('_', ' = ')}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'left', color: colors.muted }}>Las Losowy (Drzewa)</td>
                            <td style={{ padding: '10px', fontWeight: '600' }}>{drzewa?.avg_accuracy ?? '-'}%</td>
                            <td style={{ padding: '10px' }}>{drzewa?.avg_precision ?? '-'}%</td>
                            <td style={{ padding: '10px' }}>{drzewa?.avg_recall ?? '-'}%</td>
                            <td style={{ padding: '10px' }}>{drzewa?.avg_f1_score ?? '-'}%</td>
                            <td rowSpan={2} style={{ 
                              padding: '14px', 
                              fontWeight: '900', 
                              fontSize: '14px',
                              borderBottom: `1px solid ${colors.border}`,
                              color: diff > 0 ? colors.custom : (diff < 0 ? colors.danger : colors.muted) 
                            }}>
                              {diff !== undefined ? (diff > 0 ? `+${diff}%` : `${diff}%`) : '-'}
                            </td>
                          </tr>
                          {/* Wiersz dla Reguł */}
                          <tr style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '10px', textAlign: 'left', color: activeAccent, fontWeight: 'bold' }}>Reguły (Algorytm A)</td>
                            <td style={{ padding: '10px', fontWeight: '800', color: colors.text }}>{reguly?.avg_accuracy ?? '-'}%</td>
                            <td style={{ padding: '10px', fontWeight: '600' }}>{reguly?.avg_precision ?? '-'}%</td>
                            <td style={{ padding: '10px', fontWeight: '600' }}>{reguly?.avg_recall ?? '-'}%</td>
                            <td style={{ padding: '10px', fontWeight: '800', color: activeAccent }}>{reguly?.avg_f1_score ?? '-'}%</td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}