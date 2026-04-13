import React, { useState, useEffect, useCallback } from 'react';
import { getProjects, createProject, deleteProject } from '../api/client';
import { ProgBar } from '../components/ui/Charts';
import { ConfirmModal, Modal } from '../components/ui/Modal';
import useSocket from '../hooks/useSocket';

const STATUS_COLOR = { Active: 'var(--lime)', Pending: 'var(--am)', Completed: 'var(--tl)', Hold: 'var(--rd)', 'On Hold': 'var(--rd)' };
const HEALTH_CFG = {
  Excellent:  { c: '#22c55e', ic: '✓' },
  Good:       { c: '#38BDF8', ic: '◎' },
  Average:    { c: '#FFB547', ic: '◎' },
  'At Risk':  { c: '#FFB547', ic: '⚠' },
  Poor:       { c: '#FF4D4D', ic: '✕' },
  Critical:   { c: '#FF4D4D', ic: '✕' },
};

function HealthBadge({ health }) {
  const { c, ic } = HEALTH_CFG[health] || { c: 'var(--t2)', ic: '◎' };
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: c, fontSize: 13, fontWeight: 700 }}><span style={{ fontSize: 11 }}>{ic}</span>{health}</span>;
}

function ProjectCard({ project: p, onView, onDelete }) {
  const sc = STATUS_COLOR[p.status] || 'var(--t2)';
  const bd = p.bugsBreakdown || { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
  return (
    <div className={`cd ${p.health === 'Excellent' ? 'cd-glow' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', lineHeight: 1.3, flex: 1, paddingRight: 8 }}>{p.name}</div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${sc}15`, color: sc, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc }} />{p.status}
        </span>
      </div>
      <div style={{ marginBottom: 13 }}>
        <div style={{ fontSize: 11.5, color: 'var(--t3)', marginBottom: 4 }}>Project Health</div>
        <HealthBadge health={p.health} />
      </div>
      <div style={{ marginBottom: 13 }}>
        <div style={{ fontSize: 11.5, color: 'var(--t3)', marginBottom: 7 }}>Bugs Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          {[['Critical', bd.critical, 'var(--rd)'], ['High', bd.high, 'var(--am)'], ['Medium', bd.medium, 'var(--am)'], ['Low', bd.low, 'var(--tl)']].map(([l, v, c]) =>
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ fontSize: 12, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ fontSize: 9, color: c }}>▲</span>{l}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: v > 0 ? c : 'var(--t3)' }}>{v}</span>
            </div>
          )}
        </div>
      </div>
      {[['Total Bugs', bd.total, bd.total > 20 ? 'var(--rd)' : bd.total > 10 ? 'var(--am)' : 'var(--tx)'], ['Test Cases', p.testCasesCount || 0, 'var(--tx)'], ['Pass Rate', `${p.passRate || 0}%`, (p.passRate || 0) >= 90 ? 'var(--lime)' : (p.passRate || 0) >= 75 ? 'var(--am)' : 'var(--rd)']].map(([l, v, c]) =>
        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>{l}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: c }}>{v}</span>
        </div>
      )}
      <ProgBar value={p.passRate || 0} color={(p.passRate || 0) >= 90 ? 'var(--lime)' : (p.passRate || 0) >= 75 ? 'var(--am)' : 'var(--rd)'} height={5} style={{ marginTop: 6, marginBottom: 14 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-s" style={{ flex: 1, fontSize: 13 }} onClick={() => onView(p)}>View Overview</button>
        <button className="btn btn-d" style={{ padding: '9px 12px', fontSize: 13 }} onClick={() => onDelete(p)}>✕</button>
      </div>
    </div>
  );
}

function CreateProjectModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', status: 'Active', health: 'Good', description: '' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handle = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    await onCreate(form);
    setLoading(false);
    onClose();
  };

  const lbl = { display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 };
  const inp = {
    width: '100%', background: 'var(--b2)', border: '1px solid var(--bd)',
    borderRadius: 10, color: 'var(--tx)', fontSize: 13.5, padding: '10px 14px',
    outline: 'none', fontFamily: "'DM Sans',sans-serif", marginBottom: 16, boxSizing: 'border-box',
  };

  const STATUS_OPTIONS = ['Active', 'Pending', 'On Hold'];
  const HEALTH_OPTIONS = ['Good', 'At Risk', 'Critical'];
  const HEALTH_COLOR_MAP = { Good: '#38BDF8', 'At Risk': '#FFB547', Critical: '#FF4D4D' };
  const STATUS_COLOR_MAP = { Active: '#C8E64A', Pending: '#FFB547', 'On Hold': '#FF4D4D' };

  return (
    <Modal title="Create New Project" onClose={onClose}>
      {/* Project Name */}
      <label style={lbl}>Project Name <span style={{ color: 'var(--rd)' }}>*</span></label>
      <input
        value={form.name}
        onChange={set('name')}
        placeholder="e.g. Mobile App Testing"
        style={inp}
        autoFocus
      />

      {/* Status + Health side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 0 }}>
        <div>
          <label style={lbl}>Status</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${form.status === s ? STATUS_COLOR_MAP[s] : 'var(--bd)'}`,
                  background: form.status === s ? `${STATUS_COLOR_MAP[s]}18` : 'transparent',
                  color: form.status === s ? STATUS_COLOR_MAP[s] : 'var(--t2)',
                  transition: 'all .15s',
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={lbl}>Health</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {HEALTH_OPTIONS.map(h => (
              <button key={h} onClick={() => setForm(f => ({ ...f, health: h }))}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: `1px solid ${form.health === h ? HEALTH_COLOR_MAP[h] : 'var(--bd)'}`,
                  background: form.health === h ? `${HEALTH_COLOR_MAP[h]}18` : 'transparent',
                  color: form.health === h ? HEALTH_COLOR_MAP[h] : 'var(--t2)',
                  transition: 'all .15s',
                }}>
                {h}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <label style={lbl}>Description</label>
      <textarea
        value={form.description}
        onChange={set('description')}
        rows={4}
        placeholder="Briefly describe the project scope, goals, or testing focus..."
        style={{ ...inp, resize: 'vertical', lineHeight: 1.7, marginBottom: 20 }}
      />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--bd)', paddingTop: 16, marginTop: 4 }}>
        <button className="btn btn-s" onClick={onClose} style={{ minWidth: 90 }}>Cancel</button>
        <button
          className="btn btn-p"
          onClick={handle}
          disabled={loading || !form.name.trim()}
          style={{ minWidth: 130 }}>
          {loading ? 'Creating…' : 'Create Project'}
        </button>
      </div>
    </Modal>
  );
}

export default function ProjectsPage({ onViewProject, toast, initialFilter = 'All' }) {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState(initialFilter);
  const [hFilter, setHFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await getProjects();
      setProjects(res.data);
    } catch { toast('error', 'Failed to load projects'); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  useSocket({
    'project:created': load,
    'project:updated': load,
    'project:deleted': load,
    'bug:created': load,
    'bug:updated': load,
    'execution:created': load,
  });

  const filtered = projects.filter(p =>
    (filter === 'All' || p.status === filter) &&
    (hFilter === 'All' || p.health === hFilter)
  );

  const counts = {
    total: projects.length,
    Active: projects.filter(p => p.status === 'Active').length,
    Pending: projects.filter(p => p.status === 'Pending').length,
    Completed: projects.filter(p => p.status === 'Completed').length,
    Hold: projects.filter(p => p.status === 'Hold').length,
  };

  const handleCreate = async (data) => {
    try {
      await createProject(data);
      toast('success', `Project "${data.name}" created!`);
      load();
    } catch { toast('error', 'Failed to create project'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject(deleteTarget.id);
      toast('success', `Project "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      load();
    } catch { toast('error', 'Failed to delete project'); }
  };

  const selStyle = { background: 'var(--bc)', border: '1px solid var(--bd)', borderRadius: 9, color: 'var(--tx)', fontSize: 13, padding: '7px 30px 7px 12px', outline: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", appearance: 'none', WebkitAppearance: 'none' };

  return (
    <div className="crossfade" style={{ paddingBottom: 24 }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 22 }}>
        {[
          ['Total Projects', counts.total, undefined, 'All', '📁'],
          ['Active', counts.Active, 'var(--lime)', 'Active', '▶'],
          ['Pending', counts.Pending, 'var(--am)', 'Pending', '⏳'],
          ['Completed', counts.Completed, 'var(--cy)', 'Completed', '✓'],
          ['On Hold', counts.Hold, 'var(--rd)', 'Hold', '⏸'],
        ].map(([l, v, c, f, ic]) => (
          <div key={l} className="mc" onClick={() => setFilter(f)}
            style={{ cursor: 'pointer', border: `1px solid ${filter === f ? (c || 'rgba(200,230,74,.4)') : 'var(--bd)'}`, background: filter === f ? `${c ? c + '10' : 'rgba(200,230,74,.06)'}` : 'var(--bc)', transition: 'all .2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--t2)' }}>{l}</div>
              <span style={{ fontSize: 14, opacity: .5 }}>{ic}</span>
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, color: c || 'var(--tx)', lineHeight: 1 }}>{v}</div>
            {filter === f && <div style={{ marginTop: 8, height: 2, borderRadius: 1, background: c || 'var(--lime)', opacity: .6 }} />}
          </div>
        ))}
      </div>

      {/* Filters + create */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', background: 'var(--bc)', border: '1px solid var(--bd)', borderRadius: 14, padding: '10px 14px' }}>
        <div style={{ position: 'relative' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={selStyle}>
            {['All', 'Active', 'Pending', 'Completed', 'Hold'].map(s => <option key={s} value={s}>{s === 'All' ? 'All Status' : s}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 10, color: 'var(--t2)' }}>▼</span>
        </div>
        <div style={{ position: 'relative' }}>
          <select value={hFilter} onChange={e => setHFilter(e.target.value)} style={selStyle}>
            {['All', 'Excellent', 'Good', 'Average', 'Poor'].map(h => <option key={h}>{h === 'All' ? 'All Health' : h}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 10, color: 'var(--t2)' }}>▼</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>
            {filtered.length} project{filtered.length !== 1 ? 's' : ''}
          </span>
          <button className="btn btn-p" onClick={() => setShowCreate(true)}>+ New Project</button>
        </div>
      </div>

      {/* Grid */}
      {loading
        ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skel" style={{ height: 300 }} />)}
          </div>
        : filtered.length === 0
          ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', background: 'var(--bc)', border: '1px solid var(--bd)', borderRadius: 18, minHeight: 280 }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--b2)', border: '1px solid var(--bd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 16 }}>📭</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>No projects yet</div>
              <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 22, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
                {filter !== 'All' || hFilter !== 'All'
                  ? 'No projects match the selected filters. Try adjusting or clearing the filters.'
                  : 'Get started by creating your first QA project. Track bugs, test cases, and executions all in one place.'}
              </div>
              {filter !== 'All' || hFilter !== 'All'
                ? <button className="btn btn-s" onClick={() => { setFilter('All'); setHFilter('All'); }}>Clear Filters</button>
                : <button className="btn btn-p" onClick={() => setShowCreate(true)}>+ Create First Project</button>}
            </div>
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {filtered.map(p => (
                <ProjectCard key={p.id} project={p}
                  onView={proj => onViewProject(proj)}
                  onDelete={proj => setDeleteTarget(proj)} />
              ))}
            </div>
      }

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {deleteTarget && (
        <ConfirmModal title="Delete Project" message={`Delete "${deleteTarget.name}"? This will remove all associated bugs, test cases, and executions. This action cannot be undone.`}
          confirmLabel="Delete Project" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  );
}
