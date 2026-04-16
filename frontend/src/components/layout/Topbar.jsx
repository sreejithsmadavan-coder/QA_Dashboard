import React from 'react';
import NotificationCenter from '../ui/NotificationCenter';

export default function Topbar({ title, sub, theme, setTheme, toast, activity = [], onSearchClick }) {

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 26px', borderBottom: '1px solid var(--bd)', flexShrink: 0, background: 'var(--bc)', gap: 16 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Search — opens Command Palette */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--b2)', borderRadius: 10, border: '1px solid var(--bd)', padding: '7px 14px', cursor: 'pointer', transition: 'all .2s', minWidth: 180 }}
          onClick={onSearchClick}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,230,74,.3)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(200,230,74,.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span style={{ color: 'var(--t3)', fontSize: 12.5, flex: 1 }}>Search everything...</span>
          <kbd style={{ color: 'var(--t3)', fontSize: 10, background: 'var(--bd)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', border: '1px solid rgba(255,255,255,.06)' }}>Ctrl+K</kbd>
        </div>
        {/* Theme */}
        <button className="icon-btn" title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'} onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {/* Notifications */}
        <NotificationCenter />
      </div>
    </div>
  );
}
