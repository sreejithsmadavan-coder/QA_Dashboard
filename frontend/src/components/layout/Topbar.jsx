import React, { useState, useRef, useEffect, useMemo } from 'react';
import { getProjects } from '../../api/client';

export default function Topbar({ title, sub, theme, setTheme, toast, activity = [] }) {
  const [sOpen, setSOpen] = useState(false);
  const [nOpen, setNOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const sRef = useRef(null);
  const nRef = useRef(null);

  useEffect(() => {
    if (!nOpen) return;
    const h = e => { if (nRef.current && !nRef.current.contains(e.target)) setNOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, [nOpen]);

  useEffect(() => {
    const h = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSOpen(true); setTimeout(() => sRef.current?.focus(), 50); }
      if (e.key === 'Escape') { setSOpen(false); setNOpen(false); setSearch(''); }
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await getProjects({ status: 'All' });
        const q = search.toLowerCase();
        setSearchResults(res.data.filter(p => p.name.toLowerCase().includes(q) || p.status.toLowerCase().includes(q)).slice(0, 6));
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 26px', borderBottom: '1px solid var(--bd)', flexShrink: 0, background: 'var(--bc)', gap: 16 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)' }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          {sOpen
            ? <div style={{ display: 'flex', alignItems: 'center', background: 'var(--b2)', borderRadius: 10, border: '1px solid rgba(200,230,74,.35)', padding: '0 12px', width: 260, boxShadow: '0 0 0 3px rgba(200,230,74,.06)' }}>
                <span style={{ color: 'var(--t3)', fontSize: 14, marginRight: 8 }}>🔍</span>
                <input ref={sRef} autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects... (Esc)" style={{ flex: 1, background: 'none', border: 'none', color: 'var(--tx)', fontSize: 13, padding: '9px 0', outline: 'none', fontFamily: "'DM Sans',sans-serif" }} />
                <span style={{ color: 'var(--t3)', cursor: 'pointer', fontSize: 12 }} onClick={() => { setSOpen(false); setSearch(''); }}>✕</span>
              </div>
            : <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--b2)', borderRadius: 10, border: '1px solid var(--bd)', padding: '7px 12px', cursor: 'pointer' }} onClick={() => setSOpen(true)}>
                <span style={{ color: 'var(--t3)', fontSize: 13 }}>🔍</span>
                <span style={{ color: 'var(--t3)', fontSize: 12 }}>Search</span>
                <span style={{ color: 'var(--t3)', fontSize: 10, background: 'var(--bd)', padding: '2px 5px', borderRadius: 4, marginLeft: 4 }}>⌘K</span>
              </div>}
          {sOpen && search.trim() && (
            <div style={{ position: 'absolute', top: 46, left: 0, width: 320, background: 'var(--bc)', borderRadius: 14, border: '1px solid var(--bd)', boxShadow: 'var(--shadow-lg)', zIndex: 300, overflow: 'hidden', animation: 'fadeUp .15s ease' }}>
              {searchResults.length > 0
                ? <>{
                    <div style={{ padding: '10px 14px 6px', fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase' }}>{searchResults.length} result{searchResults.length > 1 ? 's' : ''}</div>
                  }
                  {searchResults.map(p => (
                    <div key={p.id} className="rh" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid var(--bd)' }} onClick={() => { setSOpen(false); setSearch(''); }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(200,230,74,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--lime)', fontWeight: 700 }}>◉</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--t3)' }}>{p.status} · {p.health}</div>
                      </div>
                    </div>
                  ))}</>
                : <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>No results found</div>
                    <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>No projects match "<span style={{ color: 'var(--lime)' }}>{search}</span>"</div>
                  </div>}
            </div>
          )}
        </div>
        {/* Theme */}
        <button className="icon-btn" title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'} onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {/* Notifications */}
        <div ref={nRef} style={{ position: 'relative' }}>
          <button className="icon-btn" style={{ position: 'relative' }} onClick={() => setNOpen(o => !o)}>
            🔔
            {activity.length > 0 && <div style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: '50%', background: 'var(--rd)', border: '2px solid var(--bc)' }} />}
          </button>
          {nOpen && (
            <div style={{ position: 'absolute', right: 0, top: 46, width: 300, background: 'var(--bc)', borderRadius: 16, border: '1px solid var(--bd)', boxShadow: 'var(--shadow-lg)', padding: 14, zIndex: 200, animation: 'fadeUp .2s ease' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 10 }}>Notifications</div>
              {activity.slice(0, 5).map((a, i) => (
                <div key={i} className="rh" style={{ padding: '9px 8px', borderBottom: i < 4 ? '1px solid var(--bd)' : 'none', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(200,230,74,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: a.c, flexShrink: 0 }}>{a.ic}</span>
                  <div>
                    <div style={{ fontSize: 12.5, color: 'var(--tx)', lineHeight: 1.3 }}>{a.t}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
