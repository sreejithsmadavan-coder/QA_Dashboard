import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { sendChatMessage, getChatStats, getChatDailyDigest } from '../../api/client';

// ── Notification Sound (tiny inline base64 — short "ding") ──────────────────
const NOTIF_SOUND_URL = 'data:audio/wav;base64,UklGRl9vT19teleWQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRh';
let _audioCtx = null;
function playNotifSound() {
  try {
    if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = _audioCtx.createOscillator();
    const gain = _audioCtx.createGain();
    osc.connect(gain);
    gain.connect(_audioCtx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.15, _audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.3);
    osc.start(_audioCtx.currentTime);
    osc.stop(_audioCtx.currentTime + 0.3);
  } catch {}
}

// ── Markdown-lite renderer ──────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const html = lines.map(line => {
    // Headers
    if (line.startsWith('### ')) return `<h4 style="margin:8px 0 4px;font-size:13px;font-weight:700;color:var(--tx)">${esc(line.slice(4))}</h4>`;
    if (line.startsWith('## ')) return `<h3 style="margin:8px 0 4px;font-size:14px;font-weight:700;color:var(--tx)">${esc(line.slice(3))}</h3>`;
    // List items
    if (/^[-*]\s/.test(line)) return `<div style="padding:1px 0 1px 12px;position:relative"><span style="position:absolute;left:0">•</span>${inlineFormat(line.slice(2))}</div>`;
    if (/^\d+\.\s/.test(line)) {
      const m = line.match(/^(\d+)\.\s(.*)/);
      return `<div style="padding:1px 0 1px 16px;position:relative"><span style="position:absolute;left:0;font-weight:600">${m[1]}.</span>${inlineFormat(m[2])}</div>`;
    }
    if (line.trim() === '') return '<div style="height:6px"></div>';
    return `<div>${inlineFormat(line)}</div>`;
  }).join('');
  return html;
}
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function inlineFormat(s) {
  s = esc(s);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/`(.+?)`/g, '<code style="background:var(--bd);padding:1px 5px;border-radius:4px;font-size:12px">$1</code>');
  s = s.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" style="color:var(--lime);text-decoration:underline">$1</a>');
  return s;
}

// ── Storage helpers ─────────────────────────────────────────────────────────
const STORAGE_KEY = 'qa_chat_history';
const DIGEST_KEY = 'qa_chat_digest_date';
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveHistory(msgs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-100))); } catch {}
}

// ── Quick reply chips ───────────────────────────────────────────────────────
const QUICK_REPLIES = [
  { label: '📊 Dashboard Stats', msg: 'Show me the dashboard stats' },
  { label: '🐛 Open Bugs', msg: 'Show open bugs' },
  { label: '🧪 Last Test Run', msg: 'Show last test run results' },
  { label: '🗺️ Navigation Help', msg: 'How do I navigate the app?' },
  { label: '📋 Daily Digest', msg: 'Show my daily digest' },
  { label: '🔍 Bug Triage Help', msg: 'How do I triage a bug?' },
];

// ── Navigation commands ─────────────────────────────────────────────────────
const NAV_COMMANDS = {
  'go to dashboard': 'dashboard',
  'open dashboard': 'dashboard',
  'show dashboard': 'dashboard',
  'go to projects': 'projects',
  'open projects': 'projects',
  'show projects': 'projects',
  'go to qa agent': 'qa-agent',
  'open qa agent': 'qa-agent',
  'go to meetings': 'meetings',
  'open meetings': 'meetings',
  'go to settings': 'settings',
  'open settings': 'settings',
  'go to profile': 'profile',
  'open profile': 'profile',
};

// ── Styles ──────────────────────────────────────────────────────────────────
const STYLES = `
@keyframes chatBotEntry{0%{opacity:0;transform:scale(.3) rotate(-180deg)}60%{opacity:1;transform:scale(1.1) rotate(10deg)}100%{opacity:1;transform:scale(1) rotate(0deg)}}
@keyframes chatBotPulse{0%,100%{box-shadow:0 4px 20px rgba(200,230,74,.25),0 0 0 0 rgba(200,230,74,.3)}50%{box-shadow:0 4px 20px rgba(200,230,74,.25),0 0 0 10px rgba(200,230,74,0)}}
@keyframes chatBotFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes chatPanelIn{from{opacity:0;transform:translateY(20px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes dotBounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
@keyframes badgePop{0%{transform:scale(0)}50%{transform:scale(1.3)}100%{transform:scale(1)}}
@keyframes msgSlideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmerChat{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes wiggle{0%,100%{transform:rotate(0deg)}25%{transform:rotate(-5deg)}75%{transform:rotate(5deg)}}
`;

