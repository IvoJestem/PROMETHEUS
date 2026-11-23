import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Info, Layers, Sparkles } from 'lucide-react';
import { colors } from '../../constants/theme';

const spectrumColors = {
  1: '#10b981',
  2: '#06b6d4',
  3: '#a855f7',
  4: '#fbbf24',
  5: '#f97316',
  6: '#ef4444',
};

function computeRowBalanceMetrics(row, totalClassesHint = 4) {
  const maxLevel = Math.min(6, Math.max(2, totalClassesHint));
  const buckets = [];
  for (let lvl = 1; lvl <= maxLevel; lvl += 1) {
    buckets.push(Number(row?.spectrum?.[String(lvl)] || 0));
  }

  const rowsCount = Number(row?.rows || 0);
  const nonZero = buckets.filter((v) => v > 0);
  if (rowsCount <= 0 || nonZero.length < 2) {
    return { balancePct: 0, score: 0 };
  }

  const totalNz = nonZero.reduce((a, b) => a + b, 0);
  const maxShare = totalNz > 0 ? Math.max(...nonZero) / totalNz : 1;

  const meanNz = nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
  const varianceNz =
    nonZero.reduce((acc, v) => acc + Math.pow(v - meanNz, 2), 0) / nonZero.length;
  const stdNz = Math.sqrt(varianceNz);
  const cvNz = meanNz > 0 ? stdNz / meanNz : 1;

  const rawEvenness = Math.max(0, 1 - Math.min(1, cvNz));
  const dominanceFactor = Math.max(
    0.05,
    1 - Math.max(0, (maxShare - 0.5) * 1.6)
  );
  const evenness = rawEvenness * dominanceFactor;

  const diversity = 0.75 + 0.15 * Math.min(4, nonZero.length);
  const score = Math.pow(rowsCount, 0.45) * Math.pow(evenness, 1.5) * diversity;

  return {
    balancePct: Math.round(evenness * 100),
    score,
  };
}

