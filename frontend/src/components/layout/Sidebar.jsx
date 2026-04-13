import React from 'react';

const NAV = [
  { k: 'dashboard', ic: '◈', l: 'Dashboard Overview' },
  { k: 'projects',  ic: '◉', l: 'Projects' },
  { k: 'qa-agent',  ic: '🤖', l: 'QA Agent' },
  { k: 'meetings',  ic: '📅', l: 'Meetings' },
];

export default function Sidebar({ page, setPage, activeProjId, setActiveProjId, onLogoClick, onLogout, user }) {
  return (
    <div style={{ width: 230, background: 'var(--bc)', borderRight: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
      {/* Logo */}
      <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={onLogoClick}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#121418', boxShadow: '0 0 16px rgba(200,230,74,.35)', transition: 'transform .2s,box-shadow .2s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1) rotate(8deg)'; e.currentTarget.style.boxShadow = '0 0 24px rgba(200,230,74,.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 0 16px rgba(200,230,74,.35)'; }}>Q</div>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--tx)', userSelect: 'none' }}>QA Nexus</span>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
        {NAV.map(n => (
          <button key={n.k} className={`sb ${page === n.k && !activeProjId ? 'sb-a' : ''}`}
            onClick={() => { setActiveProjId(null); setPage(n.k); }}>
            <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{n.ic}</span>{n.l}
          </button>
        ))}
      </div>

      {/* Bottom */}
      <div style={{ borderTop: '1px solid var(--bd)', padding: '10px' }}>
        <button className={`sb ${page === 'settings' && !activeProjId ? 'sb-a' : ''}`}
          onClick={() => { setActiveProjId(null); setPage('settings'); }}>
          <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>⚙</span>Settings
        </button>
        <button className="sb" style={{ color: 'var(--rd)' }} onClick={onLogout}>
          <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>→</span>Logout
        </button>
        {/* User profile */}
        <div style={{ borderTop: '1px solid var(--bd)', marginTop: 6, paddingTop: 10, display: 'flex', alignItems: 'center', gap: 10, padding: '10px', cursor: 'pointer', borderRadius: 10, transition: 'background .15s' }}
          onClick={() => { setActiveProjId(null); setPage('profile'); }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--b2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {user?.avatar
              ? <img src={user.avatar} alt="avatar" style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover' }} />
              : <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,rgba(200,230,74,.25),rgba(74,230,200,.25))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--lime)' }}>
                  {(user?.firstName?.[0] || 'Q') + (user?.lastName?.[0] || 'A')}
                </div>}
            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', border: '2px solid var(--bc)', animation: 'pulse 2s ease infinite' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.firstName} {user?.lastName}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 300 }}>{user?.role || 'QA Lead'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
