import React, { useState, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { login as apiLogin } from './api/client';
import { Toasts, useToast } from './components/ui/Toast';
import { Modal, ConfirmModal } from './components/ui/Modal';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import { createProject } from './api/client';

// Lazy-load heavy pages (code-split into separate chunks)
const ProjectInnerPage = lazy(() => import('./pages/ProjectInnerPage'));
const MeetingsPage = lazy(() => import('./pages/MeetingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const QAAgentPage = lazy(() => import('./pages/QAAgentPage'));
const ChatBotIcon = lazy(() => import('./components/ui/ChatBotIcon'));
const CommandPalette = lazy(() => import('./components/ui/CommandPalette'));
import { getActivityFeed } from './api/client';
import useSocket from './hooks/useSocket';

const PAGE_TITLES = {
  dashboard: 'Dashboard Overview',
  projects: 'Projects',
  'qa-agent': 'QA Agent',
  meetings: 'Meetings',
  settings: 'Settings',
  profile: 'Profile',
};
const PAGE_SUBS = {
  dashboard: 'Monitor your QA metrics and project health',
  projects: 'Manage and monitor all your QA projects',
  'qa-agent': 'AI-powered test generation, execution & reporting',
  meetings: 'Schedule and manage your QA team meetings',
  settings: 'Manage your account and preferences',
  profile: 'Manage your personal information',
};

function AppContent() {
  const { user, loading, login, logout } = useAuth();
  const { toasts, toast, removeToast } = useToast();

  const [page, setPage] = useState('dashboard');
  const [activeProjId, setActiveProjId] = useState(null);
  const [activeProject, setActiveProject] = useState(null);
  const [projFilter, setProjFilter] = useState('All');
  const [theme, setTheme] = useState(() => localStorage.getItem('qa_theme') || 'dark');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activity, setActivity] = useState([]);
  const [qaRunning, setQaRunning] = useState(false);
  const [qaBackground, setQaBackground] = useState(false);
  const [qaSwitchTarget, setQaSwitchTarget] = useState(null);
  const [qaProgress, setQaProgress] = useState(0);
  const [qaCompletedPending, setQaCompletedPending] = useState(false);
  const [autoCreateProject, setAutoCreateProject] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);

  // Global keyboard shortcuts (Ctrl+K search)
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setCmdPaletteOpen(o => !o); }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  // Update browser tab title when page changes
  useEffect(() => {
    const title = activeProject
      ? `${activeProject.name} · QA Nexus`
      : `${PAGE_TITLES[page] || 'Dashboard'} · QA Nexus`;
    document.title = title;
  }, [page, activeProject]);

  // Listen for QA Agent running-state + progress messages from iframe
  useEffect(() => {
    const onMessage = (ev) => {
      const m = ev?.data;
      if (!m || m.source !== 'qa-agent') return;
      if (m.type === 'running-state') {
        const running = !!m.data?.running;
        setQaRunning(prev => {
          // Transition from running → not running while user is off the QA tab = completion pending
          if (prev && !running && page !== 'qa-agent') {
            setQaCompletedPending(true);
          }
          return running;
        });
        if (running) {
          setQaCompletedPending(false);
        } else {
          // Keep background flag until user revisits tab (so completion badge stays)
        }
      } else if (m.type === 'progress-update') {
        setQaProgress(Math.max(0, Math.min(100, m.data?.pct || 0)));
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [page]);

  // Clear completion badge + background flag when user visits the QA Agent tab
  useEffect(() => {
    if (page === 'qa-agent') {
      setQaCompletedPending(false);
      setQaBackground(false);
    }
  }, [page]);

  // Guarded page setter — intercepts when leaving QA Agent while running
  const safeSetPage = useCallback((target) => {
    if (page === 'qa-agent' && qaRunning && target !== 'qa-agent') {
      setQaSwitchTarget(target);
      return;
    }
    if (target === 'qa-agent') setQaBackground(false);
    setPage(target);
  }, [page, qaRunning]);

  const handleQABackground = useCallback(() => {
    const target = qaSwitchTarget;
    setQaSwitchTarget(null);
    setQaBackground(true);
    if (target) setPage(target);
  }, [qaSwitchTarget]);

  const handleQAEnd = useCallback(() => {
    const target = qaSwitchTarget;
    setQaSwitchTarget(null);
    const iframe = document.querySelector('iframe[title="QA Agent"]');
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ source: 'qa-agent-host', type: 'stop-reset' }, '*');
    }
    setQaRunning(false);
    setQaBackground(false);
    if (target) setPage(target);
    toast('info', 'QA Agent run stopped and reset');
  }, [qaSwitchTarget, toast]);

  // Apply theme
  useEffect(() => {
    document.documentElement.className = theme === 'light' ? 'light' : '';
    localStorage.setItem('qa_theme', theme);
  }, [theme]);

  // Load activity feed
  const loadActivity = useCallback(async () => {
    if (!user) return;
    try {
      const res = await getActivityFeed(10);
      setActivity(res.data);
    } catch {}
  }, [user]);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  // Real-time activity updates
  useSocket({
    'activity:new': (a) => setActivity(prev => [{ ...a, id: Date.now() }, ...prev].slice(0, 10)),
    'project:created': loadActivity,
    'bug:created': loadActivity,
    'execution:created': loadActivity,
  });

  const handleLogin = useCallback((token, userData) => {
    login(token, userData);
    toast('success', `Welcome back, ${userData.firstName}!`);
  }, [login, toast]);

  const handleLogout = useCallback(() => {
    logout();
    setPage('dashboard');
    setActiveProjId(null);
    setActiveProject(null);
    setShowLogoutConfirm(false);
  }, [logout]);

  const goHome = useCallback(() => {
    if (page === 'qa-agent' && qaRunning) {
      setQaSwitchTarget('dashboard');
      return;
    }
    setActiveProjId(null);
    setActiveProject(null);
    setPage('dashboard');
  }, [page, qaRunning]);

  const navigateToProjects = useCallback((filterKey) => {
    if (page === 'qa-agent' && qaRunning) {
      setQaSwitchTarget('projects');
      return;
    }
    setActiveProjId(null);
    setActiveProject(null);
    setProjFilter(filterKey || 'All');
    setPage('projects');
    if (filterKey && filterKey !== 'All') {
      toast('info', `Showing ${filterKey.toLowerCase()} projects`);
    }
  }, [toast, page, qaRunning]);

  const handleViewProject = useCallback((proj) => {
    setActiveProject(proj);
    setActiveProjId(proj.id);
    toast('success', `Opened ${proj.name}`);
  }, [toast]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--bd)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <div style={{ color: 'var(--t3)', fontSize: 14 }}>Loading…</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toasts items={toasts} remove={removeToast} />
      </>
    );
  }

  // Determine page title/sub
  const topTitle = activeProject
    ? activeProject.name
    : (PAGE_TITLES[page] || 'Dashboard');
  const topSub = activeProject
    ? activeProject.description || `Testing overview for ${activeProject.name}`
    : (PAGE_SUBS[page] || '');

  // Render main content (non-QA pages). QA Agent stays mounted via a persistent wrapper below.
  let mainContent;
  if (activeProject) {
    mainContent = (
      <ProjectInnerPage
        project={activeProject}
        onBack={() => { setActiveProjId(null); setActiveProject(null); }}
        toast={toast}
      />
    );
  } else if (page === 'dashboard') {
    mainContent = <DashboardPage onNavigate={navigateToProjects} toast={toast} />;
  } else if (page === 'projects') {
    mainContent = (
      <ProjectsPage
        onViewProject={handleViewProject}
        toast={toast}
        initialFilter={projFilter}
        autoCreate={autoCreateProject}
        onAutoCreateDone={() => setAutoCreateProject(false)}
      />
    );
  } else if (page === 'meetings') {
    mainContent = <MeetingsPage toast={toast} />;
  } else if (page === 'profile') {
    mainContent = <ProfilePage toast={toast} onDeleteAccount={() => setShowDeleteConfirm(true)} />;
  } else if (page === 'settings') {
    mainContent = (
      <SettingsPage
        toast={toast}
        theme={theme}
        setTheme={setTheme}
        onNavigateProfile={() => { setActiveProjId(null); setActiveProject(null); setPage('profile'); }}
        onDeleteAccount={() => setShowDeleteConfirm(true)}
      />
    );
  }
  const showQAAgent = page === 'qa-agent' && !activeProject;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', transition: 'background .3s' }}>
      <Sidebar
        page={page}
        setPage={safeSetPage}
        activeProjId={activeProjId}
        setActiveProjId={(id) => { setActiveProjId(id); if (!id) setActiveProject(null); }}
        onLogoClick={goHome}
        onLogout={() => setShowLogoutConfirm(true)}
        user={user}
        qaRunning={qaRunning}
        qaBackground={qaBackground}
        qaProgress={qaProgress}
        qaCompletedPending={qaCompletedPending}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Topbar
          title={topTitle}
          sub={topSub}
          theme={theme}
          setTheme={setTheme}
          toast={toast}
          activity={activity}
          onSearchClick={() => setCmdPaletteOpen(true)}
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', position: 'relative' }}>
          <div style={{ display: showQAAgent ? 'none' : 'block' }}>
            <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}><div style={{ width: 28, height: 28, border: '3px solid var(--bd)', borderTopColor: 'var(--lime)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /></div>}>
              {mainContent}
            </Suspense>
          </div>
          <div style={{ display: showQAAgent ? 'block' : 'none', height: '100%' }}>
            <QAAgentPage theme={theme} toast={toast} onNavigateCreateProject={() => {
              setShowCreateProjectModal(true);
            }} />
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <ChatBotIcon onNavigate={(pg) => { safeSetPage(pg); setActiveProjId(null); setActiveProject(null); }} />
        <CommandPalette
          open={cmdPaletteOpen}
          onClose={() => setCmdPaletteOpen(false)}
          onNavigate={(pg) => { safeSetPage(pg); setActiveProjId(null); setActiveProject(null); setCmdPaletteOpen(false); }}
          onViewProject={(proj) => { setActiveProject(proj); setActiveProjId(proj.id); setCmdPaletteOpen(false); }}
        />
      </Suspense>
      <Toasts items={toasts} remove={removeToast} />

      {showLogoutConfirm && (
        <ConfirmModal
          title="Logout"
          message="Are you sure you want to logout?"
          confirmLabel="Logout"
          confirmStyle="d"
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete Account"
          message="This action is permanent. All your projects, test data, and reports will be permanently deleted."
          confirmLabel="Yes, Delete My Account"
          confirmStyle="d"
          onConfirm={() => { toast('error', 'Account deleted'); setShowDeleteConfirm(false); setTimeout(handleLogout, 1500); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      {qaSwitchTarget && (
        <QASwitchModal
          target={qaSwitchTarget}
          onBackground={handleQABackground}
          onEnd={handleQAEnd}
          onCancel={() => setQaSwitchTarget(null)}
        />
      )}
      {showCreateProjectModal && (
        <CreateProjectInlineModal
          onClose={() => setShowCreateProjectModal(false)}
          onCreate={async (data) => {
            try {
              await createProject(data);
              toast('success', `Project "${data.name}" created!`);
              setShowCreateProjectModal(false);
              // Notify QA Agent iframe to refresh projects list
              const qaFrame = document.querySelector('iframe[title="QA Agent"]');
              if (qaFrame?.contentWindow) {
                qaFrame.contentWindow.postMessage({ source: 'qa-agent-host', type: 'projects-updated', data: [] }, '*');
              }
              // Trigger a fresh projects fetch in the iframe
              try {
                const { getProjects: fetchProjects } = await import('./api/client');
                const resp = await fetchProjects();
                const projList = Array.isArray(resp.data) ? resp.data : (resp.data?.rows || []);
                if (qaFrame?.contentWindow) {
                  qaFrame.contentWindow.postMessage({
                    source: 'qa-agent-host', type: 'projects-updated',
                    data: projList.map(p => ({ id: p.id, name: p.name })),
                  }, '*');
                }
              } catch (_) {}
            } catch { toast('error', 'Failed to create project'); }
          }}
        />
      )}
    </div>
  );
}

function CreateProjectInlineModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: '', status: 'Active', health: 'Good', description: '' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handle = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    await onCreate(form);
    setLoading(false);
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
      <label style={lbl}>Project Name <span style={{ color: 'var(--rd)' }}>*</span></label>
      <input value={form.name} onChange={set('name')} placeholder="e.g. Mobile App Testing" style={inp} autoFocus />

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
                }}>{s}</button>
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
                }}>{h}</button>
            ))}
          </div>
        </div>
      </div>

      <label style={lbl}>Description</label>
      <textarea value={form.description} onChange={set('description')} rows={4}
        placeholder="Briefly describe the project scope, goals, or testing focus..."
        style={{ ...inp, resize: 'vertical', lineHeight: 1.7, marginBottom: 20 }} />

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--bd)', paddingTop: 16, marginTop: 4 }}>
        <button className="btn btn-s" onClick={onClose} style={{ minWidth: 90 }}>Cancel</button>
        <button className="btn btn-p" onClick={handle} disabled={loading || !form.name.trim()} style={{ minWidth: 130 }}>
          {loading ? 'Creating…' : 'Create Project'}
        </button>
      </div>
    </Modal>
  );
}

function QASwitchModal({ target, onBackground, onEnd, onCancel }) {
  const targetLabel = PAGE_TITLES[target] || target;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={onCancel}>
      <div style={{ background: 'var(--bc)', border: '1px solid var(--bd)', borderRadius: 12, padding: 24, maxWidth: 460, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,.5)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(200,230,74,.15)', border: '1px solid rgba(200,230,74,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚠</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)' }}>QA Agent is running</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 18 }}>
          A QA Agent run is currently in progress. You&apos;re trying to switch to <b style={{ color: 'var(--tx)' }}>{targetLabel}</b>. Do you want to continue running in the background or end the current run?
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, background: 'transparent', color: 'var(--t2)', border: '1px solid var(--bd)', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onEnd} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, background: 'rgba(248,81,73,.12)', color: 'var(--rd)', border: '1px solid rgba(248,81,73,.4)', borderRadius: 8, cursor: 'pointer' }}>End Run</button>
          <button onClick={onBackground} style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, background: 'var(--lime)', color: '#121418', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Run in Background</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
