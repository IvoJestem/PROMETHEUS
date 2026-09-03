import React from 'react';
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
  triggerEtFlight
}) {
  const activeMethodData = integratedResults?.results?.[selectedRulesMethod];
  
  const rawRulesList = activeMethodData?.Reguly_Globalne || activeMethodData?.algorithmAResults || [];

  const rulesList = rawRulesList.map((r, idx) => {
    const normalizedConditions = (r.conditions || []).map(c => ({
      attribute: c.attribute,
      op: c.op || '==',
      val: c.val !== undefined ? c.val : c.value
    }));

    return {
      ...r,
      conditions: normalizedConditions,
      supportCount: r.supportCount ?? 1,
      isBestRule: r.isBestRule !== undefined ? r.isBestRule : (idx === 0)
    };
  });

  const getMethodColor = (m) => {
    if (m === "BASELINE") return colors.baseline;
    if (m === "GD") return colors.gd;
    if (m === "MCD") return colors.mcd;
    return colors.custom;
  };

  const activeAccent = getMethodColor(selectedRulesMethod);
  const toggleGroup = (sup) => setExpandedGroups(p => ({ ...p, [sup]: !p[sup] }));

  const maxTrees = int(nTrees);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', letterSpacing: '-0.02em' }}>
            Baza Reguł Wyjaśnialnych (PROMETHEUS Engine)
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: colors.muted }}>
            Wybierz technikę usuwania niespójności, aby przeanalizować powtarzalność i semantykę reguł globalnych wyindukowanych przez Algorytm A.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#141417', padding: '6px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
          {[
            { key: "BASELINE", label: "B.C", color: colors.baseline },
            { key: "GD", label: "G.D", color: colors.gd },
            { key: "MCD", label: "M.C.D", color: colors.mcd },
            { key: "CUSTOM", label: "E.T", color: colors.custom }
          ].map(m => {
            const isSelected = selectedRulesMethod === m.key;
            return (
              <button
                key={m.key}
                onClick={() => {
                  setSelectedRulesMethod(m.key);
                  setExpandedGroups({});
                  if (m.key === "CUSTOM" && triggerEtFlight) triggerEtFlight();
                }}
                style={{
                  padding: '8px 14px', borderRadius: '7px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', border: 'none',
                  backgroundColor: isSelected ? m.color : 'transparent',
                  color: isSelected ? colors.bg : colors.muted,
                  transition: 'all 0.15s ease'
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {rulesList.length > 0 ? (
        Array.from({ length: maxTrees }, (_, i) => maxTrees - i).map(sup => {
          const group = rulesList.filter(r => r.supportCount === sup);
          if (group.length === 0) return null;
          const isOpen = expandedGroups[sup];

          return (
            <div key={sup} style={{ marginBottom: '10px', border: `1px solid ${isOpen ? activeAccent : colors.border}`, borderRadius: '10px', overflow: 'hidden' }}>
              <div
                onClick={() => toggleGroup(sup)}
                style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', backgroundColor: colors.card, alignItems: 'center', userSelect: 'none' }}
              >
                <span style={{ fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: activeAccent }}></span>
                  Poziom Poparcia Przez Drzewa: {sup} z {maxTrees}
                  {sup === 1 ? ' <Lokalny szum logiczny odrzucony w agregacji>' : ''}
                </span>
                <span style={{ color: colors.muted, fontSize: '12px', fontWeight: '600' }}>
                  {group.length} {group.length === 1 ? 'reguła' : 'reguł'} {isOpen ? '▲' : '▼'}
                </span>
              </div>
              {isOpen && (
                <div style={{ padding: '20px', backgroundColor: '#0c0c0e', borderTop: `1px solid ${colors.border}` }}>
                  {group.slice(0, 40).map((r, i) => (
                    <div key={i} style={{
                      fontSize: '13px', marginBottom: '12px', padding: '16px', backgroundColor: colors.card,
                      border: r.isBestRule ? `1px dashed ${activeAccent}` : `1px solid ${colors.border}`, borderRadius: '8px'
                    }}>
                      {r.isBestRule && (
                        <div style={{ color: activeAccent, fontWeight: '900', marginBottom: '12px', fontSize: '11px', letterSpacing: '0.05em' }}>
                          OPTYMALNY WZORZEC GLOBALNY (NAJWYŻSZE WSPARCIE W LESIE)
                        </div>
                      )}
                      <span style={{ color: colors.muted, fontWeight: '700' }}>IF </span> 
                      {r.conditions && r.conditions.length > 0 ? (
                        r.conditions.map((c, ci) => (
                          <RulePill key={ci} attr={c.attribute} op={c.op} val={c.val} accentColor={activeAccent} />
                        ))
                      ) : (
                        <span style={{ color: colors.muted, fontStyle: 'italic' }}>Brak warunków (Reguła domyślna)</span>
                      )}
                      <span style={{ color: colors.muted, fontWeight: '700' }}> THEN </span> 
                      <span style={{ color: colors.custom, fontWeight: 'bold' }}>{String(r.decision)}</span>
                      
                      {typeof generateRuleSentence === 'function' && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px dashed ${colors.border}`, color: colors.muted, fontStyle: 'italic', fontSize: '11px', lineHeight: '1.6' }}>
                          {generateRuleSentence(r.conditions, r.decision)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div style={{ padding: '32px', textAlign: 'center', color: colors.muted, border: `2px dashed ${colors.border}`, borderRadius: '12px', fontSize: '13px', backgroundColor: colors.card }}>
          Wszystkie wygenerowane reguły dla tego wariantu zostały odrzucone przez próg selekcji wsparcia.
        </div>
      )}
    </div>
  );
}