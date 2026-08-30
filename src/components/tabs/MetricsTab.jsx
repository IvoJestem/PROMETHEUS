import React from 'react';
import { colors } from '../../constants/theme';

export default function MetricsTab({ integratedResults }) {
  const results = integratedResults?.results || {};

  const cardsConfig = [
    {
      id: 'BASELINE',
      title: '0. Czysty Baseline',
      subtitle: 'Surowy las ID3 (wybór cech przez Information Gain)',
      accentColor: colors.baseline
    },
    {
      id: 'GD',
      title: '1. Generalized Decision',
      subtitle: 'Wiersze sporne scalone w decyzje uogólnione',
      accentColor: colors.gd
    },
    {
      id: 'MCD',
      title: '2. Most Common Decision',
      subtitle: 'Głosowanie większościowe (dominanta)',
      accentColor: colors.mcd
    },
    {
      id: 'CUSTOM',
      title: '3. Entropy Threshold',
      subtitle: 'Globalne usuwanie szumu informacyjnego miarą entropii',
      accentColor: colors.custom
    }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
      {cardsConfig.map((card) => {
        const data = results[card.id];
        const stats = data?.evalStats || data;
        const struct = data?.Struktura_Bazowa;
        const opt = data?.Optymalizacja_Regul;

        return (
          <div
            key={card.id}
            style={{
              backgroundColor: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              position: 'relative'
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: card.accentColor }}>
                {card.title}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: colors.muted, lineHeight: '1.4' }}>
                {card.subtitle}
              </p>
            </div>

            {!stats ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: colors.danger, fontSize: '12px' }}>
                ⚠️ Brak danych z API<br />
                <span style={{ color: colors.muted, fontSize: '11px' }}>Wariant nie został wyliczony lub zwrócił puste dane.</span>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ backgroundColor: '#141417', padding: '14px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: colors.text }}>
                      {stats.Dokladnosc_Klasyfikacji ?? '-'}%
                    </div>
                    <div style={{ fontSize: '10px', color: colors.muted, marginTop: '2px', fontWeight: 'bold' }}>Accuracy</div>
                  </div>
                  <div style={{ backgroundColor: '#141417', padding: '14px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${colors.border}` }}>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: colors.text }}>
                      {stats.f1 ?? '-'}%
                    </div>
                    <div style={{ fontSize: '10px', color: colors.muted, marginTop: '2px', fontWeight: 'bold' }}>F1-Macro</div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: card.accentColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    OPTYMALIZACJA XAI
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                    <span style={{ color: colors.muted }}>Zredukowane reguły:</span>
                    <b style={{ color: colors.text }}>{opt?.Liczba_Regul_Po ?? '-'}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                    <span style={{ color: colors.muted }}>Pierwotne reguły:</span>
                    <b style={{ color: colors.text }}>{opt?.Liczba_Regul_Przed ?? '-'}</b>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: colors.custom, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    METRYKI STATYSTYCZNE I CZAS
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                    <span style={{ color: colors.muted }}>Średnia Dokładność (μ):</span>
                    <b style={{ color: colors.text }}>{stats.Dokladnosc_Klasyfikacji ?? '-'}%</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                    <span style={{ color: colors.muted }}>Odchylenie standardowe (σ):</span>
                    <b style={{ color: colors.text }}>±{stats.Dokladnosc_Odchylenie ?? 0}%</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                    <span style={{ color: colors.muted }}>Czas wykonania folda:</span>
                    <b style={{ color: colors.text }}>{stats.Czas_Sredni ?? '-'} s</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                    <span style={{ color: colors.muted }}>Odchylenie czasu (σt):</span>
                    <b style={{ color: colors.text }}>±{stats.Czas_Odchylenie ?? 0} s</b>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '10px', fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    STRUKTURA BAZOWA
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                    <span style={{ color: colors.muted }}>Liczba Węzłów:</span>
                    <b style={{ color: colors.text }}>{struct?.Liczba_Wezlow ?? '-'}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                    <span style={{ color: colors.muted }}>Liczba Liści:</span>
                    <b style={{ color: colors.text }}>{struct?.Liczba_Lisci ?? '-'}</b>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                    <span style={{ color: colors.muted }}>Śr. głębokość:</span>
                    <b style={{ color: colors.text }}>{struct?.Srednia_Glebokosc ?? '-'}</b>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}