import React, { useMemo } from 'react';
import { BookOpen, CheckCircle2, Filter, Sparkles } from 'lucide-react';
import { colors } from '../../constants/theme';
import { int, generateRuleSentence } from '../../utils/helpers';
import { RulePill } from '../common/UIComponents';

export default function RulesTab({
  integratedResults,
  selectedRulesMethod,
  setSelectedRulesMethod,
  expandedGroups,
  setExpandedGroups,
  nTrees,
  triggerEtFlight,
}) {
  const activeMethodData = integratedResults?.results?.[selectedRulesMethod];
  const rawRulesList =
    activeMethodData?.Reguly_Globalne ||
    activeMethodData?.algorithmAResults ||
    [];

  const rulesList = useMemo(() => {
    return rawRulesList.map((r, idx) => {
      const normalizedConditions = (r.conditions || []).map((c) => ({
        attribute: c.attribute,
        op: c.op || '=',
        val: c.val !== undefined ? c.val : c.value,
      }));

      return {
        ...r,
        conditions: normalizedConditions,
        supportCount: r.supportCount ?? 1,
        isBestRule: r.isBestRule !== undefined ? r.isBestRule : idx === 0,
      };
    });
  }, [rawRulesList]);

  const getMethodColor = (m) => {
    if (m === 'BASELINE') return colors.baseline;
    if (m === 'GD') return colors.gd;
    if (m === 'MCD') return colors.mcd;
    return colors.custom;
  };

  const activeAccent = getMethodColor(selectedRulesMethod);
  const toggleGroup = (sup) =>
    setExpandedGroups((p) => ({ ...p, [sup]: !p[sup] }));

  const maxTrees = Math.max(1, int(nTrees));
  const uniqueSupports = useMemo(
    () =>
      Array.from(new Set(rulesList.map((r) => r.supportCount))).sort(
        (a, b) => b - a
      ),
    [rulesList]
  );

  const topSupport = uniqueSupports.length > 0 ? uniqueSupports[0] : 0;
  const avgConditions =
    rulesList.length > 0
      ? (
          rulesList.reduce((acc, r) => acc + r.conditions.length, 0) /
          rulesList.length
        ).toFixed(1)
      : '0.0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
            <BookOpen size={18} color={activeAccent} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
              Baza Reguł Wyjaśnialnych (Algorytm A)
            </h3>
          </div>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: colors.muted }}>
            Porównuj powtarzalność i semantykę reguł globalnych pomiędzy wariantami redukcji niespójności.
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
          {[
            { key: 'BASELINE', label: 'Baseline', color: colors.baseline },
            { key: 'GD', label: 'GD', color: colors.gd },
            { key: 'MCD', label: 'MCD', color: colors.mcd },
            { key: 'CUSTOM', label: 'Entropy (ET)', color: colors.custom },
          ].map((m) => {
            const isSelected = selectedRulesMethod === m.key;
            return (
              <button
                key={m.key}
                onClick={() => {
                  setSelectedRulesMethod(m.key);
                  setExpandedGroups({});
                  if (m.key === 'CUSTOM' && triggerEtFlight) triggerEtFlight();
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: isSelected ? m.color : 'transparent',
                  color: isSelected ? colors.bg : colors.muted,
                  transition: 'all 0.15s ease',
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="num-tabular"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '14px',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(20, 20, 23, 0.85)',
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: '11px', color: colors.muted }}>REGUŁY GLOBALNE</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: activeAccent, marginTop: '4px' }}>
            {rulesList.length}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(20, 20, 23, 0.85)',
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: '11px', color: colors.muted }}>MAKS. POPARCIE W LESIE</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: colors.text, marginTop: '4px' }}>
            {topSupport} / {maxTrees}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(20, 20, 23, 0.85)',
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: '11px', color: colors.muted }}>ŚR. LICZBA WARUNKÓW</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: colors.text, marginTop: '4px' }}>
            {avgConditions}
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(20, 20, 23, 0.85)',
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: '11px', color: colors.muted }}>POZIOMY POPARCIA</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: colors.text, marginTop: '4px' }}>
            {uniqueSupports.length}
          </div>
        </div>
      </div>

      {uniqueSupports.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {uniqueSupports.map((sup) => {
            const group = rulesList.filter((r) => r.supportCount === sup);
            if (group.length === 0) return null;
            const isOpen = expandedGroups[sup];
            const supportPct = Math.min(100, Math.round((sup / maxTrees) * 100));

            return (
              <div
                key={sup}
                style={{
                  border: `1px solid ${isOpen ? activeAccent : colors.border}`,
                  borderRadius: '14px',
                  overflow: 'hidden',
                  backgroundColor: 'rgba(20, 20, 23, 0.85)',
                }}
              >
                <div
                  onClick={() => toggleGroup(sup)}
                  style={{
                    padding: '14px 20px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <Filter size={14} color={activeAccent} />
                    <span className="num-tabular" style={{ fontWeight: 700, fontSize: '13px' }}>
                      Wsparcie: {sup} z {maxTrees} drzew ({supportPct}%)
                    </span>
                    <div
                      style={{
                        width: '90px',
                        height: '6px',
                        borderRadius: '999px',
                        backgroundColor: colors.bg,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${supportPct}%`,
                          height: '100%',
                          backgroundColor: activeAccent,
                        }}
                      />
                    </div>
                  </div>

                  <span className="num-tabular" style={{ color: colors.muted, fontSize: '12px', fontWeight: 700 }}>
                    {group.length} {group.length === 1 ? 'reguła' : 'reguł'} {isOpen ? '▲' : '▼'}
                  </span>
                </div>

                {isOpen && (
                  <div
                    style={{
                      padding: '18px 20px',
                      backgroundColor: colors.bg,
                      borderTop: `1px solid ${colors.border}`,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                      gap: '14px',
                    }}
                  >
                    {group.slice(0, 40).map((r, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: '13px',
                          padding: '16px',
                          backgroundColor: colors.card,
                          border: r.isBestRule
                            ? `1px solid ${activeAccent}`
                            : `1px solid ${colors.border}`,
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div>
                          {r.isBestRule && (
                            <div
                              style={{
                                color: activeAccent,
                                fontWeight: 800,
                                marginBottom: '10px',
                                fontSize: '10.5px',
                                letterSpacing: '0.05em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <Sparkles size={12} /> NAJWYŻSZE WSPARCIE W LESIE
                            </div>
                          )}

                          <div style={{ lineHeight: 1.7 }}>
                            <span style={{ color: colors.muted, fontWeight: 800, fontSize: '11px' }}>
                              IF{' '}
                            </span>
                            {r.conditions && r.conditions.length > 0 ? (
                              r.conditions.map((c, ci) => (
                                <RulePill
                                  key={ci}
                                  attr={c.attribute}
                                  op={c.op}
                                  val={c.val}
                                  accentColor={activeAccent}
                                />
                              ))
                            ) : (
                              <span style={{ color: colors.muted, fontStyle: 'italic' }}>
                                Brak warunków (reguła domyślna)
                              </span>
                            )}
                            <span style={{ color: colors.muted, fontWeight: 800, fontSize: '11px', marginLeft: '4px' }}>
                              THEN{' '}
                            </span>
                            <span
                              style={{
                                color: colors.custom,
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                              }}
                            >
                              {String(r.decision)}
                            </span>
                          </div>
                        </div>

                        {typeof generateRuleSentence === 'function' && (
                          <div
                            style={{
                              paddingTop: '10px',
                              borderTop: `1px dashed ${colors.border}`,
                              color: colors.muted,
                              fontStyle: 'italic',
                              fontSize: '11.5px',
                              lineHeight: 1.5,
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '6px',
                            }}
                          >
                            <CheckCircle2 size={13} color={activeAccent} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{generateRuleSentence(r.conditions, r.decision)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            padding: '36px',
            textAlign: 'center',
            color: colors.muted,
            border: `1px dashed ${colors.border}`,
            borderRadius: '14px',
            fontSize: '13px',
            backgroundColor: 'rgba(20, 20, 23, 0.75)',
          }}
        >
          Brak reguł globalnych dla wybranego wariantu i parametrów.
        </div>
      )}
    </div>
  );
}