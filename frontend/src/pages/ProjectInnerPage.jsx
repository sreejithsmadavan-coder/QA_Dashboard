import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  getProject, getBugs, getTestCases, getExecutions,
  createBug, updateBug, deleteBug,
  createTestCase, deleteTestCase,
  createExecution, uploadFile, getCategorySummary, getExecutionSummary, getDetailedAnalysis,
} from '../api/client';
import { Donut, ProgBar } from '../components/ui/Charts';
import useSocket from '../hooks/useSocket';

// Re-usable within this page only
function Cd({ children, style, glow }) {
  return (
    <div className={`cd ${glow ? 'cd-glow' : ''}`} style={style}>
      {children}
    </div>
  );
}

function StatRow({ label, value, valueColor, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid var(--bd)' }}>
      <span style={{ fontSize: 13.5, color: 'var(--t2)' }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: bold ? 700 : 500, color: valueColor || 'var(--tx)' }}>{value}</span>
    </div>
  );
}

function BarRow({ label, value, color, suffix = '%' }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--bd)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
        <span style={{ fontSize: 13.5, color: 'var(--t2)' }}>{label}</span>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: color || 'var(--tx)' }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bd)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color || 'var(--lime)', borderRadius: 3, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

function StatPair({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || 'var(--tx)', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// ── FileViewerModal ────────────────────────────────────────────────────────────
function FileViewerModal({ file, onClose }) {
  const [rows, setRows] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!file?.raw) { setLoading(false); setError('No file data.'); return; }
    setLoading(true); setError(null);
    import('xlsx').then(XLSX => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (json.length > 0) {
            setHeaders(json[0].map(String));
            setRows(json.slice(1));
          } else { setHeaders([]); setRows([]); }
        } catch (err) { setError('Could not parse file: ' + err.message); }
        setLoading(false);
      };
      reader.onerror = () => { setError('Failed to read file.'); setLoading(false); };
      reader.readAsArrayBuffer(file.raw);
    });
  }, [file]);

  const filteredRows = useMemo(() => {
    if (!rows) return [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => r.some(cell => String(cell).toLowerCase().includes(q)));
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
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--b2)', borderRadius: 9, border: '1px solid var(--bd)', padding: '0 10px' }}>
              <span style={{ color: 'var(--t3)', fontSize: 13, marginRight: 6 }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{ background: 'none', border: 'none', color: 'var(--tx)', fontSize: 12.5, padding: '7px 0', outline: 'none', width: 140, fontFamily: "'DM Sans',sans-serif" }} />
              {search && <span style={{ color: 'var(--t3)', cursor: 'pointer', fontSize: 12, marginLeft: 4 }} onClick={() => setSearch('')}>✕</span>}
            </div>
          )}
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--bd)', background: 'var(--b2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--t2)', flexShrink: 0, transition: 'all .2s' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          {loading && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 14 }}>
            <div style={{ width: 36, height: 36, border: '3px solid var(--bd)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
            <div style={{ fontSize: 13, color: 'var(--t3)' }}>Parsing…</div>
          </div>}
          {!loading && error && <div style={{ textAlign: 'center', padding: '60px 20px' }}><div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>Unable to preview</div><div style={{ fontSize: 13, color: 'var(--t3)' }}>{error}</div></div>}
          {!loading && !error && rows && rows.length === 0 && <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--t3)' }}>Empty file — no data rows found.</div>}
          {!loading && !error && rows && rows.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--b2)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '10px 14px', fontSize: 11.5, fontWeight: 700, color: 'var(--t3)', textAlign: 'left', borderBottom: '1px solid var(--bd)', width: 44 }}>#</th>
                  {headers.map((h, i) => <th key={i} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: 'var(--t2)', textAlign: 'left', borderBottom: '1px solid var(--bd)', whiteSpace: 'nowrap' }}>{h || `Col ${i + 1}`}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 200).map((row, ri) => (
                  <tr key={ri} className="rh" style={{ borderBottom: '1px solid var(--bd)' }}>
                    <td style={{ padding: '9px 14px', fontSize: 11.5, color: 'var(--t3)', fontFamily: 'monospace', textAlign: 'right', userSelect: 'none' }}>{ri + 1}</td>
                    {headers.map((_, ci) => <td key={ci} style={{ padding: '9px 14px', color: 'var(--tx)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(row[ci] ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && !error && rows && rows.length > 0 && (
          <div style={{ padding: '12px 22px', borderTop: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--b2)', borderRadius: '0 0 20px 20px', flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>{search ? `${filteredRows.length} of ${rows.length} rows match` : `Showing ${Math.min(filteredRows.length, 200)} of ${rows.length} rows`}</div>
            <button onClick={onClose} style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid var(--bd)', background: 'var(--bc)', color: 'var(--tx)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Close</button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── TABS ───────────────────────────────────────────────────────────────────────
const TABS = ['Overview', 'Details', 'Test Cases', 'Execution', 'API Testing', 'Performance', '404 Pages', 'Broken Links'];

const HEALTH_COLOR = { Excellent: '#22c55e', Good: '#38BDF8', Average: '#FFB547', Poor: '#FF4D4D' };
const HEALTH_IC = { Excellent: '✓', Good: '◎', Average: '◎', Poor: '✕' };

// ── OverviewTab ────────────────────────────────────────────────────────────────
function OverviewTab({ project }) {
  const passed = Math.round((project.testCasesCount || 0) * (project.passRate || 0) / 100);
  const failed = (project.testCasesCount || 0) - passed;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {[
          ['Test Cases', project.testCasesCount || 0, `${passed} passed · ${failed} failed`, 'var(--tx)'],
          ['Pass Rate', `${project.passRate || 0}%`, `${passed} test cases passed`, 'var(--lime)'],
          ['Fail Rate', `${(100 - (project.passRate || 0)).toFixed(1)}%`, `${failed} test cases failed`, 'var(--rd)'],
        ].map(([label, value, sub, color]) => (
          <div key={label} className="mc">
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--t2)', marginBottom: 10 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>{sub}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Cd>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>API Testing Overview</span>
            <span style={{ background: 'rgba(255,255,255,.05)', color: 'var(--t3)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10 }}>No Data</span>
          </div>
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t3)', fontSize: 13, lineHeight: 1.7 }}>
            No API test results yet.<br/>Upload API test data in the <strong>API Testing</strong> tab.
          </div>
        </Cd>
        <Cd>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>Performance Testing</span>
            <span style={{ background: 'rgba(255,255,255,.05)', color: 'var(--t3)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10 }}>No Data</span>
          </div>
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t3)', fontSize: 13, lineHeight: 1.7 }}>
            No performance test results yet.<br/>Upload performance data in the <strong>Performance</strong> tab.
          </div>
        </Cd>
      </div>
    </div>
  );
}

// ── DetailsTab ─────────────────────────────────────────────────────────────────
function DetailsTab({ project, bugs }) {
  const hC = HEALTH_COLOR[project.health] || 'var(--t2)';
  const bd = project.bugsBreakdown || {};


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Cd>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 18 }}>Project Information</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          <div style={{ paddingBottom: 18, borderBottom: '1px solid var(--bd)' }}>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>Project Name</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{project.name}</div>
          </div>
          <div style={{ paddingBottom: 18, borderBottom: '1px solid var(--bd)', paddingLeft: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>Project ID</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>PRJ-{String(project.id).padStart(4, '0')}</div>
          </div>
          <div style={{ paddingTop: 18, paddingBottom: 18, borderBottom: '1px solid var(--bd)' }}>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 6 }}>Status</div>
            <span style={{ background: 'var(--tx)', color: 'var(--bg)', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 6, display: 'inline-block' }}>{project.status}</span>
          </div>
          <div style={{ paddingTop: 18, paddingBottom: 18, borderBottom: '1px solid var(--bd)', paddingLeft: 24 }}>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 6 }}>Health Score</div>
            <span style={{ background: `${hC}15`, color: hC, fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 6, border: `1px solid ${hC}30`, display: 'inline-block' }}>{project.health}</span>
          </div>
          <div style={{ paddingTop: 18, gridColumn: 'span 2' }}>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 6 }}>Description</div>
            <div style={{ fontSize: 13.5, color: 'var(--t2)', lineHeight: 1.7 }}>{project.description || '—'}</div>
          </div>
        </div>
      </Cd>

      <Cd>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>Bug Breakdown by Priority</div>
        {[['Critical', bd.critical || 0, 'var(--rd)'], ['High', bd.high || 0, 'var(--am)'], ['Medium', bd.medium || 0, 'var(--am)'], ['Low', bd.low || 0, 'var(--tl)']].map(([l, v, c]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid var(--bd)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: c, fontSize: 14 }}>▲</span>
              <span style={{ fontSize: 13.5, color: 'var(--tx)' }}>{l}</span>
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tx)' }}>{v}</span>
          </div>
        ))}
      </Cd>
    </div>
  );
}

