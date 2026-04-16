import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { globalSearch } from '../../api/client';

const SECTIONS = [
  { key: 'projects', label: 'Projects', icon: '📁', color: 'var(--lime)' },
  { key: 'bugs', label: 'Bugs', icon: '🐛', color: 'var(--rd)' },
  { key: 'testCases', label: 'Test Cases', icon: '🧪', color: 'var(--cy)' },
  { key: 'meetings', label: 'Meetings', icon: '📅', color: 'var(--pu)' },
];

const QUICK_ACTIONS = [
  { label: 'Go to Dashboard', icon: '📊', page: 'dashboard', keys: 'D' },
  { label: 'Go to Projects', icon: '📁', page: 'projects', keys: 'P' },
  { label: 'Go to QA Agent', icon: '🤖', page: 'qa-agent', keys: 'A' },
  { label: 'Go to Meetings', icon: '📅', page: 'meetings', keys: 'M' },
  { label: 'Go to Settings', icon: '⚙️', page: 'settings', keys: 'S' },
];

export default function CommandPalette({ open, onClose, onNavigate, onViewProject, onViewBug }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!query || query.length < 2) { setResults(null); setSelectedIdx(0); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await globalSearch(query);
        setResults(res.data);
        setSelectedIdx(0);
      } catch { setResults(null); }
      setLoading(false);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const flatItems = [];
  if (results) {
    for (const sec of SECTIONS) {
      const items = results[sec.key] || [];
      if (items.length > 0) {
        items.forEach(item => flatItems.push({ ...item, _section: sec.key, _icon: sec.icon, _color: sec.color }));
      }
    }
  } else if (!query) {
    QUICK_ACTIONS.forEach((a, i) => flatItems.push({ ...a, _section: 'action', _idx: i }));
  }

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, flatItems.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter' && flatItems[selectedIdx]) {
      e.preventDefault();
      handleSelect(flatItems[selectedIdx]);
    }
  }, [flatItems, selectedIdx, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  const handleSelect = (item) => {
    if (item._section === 'action') {
      onNavigate(item.page);
    } else if (item._section === 'projects') {
      if (onViewProject) onViewProject(item);
      else onNavigate('projects');
    } else if (item._section === 'bugs') {
      if (onViewBug) onViewBug(item);
      else onNavigate('projects');
    } else if (item._section === 'testCases') {
      onNavigate('projects');
    } else if (item._section === 'meetings') {
      onNavigate('meetings');
    }
    onClose();
  };

  if (!open) return null;

  const totalResults = results ? SECTIONS.reduce((s, sec) => s + (results[sec.key]?.length || 0), 0) : 0;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)',
      }} />

      {/* Centered container */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', justifyContent: 'center', paddingTop: '15vh',
        pointerEvents: 'none',
      }}>
        {/* Palette */}
        <div style={{
          width: 560, maxHeight: '55vh', background: 'var(--bc)', borderRadius: 18,
          border: '1px solid var(--bd)',
          boxShadow: '0 24px 80px rgba(0,0,0,.5), 0 0 0 1px rgba(200,230,74,.06)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'fadeUp .2s cubic-bezier(.22,1,.36,1)',
          pointerEvents: 'auto', alignSelf: 'flex-start',
        }}>
          {/* Search Input */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
            borderBottom: '1px solid var(--bd)', flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search projects, bugs, test cases, meetings..."
              style={{
                flex: 1, background: 'transparent', border: 'none', color: 'var(--tx)',
                fontSize: 15, outline: 'none', fontFamily: "'DM Sans',sans-serif",
              }}
            />
            {loading && (
              <div style={{ width: 18, height: 18, border: '2px solid var(--bd)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin .6s linear infinite', flexShrink: 0 }} />
            )}
            <kbd style={{
              padding: '3px 8px', borderRadius: 6, background: 'var(--b2)', border: '1px solid var(--bd)',
              fontSize: 11, color: 'var(--t3)', fontFamily: 'monospace', flexShrink: 0,
            }}>ESC</kbd>
          </div>

          {/* Results */}
          <div ref={listRef} style={{ overflowY: 'auto', padding: '8px 0', flex: 1 }}>
            {!query && (
              <>
                <div style={{ padding: '6px 20px 4px', fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1 }}>Quick Actions</div>
                {QUICK_ACTIONS.map((a, i) => (
                  <div key={i} data-idx={i}
                    onClick={() => handleSelect({ ...a, _section: 'action' })}
                    onMouseEnter={() => setSelectedIdx(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
                      cursor: 'pointer', transition: 'background .1s',
                      background: selectedIdx === i ? 'rgba(200,230,74,.06)' : 'transparent',
                      borderLeft: selectedIdx === i ? '2px solid var(--lime)' : '2px solid transparent',
                    }}>
                    <span style={{ fontSize: 16, width: 24, textAlign: 'center' }}>{a.icon}</span>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: selectedIdx === i ? 'var(--tx)' : 'var(--t2)' }}>{a.label}</span>
                    <kbd style={{ padding: '2px 7px', borderRadius: 5, background: 'var(--b2)', border: '1px solid var(--bd)', fontSize: 11, color: 'var(--t3)', fontFamily: 'monospace' }}>{a.keys}</kbd>
                  </div>
                ))}
              </>
            )}

            {results && SECTIONS.map(sec => {
              const items = results[sec.key] || [];
              if (items.length === 0) return null;
              const startIdx = flatItems.findIndex(f => f._section === sec.key && f.id === items[0].id);
              return (
                <div key={sec.key}>
                  <div style={{ padding: '10px 20px 4px', fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 1 }}>
                    {sec.icon} {sec.label} ({items.length})
                  </div>
                  {items.map((item, i) => {
                    const idx = startIdx + i;
                    return (
                      <div key={item.id} data-idx={idx}
                        onClick={() => handleSelect({ ...item, _section: sec.key })}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '9px 20px',
                          cursor: 'pointer', transition: 'background .1s',
                          background: selectedIdx === idx ? 'rgba(200,230,74,.06)' : 'transparent',
                          borderLeft: selectedIdx === idx ? '2px solid var(--lime)' : '2px solid transparent',
                        }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%', background: sec.color, flexShrink: 0,
                          boxShadow: `0 0 6px ${sec.color}44`,
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 500, color: selectedIdx === idx ? 'var(--tx)' : 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name || item.title}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>
                            {sec.key === 'projects' && `${item.status} · ${item.health}`}
                            {sec.key === 'bugs' && `${item.severity} · ${item.status}${item.assignee ? ` · ${item.assignee}` : ''}`}
                            {sec.key === 'testCases' && `${item.category || 'Uncategorized'}${item.testCaseRefId ? ` · ${item.testCaseRefId}` : ''}`}
                            {sec.key === 'meetings' && `${item.date}${item.time ? ` · ${item.time}` : ''} · ${item.status}`}
                          </div>
                        </div>
                        {sec.key === 'bugs' && (
                          <span style={{
                            padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                            background: item.severity === 'Critical' ? 'rgba(255,77,77,.12)' : item.severity === 'High' ? 'rgba(255,181,71,.12)' : 'rgba(200,230,74,.08)',
                            color: item.severity === 'Critical' ? 'var(--rd)' : item.severity === 'High' ? 'var(--am)' : 'var(--lime)',
                          }}>{item.severity}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {results && totalResults === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)', marginBottom: 4 }}>No results found</div>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>Try a different search term</div>
              </div>
            )}

            {query && !results && loading && (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>Searching...</div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 20px', borderTop: '1px solid var(--bd)', flexShrink: 0,
            display: 'flex', gap: 16, alignItems: 'center', fontSize: 11, color: 'var(--t3)',
          }}>
            <span><kbd style={kbdStyle}>↑↓</kbd> Navigate</span>
            <span><kbd style={kbdStyle}>↵</kbd> Open</span>
            <span><kbd style={kbdStyle}>ESC</kbd> Close</span>
            {results && <span style={{ marginLeft: 'auto' }}>{totalResults} result{totalResults !== 1 ? 's' : ''}</span>}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

const kbdStyle = {
  padding: '1px 5px', borderRadius: 4, background: 'var(--b2)',
  border: '1px solid var(--bd)', fontFamily: 'monospace', fontSize: 10,
};
