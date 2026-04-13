import React, { useState } from 'react';
import { login as apiLogin, register as apiRegister } from '../api/client';

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handle = async () => {
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        const res = await apiLogin(email, pass);
        onLogin(res.data.token, res.data.user);
      } else {
        const [firstName, ...rest] = name.split(' ');
        const res = await apiRegister({ firstName, lastName: rest.join(' ') || 'User', email, password: pass });
        onLogin(res.data.token, res.data.user);
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Authentication failed');
    }
    setLoading(false);
  };

  const handleKey = e => { if (e.key === 'Enter') handle(); };

  if (forgotMode) return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0D1117' }}>
      <div style={{ flex: '1 1 400px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'radial-gradient(ellipse at 50% 48%,#131B2A 0%,#0D1117 70%)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(56,189,248,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.04) 1px,transparent 1px)', backgroundSize: '44px 44px', animation: 'gridPulse 4s ease infinite' }} />
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔐</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#E8E8EC' }}>Password Recovery</div>
        </div>
      </div>
      <div style={{ flex: '0 0 440px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#1A1D23' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          {!forgotSent ? <>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#E8E8EC', marginBottom: 8 }}>Forgot Password?</h1>
            <p style={{ fontSize: 14, color: '#484C58', marginBottom: 28 }}>Enter your email and we'll send you a reset link.</p>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6B7080', marginBottom: 6 }}>Email Address</label>
            <input type="email" placeholder="name@company.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
              style={{ width: '100%', background: '#1F2229', borderRadius: 10, border: '1px solid #2A2D35', color: '#E8E8EC', fontSize: 14, padding: '12px 14px', outline: 'none', marginBottom: 16 }} />
            <button className="btn btn-p" style={{ width: '100%', padding: '14px 0', fontSize: 15, marginBottom: 14 }} onClick={() => { if (forgotEmail) setForgotSent(true); }}>Send Reset Link →</button>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#484C58' }}>
              <span style={{ color: '#C8E64A', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setForgotMode(false); setForgotSent(false); }}>← Back to Sign In</span>
            </p>
          </> : <>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(200,230,74,.1)', border: '2px solid rgba(200,230,74,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 20 }}>✓</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#E8E8EC', marginBottom: 8 }}>Check Your Email</h1>
            <p style={{ fontSize: 14, color: '#484C58', marginBottom: 8 }}>We sent a password reset link to:</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#C8E64A', marginBottom: 24 }}>{forgotEmail}</p>
            <button className="btn btn-p" style={{ width: '100%', padding: '14px 0', fontSize: 15, marginBottom: 14 }} onClick={() => { setForgotSent(false); }}>Resend Email</button>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#484C58' }}>
              <span style={{ color: '#C8E64A', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setForgotMode(false); setForgotSent(false); }}>← Back to Sign In</span>
            </p>
          </>}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0D1117' }}>
      {/* Left — orbital animation */}
      <div style={{ flex: '1 1 400px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'radial-gradient(ellipse at 50% 48%,#131B2A 0%,#0D1117 70%)', minHeight: 500, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(56,189,248,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.04) 1px,transparent 1px)', backgroundSize: '44px 44px', animation: 'gridPulse 4s ease infinite' }} />
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(56,189,248,.04) 0%,transparent 68%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', width: 340, height: 340 }}>
          <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(56,189,248,.1)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%', border: '1px solid rgba(56,189,248,.12)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', top: '22%', left: '22%', right: '22%', bottom: '22%', border: '1px solid rgba(56,189,248,.15)', borderRadius: '50%' }} />
          {[
            { radius: 170, dur: '12s', delay: '0s',   color: '#A78BFA', size: 9 },
            { radius: 170, dur: '12s', delay: '-7s',  color: '#38BDF8', size: 7 },
            { radius: 130, dur: '9s',  delay: '-2s',  color: '#C8E64A', size: 8 },
            { radius: 130, dur: '9s',  delay: '-6s',  color: '#C8E64A', size: 6 },
            { radius: 90,  dur: '7s',  delay: '-3s',  color: '#38BDF8', size: 5 },
          ].map((p, i) => (
            <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: p.size, height: p.size, marginLeft: -p.size / 2, marginTop: -p.size / 2, borderRadius: '50%', background: p.color, boxShadow: `0 0 12px ${p.color}99`, animation: `orbit_r${p.radius} ${p.dur} linear infinite`, animationDelay: p.delay }} />
          ))}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-55%)', textAlign: 'center', zIndex: 2 }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: '#E8E8EC', letterSpacing: 3, lineHeight: 1, textShadow: '0 0 40px rgba(200,230,74,.2)' }}>QA</div>
            <div style={{ fontSize: 12, color: '#38BDF8', letterSpacing: 9, fontWeight: 400, marginTop: 10, textShadow: '0 0 20px rgba(56,189,248,.4)' }}>N E X U S</div>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 44, left: 0, right: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#484C58', fontWeight: 300, letterSpacing: .8 }}>Quality at the speed of light</div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{ flex: '0 0 440px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#1A1D23' }}>
        <div style={{ width: '100%', maxWidth: 360, animation: 'fadeUp .5s ease both' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#E8E8EC', marginBottom: 8 }}>{mode === 'login' ? 'Welcome Back' : 'Get started'}</h1>
          <p style={{ fontSize: 14, color: '#484C58', marginBottom: 32 }}>{mode === 'login' ? 'Your testing command center awaits' : 'Ship quality software, faster'}</p>

          {mode === 'register' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6B7080', marginBottom: 6 }}>Full Name</label>
              <input type="text" placeholder="John Smith" value={name} onChange={e => setName(e.target.value)} onKeyDown={handleKey}
                style={{ width: '100%', background: '#1F2229', borderRadius: 10, border: '1px solid #2A2D35', color: '#E8E8EC', fontSize: 14, padding: '12px 14px', outline: 'none' }} />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6B7080', marginBottom: 6 }}>Email</label>
            <input type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKey}
              style={{ width: '100%', background: '#1F2229', borderRadius: 10, border: '1px solid #2A2D35', color: '#E8E8EC', fontSize: 14, padding: '12px 14px', outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6B7080', marginBottom: 6 }}>Password</label>
            <input type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={handleKey}
              style={{ width: '100%', background: '#1F2229', borderRadius: 10, border: '1px solid #2A2D35', color: '#E8E8EC', fontSize: 14, padding: '12px 14px', outline: 'none' }} />
          </div>

          {mode === 'login' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6B7080', cursor: 'pointer' }}><input type="checkbox" style={{ accentColor: '#C8E64A' }} /> Remember me</label>
              <span style={{ color: '#38BDF8', cursor: 'pointer' }} onClick={() => setForgotMode(true)}>Forgot password?</span>
            </div>
          )}

          {error && <div style={{ padding: '10px 14px', background: 'rgba(255,77,77,.1)', border: '1px solid rgba(255,77,77,.2)', borderRadius: 9, fontSize: 13, color: 'var(--rd)', marginBottom: 14 }}>{error}</div>}

          <button className="btn btn-p" style={{ width: '100%', padding: '14px 0', fontSize: 15 }} onClick={handle} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
          </button>


          <p style={{ textAlign: 'center', fontSize: 13, color: '#484C58', marginTop: 24 }}>
            {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
            <span style={{ color: '#C8E64A', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