// ── TestCasesTab ───────────────────────────────────────────────────────────────
function TestCasesTab({ project, toast }) {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [viewFile, setViewFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [analysis, setAnalysis] = useState(null);

  const loadCategories = useCallback(async () => {
    try {
      const res = await getCategorySummary({ projectId: project.id });
      const arr = Object.entries(res.data).map(([category, count]) => ({ category, count }));
      setCategories(arr);
    } catch {}
  }, [project.id]);

  const loadAnalysis = useCallback(async () => {
    try {
      const res = await getDetailedAnalysis({ projectId: project.id });
      setAnalysis(res.data);
    } catch {}
  }, [project.id]);

  useEffect(() => { loadCategories(); loadAnalysis(); }, [loadCategories, loadAnalysis]);

  const TYPE_ICONS = { UI: '🖥️', Functional: '⚙️', Responsive: '📱', Integration: '🔗', Security: '🔐', Accessibility: '♿', Performance: '⚡', Negative: '🚫', 'Console/API': '🔌', Compatibility: '🌐', Usability: '👤', 'Edge Case': '🔀', E2E: '🔄', Alternate: '↔️' };
  const TYPE_COLORS = { UI: 'var(--cy)', Functional: 'var(--lime)', Responsive: 'var(--pu)', Integration: 'var(--tl)', Security: 'var(--am)', Accessibility: '#f472b6', Performance: 'var(--rd)', Negative: '#f87171', 'Console/API': '#60a5fa', Compatibility: '#a78bfa', Usability: '#34d399', 'Edge Case': '#fbbf24', E2E: '#2dd4bf', Alternate: '#c084fc' };
  const INSIGHT_BG = { critical: 'rgba(239,68,68,.08)', warning: 'rgba(251,191,36,.08)', success: 'rgba(34,197,94,.08)', info: 'rgba(56,189,248,.08)' };
  const INSIGHT_BORDER = { critical: 'rgba(239,68,68,.25)', warning: 'rgba(251,191,36,.25)', success: 'rgba(34,197,94,.25)', info: 'rgba(56,189,248,.25)' };
  const SEV_COLORS = { Critical: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#22c55e', Unknown: 'var(--t3)' };

  const handleUpload = async (file) => {
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('projectId', project.id);
    fd.append('type', 'testcases');
    try {
      const res = await uploadFile(fd);
      toast('success', `Imported ${res.data.imported} test cases`);
      setUploadedFiles(f => [...f, { name: file.name, date: new Date().toLocaleDateString(), size: Math.round(file.size / 1024) + 'KB', raw: file }]);
      loadCategories();
      loadAnalysis();
    } catch { toast('error', 'Import failed'); }
    setImporting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 9, background: 'var(--b2)', border: '1px solid var(--bd)', color: importing ? 'var(--t3)' : 'var(--tx)', fontSize: 13, fontWeight: 600, cursor: importing ? 'default' : 'pointer', transition: 'border-color .2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(200,230,74,.3)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--bd)'}>
          {importing ? '⏳ Importing…' : '📂 Upload Test Cases'}
          <input type="file" accept=".xlsx,.csv,.xls" style={{ display: 'none' }} disabled={importing} onChange={e => handleUpload(e.target.files[0])} />
        </label>
      </div>

      {uploadedFiles.length > 0 && (
        <Cd style={{ padding: '14px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)', marginBottom: 10 }}>📁 Uploaded Documents</div>
          {uploadedFiles.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < uploadedFiles.length - 1 ? '1px solid var(--bd)' : 'none' }}>
              <span style={{ fontSize: 18 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>{f.date} · {f.size}</div>
              </div>
              <button onClick={() => setViewFile(f)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(56,189,248,.1)', border: '1px solid rgba(56,189,248,.2)', color: 'var(--cy)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>👁 View</button>
            </div>
          ))}
        </Cd>
      )}

      {categories.length === 0 && (project.testCasesCount || 0) === 0 ? (
        <Cd>
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>No Test Cases Found</div>
            <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 20, lineHeight: 1.6 }}>
              No test cases have been added to this project yet.<br />
              Upload an Excel or CSV file to import test cases.
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: 'rgba(200,230,74,.1)', border: '1px solid rgba(200,230,74,.3)', color: 'var(--lime)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              📂 Upload Test Cases
              <input type="file" accept=".xlsx,.csv,.xls" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files[0])} />
            </label>
          </div>
        </Cd>
      ) : (
        <>
          {/* ── Overview Stats Row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            <Cd style={{ padding: '18px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>Total Cases</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--tx)' }}>{analysis?.total || project.testCasesCount || 0}</div>
            </Cd>
            <Cd style={{ padding: '18px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>Testing Types</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--lime)' }}>{analysis?.testTypes?.length || categories.length}</div>
            </Cd>
            <Cd style={{ padding: '18px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>Modules</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--cy)' }}>{analysis?.modules?.length || 0}</div>
            </Cd>
          </div>

          {/* ── AI Insights (coverage-only, no pass/fail) ── */}
          {analysis?.testTypes?.length > 0 && (() => {
            const coverageInsights = [];
            const missingTypes = ['Security', 'Performance', 'E2E', 'Usability', 'Compatibility'].filter(t => !analysis.testTypes.find(x => x.type === t));
            if (missingTypes.length > 0) {
              coverageInsights.push({ type: 'warning', icon: '⚠️', title: 'Testing Coverage Gaps', message: `No ${missingTypes.join(', ')} test cases found. Consider adding these for comprehensive coverage.` });
            }
            if (analysis.testTypes.length >= 5) {
              coverageInsights.push({ type: 'success', icon: '📊', title: 'Testing Diversity', message: `${analysis.testTypes.length} different testing types covering ${analysis.modules?.length || 0} modules. ${analysis.testTypes.length >= 8 ? 'Excellent' : 'Good'} testing diversity.` });
            }
            const topType = analysis.testTypes[0];
            if (topType && analysis.total > 0) {
              const topPct = Math.round((topType.total / analysis.total) * 100);
              if (topPct > 50) coverageInsights.push({ type: 'info', icon: '📋', title: 'Type Distribution', message: `${topType.type} testing dominates at ${topPct}% of total cases. Consider expanding coverage in other types.` });
            }
            if (coverageInsights.length === 0) return null;
            return (
              <Cd style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 20 }}>🤖</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>AI Coverage Analysis</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(200,230,74,.12)', color: 'var(--lime)', fontWeight: 700 }}>AUTO</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: coverageInsights.length > 1 ? 'repeat(2,1fr)' : '1fr', gap: 10 }}>
                  {coverageInsights.map((ins, i) => (
                    <div key={i} style={{ padding: '14px 16px', borderRadius: 12, background: INSIGHT_BG[ins.type] || INSIGHT_BG.info, border: `1px solid ${INSIGHT_BORDER[ins.type] || INSIGHT_BORDER.info}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 16 }}>{ins.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{ins.title}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>{ins.message}</div>
                    </div>
                  ))}
                </div>
              </Cd>
            );
          })()}

          {/* ── Testing Types Overview (count only, no pass/fail) ── */}
          {analysis?.testTypes?.length > 0 && (
            <Cd style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <span style={{ fontSize: 20 }}>🧪</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>Testing Types Overview</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--t3)' }}>{analysis.testTypes.length} types detected</span>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {analysis.testTypes.map(t => {
                  const pct = analysis.total > 0 ? Math.round((t.total / analysis.total) * 100) : 0;
                  const color = TYPE_COLORS[t.type] || 'var(--lime)';
                  return (
                    <div key={t.type} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--b2)', border: '1px solid var(--bd)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 20 }}>{TYPE_ICONS[t.type] || '📋'}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', flex: 1 }}>{t.type}</span>
                        <span style={{ fontSize: 20, fontWeight: 800, color }}>{t.total}</span>
                        <span style={{ fontSize: 11, color: 'var(--t3)', minWidth: 48, textAlign: 'right' }}>{pct}%</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--bd)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 1s ease' }} />
                      </div>
                      {t.modules?.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                          {t.modules.filter(m => m && m !== 'Unknown' && m !== '').map(m => (
                            <span key={m} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: 'var(--bg)', border: '1px solid var(--bd)', color: 'var(--t2)' }}>{m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Cd>
          )}

          {/* ── Module Coverage & Severity/Priority ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
            {analysis?.modules?.length > 0 && (
              <Cd style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 18 }}>📦</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>Module Coverage</span>
                </div>
                {analysis.modules.map(m => (
                  <div key={m.module} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>{m.module}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)' }}>{m.total} cases</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--bd)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${analysis.total > 0 ? Math.round((m.total / analysis.total) * 100) : 0}%`, background: 'var(--lime)', borderRadius: 3, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                ))}
              </Cd>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {analysis?.severityDist && Object.keys(analysis.severityDist).filter(k => k && k !== 'Unknown' && k !== '').length > 0 && (
                <Cd style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 18 }}>🎯</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>Severity Distribution</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                    {Object.entries(analysis.severityDist).filter(([k]) => k && k !== 'Unknown' && k !== '').map(([sev, count]) => (
                      <div key={sev} style={{ padding: '12px 14px', borderRadius: 10, background: `${SEV_COLORS[sev] || 'var(--t3)'}10`, border: `1px solid ${SEV_COLORS[sev] || 'var(--t3)'}30`, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: SEV_COLORS[sev] || 'var(--t3)' }}>{count}</div>
                        <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>{sev}</div>
                      </div>
                    ))}
                  </div>
                </Cd>
              )}

              {analysis?.priorityDist && Object.keys(analysis.priorityDist).filter(k => k && k !== 'Unknown' && k !== '').length > 0 && (
                <Cd style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 18 }}>📌</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>Priority Distribution</span>
                  </div>
                  {Object.entries(analysis.priorityDist).filter(([k]) => k && k !== 'Unknown' && k !== '').map(([pri, count]) => {
                    const pct = analysis.total > 0 ? Math.round((count / analysis.total) * 100) : 0;
                    return (
                      <div key={pri} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: 'var(--t2)' }}>{pri}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)' }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height: 5, background: 'var(--bd)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--lime)', borderRadius: 3, transition: 'width 1s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </Cd>
              )}
            </div>
          </div>

          {/* ── Category Cards Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {categories.map(c => (
              <Cd key={c.category} style={{ padding: '20px 18px' }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{TYPE_ICONS[c.category] || '📋'}</div>
                <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 6, lineHeight: 1.3 }}>{c.category}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: TYPE_COLORS[c.category] || 'var(--tx)', lineHeight: 1 }}>{c.count}</div>
                <div style={{ height: 4, background: 'var(--bd)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round((c.count / (project.testCasesCount || 1)) * 100)}%`, background: TYPE_COLORS[c.category] || 'var(--lime)', borderRadius: 2, transition: 'width 1s ease' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{Math.round((c.count / (project.testCasesCount || 1)) * 100)}% of total</div>
              </Cd>
            ))}
          </div>
        </>
      )}
      {viewFile && <FileViewerModal file={viewFile} onClose={() => setViewFile(null)} />}
    </div>
  );
}

// ── ExecutionTab ───────────────────────────────────────────────────────────────
function ExecutionTab({ project, toast }) {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total: 0, passed: 0, failed: 0, skipped: 0, passRate: 0 });
  const [activeFilter, setActiveFilter] = useState('All');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [viewFile, setViewFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const TYPE_ICONS = { UI: '🖥️', Functional: '⚙️', Responsive: '📱', Integration: '🔗', Security: '🔐', Accessibility: '♿', Performance: '⚡', Negative: '🚫', 'Console/API': '🔌', Compatibility: '🌐', Usability: '👤', 'Edge Case': '🔀', E2E: '🔄', Alternate: '↔️' };
  const TYPE_COLORS = { UI: 'var(--cy)', Functional: 'var(--lime)', Responsive: 'var(--pu)', Integration: 'var(--tl)', Security: 'var(--am)', Accessibility: '#f472b6', Performance: 'var(--rd)', Negative: '#f87171', 'Console/API': '#60a5fa', Compatibility: '#a78bfa', Usability: '#34d399', 'Edge Case': '#fbbf24', E2E: '#2dd4bf', Alternate: '#c084fc' };
  const INSIGHT_BG = { critical: 'rgba(239,68,68,.08)', warning: 'rgba(251,191,36,.08)', success: 'rgba(34,197,94,.08)', info: 'rgba(56,189,248,.08)' };
  const INSIGHT_BORDER = { critical: 'rgba(239,68,68,.25)', warning: 'rgba(251,191,36,.25)', success: 'rgba(34,197,94,.25)', info: 'rgba(56,189,248,.25)' };

  const load = useCallback(async () => {
    try {
      const [exRes, smRes, anRes] = await Promise.all([
        getExecutions({ projectId: project.id }),
        getExecutionSummary({ projectId: project.id }),
        getDetailedAnalysis({ projectId: project.id }),
      ]);
      setRows(exRes.data);
      setSummary(smRes.data);
      setAnalysis(anRes.data);
    } catch {}
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);
  useSocket({ 'execution:created': load, 'executions:bulk_imported': load });

  const filtered = activeFilter === 'All' ? rows : rows.filter(r => r.status === activeFilter);
  const stC = { Passed: '#22c55e', Failed: 'var(--rd)', Skipped: 'var(--am)' };

  const handleUpload = async (file) => {
    if (!file) return;
    setImporting(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('projectId', project.id);
    fd.append('type', 'executions');
    try {
      const res = await uploadFile(fd);
      toast('success', `Imported ${res.data.imported} executions`);
      setUploadedFiles(f => [...f, { name: file.name, size: Math.round(file.size / 1024) + 'KB', raw: file }]);
      load();
    } catch { toast('error', 'Import failed'); }
    setImporting(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'Passed', 'Failed', 'Skipped'].map(f => (
            <button key={f} onClick={() => setActiveFilter(f)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${activeFilter === f ? 'rgba(200,230,74,.4)' : 'var(--bd)'}`, background: activeFilter === f ? 'rgba(200,230,74,.1)' : 'var(--b2)', color: activeFilter === f ? 'var(--lime)' : 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
              {f}
            </button>
          ))}
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: 'var(--b2)', border: '1px solid var(--bd)', color: importing ? 'var(--t3)' : 'var(--tx)', fontSize: 13, fontWeight: 600, cursor: importing ? 'default' : 'pointer' }}>
          {importing ? '⏳ Importing…' : '📂 Upload Report'}
          <input type="file" accept=".xlsx,.csv,.xls" style={{ display: 'none' }} disabled={importing} onChange={e => handleUpload(e.target.files[0])} />
        </label>
      </div>

      {uploadedFiles.length > 0 && (
        <Cd style={{ padding: '14px 18px' }}>
          {uploadedFiles.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < uploadedFiles.length - 1 ? '1px solid var(--bd)' : 'none' }}>
              <span style={{ fontSize: 18 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>{f.name}</div>{f.size && <div style={{ fontSize: 11, color: 'var(--t3)' }}>{f.size}</div>}</div>
              <button onClick={() => setViewFile(f)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(56,189,248,.1)', border: '1px solid rgba(56,189,248,.2)', color: 'var(--cy)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>👁 View</button>
            </div>
          ))}
        </Cd>
      )}

      {/* ── Execution Overview Stats ── */}
      {analysis?.total > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            <Cd style={{ padding: '18px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>Total Cases</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--tx)' }}>{analysis.total}</div>
            </Cd>
            <Cd style={{ padding: '18px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>Passed</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#22c55e' }}>{analysis.totalPass}</div>
            </Cd>
            <Cd style={{ padding: '18px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>Failed</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444' }}>{analysis.totalFail}</div>
            </Cd>
            <Cd style={{ padding: '18px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>Pass Rate</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: (analysis.overallPassRate || 0) >= 80 ? '#22c55e' : (analysis.overallPassRate || 0) >= 60 ? 'var(--am)' : '#ef4444' }}>{analysis.overallPassRate}%</div>
            </Cd>
          </div>

          {/* ── AI Insights (with pass/fail analysis) ── */}
          {analysis.insights?.length > 0 && (
            <Cd style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 20 }}>🤖</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>AI Execution Analysis</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: 'rgba(200,230,74,.12)', color: 'var(--lime)', fontWeight: 700 }}>AUTO</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                {analysis.insights.map((ins, i) => (
                  <div key={i} style={{ padding: '14px 16px', borderRadius: 12, background: INSIGHT_BG[ins.type] || INSIGHT_BG.info, border: `1px solid ${INSIGHT_BORDER[ins.type] || INSIGHT_BORDER.info}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>{ins.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tx)' }}>{ins.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>{ins.message}</div>
                  </div>
                ))}
              </div>
            </Cd>
          )}

          {/* ── Testing Types with Pass/Fail Breakdown ── */}
          {analysis.testTypes?.length > 0 && (
            <Cd style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <span style={{ fontSize: 20 }}>🧪</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>Testing Types — Execution Results</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--t3)' }}>{analysis.testTypes.length} types</span>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {analysis.testTypes.map(t => {
                  const pct = analysis.total > 0 ? Math.round((t.total / analysis.total) * 100) : 0;
                  const color = TYPE_COLORS[t.type] || 'var(--lime)';
                  return (
                    <div key={t.type} style={{ padding: '16px 18px', borderRadius: 14, background: 'var(--b2)', border: '1px solid var(--bd)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <span style={{ fontSize: 22 }}>{TYPE_ICONS[t.type] || '📋'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{t.type}</span>
                            <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 6, background: `${color}18`, color, fontWeight: 600 }}>{t.total} cases</span>
                            <span style={{ fontSize: 11, color: 'var(--t3)' }}>{pct}% of total</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#22c55e' }}>{t.passed}</div>
                            <div style={{ fontSize: 10, color: 'var(--t3)' }}>Pass</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#ef4444' }}>{t.failed}</div>
                            <div style={{ fontSize: 10, color: 'var(--t3)' }}>Fail</div>
                          </div>
                          <div style={{ textAlign: 'center', minWidth: 44 }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: t.passRate >= 80 ? '#22c55e' : t.passRate >= 60 ? 'var(--am)' : '#ef4444' }}>{t.passRate}%</div>
                            <div style={{ fontSize: 10, color: 'var(--t3)' }}>Rate</div>
                          </div>
                        </div>
                      </div>
                      <div style={{ height: 6, background: 'var(--bd)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', display: 'flex' }}>
                          <div style={{ width: `${t.total > 0 ? (t.passed / t.total) * 100 : 0}%`, background: '#22c55e', transition: 'width 1s ease' }} />
                          <div style={{ width: `${t.total > 0 ? (t.failed / t.total) * 100 : 0}%`, background: '#ef4444', transition: 'width 1s ease' }} />
                        </div>
                      </div>
                      {t.modules?.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                          {t.modules.filter(m => m && m !== 'Unknown' && m !== '').map(m => (
                            <span key={m} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: 'var(--bg)', border: '1px solid var(--bd)', color: 'var(--t2)' }}>{m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Cd>
          )}

          {/* ── Module Pass/Fail Breakdown ── */}
          {analysis.modules?.length > 0 && (
            <Cd style={{ padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 18 }}>📦</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>Module Execution Results</span>
              </div>
              {analysis.modules.map(m => (
                <div key={m.module} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>{m.module}</span>
                    <span style={{ fontSize: 12, display: 'flex', gap: 8 }}>
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>{m.passed}✓</span>
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>{m.failed}✕</span>
                      <span style={{ color: 'var(--t3)', fontWeight: 600 }}>{m.total} total</span>
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'var(--bd)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', display: 'flex' }}>
                      <div style={{ width: `${m.total > 0 ? (m.passed / m.total) * 100 : 0}%`, background: '#22c55e', transition: 'width 1s ease' }} />
                      <div style={{ width: `${m.total > 0 ? (m.failed / m.total) * 100 : 0}%`, background: '#ef4444', transition: 'width 1s ease' }} />
                    </div>
                  </div>
                </div>
              ))}
            </Cd>
          )}
        </>
      )}

      {!loading && rows.length === 0 && !(analysis?.total > 0) ? (
        <Cd>
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>▶</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>No Execution Records Found</div>
            <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 20, lineHeight: 1.6 }}>
              No test executions have been recorded yet.<br />
              Upload an execution report (Excel/CSV) to import results.
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, background: 'rgba(200,230,74,.1)', border: '1px solid rgba(200,230,74,.3)', color: 'var(--lime)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              📂 Upload Execution Report
              <input type="file" accept=".xlsx,.csv,.xls" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files[0])} />
            </label>
          </div>
        </Cd>
      ) : rows.length > 0 && (
      <Cd>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 14 }}>📋 Test Execution Log</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid var(--bd)' }}>
          {[
            ['Total Executions', summary.total,   'var(--tx)'],
            ['Passed',           summary.passed,  '#22c55e'],
            ['Failed',           summary.failed,  'var(--rd)'],
            ['Skipped',          summary.skipped, 'var(--am)'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ background: 'var(--b2)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color }}>{value ?? 0}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: 'var(--t2)' }}>Pass Rate</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--lime)' }}>{summary.successRate || summary.passRate || 0}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--bd)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${summary.successRate || summary.passRate || 0}%`, background: 'var(--lime)', borderRadius: 4, transition: 'width 1s ease' }} />
          </div>
        </div>
        {loading
          ? <div style={{ padding: '24px 0', color: 'var(--t3)', textAlign: 'center' }}>Loading…</div>
          : rows.length > 0 && <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
              <thead><tr style={{ background: 'var(--b2)' }}>
                {['ID', 'Test Case', 'Status', 'Sprint', 'Duration'].map(h => <th key={h} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--t2)', textAlign: 'left', borderBottom: '1px solid var(--bd)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.slice(0, 50).map(r => (
                  <tr key={r.id} className="rh" style={{ borderBottom: '1px solid var(--bd)' }}>
                    <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--cy)', fontFamily: 'monospace', fontWeight: 600 }}>EX-{String(r.id).padStart(3, '0')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--tx)' }}>{r.testCase?.name || '—'}</td>
                    <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: `${stC[r.status] || 'var(--t3)'}18`, color: stC[r.status] || 'var(--t3)' }}>{r.status}</span></td>
                    <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--t2)' }}>{r.sprint}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--t3)', fontFamily: 'monospace' }}>{r.duration || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </Cd>
      )}
      {viewFile && <FileViewerModal file={viewFile} onClose={() => setViewFile(null)} />}
    </div>
  );
}

