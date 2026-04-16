import React, { useState, useRef, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, forgotPassword, verifyOtp, resetPassword } from '../api/client';

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState('email'); // 'email' | 'otp' | 'newpass' | 'done'
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

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

  // ── Forgot password handlers ──────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!forgotEmail) return setForgotError('Please enter your email');
    setForgotError(''); setForgotLoading(true);
    try {
      const res = await forgotPassword(forgotEmail);
      setPreviewUrl(res.data.previewUrl);
      setForgotStep('otp');
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
    } catch (e) {
      setForgotError(e.response?.data?.error || 'Failed to send OTP');
    }
    setForgotLoading(false);
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && otp.every(d => d)) handleVerifyOtp();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) newOtp[i] = text[i] || '';
    setOtp(newOtp);
    const nextEmpty = newOtp.findIndex(d => !d);
    otpRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) return setForgotError('Please enter the 6-digit OTP');
    setForgotError(''); setForgotLoading(true);
    try {
      await verifyOtp(forgotEmail, code);
      setForgotStep('newpass');
    } catch (e) {
      setForgotError(e.response?.data?.error || 'Invalid OTP');
    }
    setForgotLoading(false);
  };

  const handleResetPassword = async () => {
    if (!newPass) return setForgotError('Please enter a new password');
    if (newPass.length < 6) return setForgotError('Password must be at least 6 characters');
    if (newPass !== confirmPass) return setForgotError('Passwords do not match');
    setForgotError(''); setForgotLoading(true);
    try {
      await resetPassword(forgotEmail, otp.join(''), newPass);
      setForgotStep('done');
    } catch (e) {
      setForgotError(e.response?.data?.error || 'Failed to reset password');
    }
    setForgotLoading(false);
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setForgotError(''); setForgotLoading(true);
    try {
      const res = await forgotPassword(forgotEmail);
      setPreviewUrl(res.data.previewUrl);
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch (e) {
      setForgotError(e.response?.data?.error || 'Failed to resend OTP');
    }
    setForgotLoading(false);
  };

  const resetForgot = () => {
    setForgotMode(false);
    setForgotStep('email');
    setForgotEmail('');
    setOtp(['', '', '', '', '', '']);
    setNewPass('');
    setConfirmPass('');
    setForgotError('');
    setPreviewUrl(null);
  };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', background: '#1F2229', borderRadius: 10, border: '1px solid #2A2D35',
    color: '#E8E8EC', fontSize: 14, padding: '12px 14px', outline: 'none',
    transition: 'border-color .2s', fontFamily: "'DM Sans',sans-serif",
  };

  const leftPanel = (
    <div style={{ flex: '1 1 400px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: 'radial-gradient(ellipse at 50% 48%,#131B2A 0%,#0D1117 70%)', minHeight: 500, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(56,189,248,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.04) 1px,transparent 1px)', backgroundSize: '44px 44px', animation: 'gridPulse 4s ease infinite' }} />
      <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(ellipse,rgba(56,189,248,.04) 0%,transparent 68%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', width: 340, height: 340 }}>
        <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(56,189,248,.1)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%', border: '1px solid rgba(56,189,248,.12)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '22%', left: '22%', right: '22%', bottom: '22%', border: '1px solid rgba(56,189,248,.15)', borderRadius: '50%' }} />
        {[
          { radius: 170, dur: '12s', delay: '0s', color: '#A78BFA', size: 9 },
          { radius: 170, dur: '12s', delay: '-7s', color: '#38BDF8', size: 7 },
          { radius: 130, dur: '9s', delay: '-2s', color: '#C8E64A', size: 8 },
          { radius: 130, dur: '9s', delay: '-6s', color: '#C8E64A', size: 6 },
          { radius: 90, dur: '7s', delay: '-3s', color: '#38BDF8', size: 5 },
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
  );

  // ── Forgot Password Flow ──────────────────────────────────────────────────
  if (forgotMode) return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0D1117' }}>
      {leftPanel}
      <div style={{ flex: '0 0 440px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#1A1D23' }}>
        <div style={{ width: '100%', maxWidth: 360, animation: 'fadeUp .5s ease both' }}>

          {/* Step 1: Enter Email */}
          {forgotStep === 'email' && <>
            <button onClick={resetForgot} style={backBtnStyle}
              onMouseEnter={e => { e.currentTarget.style.background = '#1F2229'; e.currentTarget.style.borderColor = 'rgba(200,230,74,.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#2A2D35'; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
              Back to Sign In
            </button>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(56,189,248,.1)', border: '2px solid rgba(56,189,248,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 20, marginTop: 20 }}>🔐</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#E8E8EC', marginBottom: 8 }}>Forgot Password?</h1>
            <p style={{ fontSize: 14, color: '#484C58', marginBottom: 28 }}>Enter your email and we'll send you a 6-digit OTP.</p>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6B7080', marginBottom: 6 }}>Email Address</label>
            <input type="email" placeholder="name@company.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
              style={{ ...inputStyle, marginBottom: 16 }}
              onFocus={e => e.target.style.borderColor = 'rgba(200,230,74,.4)'}
              onBlur={e => e.target.style.borderColor = '#2A2D35'} />
            {forgotError && <div style={errorStyle}>{forgotError}</div>}
            <button className="btn btn-p" style={btnFullStyle} onClick={handleSendOtp} disabled={forgotLoading}>
              {forgotLoading ? 'Sending...' : 'Send OTP →'}
            </button>
          </>}

          {/* Step 2: Enter OTP */}
          {forgotStep === 'otp' && <>
            <button onClick={() => { setForgotStep('email'); setForgotError(''); }} style={backBtnStyle}
              onMouseEnter={e => { e.currentTarget.style.background = '#1F2229'; e.currentTarget.style.borderColor = 'rgba(200,230,74,.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#2A2D35'; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
              Back
            </button>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(200,230,74,.1)', border: '2px solid rgba(200,230,74,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 20, marginTop: 20 }}>📧</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#E8E8EC', marginBottom: 8 }}>Check Your Email</h1>
            <p style={{ fontSize: 14, color: '#484C58', marginBottom: 6 }}>We sent a 6-digit code to:</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#C8E64A', marginBottom: 24 }}>{forgotEmail}</p>

            {/* Ethereal preview link for local dev */}
            {previewUrl && (
              <div style={{ padding: '10px 14px', background: 'rgba(56,189,248,.08)', border: '1px solid rgba(56,189,248,.2)', borderRadius: 10, fontSize: 12, marginBottom: 16 }}>
                <span style={{ color: '#9096A8' }}>Local dev — </span>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#38BDF8', textDecoration: 'underline', wordBreak: 'break-all' }}>
                  View email in browser →
                </a>
              </div>
            )}

            {/* OTP Input Boxes */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  style={{
                    width: 46, height: 54, textAlign: 'center', fontSize: 22, fontWeight: 700,
                    background: digit ? 'rgba(200,230,74,.06)' : '#1F2229',
                    borderRadius: 12, border: `2px solid ${digit ? 'rgba(200,230,74,.3)' : '#2A2D35'}`,
                    color: '#E8E8EC', outline: 'none', caretColor: '#C8E64A',
                    transition: 'border-color .2s, background .2s',
                    fontFamily: "'DM Sans',monospace",
                  }}
                  onFocus={e => e.target.style.borderColor = '#C8E64A'}
                  onBlur={e => e.target.style.borderColor = digit ? 'rgba(200,230,74,.3)' : '#2A2D35'}
                />
              ))}
            </div>

            {forgotError && <div style={errorStyle}>{forgotError}</div>}
            <button className="btn btn-p" style={btnFullStyle} onClick={handleVerifyOtp} disabled={forgotLoading || otp.some(d => !d)}>
              {forgotLoading ? 'Verifying...' : 'Verify OTP →'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <span
                style={{ ...linkStyle, color: resendTimer > 0 ? '#484C58' : '#38BDF8', cursor: resendTimer > 0 ? 'default' : 'pointer' }}
                onClick={handleResendOtp}
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </span>
            </div>
          </>}

          {/* Step 3: New Password */}
          {forgotStep === 'newpass' && <>
            <button onClick={() => { setForgotStep('otp'); setForgotError(''); }} style={backBtnStyle}
              onMouseEnter={e => { e.currentTarget.style.background = '#1F2229'; e.currentTarget.style.borderColor = 'rgba(200,230,74,.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#2A2D35'; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
              Back
            </button>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(200,230,74,.1)', border: '2px solid rgba(200,230,74,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 20, marginTop: 20 }}>🔑</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#E8E8EC', marginBottom: 8 }}>Set New Password</h1>
            <p style={{ fontSize: 14, color: '#484C58', marginBottom: 28 }}>Create a strong password for your account.</p>

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6B7080', marginBottom: 6 }}>New Password</label>
            <input type="password" placeholder="••••••••" value={newPass} onChange={e => setNewPass(e.target.value)}
              style={{ ...inputStyle, marginBottom: 14 }}
              onFocus={e => e.target.style.borderColor = 'rgba(200,230,74,.4)'}
              onBlur={e => e.target.style.borderColor = '#2A2D35'} />

            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6B7080', marginBottom: 6 }}>Confirm Password</label>
            <input type="password" placeholder="••••••••" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
              style={{ ...inputStyle, marginBottom: 16 }}
              onFocus={e => e.target.style.borderColor = 'rgba(200,230,74,.4)'}
              onBlur={e => e.target.style.borderColor = '#2A2D35'} />

            {newPass && confirmPass && newPass !== confirmPass && (
              <div style={{ fontSize: 12, color: '#FF4D4D', marginBottom: 12 }}>Passwords do not match</div>
            )}
            {forgotError && <div style={errorStyle}>{forgotError}</div>}
            <button className="btn btn-p" style={btnFullStyle} onClick={handleResetPassword} disabled={forgotLoading}>
              {forgotLoading ? 'Resetting...' : 'Reset Password →'}
            </button>
          </>}

          {/* Step 4: Success */}
          {forgotStep === 'done' && <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(200,230,74,.12)', border: '2px solid rgba(200,230,74,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 20px' }}>✓</div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#E8E8EC', marginBottom: 8 }}>Password Reset!</h1>
              <p style={{ fontSize: 14, color: '#484C58', marginBottom: 28 }}>Your password has been updated successfully. You can now sign in with your new password.</p>
              <button className="btn btn-p" style={btnFullStyle} onClick={() => { resetForgot(); setEmail(forgotEmail); }}>
                Sign In →
              </button>
            </div>
          </>}
        </div>
      </div>
    </div>
  );

  // ── Login / Register Form ─────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0D1117' }}>
      {leftPanel}
      <div style={{ flex: '0 0 440px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, background: '#1A1D23' }}>
        <div style={{ width: '100%', maxWidth: 360, animation: 'fadeUp .5s ease both' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#E8E8EC', marginBottom: 8 }}>{mode === 'login' ? 'Welcome Back' : 'Get started'}</h1>
          <p style={{ fontSize: 14, color: '#484C58', marginBottom: 32 }}>{mode === 'login' ? 'Your testing command center awaits' : 'Ship quality software, faster'}</p>

          {mode === 'register' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6B7080', marginBottom: 6 }}>Full Name</label>
              <input type="text" placeholder="John Smith" value={name} onChange={e => setName(e.target.value)} onKeyDown={handleKey}
                style={inputStyle} />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6B7080', marginBottom: 6 }}>Email</label>
            <input type="email" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={handleKey}
              style={inputStyle} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#6B7080', marginBottom: 6 }}>Password</label>
            <input type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={handleKey}
              style={inputStyle} />
          </div>

          {mode === 'login' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6B7080', cursor: 'pointer' }}><input type="checkbox" style={{ accentColor: '#C8E64A' }} /> Remember me</label>
              <span style={{ color: '#38BDF8', cursor: 'pointer' }} onClick={() => setForgotMode(true)}>Forgot password?</span>
            </div>
          )}

          {error && <div style={errorStyle}>{error}</div>}

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

const errorStyle = {
  padding: '10px 14px', background: 'rgba(255,77,77,.1)', border: '1px solid rgba(255,77,77,.2)',
  borderRadius: 9, fontSize: 13, color: '#FF4D4D', marginBottom: 14,
};
const btnFullStyle = { width: '100%', padding: '14px 0', fontSize: 15, marginBottom: 14 };
const linkStyle = { color: '#C8E64A', cursor: 'pointer', fontWeight: 600, fontSize: 13 };
const backBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px',
  borderRadius: 10, border: '1px solid #2A2D35', background: 'transparent',
  color: '#9096A8', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  fontFamily: "'DM Sans',sans-serif", transition: 'all .2s cubic-bezier(.22,1,.36,1)',
};
