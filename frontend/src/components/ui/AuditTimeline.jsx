import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../../api/client';

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function actionColor(action) {
  switch (action) {
    case 'create': case 'created': return 'var(--lime, #22c55e)';
    case 'update': case 'updated': return 'var(--ac, #6366f1)';
    case 'delete': case 'deleted': return '#ef4444';
    default: return 'var(--tx2)';
  }
}

function actionLabel(action) {
  switch (action) {
    case 'create': case 'created': return 'Created';
    case 'update': case 'updated': return 'Updated';
    case 'delete': case 'deleted': return 'Deleted';
    default: return action;
  }
}

function UserAvatar({ name }) {
  const initial = (name || '?')[0].toUpperCase();
  return (
    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ac, #6366f1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
      color: '#fff', flexShrink: 0, zIndex: 2, position: 'relative' }}>
      {initial}
    </div>
  );
}

function ChangesDiff({ changes }) {
  if (!changes || typeof changes !== 'object') return null;
  const entries = Array.isArray(changes) ? changes : Object.entries(changes).map(([field, val]) => {
    if (val && typeof val === 'object' && ('old' in val || 'new' in val)) {
      return { field, oldValue: val.old, newValue: val.new };
    }
    return { field, oldValue: undefined, newValue: val };
  });
  if (entries.length === 0) return null;

  return (
    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {entries.map((ch, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
          <span style={{ color: 'var(--tx2)', fontWeight: 500 }}>{ch.field}:</span>
          {ch.oldValue !== undefined && (
            <span style={{ background: 'rgba(239,68,68,.15)', color: '#ef4444', padding: '1px 6px',
              borderRadius: 4, textDecoration: 'line-through' }}>
              {String(ch.oldValue)}
            </span>
          )}
          {ch.oldValue !== undefined && <span style={{ color: 'var(--tx2)' }}>→</span>}
          {ch.newValue !== undefined && (
            <span style={{ background: 'rgba(34,197,94,.15)', color: '#22c55e', padding: '1px 6px', borderRadius: 4 }}>
              {String(ch.newValue)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function AuditTimeline({ entityType, entityId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAuditLogs({ entityType, entityId })
      .then(res => { if (!cancelled) setLogs(res.data?.logs || res.data || []); })
      .catch(err => { if (!cancelled) setError(err.response?.data?.error || 'Failed to load audit logs'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [entityType, entityId]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--tx2)', fontSize: 13 }}>
        Loading audit trail...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#ef4444', fontSize: 13 }}>{error}</div>
    );
  }

  if (logs.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--tx2)', fontSize: 13 }}>
        No audit history found.
      </div>
    );
  }

  return (
    <div style={{ maxHeight: 400, overflowY: 'auto', position: 'relative', paddingLeft: 16 }}>
      {/* Vertical timeline line */}
      <div style={{ position: 'absolute', left: 31, top: 0, bottom: 0, width: 2,
        background: 'var(--bd, rgba(255,255,255,.1))' }} />

      {logs.map((entry, i) => (
        <div key={entry.id || i} style={{ display: 'flex', gap: 12, marginBottom: 20, position: 'relative' }}>
          <UserAvatar name={entry.userName} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
                {entry.userName || 'System'}
              </span>
              <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 6,
                background: `${actionColor(entry.action)}20`, color: actionColor(entry.action), fontWeight: 600 }}>
                {actionLabel(entry.action)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--tx2)' }}>
                {entry.entityType}{entry.entityName ? `: ${entry.entityName}` : ''}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 2 }}>
              {formatTime(entry.createdAt)}
            </div>
            <ChangesDiff changes={entry.changes} />
          </div>
        </div>
      ))}
    </div>
  );
}
