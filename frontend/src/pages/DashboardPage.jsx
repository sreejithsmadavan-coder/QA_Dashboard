import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getDashboardStats, getSprintOverview } from '../api/client';
import { Donut, AreaChart, ProgBar } from '../components/ui/Charts';
import useSocket from '../hooks/useSocket';

function MetricCard({ label, value, sub, color, icon, onClick }) {
  const ref = useRef(null);
  const move = useCallback((e) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - .5) * 2;
    const y = ((e.clientY - r.top) / r.height - .5) * 2;
    ref.current.style.transform = `translateY(-2px) perspective(800px) rotateY(${x * .5}deg) rotateX(${-y * .5}deg)`;
    ref.current.style.transition = 'transform .08s';
  }, []);
  const leave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = 'none';
    ref.current.style.transition = 'transform .4s cubic-bezier(.22,1,.36,1)';
  }, []);
  return (
    <div ref={ref} className="mc" onMouseMove={move} onMouseLeave={leave} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--t2)' }}>{label}</div>
        {icon && <span style={{ fontSize: 15, color: 'var(--t3)', opacity: .7 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || 'var(--tx)', marginBottom: 4 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--t3)', fontWeight: 400 }}>{sub}</div>}
    </div>
  );
}

function Cd({ children, glow, style = {} }) {
  return <div className={`cd ${glow ? 'cd-glow' : ''}`} style={style}>{children}</div>;
}