// ── APITestingTab ──────────────────────────────────────────────────────────────
function APITestingTab({ project, toast }) {
  const [jsonFiles, setJsonFiles] = useState([]);
  const [excelFiles, setExcelFiles] = useState([]);
  const [viewFile, setViewFile] = useState(null);
  const [pmConnected, setPmConnected] = useState(false);

  const handleUpload = async (file, type) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('projectId', project.id);
    fd.append('type', 'auto');
    try {
      await uploadFile(fd);
      toast('success', `${file.name} uploaded`);
      const entry = { name: file.name, size: Math.round(file.size / 1024) + 'KB', date: new Date().toLocaleDateString(), raw: file };
      if (type === 'json') setJsonFiles(f => [...f, entry]);
      else setExcelFiles(f => [...f, entry]);
    } catch { toast('error', 'Upload failed'); }
  };

  const allFiles = [
    ...jsonFiles.map(f => ({ ...f, icon: '📋', badge: 'JSON', badgeBg: 'rgba(167,139,250,.1)', badgeColor: 'var(--pu)' })),
    ...excelFiles.map(f => ({ ...f, icon: '📊', badge: 'Excel', badgeBg: 'rgba(34,197,94,.1)', badgeColor: '#22c55e' })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Cd style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,108,55,.15)', border: '1px solid rgba(255,108,55,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🔶</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>Postman Integration</div>
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>Connect your Postman workspace to sync API collections</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {pmConnected && <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />Connected</span>}
            <button onClick={() => setPmConnected(p => !p)} style={{ padding: '8px 18px', borderRadius: 9, background: pmConnected ? 'rgba(255,77,77,.1)' : 'rgba(255,108,55,.15)', border: `1px solid ${pmConnected ? 'rgba(255,77,77,.3)' : 'rgba(255,108,55,.4)'}`, color: pmConnected ? 'var(--rd)' : '#FF6C37', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
              {pmConnected ? 'Disconnect' : 'Connect Postman'}
            </button>
          </div>
        </div>
        {pmConnected && (
          <div style={{ marginTop: 14, padding: '12px 16px', background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 10 }}>
            <div style={{ fontSize: 12.5, color: '#22c55e', fontWeight: 600, marginBottom: 4 }}>✓ Workspace synced — QA Nexus API Collection</div>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>45 requests · Last synced: just now</div>
          </div>
        )}
      </Cd>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: 'rgba(167,139,250,.1)', border: '1px solid rgba(167,139,250,.25)', color: 'var(--pu)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          📋 Upload JSON
          <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files[0], 'json')} />
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)', color: '#22c55e', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          📊 Upload Excel
          <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => handleUpload(e.target.files[0], 'excel')} />
        </label>
      </div>

      {allFiles.length > 0 && (
        <Cd style={{ padding: '14px 18px' }}>
          {allFiles.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < allFiles.length - 1 ? '1px solid var(--bd)' : 'none' }}>
              <span style={{ fontSize: 18 }}>{f.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: f.badgeBg, color: f.badgeColor, flexShrink: 0 }}>{f.badge}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>{f.date} · {f.size}</div>
              </div>
              <button onClick={() => setViewFile(f)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(56,189,248,.1)', border: '1px solid rgba(56,189,248,.2)', color: 'var(--cy)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>👁 View</button>
            </div>
          ))}
        </Cd>
      )}

      <Cd>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>⚡ API Testing Results</div>
        <StatRow label="Total Endpoints" value={45} />
        <StatRow label="Tested" value={43} valueColor="var(--cy)" bold />
        <BarRow label="Coverage" value={96} color="var(--lime)" suffix="%" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, paddingTop: 18 }}>
          <StatPair label="Passed" value={40} color="#22c55e" />
          <StatPair label="Failed" value={3} color="var(--rd)" />
        </div>
      </Cd>
      {viewFile && <FileViewerModal file={viewFile} onClose={() => setViewFile(null)} />}
    </div>
  );
}

