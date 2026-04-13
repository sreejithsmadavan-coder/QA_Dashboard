import React from 'react';

export default function SettingsPage({ toast, theme, setTheme, onNavigateProfile, onDeleteAccount }) {
  return (
    <div className="crossfade" style={{ maxWidth: 540, paddingBottom: 24 }}>
      <div className="cd" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>General Settings</span>
        </div>
        <div style={{ padding: '14px 0', borderBottom: '1px solid var(--bd)', marginBottom: 14 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tx)', marginBottom: 4 }}>Profile Information</div>
          <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 12 }}>Manage your name, email, role, and other personal details from the Profile page.</div>
          <button className="btn btn-s" onClick={onNavigateProfile}>Go to Profile →</button>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)', marginBottom: 8 }}>Appearance</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn ${theme === 'dark' ? 'btn-p' : 'btn-s'}`}
              onClick={() => { setTheme('dark'); toast('success', 'Dark mode activated'); }}>
              🌙 Dark Mode
            </button>
            <button className={`btn ${theme === 'light' ? 'btn-p' : 'btn-s'}`}
              onClick={() => { setTheme('light'); toast('success', 'Light mode activated'); }}>
              ☀️ Light Mode
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 6 }}>Choose your preferred interface theme</div>
        </div>
      </div>

      <div className="cd">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>Danger Zone</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10, background: 'rgba(255,77,77,.1)', color: 'var(--rd)' }}>Irreversible</span>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--t3)', marginBottom: 14, lineHeight: 1.6 }}>Deleting your account is permanent. All projects, test data, and reports will be removed and cannot be recovered.</p>
        <button className="btn btn-d" onClick={onDeleteAccount}>Delete Account</button>
      </div>
    </div>
  );
}
