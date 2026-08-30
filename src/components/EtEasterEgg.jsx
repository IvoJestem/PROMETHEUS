import React from 'react';

export default function EtEasterEgg({ etFlying }) {
  if (!etFlying) return null;

  return (
    <>
      <style>{`
        @keyframes flyET {
          0% { transform: translate(-20vw, 30vh) scale(0.6) rotate(5deg); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translate(50vw, 12vh) scale(1.1) rotate(0deg); }
          90% { opacity: 1; }
          100% { transform: translate(110vw, 40vh) scale(0.7) rotate(-5deg); opacity: 0; }
        }
      `}</style>

      <div style={{ 
        position: 'fixed', 
        top: 0,
        left: 0,
        zIndex: 9999, 
        pointerEvents: 'none', 
        animation: 'flyET 4.5s linear forwards', 
        width: '160px', 
        height: '130px' 
      }}>
        <svg viewBox="0 0 100 75" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 0 16px rgba(254, 252, 232, 0.4))' }}>
          <defs>
            <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
              <stop offset="0%" stopColor="#fefce8" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#fef3c7" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#09090b" stopOpacity="0.0" />
            </radialGradient>
            <linearGradient id="bikeFrame" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id="etSkin" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#92400e" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
          </defs>

          <circle cx="50" cy="35" r="30" fill="url(#moonGlow)" stroke="rgba(254, 252, 232, 0.15)" strokeWidth="1" strokeDasharray="5 3" />

          <circle cx="25" cy="55" r="11.5" stroke="#ef4444" strokeWidth="2.5" fill="#1c1c21" />
          <circle cx="25" cy="55" r="7" stroke="rgba(244, 244, 245, 0.3)" strokeWidth="1" fill="none" />
          <circle cx="75" cy="55" r="11.5" stroke="#ef4444" strokeWidth="2.5" fill="#1c1c21" />
          <circle cx="75" cy="55" r="7" stroke="rgba(244, 244, 245, 0.3)" strokeWidth="1" fill="none" />

          <path d="M 25 55 L 46 55 L 64 36 L 75 55 M 46 55 L 55 30 L 64 36 M 55 30 L 36 38 L 25 55" stroke="url(#bikeFrame)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 64 36 L 61 19 L 56 21" stroke="#a1a1aa" strokeWidth="2.8" strokeLinecap="round" />

          <rect x="63" y="16" width="16" height="12" rx="2" fill="rgba(244, 244, 245, 0.1)" stroke="#e4e4e7" strokeWidth="1.5" />
          <line x1="69" y1="16" x2="69" y2="28" stroke="rgba(244, 244, 245, 0.2)" strokeWidth="1" />
          <line x1="74" y1="16" x2="74" y2="28" stroke="rgba(244, 244, 245, 0.2)" strokeWidth="1" />

          <path d="M 67 15 C 65 6, 77 6, 75 15 Z" fill="#fafafa" stroke="#d1d5db" strokeWidth="0.5" />
          <circle cx="71" cy="12" r="4.5" fill="url(#etSkin)" />
          <circle cx="70" cy="11.5" r="1.2" fill="#fafafa" />
          <circle cx="70" cy="11.5" r="0.5" fill="#09090b" />
          <path d="M 69 16 C 69 11, 74 11, 74 16 Z" fill="#f4f4f5" stroke="#e4e4e7" strokeWidth="0.5" />

          <circle cx="47" cy="21" r="5" fill="#ef4444" stroke="#fafafa" strokeWidth="1.5" />
          <path d="M 41 28 C 41 21, 55 21, 55 28 L 52 40 L 43 40 Z" fill="#ef4444" stroke="#fafafa" strokeWidth="1.5" />
          <path d="M 48 28 L 58 23" stroke="#f4f4f5" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </>
  );
}