// ── PerformanceTab ─────────────────────────────────────────────────────────────
function PerformanceTab() {
  return (
    <div style={{ marginTop: 0 }}>
      <Cd>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>📈</span> Performance Testing Metrics
        </div>
        <StatRow label="Tests Run" value={18} />
        <StatRow label="Average Response Time" value="180ms" valueColor="var(--cy)" bold />
        <BarRow label="Success Rate" value={94} color="var(--lime)" suffix="%" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, paddingTop: 18 }}>
          <StatPair label="Passed" value={17} color="#22c55e" />
          <StatPair label="Failed" value={1} color="var(--rd)" />
        </div>
      </Cd>
    </div>
  );
}

// ── Pages404Tab ────────────────────────────────────────────────────────────────
function Pages404Tab() {
  const [selected, setSelected] = useState(null);
  const pages = [
    { url: '/old-checkout',   code: 404, found: '2 days ago',  redirect: '/checkout',   priority: 'High' },
    { url: '/legacy/cart',    code: 404, found: '5 days ago',  redirect: '/cart',       priority: 'High' },
    { url: '/v1/user-profile',code: 404, found: '1 week ago',  redirect: '/profile',    priority: 'Medium' },
    { url: '/beta/dashboard', code: 404, found: '2 weeks ago', redirect: '/dashboard',  priority: 'Low' },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Cd style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--am)' }}>{pages.length}</span>
          <div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>404 Page Check Results</div><div style={{ fontSize: 12, color: 'var(--t3)' }}>Click a row to view details</div></div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'var(--b2)' }}>
            {['URL', 'Error', 'Priority', 'Discovered', 'Suggested Redirect'].map(h => <th key={h} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--t2)', textAlign: 'left', borderBottom: '1px solid var(--bd)' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {pages.map((r, i) => (
              <tr key={i} className="rh" style={{ borderBottom: '1px solid var(--bd)', cursor: 'pointer', background: selected?.url === r.url ? 'rgba(255,181,71,.04)' : 'transparent' }} onClick={() => setSelected(selected?.url === r.url ? null : r)}>
                <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--cy)', fontFamily: 'monospace' }}>{r.url}</td>
                <td style={{ padding: '11px 14px' }}><span style={{ background: 'rgba(255,77,77,.1)', color: 'var(--rd)', fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 6 }}>{r.code}</span></td>
                <td style={{ padding: '11px 14px' }}><span style={{ fontSize: 12, fontWeight: 700, color: r.priority === 'High' ? 'var(--rd)' : r.priority === 'Medium' ? 'var(--am)' : 'var(--t2)' }}>{r.priority}</span></td>
                <td style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--t3)' }}>{r.found}</td>
                <td style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--tl)', fontFamily: 'monospace' }}>{r.redirect}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Cd>
      {selected && (
        <Cd style={{ padding: '20px 24px', border: '1px solid rgba(255,181,71,.25)', background: 'rgba(255,181,71,.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>🔍 Issue Detail — <span style={{ color: 'var(--cy)', fontFamily: 'monospace' }}>{selected.url}</span></div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {[['Error Code', selected.code, 'var(--rd)'], ['Priority', selected.priority, 'var(--am)'], ['Discovered', selected.found, 'var(--t2)'], ['Redirect To', selected.redirect, 'var(--tl)']].map(([l, v, c]) => (
              <div key={l} style={{ padding: '12px 14px', background: 'var(--b2)', borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: c }}>{v}</div>
              </div>
            ))}
          </div>
        </Cd>
      )}
    </div>
  );
}

