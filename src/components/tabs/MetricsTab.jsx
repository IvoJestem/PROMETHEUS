import React from 'react';
import { Award, Cpu, GitBranch, ShieldCheck, Table2 } from 'lucide-react';
import { colors } from '../../constants/theme';

export default function MetricsTab({ integratedResults }) {
  const results = integratedResults?.results || {};

  const cardsConfig = [
    {
      id: 'BASELINE',
      title: '0. Baseline',
      subtitle: 'Pełny zestaw cech, surowy las ID3',
      accentColor: colors.baseline,
      icon: ShieldCheck,
    },
    {
      id: 'GD',
      title: '1. Generalized Decision',
      subtitle: 'Zachowanie uogólnionych decyzji',
      accentColor: colors.gd,
      icon: GitBranch,
    },
    {
      id: 'MCD',
      title: '2. Most Common Decision',
      subtitle: 'Dominanta w klasie abstrakcji',
      accentColor: colors.mcd,
      icon: Cpu,
    },
    {
      id: 'CUSTOM',
      title: '3. Entropy Threshold',
      subtitle: 'Znormalizowany próg entropii (ET)',
      accentColor: colors.custom,
      icon: Award,
    },
  ];

  const ranked = cardsConfig.map((c) => {
    const d = results[c.id];
    const st = d?.evalStats || d;
    const rulesBefore = Number(d?.Optymalizacja_Regul?.Liczba_Regul_Przed ?? 0);
    const rulesAfter = Number(d?.Optymalizacja_Regul?.Liczba_Regul_Po ?? 0);
    const compression =
      rulesBefore > 0
        ? (((rulesBefore - rulesAfter) / rulesBefore) * 100).toFixed(1)
        : '0.0';

    return {
      ...c,
      acc: Number(st?.Dokladnosc_Klasyfikacji ?? 0),
      f1: Number(st?.f1 ?? 0),
      rulesBefore,
      rulesAfter,
      compression,
      stdAcc: Number(st?.Dokladnosc_Odchylenie ?? 0),
      timeMean: Number(st?.Czas_Sredni ?? 0),
      nodes: d?.Struktura_Bazowa?.Liczba_Wezlow ?? 0,
      leaves: d?.Struktura_Bazowa?.Liczba_Lisci ?? 0,
      depth: d?.Struktura_Bazowa?.Srednia_Glebokosc ?? 0,
      hasData: Boolean(st),
    };
  });

  const bestModel = [...ranked]
    .filter((m) => m.hasData)
    .sort((a, b) => b.f1 - a.f1 || b.acc - a.acc)[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(16, 185, 129, 0.14), rgba(20, 20, 23, 0.92))',
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            padding: '22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, color: colors.custom }}>
            <Award size={15} /> NAJWYŻSZE F1-MACRO W BIEŻĄCYM PRZEBIEGU
          </div>
          {bestModel ? (
            <>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: bestModel.accentColor }}>
                  {bestModel.title}
                </div>
                <div style={{ fontSize: '12px', color: colors.muted, marginTop: '4px' }}>
                  {bestModel.subtitle}
                </div>
              </div>
              <div className="num-tabular" style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '11px', color: colors.muted }}>Accuracy</div>
                  <div style={{ fontSize: '22px', fontWeight: 900 }}>{bestModel.acc.toFixed(2)}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: colors.muted }}>F1-Macro</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: colors.custom }}>
                    {bestModel.f1.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: colors.muted }}>Reguły (Alg. A)</div>
                  <div style={{ fontSize: '22px', fontWeight: 900 }}>
                    {bestModel.rulesAfter}{' '}
                    <span style={{ fontSize: '12px', color: colors.muted, fontWeight: 600 }}>
                      / {bestModel.rulesBefore}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: colors.muted, fontSize: '13px' }}>Brak wyników.</div>
          )}
        </div>

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
          <div style={{ fontSize: '12px', fontWeight: 800, color: colors.text }}>
            Porównanie Accuracy i F1-Macro między wariantami
          </div>

          <div className="num-tabular" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ranked.map((m) => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ fontWeight: 700, color: m.accentColor }}>{m.title}</span>
                  <span style={{ color: colors.text, fontWeight: 700 }}>
                    Acc: {m.acc.toFixed(1)}% · F1: {m.f1.toFixed(1)}%
                  </span>
                </div>
                <div
                  style={{
                    height: '8px',
                    borderRadius: '999px',
                    backgroundColor: colors.bg,
                    overflow: 'hidden',
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, m.f1))}%`,
                      height: '100%',
                      backgroundColor: m.accentColor,
                      transition: 'width 0.35s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="num-tabular"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '18px',
        }}
      >
        {ranked.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              style={{
                backgroundColor: 'rgba(20, 20, 23, 0.85)',
                border: `1px solid ${colors.border}`,
                borderTop: `3px solid ${m.accentColor}`,
                borderRadius: '14px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: m.accentColor }}>{m.title}</div>
                  <div style={{ fontSize: '11px', color: colors.muted }}>{m.subtitle}</div>
                </div>
                <Icon size={16} color={m.accentColor} />
              </div>

              {!m.hasData ? (
                <div style={{ padding: '24px 0', textAlign: 'center', fontSize: '12px', color: colors.danger }}>
                  Brak danych dla wariantu
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ backgroundColor: colors.bg, padding: '10px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                      <div style={{ fontSize: '10px', color: colors.muted }}>ACCURACY</div>
                      <div style={{ fontSize: '18px', fontWeight: 900 }}>{m.acc.toFixed(2)}%</div>
                      <div style={{ fontSize: '10px', color: colors.muted }}>±{m.stdAcc.toFixed(2)}%</div>
                    </div>
                    <div style={{ backgroundColor: colors.bg, padding: '10px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                      <div style={{ fontSize: '10px', color: colors.muted }}>F1-MACRO</div>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: m.accentColor }}>{m.f1.toFixed(2)}%</div>
                      <div style={{ fontSize: '10px', color: colors.muted }}>czas: {m.timeMean.toFixed(3)}s</div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: colors.muted }}>Reguły (po / przed):</span>
                      <strong>{m.rulesAfter} / {m.rulesBefore}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: colors.muted }}>Węzły / Liście:</span>
                      <strong>{m.nodes} / {m.leaves}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: colors.muted }}>Śr. głębokość:</span>
                      <strong>{m.depth}</strong>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          backgroundColor: 'rgba(20, 20, 23, 0.85)',
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          padding: '18px 22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Table2 size={15} color={colors.custom} />
          <span style={{ fontSize: '12px', fontWeight: 800, color: colors.text }}>
            Zestawienie porównawcze wariantów (szybki podgląd)
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            className="num-tabular"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '12px',
              textAlign: 'center',
            }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${colors.border}`, color: colors.muted, fontSize: '11px' }}>
                <th style={{ padding: '8px 10px', textAlign: 'left' }}>Wariant</th>
                <th style={{ padding: '8px 10px' }}>Accuracy</th>
                <th style={{ padding: '8px 10px' }}>F1-Macro</th>
                <th style={{ padding: '8px 10px' }}>Reguły (przed → po)</th>
                <th style={{ padding: '8px 10px' }}>Kompresja</th>
                <th style={{ padding: '8px 10px' }}>Czas śr.</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((m) => (
                <tr key={m.id} style={{ borderBottom: `1px solid rgba(39, 39, 42, 0.55)` }}>
                  <td style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700, color: m.accentColor }}>
                    {m.title}
                  </td>
                  <td style={{ padding: '9px 10px', fontWeight: 700 }}>
                    {m.acc.toFixed(2)}% <span style={{ color: colors.muted, fontWeight: 500 }}>(±{m.stdAcc.toFixed(2)}%)</span>
                  </td>
                  <td style={{ padding: '9px 10px', fontWeight: 800, color: m.accentColor }}>
                    {m.f1.toFixed(2)}%
                  </td>
                  <td style={{ padding: '9px 10px' }}>
                    {m.rulesBefore} → <strong>{m.rulesAfter}</strong>
                  </td>
                  <td style={{ padding: '9px 10px', color: '#38bdf8', fontWeight: 700 }}>
                    {m.compression}%
                  </td>
                  <td style={{ padding: '9px 10px', color: colors.muted }}>
                    {m.timeMean.toFixed(3)}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}