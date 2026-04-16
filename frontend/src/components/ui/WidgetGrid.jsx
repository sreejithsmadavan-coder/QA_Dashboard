import React, { useState, useEffect, useRef } from 'react';

const WIDGET_DEFS = [
  { key: 'ProjectSummary', label: 'Project Summary', icon: '📊' },
  { key: 'BugChart', label: 'Bug Chart', icon: '🐛' },
  { key: 'TestPassRate', label: 'Test Pass Rate', icon: '✅' },
  { key: 'RecentActivity', label: 'Recent Activity', icon: '📋' },
  { key: 'SprintOverview', label: 'Sprint Overview', icon: '🏃' },
  { key: 'QuickActions', label: 'Quick Actions', icon: '⚡' },
];

const STORAGE_KEY = 'qa_dashboard_widgets';

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return WIDGET_DEFS.map(w => w.key);
}

function saveConfig(keys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

/* ── Individual widget renderers ──────────────────────────────────────────── */

function ProjectSummaryWidget({ stats }) {
  const projects = stats?.projects || {};
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 12 }}>Project Summary</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Total', value: projects.total ?? 0, color: 'var(--ac)' },
          { label: 'Active', value: projects.active ?? 0, color: 'var(--lime)' },
          { label: 'Completed', value: projects.completed ?? 0, color: 'var(--pu)' },
          { label: 'On Hold', value: projects.hold ?? 0, color: 'var(--wa)' },
        ].map(item => (
          <div key={item.label} style={{ textAlign: 'center', padding: 10, borderRadius: 10, background: 'var(--bg2, rgba(255,255,255,.04))' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BugChartWidget({ stats }) {
  const bugs = stats?.bugs || {};
  const total = bugs.total || 0;
  const items = [
    { label: 'Critical', value: bugs.critical ?? 0, color: '#ef4444' },
    { label: 'High', value: bugs.high ?? 0, color: '#f97316' },
    { label: 'Medium', value: bugs.medium ?? 0, color: '#eab308' },
    { label: 'Low', value: bugs.low ?? 0, color: '#22c55e' },
  ];
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 12 }}>Bug Distribution</div>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--tx2)', width: 55 }}>{item.label}</span>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--bg2, rgba(255,255,255,.08))' }}>
            <div style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, height: '100%', borderRadius: 4, background: item.color, transition: 'width .3s' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: item.color, width: 24, textAlign: 'right' }}>{item.value}</span>
        </div>
      ))}
      <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 8, textAlign: 'right' }}>Total: {total}</div>
    </div>
  );
}

function TestPassRateWidget({ stats }) {
  const rate = stats?.passRate ?? 0;
  const rateColor = rate >= 80 ? 'var(--lime)' : rate >= 50 ? 'var(--wa)' : '#ef4444';
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 16 }}>Test Pass Rate</div>
      <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto' }}>
        <svg viewBox="0 0 36 36" style={{ width: 120, height: 120, transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--bg2, rgba(255,255,255,.08))" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={rateColor} strokeWidth="3"
            strokeDasharray={`${rate} ${100 - rate}`} strokeLinecap="round" />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: rateColor }}>{Math.round(rate)}%</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 14, fontSize: 12 }}>
        <span style={{ color: 'var(--lime)' }}>Passed: {stats?.passed ?? 0}</span>
        <span style={{ color: '#ef4444' }}>Failed: {stats?.failed ?? 0}</span>
      </div>
    </div>
  );
}

