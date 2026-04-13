import React, { useState, useEffect, useCallback } from 'react';
import { updateProfile, changePassword, getMe } from '../api/client';
import { useAuth } from '../context/AuthContext';

const NOTIF_KEYS = [
  { key: 'email',    label: 'Email Notifications', desc: 'Receive updates via email',    icon: '✉️' },
  { key: 'bugs',     label: 'Bug Alerts',           desc: 'Get notified on new critical bugs', icon: '🐛' },
  { key: 'sprint',   label: 'Sprint Updates',       desc: 'Updates on sprint progress',  icon: '📋' },
  { key: 'meetings', label: 'Meeting Reminders',    desc: 'Reminders before meetings',   icon: '📅' },
];

function Toggle({ on, onChange }) {
  return (
    <div onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, background: on ? 'var(--lime)' : 'var(--bd)', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background .25s', boxShadow: on ? '0 0 10px rgba(200,230,74,.35)' : 'none' }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: on ? '#121418' : 'var(--bc)', boxShadow: '0 1px 4px rgba(0,0,0,.3)', transition: 'left .22s cubic-bezier(.22,1,.36,1)' }} />
    </div>
  );
}

function Field({ label, fieldKey, type = 'text', placeholder, value, onChange, half, readOnly }) {
  return (
    <div style={{ gridColumn: half ? 'span 1' : 'span 2' }}>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={readOnly ? undefined : onChange} readOnly={readOnly} placeholder={placeholder || label}
        style={{ width: '100%', background: 'var(--b2)', border: '1px solid var(--bd)', borderRadius: 10, color: readOnly ? 'var(--t3)' : 'var(--tx)', fontSize: 13.5, padding: '10px 14px', outline: 'none', transition: 'border-color .2s,box-shadow .2s', fontFamily: "'DM Sans',sans-serif", cursor: readOnly ? 'default' : 'text' }}
        onFocus={readOnly ? undefined : e => { e.currentTarget.style.borderColor = 'rgba(200,230,74,.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(200,230,74,.07)'; }}
        onBlur={readOnly ? undefined : e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.boxShadow = 'none'; }} />
    </div>
  );
}

