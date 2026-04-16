import React, { useState, useRef, useEffect } from 'react';

const STYLES = `
@keyframes chatBotEntry {
  0% { opacity: 0; transform: scale(0.3) rotate(-180deg); }
  60% { opacity: 1; transform: scale(1.1) rotate(10deg); }
  100% { opacity: 1; transform: scale(1) rotate(0deg); }
}
@keyframes chatBotPulse {
  0%, 100% { box-shadow: 0 4px 20px rgba(200,230,74,.25), 0 0 0 0 rgba(200,230,74,.3); }
  50% { box-shadow: 0 4px 20px rgba(200,230,74,.25), 0 0 0 10px rgba(200,230,74,0); }
}
@keyframes chatBotFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes chatPanelIn {
  from { opacity: 0; transform: translateY(20px) scale(0.9); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes dotBounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}
`;

export default function ChatBotIcon() {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hi! I\'m QA Nexus Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setTooltipVisible(true), 2000);
    const t2 = setTimeout(() => setTooltipVisible(false), 7000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [...prev, {
        role: 'bot',
        text: getBotReply(text),
      }]);
    }, 1200 + Math.random() * 800);
  };

  return (
    <>
      <style>{STYLES}</style>

      {/* Tooltip */}
      {!open && tooltipVisible && (
        <div style={{
          position: 'fixed', bottom: 90, right: 28, zIndex: 10001,
          background: 'var(--bc)', border: '1px solid var(--bd)',
          borderRadius: 12, padding: '10px 16px', fontSize: 13,
          color: 'var(--tx)', boxShadow: 'var(--shadow-lg)',
          animation: 'chatPanelIn .3s ease', whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}>
          Need help? Chat with me!
          <div style={{
            position: 'absolute', bottom: -6, right: 24,
            width: 12, height: 12, background: 'var(--bc)',
            border: '1px solid var(--bd)', borderTop: 'none', borderLeft: 'none',
            transform: 'rotate(45deg)',
          }} />
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => { setOpen(o => !o); setTooltipVisible(false); }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Open chat"
        style={{
          position: 'fixed', bottom: 24, right: 28, zIndex: 10000,
          width: 56, height: 56, borderRadius: '50%',
          background: open
            ? 'linear-gradient(135deg, #FF4D4D, #e03e3e)'
            : 'linear-gradient(135deg, var(--lime), #A8C830)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: open
            ? 'none'
            : hovered
              ? 'chatBotFloat 2s ease-in-out infinite'
              : 'chatBotEntry .6s cubic-bezier(.34,1.56,.64,1) forwards, chatBotPulse 3s ease-in-out 1s infinite',
          boxShadow: hovered
            ? '0 8px 32px rgba(200,230,74,.45), 0 0 0 4px rgba(200,230,74,.15)'
            : '0 4px 20px rgba(200,230,74,.25)',
          transform: hovered && !open ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform .25s cubic-bezier(.22,1,.36,1), box-shadow .3s, background .3s',
        }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 5.82 2 10.5c0 2.55 1.4 4.84 3.6 6.35-.2 1.8-1 3.35-1.06 3.45a.5.5 0 00.44.7c.06 0 2.9-.3 4.77-1.6.73.2 1.48.3 2.25.3 5.52 0 10-3.82 10-8.5S17.52 2 12 2z" fill="#121418"/>
            <circle cx="8.5" cy="10.5" r="1.2" fill="var(--lime)"/>
            <circle cx="12" cy="10.5" r="1.2" fill="var(--lime)"/>
            <circle cx="15.5" cy="10.5" r="1.2" fill="var(--lime)"/>
          </svg>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 92, right: 28, zIndex: 10001,
          width: 380, maxHeight: 520,
          background: 'var(--bc)', borderRadius: 20,
          border: '1px solid var(--bd)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column',
          animation: 'chatPanelIn .35s cubic-bezier(.22,1,.36,1)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12,
            background: 'linear-gradient(135deg, rgba(200,230,74,.08), transparent)',
            borderBottom: '1px solid var(--bd)',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--lime), #A8C830)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#121418">
                <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7v1h1.5a.5.5 0 010 1H20v1a3 3 0 01-3 3H7a3 3 0 01-3-3v-1H1.5a.5.5 0 010-1H4v-1a7 7 0 017-7h1V5.73A2 2 0 0112 2zM9.5 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm5 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--tx)' }}>QA Nexus Bot</div>
              <div style={{ fontSize: 12, color: 'var(--lime)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)', display: 'inline-block' }} />
                Online
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px 16px 8px',
            display: 'flex', flexDirection: 'column', gap: 12,
            minHeight: 280, maxHeight: 340,
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                animation: 'chatPanelIn .3s ease',
              }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px', borderRadius: 14,
                  fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word',
                  ...(m.role === 'user' ? {
                    background: 'linear-gradient(135deg, var(--lime), #A8C830)',
                    color: '#121418', fontWeight: 500,
                    borderBottomRightRadius: 4,
                  } : {
                    background: 'var(--b2)', color: 'var(--tx)',
                    border: '1px solid var(--bd)',
                    borderBottomLeftRadius: 4,
                  }),
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', animation: 'chatPanelIn .3s ease' }}>
                <div style={{
                  background: 'var(--b2)', border: '1px solid var(--bd)',
                  borderRadius: 14, borderBottomLeftRadius: 4,
                  padding: '12px 18px', display: 'flex', gap: 5,
                }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: 'var(--t3)', display: 'inline-block',
                      animation: `dotBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--bd)',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 12,
                background: 'var(--b2)', border: '1px solid var(--bd)',
                color: 'var(--tx)', fontSize: 13, outline: 'none',
                fontFamily: "'DM Sans', sans-serif",
                transition: 'border-color .2s',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(200,230,74,.4)'}
              onBlur={e => e.target.style.borderColor = 'var(--bd)'}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              style={{
                width: 38, height: 38, borderRadius: '50%',
                background: input.trim()
                  ? 'linear-gradient(135deg, var(--lime), #A8C830)'
                  : 'var(--b2)',
                border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .2s', flexShrink: 0,
                transform: input.trim() ? 'scale(1)' : 'scale(0.9)',
                opacity: input.trim() ? 1 : 0.5,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22 2L11 13" stroke={input.trim() ? '#121418' : 'var(--t3)'} strokeWidth="2" strokeLinecap="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={input.trim() ? '#121418' : 'var(--t3)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function getBotReply(text) {
  const t = text.toLowerCase();
  if (t.includes('bug') || t.includes('defect'))
    return 'You can log bugs from the Project Inner Page. Navigate to a project, then use the Bugs tab to create and track defects.';
  if (t.includes('test') && (t.includes('create') || t.includes('add') || t.includes('write')))
    return 'Head over to the QA Agent page from the sidebar. Configure your AI provider and it can auto-generate test cases for your project!';
  if (t.includes('project'))
    return 'Go to the Projects page to see all your QA projects. You can filter by status and click into any project for details.';
  if (t.includes('meeting') || t.includes('schedule'))
    return 'Check out the Meetings page to schedule and manage your QA team meetings.';
  if (t.includes('report') || t.includes('export'))
    return 'You can export test execution reports from within any project. Look for the export options in the project detail view.';
  if (t.includes('hello') || t.includes('hi') || t.includes('hey'))
    return 'Hello! How can I help you with QA Nexus today?';
  if (t.includes('thank'))
    return 'You\'re welcome! Let me know if you need anything else.';
  return 'I can help you with projects, test cases, bug tracking, meetings, and reports. What would you like to know more about?';
}
