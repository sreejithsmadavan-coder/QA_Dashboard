import React from 'react';

export function Toasts({ items, remove }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map(t => (
        <div key={t.id} onClick={() => remove(t.id)}
          style={{ background: 'var(--bc)', border: `1px solid ${t.type === 'success' ? 'rgba(200,230,74,.3)' : t.type === 'error' ? 'rgba(255,77,77,.3)' : 'rgba(56,189,248,.3)'}`, borderRadius: 14, padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 270, boxShadow: 'var(--shadow-lg)', animation: 'toastIn .3s ease', cursor: 'pointer' }}>
          <span style={{ fontSize: 16 }}>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          <span style={{ fontSize: 13.5, color: 'var(--tx)', fontWeight: 500 }}>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

let toastId = 0;
export function useToast() {
  const [toasts, setToasts] = React.useState([]);
  const toast = React.useCallback((type, text) => {
    const id = ++toastId;
    setToasts(p => [...p, { id, type, text }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);
  const removeToast = React.useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, toast, removeToast };
}
