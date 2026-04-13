import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';

export function FileViewerModal({ file, onClose }) {
  const [rows, setRows] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!file?.raw) { setLoading(false); setError('No file data.'); return; }
    setLoading(true); setError(null);
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (json.length > 0) { setHeaders(json[0].map(String)); setRows(json.slice(1)); }
        else { setHeaders([]); setRows([]); }
      } catch (err) { setError('Could not parse file: ' + err.message); }
      setLoading(false);
    };
    reader.onerror = () => { setError('Failed to read file.'); setLoading(false); };
    reader.readAsArrayBuffer(file.raw);
  }, [file]);

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => r.some(c => String(c).toLowerCase().includes(q)));
  }, [rows, search]);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)', zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', backdropFilter: 'blur(6px)', animation: 'fadeIn .18s ease', padding: '60px 24px 24px', overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--bc)', borderRadius: 20, border: '1px solid var(--bd)', width: 'min(900px,95vw)', maxHeight: 'calc(100vh - 84px)', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,.6)', animation: 'fadeUp .22s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '1px solid var(--bd)', flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file?.name}</div>
            {!loading && rows && <div style={{ fontSize: 12, color: 'var(--lime)', marginTop: 1 }}>{rows.length} rows · {headers.length} columns</div>}
          </div>
          {!loading && rows && rows.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--b2)', borderRadius: 9, border: '1px solid var(--bd)', padding: '0 10px', flexShrink: 0 }}>
              <span style={{ color: 'var(--t3)', fontSize: 13, marginRight: 6 }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rows..." style={{ background: 'none', border: 'none', color: 'var(--tx)', fontSize: 12.5, padding: '7px 0', outline: 'none', width: 160 }} />
              {search && <span style={{ color: 'var(--t3)', cursor: 'pointer', fontSize: 12, marginLeft: 4 }} onClick={() => setSearch('')}>✕</span>}
            </div>
          )}
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--bd)', background: 'var(--b2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--t2)', flexShrink: 0 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          {loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 14, flexDirection: 'column' }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--bd)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
            <div style={{ fontSize: 13, color: 'var(--t3)' }}>Parsing file…</div>
          </div>}
          {!loading && error && <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontSize: 13, color: 'var(--t3)' }}>{error}</div>
          </div>}
          {!loading && !error && rows && rows.length === 0 && <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>😭</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>Empty file</div>
          </div>}
          {!loading && !error && rows && rows.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--b2)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '10px 14px', fontSize: 11.5, fontWeight: 700, color: 'var(--t3)', textAlign: 'left', borderBottom: '1px solid var(--bd)', borderRight: '1px solid var(--bd)', width: 44 }}>#</th>
                  {headers.map((h, i) => <th key={i} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--t2)', textAlign: 'left', borderBottom: '1px solid var(--bd)', borderRight: '1px solid var(--bd)', whiteSpace: 'nowrap' }}>{h || `Col ${i + 1}`}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 200).map((row, ri) => (
                  <tr key={ri} className="rh" style={{ borderBottom: '1px solid var(--bd)' }}>
                    <td style={{ padding: '9px 14px', fontSize: 11.5, color: 'var(--t3)', borderRight: '1px solid var(--bd)', fontFamily: 'monospace', textAlign: 'right', userSelect: 'none' }}>{ri + 1}</td>
                    {headers.map((_, ci) => <td key={ci} style={{ padding: '9px 14px', color: 'var(--tx)', borderRight: '1px solid var(--bd)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={String(row[ci] ?? '')}>{String(row[ci] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && !error && rows && rows.length > 0 && (
          <div style={{ padding: '12px 22px', borderTop: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--b2)', borderRadius: '0 0 20px 20px' }}>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>
              {search ? `${filteredRows.length} of ${rows.length} rows match` : `Showing ${Math.min(filteredRows.length, 200)} of ${rows.length} rows`}
            </div>
            <button onClick={onClose} style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid var(--bd)', background: 'var(--bc)', color: 'var(--tx)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