function RecentActivityWidget({ activity }) {
  const items = activity?.slice(0, 6) || [];
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 12 }}>Recent Activity</div>
      {items.length === 0 && <div style={{ fontSize: 12, color: 'var(--tx2)' }}>No recent activity</div>}
      {items.map((item, i) => (
        <div key={item.id || i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
          <span style={{ color: item.iconColor || 'var(--lime)', fontSize: 10, marginTop: 4 }}>{item.icon || '●'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--tx)' }}>{item.action}</div>
            <div style={{ fontSize: 10, color: 'var(--tx2)' }}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SprintOverviewWidget({ stats }) {
  const sprints = stats?.sprints || [];
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 12 }}>Sprint Overview</div>
      {sprints.length === 0 && <div style={{ fontSize: 12, color: 'var(--tx2)' }}>No sprint data</div>}
      {sprints.slice(0, 4).map((s, i) => (
        <div key={i} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: 'var(--tx)' }}>{s.sprint || s.name || `Sprint ${i + 1}`}</span>
            <span style={{ color: 'var(--ac)', fontWeight: 600 }}>{s.passRate ?? 0}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--bg2, rgba(255,255,255,.08))' }}>
            <div style={{ width: `${s.passRate ?? 0}%`, height: '100%', borderRadius: 3, background: 'var(--ac)', transition: 'width .3s' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickActionsWidget({ onNavigate }) {
  const actions = [
    { label: 'New Bug', icon: '🐛', path: '/bugs' },
    { label: 'New Test', icon: '🧪', path: '/test-cases' },
    { label: 'Projects', icon: '📁', path: '/projects' },
    { label: 'Reports', icon: '📈', path: '/reports' },
    { label: 'Meetings', icon: '📅', path: '/meetings' },
    { label: 'Settings', icon: '⚙️', path: '/settings' },
  ];
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--tx2)', marginBottom: 12 }}>Quick Actions</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {actions.map(a => (
          <button key={a.label} onClick={() => onNavigate?.(a.path)}
            style={{ background: 'var(--bg2, rgba(255,255,255,.04))', border: '1px solid var(--bd)', borderRadius: 10,
              padding: '12px 4px', cursor: 'pointer', textAlign: 'center', transition: 'background .2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3, rgba(255,255,255,.08))'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg2, rgba(255,255,255,.04))'}
          >
            <div style={{ fontSize: 20 }}>{a.icon}</div>
            <div style={{ fontSize: 10, color: 'var(--tx2)', marginTop: 4 }}>{a.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

const WIDGET_MAP = {
  ProjectSummary: ProjectSummaryWidget,
  BugChart: BugChartWidget,
  TestPassRate: TestPassRateWidget,
  RecentActivity: RecentActivityWidget,
  SprintOverview: SprintOverviewWidget,
  QuickActions: QuickActionsWidget,
};

/* ── Main WidgetGrid ──────────────────────────────────────────────────────── */

export default function WidgetGrid({ stats, activity, onNavigate }) {
  const [activeWidgets, setActiveWidgets] = useState(loadConfig);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => { saveConfig(activeWidgets); }, [activeWidgets]);

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (key) => {
    setActiveWidgets(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div>
      {/* Header with Customize button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, position: 'relative' }} ref={dropRef}>
        <button onClick={() => setShowDropdown(v => !v)}
          style={{ background: 'var(--bg2, rgba(255,255,255,.06))', border: '1px solid var(--bd)', borderRadius: 10,
            padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: 'var(--tx)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>⚙</span> Customize
        </button>
        {showDropdown && (
          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: 'var(--bc)',
            border: '1px solid var(--bd)', borderRadius: 12, padding: 12, zIndex: 100, minWidth: 220,
            boxShadow: '0 8px 24px rgba(0,0,0,.3)' }}>
            {WIDGET_DEFS.map(w => (
              <label key={w.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 4px', cursor: 'pointer',
                fontSize: 13, color: 'var(--tx)' }}>
                <input type="checkbox" checked={activeWidgets.includes(w.key)} onChange={() => toggle(w.key)}
                  style={{ accentColor: 'var(--ac)' }} />
                <span>{w.icon}</span>
                <span>{w.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Widget Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
        {activeWidgets.map(key => {
          const Comp = WIDGET_MAP[key];
          if (!Comp) return null;
          return (
            <div key={key} className="cd" style={{ background: 'var(--bc)', borderRadius: 18,
              border: '1px solid var(--bd)', padding: 24 }}>
              <Comp stats={stats} activity={activity} onNavigate={onNavigate} />
            </div>
          );
        })}
      </div>

      {activeWidgets.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--tx2)', fontSize: 14 }}>
          No widgets enabled. Click "Customize" to add widgets.
        </div>
      )}
    </div>
  );
}
