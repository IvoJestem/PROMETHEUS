import React from 'react';
import { colors } from '../../constants/theme';

export const RulePill = ({ attr, op, val, accentColor }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    backgroundColor: '#1c1c21',
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    padding: '3px 10px',
    margin: '3px',
    fontSize: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  }}>
    <span style={{ color: accentColor, marginRight: '6px', fontWeight: '600' }}>{attr}</span>
    <span style={{ color: colors.muted, marginRight: '6px' }}>{op}</span>
    <span style={{ color: colors.text, fontWeight: '500' }}>{val}</span>
  </span>
);

export const StatRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px dashed ${colors.border}`, fontSize: '13px' }}>
    <span style={{ color: colors.muted }}>{label}</span>
    <strong style={{ color: colors.text }}>{value}</strong>
  </div>
);

export const SectionHeader = ({ title, color }) => (
  <h5 style={{ color: color, margin: '20px 0 10px 0', fontSize: '11px', fontWeight: '800', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
    {title}
  </h5>
);