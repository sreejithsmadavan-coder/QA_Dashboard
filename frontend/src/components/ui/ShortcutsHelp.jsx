import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

const SHORTCUTS = [
  { key: 'N', description: 'New bug report' },
  { key: 'P', description: 'Go to Projects' },
  { key: 'D', description: 'Go to Dashboard' },
  { key: 'M', description: 'Go to Meetings' },
  { key: '?', description: 'Show keyboard shortcuts' },
  { key: 'Esc', description: 'Clear selection / Close modal' },
  { key: 'Ctrl+K', description: 'Open command palette' },
];

const kbdStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  minWidth: 32, height: 30, padding: '0 10px', borderRadius: 8,
  background: 'var(--b2)', border: '1px solid var(--bd)',
  color: 'var(--tx)', fontSize: 13, fontWeight: 700,
  fontFamily: "'DM Sans', monospace", letterSpacing: 0.5,
  boxShadow: '0 2px 0 var(--bd)',
};

export default function ShortcutsHelp({ onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: 'rgba(0,0,0,0.6)',
        animation: 'fadeIn .2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bc)', borderRadius: 20,
          border: '1px solid var(--bd)', width: 'min(480px, 95vw)',
          maxHeight: '88vh', overflowY: 'auto',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          animation: 'fadeUp .2s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid var(--bd)',
          position: 'sticky', top: 0, background: 'var(--bc)',
          borderRadius: '20px 20px 0 0', zIndex: 1,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)' }}>
            Keyboard Shortcuts
          </span>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              border: '1px solid var(--bd)', background: 'var(--b2)',
              color: 'var(--t2)', cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            ✕
          </button>
        </div>

        {/* Shortcuts Grid */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'auto 1fr',
            gap: '14px 20px', alignItems: 'center',
          }}>
            {SHORTCUTS.map(s => (
              <React.Fragment key={s.key}>
                <div style={{ justifySelf: 'end' }}>
                  <kbd style={kbdStyle}>{s.key}</kbd>
                </div>
                <div style={{
                  fontSize: 13.5, fontWeight: 500, color: 'var(--t2)',
                }}>
                  {s.description}
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Footer hint */}
          <div style={{
            marginTop: 24, paddingTop: 16,
            borderTop: '1px solid var(--bd)',
            fontSize: 12, color: 'var(--t3)', textAlign: 'center',
          }}>
            Shortcuts are disabled while typing in input fields
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