export default function ChatBotIcon({ onNavigate }) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [messages, setMessages] = useState(() => {
    const hist = loadHistory();
    return hist.length > 0 ? hist : [{ role: 'bot', text: 'Hi! I\'m **QA Nexus Bot**. I can help you with project stats, bug triage, test results, and navigation. What do you need?', ts: Date.now() }];
  });
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('qa_chat_sound') !== 'off');
  const [panelSize, setPanelSize] = useState(() => {
    try { return JSON.parse(localStorage.getItem('qa_chat_size')) || { w: 400, h: 540 }; } catch { return { w: 400, h: 540 }; }
  });
  const [resizing, setResizing] = useState(false);
  const [stats, setStats] = useState(null);
  const [digestShown, setDigestShown] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const resizeRef = useRef(null);

  // Persist messages
  useEffect(() => { saveHistory(messages); }, [messages]);

  // Persist sound pref
  useEffect(() => { localStorage.setItem('qa_chat_sound', soundEnabled ? 'on' : 'off'); }, [soundEnabled]);

  // Persist panel size
  useEffect(() => { localStorage.setItem('qa_chat_size', JSON.stringify(panelSize)); }, [panelSize]);

  // Auto-scroll
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  // Focus input on open
  useEffect(() => { if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 100); }, [open, minimized]);

  // Clear unread when panel is open
  useEffect(() => { if (open && !minimized) setUnread(0); }, [open, minimized]);

  // Load daily digest on first open of the day
  useEffect(() => {
    if (!open || digestShown) return;
    const today = new Date().toDateString();
    if (localStorage.getItem(DIGEST_KEY) === today) { setDigestShown(true); return; }
    localStorage.setItem(DIGEST_KEY, today);
    setDigestShown(true);

    getChatDailyDigest().then(res => {
      const d = res.data;
      if (d.activities === 0 && d.bugsCreated === 0 && d.executions === 0) return;
      const text = `**📋 Daily Digest**\n\n` +
        `- Activities today: **${d.activities}**\n` +
        `- Bugs created: **${d.bugsCreated}**${d.criticalBugs > 0 ? ` (${d.criticalBugs} critical!)` : ''}\n` +
        `- Test executions: **${d.executions}**${d.passRate !== null ? ` — ${d.passRate}% pass rate` : ''}\n` +
        (d.failed > 0 ? `- ⚠️ **${d.failed} failed** executions need attention` : '');
      addBotMessage(text);
    }).catch(() => {});
  }, [open, digestShown]);

  // Resize handler
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e) => {
      const panel = panelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      const newW = Math.max(340, Math.min(600, rect.right - e.clientX));
      const newH = Math.max(400, Math.min(700, rect.bottom - e.clientY));
      setPanelSize({ w: newW, h: newH });
    };
    const onUp = () => setResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [resizing]);

  const addBotMessage = useCallback((text) => {
    setMessages(prev => [...prev, { role: 'bot', text, ts: Date.now() }]);
    setUnread(prev => prev + 1);
    if (soundEnabled) playNotifSound();
  }, [soundEnabled]);

  const handleSend = useCallback(async (overrideMsg) => {
    const text = (overrideMsg || input).trim();
    if (!text) return;
    if (!overrideMsg) setInput('');

    // Check for navigation commands
    const lower = text.toLowerCase();
    for (const [cmd, page] of Object.entries(NAV_COMMANDS)) {
      if (lower.includes(cmd)) {
        setMessages(prev => [...prev, { role: 'user', text, ts: Date.now() }]);
        if (onNavigate) onNavigate(page);
        setTimeout(() => addBotMessage(`Navigated to **${page.replace('-', ' ')}** page! 🚀`), 400);
        return;
      }
    }

    // Quick stats command
    if (lower.includes('quick stats') || lower === 'stats') {
      setMessages(prev => [...prev, { role: 'user', text, ts: Date.now() }]);
      setTyping(true);
      try {
        const res = await getChatStats();
        const s = res.data;
        setStats(s);
        setTyping(false);
        addBotMessage(
          `**📊 Quick Stats**\n\n` +
          `- Projects: **${s.projects.total}** (${s.projects.active} active)\n` +
          `- Bugs: **${s.bugs.total}** (${s.bugs.open} open, ${s.bugs.critical} critical)\n` +
          `- Test Cases: **${s.testCases}**\n` +
          `- Executions: **${s.executions.total}** — ${s.executions.passRate}% pass rate`
        );
      } catch {
        setTyping(false);
        addBotMessage('Sorry, I couldn\'t fetch stats right now. Try again later.');
      }
      return;
    }

    // Daily digest command
    if (lower.includes('daily digest') || lower.includes('today')) {
      setMessages(prev => [...prev, { role: 'user', text, ts: Date.now() }]);
      setTyping(true);
      try {
        const res = await getChatDailyDigest();
        const d = res.data;
        setTyping(false);
        if (d.activities === 0 && d.bugsCreated === 0 && d.executions === 0) {
          addBotMessage('No activity recorded today yet. Check back later!');
        } else {
          addBotMessage(
            `**📋 Today's Digest**\n\n` +
            `- Activities: **${d.activities}**\n` +
            `- Bugs created: **${d.bugsCreated}**${d.criticalBugs > 0 ? ` (${d.criticalBugs} critical)` : ''}\n` +
            `- Executions: **${d.executions}**${d.passRate !== null ? ` — ${d.passRate}% pass rate` : ''}\n` +
            (d.failed > 0 ? `\n⚠️ **${d.failed} failed** executions` : '')
          );
        }
      } catch {
        setTyping(false);
        addBotMessage('Couldn\'t load today\'s digest. Please try again.');
      }
      return;
    }

    // Send to API (AI or fallback)
    setMessages(prev => [...prev, { role: 'user', text, ts: Date.now() }]);
    setTyping(true);

    try {
      const history = messages.slice(-10);
      const res = await sendChatMessage(text, history);
      setTyping(false);
      addBotMessage(res.data.reply);
    } catch {
      setTyping(false);
      addBotMessage('Sorry, I\'m having trouble connecting. Please try again in a moment.');
    }
  }, [input, messages, onNavigate, addBotMessage]);

  const handleClearChat = useCallback(() => {
    const welcome = { role: 'bot', text: 'Chat cleared! How can I help you?', ts: Date.now() };
    setMessages([welcome]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const toggleMinimize = useCallback(() => setMinimized(m => !m), []);

  return (
    <>
      <style>{STYLES}</style>

      {/* ── Floating Button ─────────────────────────────────────────── */}
      <button
        onClick={() => { setOpen(o => { if (!o) setMinimized(false); return !o; }); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        style={{
          position: 'fixed', bottom: 24, right: 28, zIndex: 10000,
          width: 56, height: 56, borderRadius: '50%',
          background: open
            ? 'linear-gradient(135deg, #FF4D4D, #e03e3e)'
            : 'linear-gradient(135deg, var(--lime), #A8C830)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: open ? 'none' : hovered
            ? 'chatBotFloat 2s ease-in-out infinite'
            : 'chatBotEntry .6s cubic-bezier(.34,1.56,.64,1) forwards, chatBotPulse 3s ease-in-out 1s infinite',
          boxShadow: hovered
            ? '0 8px 32px rgba(200,230,74,.45), 0 0 0 4px rgba(200,230,74,.15)'
            : open ? '0 4px 20px rgba(255,77,77,.3)' : '0 4px 20px rgba(200,230,74,.25)',
          transform: hovered && !open ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform .25s cubic-bezier(.22,1,.36,1), box-shadow .3s, background .3s',
        }}
      >
        {/* Unread badge */}
        {!open && unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20,
            borderRadius: 10, background: 'var(--rd)', color: '#fff',
            fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '0 5px',
            animation: 'badgePop .3s cubic-bezier(.34,1.56,.64,1)',
            border: '2px solid var(--bg)',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ animation: hovered ? 'wiggle .5s ease' : 'none' }}>
            <path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.55 1.4 4.84 3.6 6.35-.2 1.8-1 3.35-1.06 3.45a.5.5 0 00.44.7c.06 0 2.9-.3 4.77-1.6.73.2 1.48.3 2.25.3 5.52 0 10-3.82 10-8.5S17.52 2 12 2z" fill="#121418"/>
            <circle cx="8.5" cy="10.5" r="1.2" fill="var(--lime)"/>
            <circle cx="12" cy="10.5" r="1.2" fill="var(--lime)"/>
            <circle cx="15.5" cy="10.5" r="1.2" fill="var(--lime)"/>
          </svg>
        )}
      </button>

      {/* ── Chat Panel ──────────────────────────────────────────────── */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed', bottom: 92, right: 28, zIndex: 10001,
            width: panelSize.w, height: minimized ? 56 : panelSize.h,
            background: 'var(--bc)', borderRadius: 20,
            border: '1px solid var(--bd)',
            boxShadow: '0 20px 60px rgba(0,0,0,.4), 0 0 0 1px rgba(200,230,74,.06)',
            display: 'flex', flexDirection: 'column',
            animation: 'chatPanelIn .35s cubic-bezier(.22,1,.36,1)',
            overflow: 'hidden', transition: 'height .3s cubic-bezier(.22,1,.36,1)',
          }}
        >
          {/* Resize handle */}
          {!minimized && (
            <div
              ref={resizeRef}
              onMouseDown={() => setResizing(true)}
              style={{
                position: 'absolute', top: 0, left: 0, width: 20, height: 20,
                cursor: 'nw-resize', zIndex: 10,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" style={{ position: 'absolute', top: 4, left: 4, opacity: 0.3 }}>
                <line x1="0" y1="12" x2="12" y2="0" stroke="var(--t3)" strokeWidth="1.5"/>
                <line x1="0" y1="8" x2="8" y2="0" stroke="var(--t3)" strokeWidth="1.5"/>
                <line x1="0" y1="4" x2="4" y2="0" stroke="var(--t3)" strokeWidth="1.5"/>
              </svg>
            </div>
          )}

          {/* Header */}
          <div
            onDoubleClick={toggleMinimize}
            style={{
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10,
              background: 'linear-gradient(135deg, rgba(200,230,74,.08), transparent)',
              borderBottom: minimized ? 'none' : '1px solid var(--bd)',
              cursor: 'pointer', userSelect: 'none', flexShrink: 0,
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--lime), #A8C830)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#121418">
                <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7v1h1.5a.5.5 0 010 1H20v1a3 3 0 01-3 3H7a3 3 0 01-3-3v-1H1.5a.5.5 0 010-1H4v-1a7 7 0 017-7h1V5.73A2 2 0 0112 2zM9.5 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm5 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--tx)' }}>QA Nexus Bot</div>
              <div style={{ fontSize: 11, color: 'var(--lime)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)', display: 'inline-block' }}/>
                Online
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {/* Sound toggle */}
              <button onClick={(e) => { e.stopPropagation(); setSoundEnabled(s => !s); }} title={soundEnabled ? 'Mute' : 'Unmute'} style={headerBtnStyle}>
                {soundEnabled ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                )}
              </button>
              {/* Clear chat */}
              <button onClick={(e) => { e.stopPropagation(); handleClearChat(); }} title="Clear chat" style={headerBtnStyle}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
              {/* Minimize */}
              <button onClick={(e) => { e.stopPropagation(); toggleMinimize(); }} title={minimized ? 'Expand' : 'Minimize'} style={headerBtnStyle}>
                {minimized ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2" strokeLinecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t2)" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                )}
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {messages.map((m, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                    animation: 'msgSlideIn .3s ease',
                  }}>
                    {m.role === 'bot' && (
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--lime), #A8C830)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginRight: 8, marginTop: 2,
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="#121418">
                          <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7v1h1.5a.5.5 0 010 1H20v1a3 3 0 01-3 3H7a3 3 0 01-3-3v-1H1.5a.5.5 0 010-1H4v-1a7 7 0 017-7h1V5.73A2 2 0 0112 2zM9.5 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm5 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>
                        </svg>
                      </div>
                    )}
                    <div style={{
                      maxWidth: '78%', padding: '10px 14px', borderRadius: 14, fontSize: 13, lineHeight: 1.55,
                      wordBreak: 'break-word',
                      ...(m.role === 'user' ? {
                        background: 'linear-gradient(135deg, var(--lime), #A8C830)',
                        color: '#121418', fontWeight: 500, borderBottomRightRadius: 4,
                      } : {
                        background: 'var(--b2)', color: 'var(--tx)',
                        border: '1px solid var(--bd)', borderBottomLeftRadius: 4,
                      }),
                    }}
                      dangerouslySetInnerHTML={m.role === 'bot' ? { __html: renderMarkdown(m.text) } : undefined}
                    >
                      {m.role === 'user' ? m.text : undefined}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {typing && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', animation: 'msgSlideIn .3s ease' }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--lime), #A8C830)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginRight: 8, marginTop: 2,
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#121418">
                        <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7v1h1.5a.5.5 0 010 1H20v1a3 3 0 01-3 3H7a3 3 0 01-3-3v-1H1.5a.5.5 0 010-1H4v-1a7 7 0 017-7h1V5.73A2 2 0 0112 2zM9.5 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm5 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>
                      </svg>
                    </div>
                    <div style={{
                      background: 'var(--b2)', border: '1px solid var(--bd)',
                      borderRadius: 14, borderBottomLeftRadius: 4,
                      padding: '12px 18px', display: 'flex', gap: 5,
                    }}>
                      {[0, 1, 2].map(i => (
                        <span key={i} style={{
                          width: 7, height: 7, borderRadius: '50%', background: 'var(--t3)',
                          display: 'inline-block',
                          animation: `dotBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                        }}/>
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef}/>
              </div>

              {/* Quick Reply Chips */}
              {messages.length <= 2 && (
                <div style={{
                  padding: '0 14px 10px', display: 'flex', flexWrap: 'wrap', gap: 6,
                  animation: 'msgSlideIn .4s ease',
                }}>
                  {QUICK_REPLIES.map((qr, i) => (
                    <button key={i} onClick={() => handleSend(qr.msg)} style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: 'var(--b2)', border: '1px solid var(--bd)',
                      color: 'var(--tx)', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                      transition: 'all .2s', whiteSpace: 'nowrap',
                    }}
                      onMouseEnter={e => { e.target.style.borderColor = 'rgba(200,230,74,.4)'; e.target.style.background = 'rgba(200,230,74,.08)'; }}
                      onMouseLeave={e => { e.target.style.borderColor = 'var(--bd)'; e.target.style.background = 'var(--b2)'; }}
                    >
                      {qr.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div style={{
                padding: '10px 14px', borderTop: '1px solid var(--bd)',
                display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0,
              }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Ask me anything..."
                  disabled={typing}
                  style={{
                    flex: 1, padding: '10px 14px', borderRadius: 12,
                    background: 'var(--b2)', border: '1px solid var(--bd)',
                    color: 'var(--tx)', fontSize: 13, outline: 'none',
                    fontFamily: "'DM Sans',sans-serif", transition: 'border-color .2s',
                    opacity: typing ? 0.6 : 1,
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(200,230,74,.4)'}
                  onBlur={e => e.target.style.borderColor = 'var(--bd)'}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || typing}
                  style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: input.trim() && !typing
                      ? 'linear-gradient(135deg, var(--lime), #A8C830)' : 'var(--b2)',
                    border: 'none',
                    cursor: input.trim() && !typing ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .2s', flexShrink: 0,
                    transform: input.trim() ? 'scale(1)' : 'scale(0.9)',
                    opacity: input.trim() && !typing ? 1 : 0.4,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke={input.trim() ? '#121418' : 'var(--t3)'} strokeWidth="2" strokeLinecap="round"/>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={input.trim() ? '#121418' : 'var(--t3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

const headerBtnStyle = {
  width: 30, height: 30, borderRadius: 8, border: 'none',
  background: 'transparent', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background .2s',
};