export default function MatrixTab({
  isMatrixLoading,
  inconsistencyMatrix,
  topCombinations = [],
  selectedAttrToRemove,
  setSelectedAttrToRemove,
  numAttrsToRemove,
  setNumAttrsToRemove,
  integratedResults,
}) {
  const statsBefore = integratedResults?.dataset_stats?.BEFORE || {};
  const statsAfterGD = integratedResults?.dataset_stats?.AFTER?.GD || {};
  const statsAfterMCD = integratedResults?.dataset_stats?.AFTER?.MCD || {};
  const statsAfterCustom = integratedResults?.dataset_stats?.AFTER?.CUSTOM || {};

  const detectedMaxLevel = useMemo(() => {
    let maxLvl = 2;
    const allRows = [
      ...(Array.isArray(inconsistencyMatrix) ? inconsistencyMatrix : []),
      ...(Array.isArray(topCombinations) ? topCombinations : []),
    ];
    allRows.forEach((r) => {
      for (let lvl = 2; lvl <= 6; lvl += 1) {
        if (Number(r?.spectrum?.[String(lvl)] || 0) > 0 && lvl > maxLvl) {
          maxLvl = lvl;
        }
      }
    });
    return maxLvl;
  }, [inconsistencyMatrix, topCombinations]);

  const enrichedMatrix = useMemo(() => {
    if (!Array.isArray(inconsistencyMatrix)) return [];
    return inconsistencyMatrix.map((row) => {
      const { balancePct, score } = computeRowBalanceMetrics(
        row,
        detectedMaxLevel
      );
      return { ...row, balancePct, score };
    });
  }, [inconsistencyMatrix, detectedMaxLevel]);

  const bestBalancedRow = useMemo(() => {
    if (enrichedMatrix.length === 0) return null;
    return [...enrichedMatrix].sort(
      (a, b) => b.score - a.score || b.rows - a.rows
    )[0];
  }, [enrichedMatrix]);

  const activeMatrixRow =
    enrichedMatrix.find((r) => r.k_removed === numAttrsToRemove) ||
    enrichedMatrix[0] ||
    null;

  const boundarySharePct =
    activeMatrixRow && activeMatrixRow.rows > 0
      ? (((activeMatrixRow.B_T || 0) / activeMatrixRow.rows) * 100).toFixed(1)
      : null;

  const formatDistribution = (distObj) => {
    if (!distObj || typeof distObj !== 'object') return [];
    return Object.entries(distObj);
  };

  const handleSelectVariant = (kRemoved, removedAttr) => {
    if (setNumAttrsToRemove) setNumAttrsToRemove(kRemoved);
    if (setSelectedAttrToRemove) setSelectedAttrToRemove(removedAttr);
  };

  const renderSpectrumBar = (spectrum = {}) => {
    const keys = ['1', '2', '3', '4', '5', '6'];
    const total = keys.reduce((acc, k) => acc + (Number(spectrum[k]) || 0), 0);
    if (!total) return <span style={{ color: colors.muted }}>—</span>;

    return (
      <div
        style={{
          display: 'flex',
          height: '8px',
          width: '115px',
          margin: '0 auto',
          borderRadius: '999px',
          overflow: 'hidden',
          backgroundColor: colors.bg,
          border: `1px solid ${colors.border}`,
        }}
      >
        {keys.map((k) => {
          const val = Number(spectrum[k]) || 0;
          if (!val) return null;
          return (
            <div
              key={k}
              title={`#${k}: ${val} (${((val / total) * 100).toFixed(0)}%)`}
              style={{
                width: `${(val / total) * 100}%`,
                backgroundColor: spectrumColors[k],
              }}
            />
          );
        })}
      </div>
    );
  };

  const baseRowsCount = Number(statsBefore?.rows || 0);
  const retentionPct = (rowsVal) => {
    if (!baseRowsCount || !rowsVal) return null;
    return ((Number(rowsVal) / baseRowsCount) * 100).toFixed(1);
  };

  const variantCards = [
    {
      label: '0. Oryginalny Baseline',
      removed: 'Zachowane wszystkie cechy',
      stats: statsBefore,
      color: colors.baseline,
      retention: null,
    },
    {
      label: '1. Wariant GD',
      removed: `Usunięto ${numAttrsToRemove} cech(y)`,
      stats: statsAfterGD,
      color: colors.gd,
      retention: retentionPct(statsAfterGD?.rows),
    },
    {
      label: '2. Wariant MCD',
      removed: `Usunięto ${numAttrsToRemove} cech(y)`,
      stats: statsAfterMCD,
      color: colors.mcd,
      retention: retentionPct(statsAfterMCD?.rows),
    },
    {
      label: '3. Entropy Threshold (ET)',
      removed: `Usunięto ${numAttrsToRemove} cech(y)`,
      stats: statsAfterCustom,
      color: colors.custom,
      retention: retentionPct(statsAfterCustom?.rows),
    },
  ];

  const renderTableHead = (firstColTitle) => (
    <thead>
      <tr style={{ borderBottom: `1px solid ${colors.border}`, color: colors.muted, fontSize: '11px' }}>
        <th style={{ padding: '10px 8px', textAlign: 'left' }}>{firstColTitle}</th>
        <th style={{ padding: '10px 8px', textAlign: 'left' }}>Usunięte cechy</th>
        <th style={{ padding: '10px 6px' }}>Rows</th>
        <th style={{ padding: '10px 6px' }}>Attr</th>
        <th style={{ padding: '10px 6px', color: spectrumColors[1] }}>#1</th>
        <th style={{ padding: '10px 6px', color: spectrumColors[2] }}>#2</th>
        <th style={{ padding: '10px 6px', color: spectrumColors[3] }}>#3</th>
        <th style={{ padding: '10px 6px', color: spectrumColors[4] }}>#4</th>
        <th style={{ padding: '10px 6px', color: spectrumColors[5] }}>#5</th>
        <th style={{ padding: '10px 6px', color: spectrumColors[6] }}>#6</th>
        <th style={{ padding: '10px 8px' }}>Proporcja</th>
        <th style={{ padding: '10px 6px', color: '#fbbf24' }}>Balans</th>
        <th style={{ padding: '10px 8px', color: colors.danger }}>B(T)</th>
      </tr>
    </thead>
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: integratedResults?.dataset_stats
          ? 'minmax(0, 1.65fr) minmax(300px, 1fr)'
          : 'minmax(0, 1fr)',
        gap: '22px',
        alignItems: 'start',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(20, 20, 23, 0.85)',
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          padding: '22px',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color={colors.custom} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                Macierz Podatności na Niespójności
              </h3>
            </div>
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: colors.muted }}>
              Kliknij wiersz (w macierzy lub w Top 5 poniżej), aby ustawić redukcję dla całego potoku.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: colors.muted, flexWrap: 'wrap' }}>
            {Object.entries(spectrumColors).map(([k, col]) => (
              <span key={k} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: col }} />
                #{k}
              </span>
            ))}
          </div>
        </div>

        {isMatrixLoading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: colors.custom, fontWeight: 700 }}>
            Obliczanie macierzy podatności...
          </div>
        ) : enrichedMatrix.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table
              className="num-tabular"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12.5px',
                textAlign: 'center',
              }}
            >
              {renderTableHead('Tabela')}
              <tbody>
                {enrichedMatrix.map((row, idx) => {
                  const isSelected = selectedAttrToRemove === row.removed_attribute;
                  const isBestBalanced =
                    bestBalancedRow?.k_removed === row.k_removed;

                  return (
                    <tr
                      key={idx}
                      onClick={() =>
                        handleSelectVariant(row.k_removed, row.removed_attribute)
                      }
                      style={{
                        borderBottom: `1px solid rgba(39, 39, 42, 0.65)`,
                        backgroundColor: isSelected
                          ? 'rgba(16, 185, 129, 0.11)'
                          : isBestBalanced
                          ? 'rgba(251, 191, 36, 0.06)'
                          : 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.14s ease',
                      }}
                    >
                      <td
                        style={{
                          padding: '11px 8px',
                          textAlign: 'left',
                          fontWeight: 700,
                          color: isSelected ? colors.custom : colors.text,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                          <span>{row.table_name || `k=${row.k_removed}`}</span>
                          {isBestBalanced && (
                            <span
                              style={{
                                fontSize: '9.5px',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '999px',
                                backgroundColor: 'rgba(251, 191, 36, 0.16)',
                                color: '#fbbf24',
                                border: '1px solid rgba(251, 191, 36, 0.35)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Sparkles size={9} /> BALANS
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        style={{
                          padding: '11px 8px',
                          textAlign: 'left',
                          color: colors.muted,
                          fontSize: '11.5px',
                          maxWidth: '170px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={row.removed_attribute}
                      >
                        {row.removed_attribute}
                      </td>
                      <td style={{ padding: '11px 6px', fontWeight: 700 }}>{row?.rows ?? 0}</td>
                      <td style={{ padding: '11px 6px' }}>{row?.attr_count ?? 0}</td>
                      <td style={{ padding: '11px 6px', fontWeight: 700 }}>{row?.spectrum?.['1'] ?? 0}</td>
                      <td style={{ padding: '11px 6px' }}>{row?.spectrum?.['2'] ?? 0}</td>
                      <td style={{ padding: '11px 6px' }}>{row?.spectrum?.['3'] ?? 0}</td>
                      <td style={{ padding: '11px 6px' }}>{row?.spectrum?.['4'] ?? 0}</td>
                      <td style={{ padding: '11px 6px' }}>{row?.spectrum?.['5'] ?? 0}</td>
                      <td style={{ padding: '11px 6px' }}>{row?.spectrum?.['6'] ?? 0}</td>
                      <td style={{ padding: '11px 8px' }}>{renderSpectrumBar(row?.spectrum)}</td>
                      <td style={{ padding: '11px 6px', fontWeight: 700, color: '#fbbf24' }}>
                        {row.balancePct}%
                      </td>
                      <td
                        style={{
                          padding: '11px 8px',
                          fontWeight: 800,
                          color: (row?.B_T ?? 0) > 0 ? colors.danger : colors.muted,
                        }}
                      >
                        {row?.B_T ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '36px', textAlign: 'center', color: colors.muted, fontSize: '13px' }}>
            Wybierz plik CSV w górnym pasku, aby wygenerować macierz podatności.
          </div>
        )}

        {activeMatrixRow && (
          <div
            className="num-tabular"
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
              gap: '12px',
              fontSize: '11.5px',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ color: colors.muted, fontSize: '10px' }}>AKTYWNY POZIOM REDUKCJI</div>
              <div style={{ fontWeight: 800, color: colors.custom, marginTop: '2px' }}>
                k = {numAttrsToRemove} ({selectedAttrToRemove || '—'})
              </div>
            </div>

            <div>
              <div style={{ color: colors.muted, fontSize: '10px' }}>UDZIAŁ KONFLIKTÓW B(T)</div>
              <div style={{ fontWeight: 800, color: colors.text, marginTop: '2px' }}>
                {activeMatrixRow.B_T ?? 0} / {activeMatrixRow.rows ?? 0} ({boundarySharePct ?? 0}%)
              </div>
            </div>

            {bestBalancedRow && (
              <div
                onClick={() =>
                  handleSelectVariant(
                    bestBalancedRow.k_removed,
                    bestBalancedRow.removed_attribute
                  )
                }
                title="Kliknij, aby wybrać rekomendowane k"
                style={{
                  cursor: 'pointer',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(251, 191, 36, 0.08)',
                  border: '1px solid rgba(251, 191, 36, 0.28)',
                }}
              >
                <div style={{ color: '#fbbf24', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={11} /> REKOMENDOWANY BALANS (IG)
                </div>
                <div style={{ fontWeight: 800, color: colors.text, marginTop: '2px' }}>
                  k = {bestBalancedRow.k_removed} ({bestBalancedRow.rows} rows · {bestBalancedRow.balancePct}%)
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.muted }}>
              <Info size={13} color={colors.custom} style={{ flexShrink: 0 }} />
              <span>
                Jednoznaczne (#1):{' '}
                <strong style={{ color: spectrumColors[1] }}>
                  {activeMatrixRow?.spectrum?.['1'] ?? 0}
                </strong>
              </span>
            </div>
          </div>
        )}

        {Array.isArray(topCombinations) && topCombinations.length > 0 && (
          <div
            style={{
              padding: '16px 18px',
              borderRadius: '14px',
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#fbbf24',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={13} /> TOP 5 KOMBINACJI CECH (PEŁNE PRZESZUKANIE · DUŻO WIERSZY + BALANS)
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table
                className="num-tabular"
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12.5px',
                  textAlign: 'center',
                }}
              >
                {renderTableHead('Rank')}
                <tbody>
                  {topCombinations.map((comb, idx) => {
                    const isSameRemoved =
                      selectedAttrToRemove === comb.removed_attribute;
                    return (
                      <tr
                        key={idx}
                        onClick={() =>
                          handleSelectVariant(
                            comb.k_removed,
                            comb.removed_attribute
                          )
                        }
                        title="Kliknij, aby ustawić tę kombinację usuwanych cech"
                        style={{
                          borderBottom: `1px solid rgba(39, 39, 42, 0.65)`,
                          backgroundColor: isSameRemoved
                            ? 'rgba(16, 185, 129, 0.12)'
                            : 'transparent',
                          cursor: 'pointer',
                          transition: 'background-color 0.14s ease',
                        }}
                      >
                        <td
                          style={{
                            padding: '10px 8px',
                            textAlign: 'left',
                            fontWeight: 800,
                            color: isSameRemoved ? colors.custom : '#fbbf24',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          #{idx + 1} (k={comb.k_removed})
                        </td>
                        <td
                          style={{
                            padding: '10px 8px',
                            textAlign: 'left',
                            color: isSameRemoved ? colors.text : colors.muted,
                            fontSize: '11.5px',
                            maxWidth: '170px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={comb.removed_attribute}
                        >
                          {comb.removed_attribute}
                        </td>
                        <td style={{ padding: '10px 6px', fontWeight: 700 }}>{comb?.rows ?? 0}</td>
                        <td style={{ padding: '10px 6px' }}>{comb?.attr_count ?? 0}</td>
                        <td style={{ padding: '10px 6px', fontWeight: 700 }}>{comb?.spectrum?.['1'] ?? 0}</td>
                        <td style={{ padding: '10px 6px' }}>{comb?.spectrum?.['2'] ?? 0}</td>
                        <td style={{ padding: '10px 6px' }}>{comb?.spectrum?.['3'] ?? 0}</td>
                        <td style={{ padding: '10px 6px' }}>{comb?.spectrum?.['4'] ?? 0}</td>
                        <td style={{ padding: '10px 6px' }}>{comb?.spectrum?.['5'] ?? 0}</td>
                        <td style={{ padding: '10px 6px' }}>{comb?.spectrum?.['6'] ?? 0}</td>
                        <td style={{ padding: '10px 8px' }}>{renderSpectrumBar(comb?.spectrum)}</td>
                        <td style={{ padding: '10px 6px', fontWeight: 700, color: '#fbbf24' }}>
                          {comb.balance_pct}%
                        </td>
                        <td
                          style={{
                            padding: '10px 8px',
                            fontWeight: 800,
                            color: (comb?.B_T ?? 0) > 0 ? colors.danger : colors.muted,
                          }}
                        >
                          {comb?.B_T ?? 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {integratedResults?.dataset_stats && (
        <div
          style={{
            backgroundColor: 'rgba(20, 20, 23, 0.85)',
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: colors.custom, letterSpacing: '0.05em' }}>
              STRUKTURA PO REDUKCJI (k = {numAttrsToRemove})
            </div>
            <h4 style={{ margin: '4px 0 0 0', fontSize: '16px', fontWeight: 800 }}>
              Rozkład klas decyzyjnych
            </h4>
          </div>

          {variantCards.map((v, i) => {
            const entries = formatDistribution(v.stats?.class_distribution);
            const totalCls = entries.reduce((acc, [, count]) => acc + Number(count || 0), 0);

            return (
              <div
                key={i}
                style={{
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderLeft: `3px solid ${v.color}`,
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 800, color: v.color }}>{v.label}</span>
                  <span className="num-tabular" style={{ fontSize: '11.5px', color: colors.text, fontWeight: 700 }}>
                    {v.stats?.rows ?? '—'} wierszy · {v.stats?.cols ?? '—'} cech
                  </span>
                </div>

                {entries.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {entries.map(([clsName, cnt]) => {
                      const pct = totalCls > 0 ? ((Number(cnt) / totalCls) * 100).toFixed(1) : '0.0';
                      return (
                        <span
                          key={clsName}
                          className="num-tabular"
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: colors.card,
                            border: `1px solid ${colors.border}`,
                            color: colors.text,
                          }}
                        >
                          <strong style={{ color: v.color }}>{clsName}:</strong> {cnt} ({pct}%)
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: colors.muted, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <AlertTriangle size={12} color={colors.danger} /> Brak danych klas
                  </div>
                )}

                {v.retention !== null && (
                  <div
                    className="num-tabular"
                    style={{
                      marginTop: '8px',
                      fontSize: '10.5px',
                      color: colors.muted,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Zachowana liczebność vs Baseline</span>
                    <strong style={{ color: v.color }}>{v.retention}%</strong>
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ fontSize: '11px', color: colors.muted, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={13} color={colors.custom} />
            Wariant ET automatycznie chroni klasy mniejszościowe i stabilizuje rozkład.
          </div>
        </div>
      )}
    </div>
  );
}