export default function DashboardPage({ onNavigate, toast }) {
  const [stats, setStats] = useState(null);
  const [sprints, setSprints] = useState({});
  const [sprint, setSprint] = useState('Sprint 6');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [sRes, spRes] = await Promise.all([getDashboardStats(), getSprintOverview()]);
      setStats(sRes.data);
      setSprints(spRes.data);
      const keys = Object.keys(spRes.data);
      if (keys.length > 0) setSprint(keys[keys.length - 1]);
    } catch (e) {
      toast('error', 'Failed to load dashboard data');
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  useSocket({
    'project:created':          load,
    'project:updated':          load,
    'project:deleted':          load,
    'bug:created':              load,
    'bug:updated':              load,
    'execution:created':        load,
    'testcases:bulk_imported':  load,
    'bugs:bulk_imported':       load,
    'executions:bulk_imported': load,
  });

  const sd = sprints[sprint] || { exec: 0, passed: 0, failed: 0, skipped: 0, passRate: 0, trend: [] };
  const p = stats?.projects || {};
  const tc = stats?.testCases || {};
  const ex = stats?.executions || {};
  const api = stats?.api || {};
  const perf = stats?.performance || {};
  const sec = stats?.security || {};

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--bd)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <div style={{ color: 'var(--t3)', fontSize: 14 }}>Loading dashboard…</div>
    </div>
  );

  return (
    <div className="crossfade" style={{ paddingBottom: 24 }}>
      {/* Project Overview */}
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 12 }}>Project Overview</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 26 }}>
        <MetricCard label="Total Projects"     value={p.total}     sub="All projects"           icon="◈" onClick={() => onNavigate('All')} />
        <MetricCard label="Active Projects"    value={p.active}    sub="In progress"             color="var(--lime)" icon="◉" onClick={() => onNavigate('Active')} />
        <MetricCard label="Pending Projects"   value={p.pending}   sub="Awaiting start"          color="var(--am)"   icon="⏷" onClick={() => onNavigate('Pending')} />
        <MetricCard label="Completed Projects" value={p.completed} sub="Successfully finished"   color="var(--cy)"   icon="✓" onClick={() => onNavigate('Completed')} />
        <MetricCard label="On Hold Projects"   value={p.hold}      sub="Temporarily paused"      color="var(--rd)"   icon="⏸" onClick={() => onNavigate('Hold')} />
      </div>

      {/* Test Cases Overview */}
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 12 }}>Test Cases Overview</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 26 }}>
        <MetricCard label="Total Test Cases"  value={tc.total ?? 0}                        icon="◎" />
        <MetricCard label="Functional Cases"  value={tc.categories?.Functional ?? 0}  color="var(--lime)"  icon="✓" />
        <MetricCard label="UI Cases"          value={tc.categories?.UI ?? 0}          color="var(--cy)"    icon="🖥" />
        <MetricCard label="Security Cases"    value={tc.categories?.Security ?? 0}    color="var(--am)"    icon="🔐" />
        <MetricCard label="Performance Cases" value={tc.categories?.Performance ?? 0} color="var(--pu)"    icon="⚡" />
      </div>

      {/* API + Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Cd glow>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>API Testing Overview</span>
            {api.total > 0
              ? <span style={{ background: 'rgba(200,230,74,.1)', color: 'var(--lime)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10 }}>Live</span>
              : <span style={{ background: 'rgba(255,255,255,.05)', color: 'var(--t3)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10 }}>No Data</span>
            }
          </div>
          {!api.total
            ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t3)', fontSize: 13 }}>No API test data yet.<br/>Upload API test results to see stats.</div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'center' }}>
                <Donut value={api.coverage} size={100} sw={10} color="var(--lime)" label="Coverage" suffix="%" />
                <div>
                  {[['Total Endpoints', api.total, 'var(--tx)'], ['Tested', api.tested, 'var(--cy)'], ['Passed', api.passed, 'var(--lime)'], ['Failed', api.failed, 'var(--rd)']].map(([l, v, c]) =>
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>{l}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: c }}>{v}</span>
                    </div>
                  )}
                  <ProgBar value={api.coverage} color="var(--lime)" height={5} />
                </div>
              </div>
          }
        </Cd>
        <Cd glow>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>Performance Testing</span>
            {perf.testsRun > 0
              ? <span style={{ background: 'rgba(56,189,248,.1)', color: 'var(--cy)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10 }}>{perf.successRate}%</span>
              : <span style={{ background: 'rgba(255,255,255,.05)', color: 'var(--t3)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10 }}>No Data</span>
            }
          </div>
          {!perf.testsRun
            ? <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--t3)', fontSize: 13 }}>No performance test data yet.<br/>Upload performance results to see stats.</div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'center' }}>
                <Donut value={perf.successRate} size={100} sw={10} color="var(--cy)" label="Success Rate" suffix="%" />
                <div>
                  {[['Tests Run', perf.testsRun, 'var(--tx)'], ['Avg Response', perf.avgResponse, 'var(--cy)'], ['Passed', perf.passed, 'var(--lime)'], ['Failed', perf.failed, 'var(--rd)']].map(([l, v, c]) =>
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>{l}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: c }}>{v}</span>
                    </div>
                  )}
                  <ProgBar value={perf.successRate} color="var(--cy)" height={5} />
                </div>
              </div>
          }
        </Cd>
      </div>

      {/* Security + 404 + Broken Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 14 }}>
        <Cd glow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>🔐</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>Security Testing</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: 'rgba(167,139,250,.1)', color: 'var(--pu)' }}>{sec.total ?? 0} Tests</span>
          </div>
          {!sec.total
            ? <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--t3)', fontSize: 13 }}>No security test cases yet.</div>
            : [['Security Test Cases', sec.total, 'var(--pu)'], ['Vulnerability Scans', sec.vulnScans, 'var(--cy)'], ['Penetration Tests', sec.penTests, 'var(--lime)'], ['Failed / Flagged', sec.failed, 'var(--rd)']].map(([l, v, c]) =>
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--bd)' }}>
                  <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: c }}>{v ?? 0}</span>
                </div>
              )
          }
          <ProgBar value={sec.total > 0 ? Math.round((sec.total - (sec.failed || 0)) / sec.total * 100) : 0} color="var(--pu)" height={5} style={{ marginTop: 12 }} />
        </Cd>
        <Cd>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 15, color: 'var(--t2)' }}>📄</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>404 Page Check</span>
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: stats?.pages404?.count > 0 ? 'var(--rd)' : 'var(--t3)', marginBottom: 4 }}>{stats?.pages404?.count ?? 0}</div>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>{stats?.pages404?.count > 0 ? 'Pages returning 404 errors' : 'No 404 errors detected'}</div>
          <ProgBar value={stats?.pages404?.count ?? 0} max={50} color="var(--rd)" height={5} style={{ marginTop: 14 }} />
        </Cd>
        <Cd>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 15, color: 'var(--t2)' }}>🔗</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>Broken Links</span>
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, color: stats?.brokenLinks?.count > 0 ? 'var(--rd)' : 'var(--t3)', marginBottom: 4 }}>{stats?.brokenLinks?.count ?? 0}</div>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>{stats?.brokenLinks?.count > 0 ? 'Links that need attention' : 'No broken links detected'}</div>
          <ProgBar value={stats?.brokenLinks?.count ?? 0} max={80} color="var(--am)" height={5} style={{ marginTop: 14 }} />
        </Cd>
      </div>

      {/* Test Execution Report */}
      <Cd glow>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>Test Execution Report Overview</span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: 'rgba(200,230,74,.1)', color: 'var(--lime)' }}>{sprint}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.keys(sprints).sort((a, b) => {
              const na = parseInt(a.split(' ')[1]); const nb = parseInt(b.split(' ')[1]);
              return nb - na;
            }).map((s, idx) => (
              <button key={s} onClick={() => setSprint(s)}
                style={{ padding: '5px 13px', borderRadius: 8, border: `1px solid ${sprint === s ? 'rgba(200,230,74,.4)' : 'var(--bd)'}`, background: sprint === s ? 'rgba(200,230,74,.12)' : 'var(--b2)', color: sprint === s ? 'var(--lime)' : 'var(--t2)', fontSize: 12, fontWeight: sprint === s ? 700 : 500, cursor: 'pointer', transition: 'all .2s', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}>
                {s}{idx === 0 && <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(200,230,74,.2)', color: 'var(--lime)', borderRadius: 4, padding: '1px 5px' }}>LATEST</span>}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 18 }}>
          {[['Total Executions', sd.exec, 'var(--tx)'], ['Passed', sd.passed, 'var(--lime)'], ['Failed', sd.failed, 'var(--rd)'], ['Skipped', sd.skipped, 'var(--am)']].map(([l, v, c]) =>
            <div key={l} style={{ padding: '14px', background: 'var(--b2)', borderRadius: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 5 }}>{l}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: c }}>{v}</div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontSize: 13, color: 'var(--t2)' }}>Overall Pass Rate</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--lime)' }}>{sd.passRate}%</span>
        </div>
        <ProgBar value={sd.passRate} color="var(--lime)" height={8} />
        {sd.trend?.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 6 }}>Trend (last {sd.trend.length} runs — {sprint})</div>
            <AreaChart data={sd.trend} color="var(--lime)" />
          </div>
        )}
      </Cd>
    </div>
  );
}