// ── BrokenLinksTab ─────────────────────────────────────────────────────────────
function BrokenLinksTab() {
  const [selected, setSelected] = useState(null);
  const links = [
    { src: '/api/v2/products',   target: 'https://ext.api.com/products', status: 'Broken',     code: 500, found: '1 day ago' },
    { src: '/assets/img/hero.png', target: 'CDN resource',              status: 'Broken',     code: 404, found: '3 days ago' },
    { src: '/docs/api-guide',    target: 'https://docs.company.com',    status: 'Redirected', code: 301, found: '5 days ago' },
    { src: '/partner/feed',      target: 'https://partner.api.io/feed', status: 'Broken',     code: 503, found: '1 week ago' },
    { src: '/static/styles/v2.css', target: 'CDN stylesheet',          status: 'Broken',     code: 404, found: '2 weeks ago' },
  ];
  const stC = { Broken: 'var(--rd)', Redirected: 'var(--am)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Cd style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--rd)' }}>{links.length}</span>
          <div><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>Broken Links Report</div><div style={{ fontSize: 12, color: 'var(--t3)' }}>Click a row to view details</div></div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: 'var(--b2)' }}>
            {['Source URL', 'Target', 'Status', 'Code', 'Discovered'].map(h => <th key={h} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--t2)', textAlign: 'left', borderBottom: '1px solid var(--bd)' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {links.map((r, i) => (
              <tr key={i} className="rh" style={{ borderBottom: '1px solid var(--bd)', cursor: 'pointer', background: selected?.src === r.src ? 'rgba(255,77,77,.04)' : 'transparent' }} onClick={() => setSelected(selected?.src === r.src ? null : r)}>
                <td style={{ padding: '11px 14px', fontSize: 13, color: 'var(--cy)', fontFamily: 'monospace' }}>{r.src}</td>
                <td style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--t2)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.target}</td>
                <td style={{ padding: '11px 14px' }}><span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: `${stC[r.status]}18`, color: stC[r.status] }}>{r.status}</span></td>
                <td style={{ padding: '11px 14px', fontSize: 12.5, fontFamily: 'monospace', color: r.status === 'Broken' ? 'var(--rd)' : 'var(--am)' }}>{r.code}</td>
                <td style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--t3)' }}>{r.found}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Cd>
      {selected && (
        <Cd style={{ padding: '20px 24px', border: '1px solid rgba(255,77,77,.2)', background: 'rgba(255,77,77,.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>🔗 Link Detail — <span style={{ color: 'var(--cy)', fontFamily: 'monospace' }}>{selected.src}</span></div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {[['Status', selected.status, stC[selected.status]], ['HTTP Code', selected.code, stC[selected.status]], ['Target', selected.target, 'var(--t2)'], ['Discovered', selected.found, 'var(--t2)']].map(([l, v, c]) => (
              <div key={l} style={{ padding: '12px 14px', background: 'var(--b2)', borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: c }}>{v}</div>
              </div>
            ))}
          </div>
        </Cd>
      )}
    </div>
  );
}