export default function ProfilePage({ toast, onDeleteAccount }) {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('personal');
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [avatarHov, setAvatarHov] = useState(false);
  const [notifs, setNotifs] = useState({ email: true, bugs: true, sprint: true, meetings: true });

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', role: '',
    department: '', location: '', timezone: '', bio: '', github: '', linkedin: '',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (user) {
      setForm({
        firstName:  user.firstName  || '',
        lastName:   user.lastName   || '',
        email:      user.email      || '',
        phone:      user.phone      || '',
        role:       user.role       || '',
        department: user.department || '',
        location:   user.location   || '',
        timezone:   user.timezone   || '',
        bio:        user.bio        || '',
        github:     user.github     || '',
        linkedin:   user.linkedin   || '',
      });
      setAvatar(user.avatar || null);
    }
  }, [user]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setPw = k => e => setPwForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ ...form, avatar });
      await refreshUser();
      toast('success', 'Profile updated!');
    } catch (e) {
      toast('error', e.response?.data?.error || 'Failed to update profile');
    }
    setSaving(false);
  };

  const handlePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast('error', 'Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast('success', 'Password updated!');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) {
      toast('error', e.response?.data?.error || 'Failed to update password');
    }
    setSaving(false);
  };

  const handleAvatarPick = () => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = e => {
      const f = e.target.files[0];
      if (f) { const r = new FileReader(); r.onload = ev => setAvatar(ev.target.result); r.readAsDataURL(f); }
    };
    inp.click();
  };

  const initials = ((form.firstName?.[0] || 'Q') + (form.lastName?.[0] || 'A')).toUpperCase();

  return (
    <div className="crossfade" style={{ maxWidth: 700, paddingBottom: 32 }}>
      {/* Profile header */}
      <div className="cd" style={{ marginBottom: 18, padding: '28px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ position: 'relative', flexShrink: 0 }} onMouseEnter={() => setAvatarHov(true)} onMouseLeave={() => setAvatarHov(false)}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(200,230,74,.3),rgba(74,230,200,.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: 'var(--lime)', boxShadow: '0 0 0 3px rgba(200,230,74,.25)', overflow: 'hidden', position: 'relative' }}>
              {avatar ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
              {avatarHov && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', borderRadius: '50%' }} onClick={handleAvatarPick}>
                  <span style={{ fontSize: 20 }}>📷</span>
                </div>
              )}
            </div>
            <div style={{ position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: 'var(--lime)', border: '2px solid var(--bc)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--tx)', marginBottom: 2 }}>{form.firstName} {form.lastName}</div>
            <div style={{ fontSize: 13.5, color: 'var(--t2)', marginBottom: 6 }}>{form.role} · {form.department}</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {form.location && <span style={{ fontSize: 12, color: 'var(--t3)' }}>📍 {form.location}</span>}
              {form.timezone && <span style={{ fontSize: 12, color: 'var(--t3)' }}>🕐 {form.timezone}</span>}
              {form.email    && <span style={{ fontSize: 12, color: 'var(--t3)' }}>✉️ {form.email}</span>}
            </div>
          </div>
          <button className="btn btn-p" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{ display: 'flex', background: 'var(--b2)', borderRadius: 10, padding: 3, marginBottom: 18, width: 'max-content' }}>
        {['personal', 'security', 'preferences'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 20px', borderRadius: 8, border: 'none', background: tab === t ? 'var(--bc)' : 'transparent', color: tab === t ? 'var(--tx)' : 'var(--t2)', fontSize: 13, fontWeight: tab === t ? 600 : 500, cursor: 'pointer', transition: 'all .2s', textTransform: 'capitalize', boxShadow: tab === t ? '0 1px 6px rgba(0,0,0,.18)' : 'none', fontFamily: "'DM Sans',sans-serif" }}>
            {t === 'personal' ? 'Personal Info' : t === 'security' ? 'Security' : 'Preferences'}
          </button>
        ))}
      </div>

      {tab === 'personal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="cd">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 18 }}>Personal Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="First Name"    fieldKey="firstName"  value={form.firstName}  onChange={set('firstName')}  half />
              <Field label="Last Name"     fieldKey="lastName"   value={form.lastName}   onChange={set('lastName')}   half />
              <Field label="Email Address" fieldKey="email"      value={form.email}      onChange={set('email')}      type="email" />
              <Field label="Phone Number"  fieldKey="phone"      value={form.phone}      onChange={set('phone')}      half />
              <Field label="Role / Title"  fieldKey="role"       value={form.role}       onChange={set('role')}       half />
              <Field label="Department"    fieldKey="department" value={form.department} onChange={set('department')} half />
              <Field label="Location"      fieldKey="location"   value={form.location}   onChange={set('location')}   half />
              <Field label="Timezone"      fieldKey="timezone"   value={form.timezone}   onChange={set('timezone')}   half />
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>Bio</label>
                <textarea value={form.bio} onChange={set('bio')} rows={3}
                  style={{ width: '100%', background: 'var(--b2)', border: '1px solid var(--bd)', borderRadius: 10, color: 'var(--tx)', fontSize: 13.5, padding: '10px 14px', outline: 'none', resize: 'vertical', fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, transition: 'border-color .2s' }}
                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(200,230,74,.4)'} onBlur={e => e.currentTarget.style.borderColor = 'var(--bd)'} />
              </div>
            </div>
          </div>
          <div className="cd">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 18 }}>Social Links</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="GitHub"   fieldKey="github"   value={form.github}   onChange={set('github')}   half placeholder="github.com/username" />
              <Field label="LinkedIn" fieldKey="linkedin" value={form.linkedin} onChange={set('linkedin')} half placeholder="linkedin.com/in/username" />
            </div>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="cd">
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 18 }}>Change Password</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Current Password"     fieldKey="cp"  type="password" value={pwForm.currentPassword} onChange={setPw('currentPassword')} />
            <Field label="New Password"          fieldKey="np"  type="password" value={pwForm.newPassword}     onChange={setPw('newPassword')}     half />
            <Field label="Confirm New Password"  fieldKey="cnp" type="password" value={pwForm.confirmPassword} onChange={setPw('confirmPassword')} half />
          </div>
          <div style={{ marginTop: 14, padding: 14, background: 'rgba(200,230,74,.05)', borderRadius: 10, border: '1px solid rgba(200,230,74,.12)' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--lime)', marginBottom: 6 }}>Password requirements</div>
            {['At least 8 characters', 'One uppercase & lowercase letter', 'One number', 'One special character'].map(r => (
              <div key={r} style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10 }}>•</span>{r}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
            <button className="btn btn-p" onClick={handlePassword} disabled={saving}>{saving ? 'Updating…' : 'Update Password'}</button>
            <button className="btn btn-g" onClick={() => setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })}>Cancel</button>
          </div>
        </div>
      )}

      {tab === 'preferences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="cd">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>Notification Preferences</div>
            {NOTIF_KEYS.map(({ key, label, desc, icon }) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--bd)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tx)' }}>{label}</div>
                    <div style={{ fontSize: 12, color: notifs[key] ? 'var(--t2)' : 'var(--t3)', transition: 'color .2s' }}>{desc}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: notifs[key] ? 'var(--lime)' : 'var(--t3)', transition: 'color .2s', minWidth: 24, textAlign: 'right' }}>{notifs[key] ? 'On' : 'Off'}</span>
                  <Toggle on={notifs[key]} onChange={() => setNotifs(n => ({ ...n, [key]: !n[key] }))} />
                </div>
              </div>
            ))}
          </div>
          <div className="cd">
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)', marginBottom: 4 }}>Account</div>
            <div style={{ padding: '14px 0', borderBottom: '1px solid var(--bd)' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tx)', marginBottom: 2 }}>Account ID</div>
              <div style={{ fontSize: 12.5, color: 'var(--t3)', fontFamily: 'monospace' }}>QA-USR-{String(user?.id || 1).padStart(5, '0')}</div>
            </div>
            <div style={{ padding: '14px 0' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--tx)', marginBottom: 6 }}>Danger Zone</div>
              <div style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 12 }}>Permanently delete your account and all associated data.</div>
              <button className="btn btn-d" onClick={onDeleteAccount}>Delete Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
