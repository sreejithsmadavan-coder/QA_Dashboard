import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { login as apiLogin } from './api/client';
import { Toasts, useToast } from './components/ui/Toast';
import { ConfirmModal } from './components/ui/Modal';
import Sidebar from './components/layout/Sidebar';
import Topbar from './components/layout/Topbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectInnerPage from './pages/ProjectInnerPage';
import MeetingsPage from './pages/MeetingsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import QAAgentPage from './pages/QAAgentPage';
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
    setActiveProjId(null);
    setActiveProject(null);
    setPage('dashboard');
  }, []);

  const navigateToProjects = useCallback((filterKey) => {
    setActiveProjId(null);
    setActiveProject(null);
    setProjFilter(filterKey || 'All');
    setPage('projects');
    if (filterKey && filterKey !== 'All') {
      toast('info', `Showing ${filterKey.toLowerCase()} projects`);
    }
  }, [toast]);

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

  // Render main content
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
      />
    );
  } else if (page === 'qa-agent') {
    mainContent = <QAAgentPage theme={theme} toast={toast} />;
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

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', transition: 'background .3s' }}>
      <Sidebar
        page={page}
        setPage={setPage}
        activeProjId={activeProjId}
        setActiveProjId={(id) => { setActiveProjId(id); if (!id) setActiveProject(null); }}
        onLogoClick={goHome}
        onLogout={() => setShowLogoutConfirm(true)}
        user={user}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Topbar
          title={topTitle}
          sub={topSub}
          theme={theme}
          setTheme={setTheme}
          toast={toast}
          activity={activity}
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {mainContent}
        </div>
      </div>

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