// ── ProjectInnerPage (main export) ─────────────────────────────────────────────
export default function ProjectInnerPage({ project: initialProject, onBack, toast }) {
  const [project, setProject] = useState(initialProject);
  const [tab, setTab] = useState('Overview');
  const [bugs, setBugs] = useState([]);

  const hC = HEALTH_COLOR[project.health] || 'var(--t2)';
  const hIc = HEALTH_IC[project.health] || '◎';

  const load = useCallback(async () => {
    try {
      const [pRes, bRes] = await Promise.all([
        getProject(project.id),
        getBugs({ projectId: project.id }),
      ]);
      setProject(pRes.data);
      setBugs(bRes.data);
    } catch {}
  }, [project.id]);

  useEffect(() => { load(); }, [load]);
  useSocket({ 'project:updated': load, 'bug:created': load, 'bug:updated': load });

  const bd = useMemo(() => {
    const all = bugs || project.bugs || [];
    return {
      critical: all.filter(b => b.severity === 'Critical').length,
      high: all.filter(b => b.severity === 'High').length,
      medium: all.filter(b => b.severity === 'Medium').length,
      low: all.filter(b => b.severity === 'Low').length,
      total: all.length,
    };
  }, [bugs, project.bugs]);

  const projectWithBD = { ...project, bugsBreakdown: bd };

  const tabContent = {
    Overview: <OverviewTab project={projectWithBD} />,
    Details: <DetailsTab project={projectWithBD} bugs={bugs} />,
    'Test Cases': <TestCasesTab project={project} toast={toast} />,
    Execution: <ExecutionTab project={project} toast={toast} />,
    'API Testing': <APITestingTab project={project} toast={toast} />,
    Performance: <PerformanceTab />,
    '404 Pages': <Pages404Tab />,
    'Broken Links': <BrokenLinksTab />,
  };

  return (
    <div className="crossfade" style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 18, lineHeight: 1, padding: '4px 6px', marginTop: 2, borderRadius: 8, transition: 'color .15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--tx)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--t2)'}>←</button>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tx)', marginBottom: 3 }}>{project.name}</div>
          <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.5 }}>{project.description}</div>
        </div>
      </div>

      {/* Status overview card */}
      <div className="cd" style={{ marginBottom: 18, padding: '22px 24px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 18 }}>Project Status Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 40, alignItems: 'start' }}>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--t3)', marginBottom: 8 }}>Current Status</div>
            <span style={{ background: 'var(--tx)', color: 'var(--bg)', fontSize: 13, fontWeight: 700, padding: '6px 16px', borderRadius: 8, display: 'inline-block' }}>{project.status}</span>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--t3)', marginBottom: 8 }}>Project Health</div>
            <span style={{ background: `${hC}15`, color: hC, fontSize: 13, fontWeight: 700, padding: '6px 16px', borderRadius: 8, border: `1px solid ${hC}30`, display: 'inline-flex', alignItems: 'center', gap: 6 }}>{hIc} {project.health}</span>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--t3)', marginBottom: 6 }}>Total Bugs</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--am)', lineHeight: 1 }}>{bd.total}</div>
            <div style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 4 }}>{bd.critical} critical · {bd.high} high</div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
        <div style={{ display: 'flex', background: 'var(--b2)', borderRadius: 10, padding: 3, width: 'max-content', minWidth: '100%', boxSizing: 'border-box' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', background: tab === t ? 'var(--bc)' : 'transparent', color: tab === t ? 'var(--tx)' : 'var(--t2)', fontSize: 13, fontWeight: tab === t ? 600 : 500, cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap', boxShadow: tab === t ? '0 1px 6px rgba(0,0,0,.18)' : 'none', fontFamily: "'DM Sans',sans-serif" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tabContent[tab]}
    </div>
  );
}
