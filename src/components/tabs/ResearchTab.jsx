import React, { useState } from 'react';
import { BarChart3, Layers, TrendingUp } from 'lucide-react';
import { colors } from '../../constants/theme';

export default function ResearchTab({ integratedResults }) {
  const [selectedMode, setSelectedMode] = useState('CUSTOM');

  const results = integratedResults?.research_grid || integratedResults?.results;

  if (!integratedResults || !results) {
    return (
      <div
        style={{
          padding: '44px',
          textAlign: 'center',
          color: colors.muted,
          border: `1px dashed ${colors.border}`,
          borderRadius: '16px',
          backgroundColor: 'rgba(20, 20, 23, 0.55)',
          fontSize: '13px',
        }}
      >
        Brak danych siatki badawczej. Uruchom potok w górnym pasku, aby wygenerować wyniki dla{' '}
        <strong style={{ color: colors.custom }}>S = 10, 30 i 50</strong>.
      </div>
    );
  }

  const modes = ['CUSTOM', 'MCD', 'GD', 'BASELINE'];
  const currentData = results[selectedMode] || results.GD || results.BASELINE;
  const isResearchData =
    currentData &&
    (currentData.FAZA_1_REPREZENTACJA_WIEDZY_BEZ_PODZIALU ||
      currentData.FAZA_2_KLASYFIKACJA_TRAIN_TEST_70_30);

  const getAccentColor = (m) => {
    if (m === 'GD') return colors.gd;
    if (m === 'MCD') return colors.mcd;
    if (m === 'CUSTOM') return colors.custom;
    return colors.baseline;
  };

  const activeAccent = getAccentColor(selectedMode);
  const phase1Entries = Object.entries(
    currentData?.FAZA_1_REPREZENTACJA_WIEDZY_BEZ_PODZIALU || {}
  );
  const phase2Entries = Object.entries(
    currentData?.FAZA_2_KLASYFIKACJA_TRAIN_TEST_70_30 || {}
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div
        style={{
          backgroundColor: 'rgba(20, 20, 23, 0.85)',
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          padding: '22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} color={activeAccent} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
              Raport Badawczy — Siatka Drzew (S = 10, 30, 50)
            </h3>
          </div>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: colors.muted }}>
            Usunięte cechy:{' '}
            <strong style={{ color: colors.danger }}>
              {integratedResults.removed_attribute || 'Brak'}
            </strong>{' '}
            · {integratedResults.metodologia || '5 powtórzeń Stratified Shuffle Split'}
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '4px',
            backgroundColor: colors.bg,
            padding: '4px',
            borderRadius: '11px',
            border: `1px solid ${colors.border}`,
          }}
        >
          {modes.map((m) => {
            const isSelected = selectedMode === m;
            const col = getAccentColor(m);
            return (
              <button
                key={m}
                onClick={() => setSelectedMode(m)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: isSelected ? col : 'transparent',
                  color: isSelected ? colors.bg : colors.muted,
                  transition: 'all 0.15s ease',
                }}
              >
                {m === 'CUSTOM' ? 'Entropy (ET)' : m}
              </button>
            );
          })}
        </div>
      </div>

      {!isResearchData ? (
        <div
          style={{
            padding: '32px',
            backgroundColor: 'rgba(251, 191, 36, 0.08)',
            border: `1px dashed ${colors.baseline}`,
            borderRadius: '14px',
            textAlign: 'center',
            fontSize: '13px',
          }}
        >
          Trwa przeliczanie siatki badawczej dla <strong>S = 10, 30 i 50</strong> w tle...
        </div>
      ) : (
        <>
          <div
            className="num-tabular"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}
          >
            {phase1Entries.map(([sKey, p1Stats]) => {
              const p2Stats =
                currentData?.FAZA_2_KLASYFIKACJA_TRAIN_TEST_70_30?.[sKey] || {};
              const diff = p2Stats.porownanie_roznica_accuracy_reguly_vs_drzewa;
              const compression = Number(p1Stats.stopien_kompresji_procent ?? 0);

              return (
                <div
                  key={sKey}
                  style={{
                    backgroundColor: 'rgba(20, 20, 23, 0.85)',
                    border: `1px solid ${colors.border}`,
                    borderTop: `3px solid ${activeAccent}`,
                    borderRadius: '14px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: activeAccent }}>
                      {sKey.replace('_', ' = ')} drzew
                    </span>
                    <span style={{ fontSize: '11px', color: colors.muted }}>
                      Reguły: <strong>{p1Stats.liczba_regul_algorytm_A}</strong> /{' '}
                      {p1Stats.liczba_regul_lasu_losowego}
                    </span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                      <span style={{ color: colors.muted }}>Kompresja reguł</span>
                      <strong style={{ color: '#38bdf8' }}>{compression.toFixed(1)}%</strong>
                    </div>
                    <div style={{ height: '6px', borderRadius: '999px', backgroundColor: colors.bg, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(0, compression))}%`,
                          height: '100%',
                          backgroundColor: '#38bdf8',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '12px' }}>
                    <span style={{ color: colors.muted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <TrendingUp size={13} color={activeAccent} /> Δ Acc (Reguły vs Las):
                    </span>
                    <strong
                      style={{
                        fontSize: '14px',
                        color:
                          diff > 0
                            ? colors.custom
                            : diff < 0
                            ? colors.danger
                            : colors.muted,
                      }}
                    >
                      {diff !== undefined ? (diff > 0 ? `+${diff}%` : `${diff}%`) : '—'}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              backgroundColor: 'rgba(20, 20, 23, 0.85)',
              border: `1px solid ${colors.border}`,
              borderRadius: '16px',
              padding: '22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Layers size={16} color={activeAccent} />
              <h4 style={{ margin: 0, color: activeAccent, fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
                I. Reprezentacja Wiedzy — Las Losowy vs Algorytm A (Cały zbiór)
              </h4>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="num-tabular" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'center' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}`, color: colors.muted, fontSize: '11px' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Rozmiar lasu (S)</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Model</th>
                    <th style={{ padding: '10px' }}>Reguły</th>
                    <th style={{ padding: '10px' }}>Śr. długość</th>
                    <th style={{ padding: '10px' }}>Wsparcie (wiersze)</th>
                    <th style={{ padding: '10px', color: activeAccent }}>Wsparcie (%)</th>
                    <th style={{ padding: '10px', color: '#38bdf8' }}>Kompresja</th>
                  </tr>
                </thead>
                <tbody>
                  {phase1Entries.map(([sKey, stats]) => (
                    <React.Fragment key={sKey}>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}>
                        <td rowSpan={2} style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>
                          {sKey.replace('_', ' = ')}
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'left', color: colors.muted }}>Las Losowy (ID3)</td>
                        <td style={{ padding: '9px 10px', color: colors.muted }}>{stats.liczba_regul_lasu_losowego ?? '—'}</td>
                        <td style={{ padding: '9px 10px', color: colors.muted }}>{stats.srednia_dlugosc_regul_lasu_losowego ?? '—'}</td>
                        <td style={{ padding: '9px 10px', color: colors.muted }}>{stats.srednie_wsparcie_regul_wiersze_lasu_losowego ?? '—'}</td>
                        <td style={{ padding: '9px 10px', color: colors.muted }}>{stats.srednie_wsparcie_regul_procent_lasu_losowego ?? '—'}%</td>
                        <td rowSpan={2} style={{ padding: '12px 10px', fontWeight: 900, color: '#38bdf8', borderBottom: `1px solid ${colors.border}` }}>
                          {stats.stopien_kompresji_procent ?? 0}%
                        </td>
                      </tr>
                      <tr style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '9px 10px', textAlign: 'left', color: activeAccent, fontWeight: 700 }}>Algorytm A</td>
                        <td style={{ padding: '9px 10px', fontWeight: 800 }}>{stats.liczba_regul_algorytm_A ?? '—'}</td>
                        <td style={{ padding: '9px 10px', fontWeight: 700 }}>{stats.srednia_dlugosc_regul ?? '—'}</td>
                        <td style={{ padding: '9px 10px', fontWeight: 700 }}>{stats.srednie_wsparcie_regul_wiersze ?? '—'}</td>
                        <td style={{ padding: '9px 10px', fontWeight: 800, color: activeAccent }}>{stats.srednie_wsparcie_regul_procent ?? '—'}%</td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div
            style={{
              backgroundColor: 'rgba(20, 20, 23, 0.85)',
              border: `1px solid ${colors.border}`,
              borderRadius: '16px',
              padding: '22px',
            }}
          >
            <h4 style={{ margin: '0 0 14px 0', color: activeAccent, fontSize: '13px', fontWeight: 800, textTransform: 'uppercase' }}>
              II. Ewaluacja Klasyfikacji — Średnia z 5 losowań
            </h4>

            <div style={{ overflowX: 'auto' }}>
              <table className="num-tabular" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'center' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${colors.border}`, color: colors.muted, fontSize: '11px' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Rozmiar lasu (S)</th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Model</th>
                    <th style={{ padding: '10px' }}>Accuracy</th>
                    <th style={{ padding: '10px' }}>Precision</th>
                    <th style={{ padding: '10px' }}>Recall</th>
                    <th style={{ padding: '10px' }}>F1-Score</th>
                    <th style={{ padding: '10px', color: colors.custom }}>Δ Acc (Reguły vs Las)</th>
                  </tr>
                </thead>
                <tbody>
                  {phase2Entries.map(([sKey, stats]) => {
                    const drzewa = stats.DRZEWA_LAS_LOSOWY_AVG_5_RUNS;
                    const reguly = stats.REGULY_ALGORYTM_A_AVG_5_RUNS;
                    const diff = stats.porownanie_roznica_accuracy_reguly_vs_drzewa;

                    return (
                      <React.Fragment key={sKey}>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}>
                          <td rowSpan={2} style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 700, borderBottom: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>
                            {sKey.replace('_', ' = ')}
                          </td>
                          <td style={{ padding: '9px 10px', textAlign: 'left', color: colors.muted }}>Las Losowy</td>
                          <td style={{ padding: '9px 10px', fontWeight: 600 }}>{drzewa?.avg_accuracy ?? '—'}%</td>
                          <td style={{ padding: '9px 10px' }}>{drzewa?.avg_precision ?? '—'}%</td>
                          <td style={{ padding: '9px 10px' }}>{drzewa?.avg_recall ?? '—'}%</td>
                          <td style={{ padding: '9px 10px' }}>{drzewa?.avg_f1_score ?? '—'}%</td>
                          <td
                            rowSpan={2}
                            style={{
                              padding: '12px 10px',
                              fontWeight: 900,
                              fontSize: '13.5px',
                              borderBottom: `1px solid ${colors.border}`,
                              color:
                                diff > 0
                                  ? colors.custom
                                  : diff < 0
                                  ? colors.danger
                                  : colors.muted,
                            }}
                          >
                            {diff !== undefined ? (diff > 0 ? `+${diff}%` : `${diff}%`) : '—'}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: `1px solid ${colors.border}`, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '9px 10px', textAlign: 'left', color: activeAccent, fontWeight: 700 }}>Reguły (Alg. A)</td>
                          <td style={{ padding: '9px 10px', fontWeight: 800 }}>{reguly?.avg_accuracy ?? '—'}%</td>
                          <td style={{ padding: '9px 10px', fontWeight: 600 }}>{reguly?.avg_precision ?? '—'}%</td>
                          <td style={{ padding: '9px 10px', fontWeight: 600 }}>{reguly?.avg_recall ?? '—'}%</td>
                          <td style={{ padding: '9px 10px', fontWeight: 800, color: activeAccent }}>{reguly?.avg_f1_score ?? '—'}%</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div
            className="num-tabular"
            style={{
              backgroundColor: 'rgba(20, 20, 23, 0.85)',
              border: `1px solid ${colors.border}`,
              borderRadius: '16px',
              padding: '16px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
              fontSize: '12px',
            }}
          >
            <div>
              <span style={{ color: colors.muted }}>Najwyższa kompresja w siatce: </span>
              <strong style={{ color: '#38bdf8' }}>
                {(() => {
                  const bestComp = [...phase1Entries].sort(
                    (a, b) =>
                      Number(b[1]?.stopien_kompresji_procent ?? 0) -
                      Number(a[1]?.stopien_kompresji_procent ?? 0)
                  )[0];
                  return bestComp
                    ? `${bestComp[0].replace('_', ' = ')} (${bestComp[1].stopien_kompresji_procent}%)`
                    : '—';
                })()}
              </strong>
            </div>

            <div>
              <span style={{ color: colors.muted }}>Najlepsze Δ Acc (Reguły vs Las): </span>
              <strong style={{ color: colors.custom }}>
                {(() => {
                  const bestDiff = [...phase2Entries].sort(
                    (a, b) =>
                      Number(
                        b[1]?.porownanie_roznica_accuracy_reguly_vs_drzewa ?? -999
                      ) -
                      Number(
                        a[1]?.porownanie_roznica_accuracy_reguly_vs_drzewa ?? -999
                      )
                  )[0];
                  const val =
                    bestDiff?.[1]?.porownanie_roznica_accuracy_reguly_vs_drzewa;
                  if (val === undefined) return '—';
                  return `${bestDiff[0].replace('_', ' = ')} (${val > 0 ? `+${val}%` : `${val}%`})`;
                })()}
              </strong>
            </div>
          </div>
        </>
      )}
    </div>
  );
}