import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getNotifications, getUnreadNotifCount, markNotifRead } from '../../api/client';

/* ── time-ago helper ─────────────────────────────────────────────────────── */
function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60)   return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60)      return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)       return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)       return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/* ── keyframes (injected once) ───────────────────────────────────────────── */
const STYLE_ID = '__notif-center-anim';
function injectKeyframes() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes notifFadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes notifBadgePop {
      0%   { transform: scale(0); }
      60%  { transform: scale(1.15); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
}

/* ── component ───────────────────────────────────────────────────────────── */
export default function NotificationCenter({ socket }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  /* inject animation keyframes */
  useEffect(() => { injectKeyframes(); }, []);

  /* fetch unread count */
  const fetchCount = useCallback(async () => {
    try {
      const { data } = await getUnreadNotifCount();
      setUnreadCount(data.count || 0);
    } catch { /* silent */ }
  }, []);

  /* fetch full list */
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getNotifications({ limit: 50 });
      setNotifications(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  /* poll unread count every 30s */
  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, 30000);
    return () => clearInterval(id);
  }, [fetchCount]);

  /* listen to socket for real-time push */
  useEffect(() => {
    if (!socket) return;
    const handler = (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
    };
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, [socket]);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  /* toggle panel */
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchNotifications();
  };

  /* mark single as read */
  const handleRead = async (id) => {
    try {
      await markNotifRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  /* mark all read */
  const handleMarkAllRead = async () => {
    try {
      await markNotifRead('all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  /* ── styles ──────────────────────────────────────────────────────────── */
  const btnStyle = {
    position: 'relative',
    width: 38,
    height: 38,
    borderRadius: 12,
    border: '1px solid var(--bd)',
    background: 'var(--b2)',
    color: 'var(--t2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 17,
    transition: 'border-color .2s, color .2s',
  };

  const badgeStyle = {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    background: 'var(--rd, #ff4d4d)',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'DM Sans, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 5px',
    lineHeight: 1,
    animation: 'notifBadgePop .3s ease',
  };

  const panelStyle = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    width: 340,
    maxHeight: 400,
    background: 'var(--bc)',
    border: '1px solid var(--bd)',
    borderRadius: 14,
    boxShadow: '0 12px 40px rgba(0,0,0,.35)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    animation: 'notifFadeUp .25s ease',
    fontFamily: 'DM Sans, sans-serif',
    overflow: 'hidden',
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px 10px',
    borderBottom: '1px solid var(--bd)',
  };

  const listStyle = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  };

  const itemBase = {
    display: 'flex',
    gap: 10,
    padding: '11px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--bd)',
    transition: 'background .15s',
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        ref={btnRef}
        onClick={toggle}
        style={btnStyle}
        title="Notifications"
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--lime)'; e.currentTarget.style.color = 'var(--tx)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.color = 'var(--t2)'; }}
      >
        {/* bell SVG */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={badgeStyle}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div ref={panelRef} style={panelStyle}>
          {/* Header */}
          <div style={headerStyle}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)' }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--lime)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  padding: '2px 6px',
                  borderRadius: 6,
                  transition: 'background .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,230,74,.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={listStyle}>
            {loading && notifications.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>
                Loading...
              </div>
            )}
            {!loading && notifications.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>
                No notifications yet
              </div>
            )}
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => { if (!n.read) handleRead(n.id); }}
                style={{
                  ...itemBase,
                  borderLeft: !n.read ? '3px solid var(--lime)' : '3px solid transparent',
                  background: !n.read ? 'rgba(200,230,74,.04)' : 'transparent',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--b2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = !n.read ? 'rgba(200,230,74,.04)' : 'transparent'; }}
              >
                {/* Icon */}
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--b2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  color: n.iconColor || 'var(--lime)',
                  flexShrink: 0,
                  border: '1px solid var(--bd)',
                }}>
                  {n.icon || '●'}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: n.read ? 400 : 600,
                    color: 'var(--tx)',
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {n.title}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--t2)',
                    lineHeight: 1.35,
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {n.message}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'var(--t3)',
                    marginTop: 3,
                  }}>
                    {timeAgo(n.createdAt)}
                  </div>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--lime)',
                    flexShrink: 0,
                    marginTop: 4,
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
