import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLUMNS = ['Open', 'In Progress', 'Resolved', 'Closed'];

const COLUMN_COLORS = {
  'Open': 'var(--rd)',
  'In Progress': 'var(--am)',
  'Resolved': 'var(--tl)',
  'Closed': 'var(--t3)',
};

const SEVERITY_ORDER = ['Critical', 'High', 'Medium', 'Low'];

const SEVERITY_COLORS = {
  Critical: 'var(--rd)',
  High: 'var(--am)',
  Medium: '#eab308',
  Low: 'var(--tl)',
};

const SEVERITY_BG = {
  Critical: 'rgba(255,77,77,.12)',
  High: 'rgba(255,181,71,.12)',
  Medium: 'rgba(234,179,8,.12)',
  Low: 'rgba(45,212,191,.12)',
};

// ── Keyframes (injected once) ────────────────────────────────────────────────
const KANBAN_STYLES = `
@keyframes kanbanFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes kanbanPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(200,230,74,.0); }
  50%      { box-shadow: 0 0 0 4px rgba(200,230,74,.15); }
}
`;

// ── BugCard ──────────────────────────────────────────────────────────────────
function BugCard({ bug, index, onCardClick, onDragStart, onDragEnd }) {
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), index * 40);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, bug)}
      onDragEnd={onDragEnd}
      onClick={() => onCardClick?.(bug)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--b2)',
        border: '1px solid var(--bd)',
        borderRadius: 12,
        padding: '14px 16px',
        cursor: 'grab',
        transition: 'transform .18s ease, box-shadow .18s ease, opacity .3s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 8px 24px rgba(0,0,0,.25), 0 0 0 1px rgba(200,230,74,.15)'
          : '0 1px 3px rgba(0,0,0,.12)',
        opacity: mounted ? 1 : 0,
        animation: mounted ? 'kanbanFadeIn .3s ease forwards' : 'none',
        userSelect: 'none',
        position: 'relative',
      }}
    >
      {/* Drag handle */}
      <div style={{
        position: 'absolute',
        top: 14,
        right: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        opacity: hovered ? .6 : .25,
        transition: 'opacity .15s',
      }}>
        <div style={{ display: 'flex', gap: 2 }}>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--t3)' }} />
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--t3)' }} />
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--t3)' }} />
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--t3)' }} />
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--t3)' }} />
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--t3)' }} />
        </div>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 13.5,
        fontWeight: 600,
        color: 'var(--tx)',
        marginBottom: 10,
        paddingRight: 20,
        lineHeight: 1.4,
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {bug.title}
      </div>

      {/* Bottom row: severity badge + assignee */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          padding: '3px 9px',
          borderRadius: 6,
          background: SEVERITY_BG[bug.severity] || 'rgba(255,255,255,.06)',
          color: SEVERITY_COLORS[bug.severity] || 'var(--t3)',
          border: `1px solid ${SEVERITY_COLORS[bug.severity] || 'var(--t3)'}30`,
          flexShrink: 0,
          letterSpacing: .2,
        }}>
          {bug.severity}
        </span>
        {bug.assignee && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            minWidth: 0,
          }}>
            <div style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'var(--bd)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--t2)',
              flexShrink: 0,
            }}>
              {bug.assignee.charAt(0).toUpperCase()}
            </div>
            <span style={{
              fontSize: 11.5,
              color: 'var(--t3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {bug.assignee}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── KanbanColumn ─────────────────────────────────────────────────────────────
function KanbanColumn({ title, color, bugs, onDrop, onCardClick, onDragStart, onDragEnd }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback(e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(e => {
    // Only trigger when leaving the column itself, not child elements
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(e => {
    e.preventDefault();
    setDragOver(false);
    const rawId = e.dataTransfer.getData('text/bugId');
    if (!rawId) return;
    // Support both numeric IDs and string IDs like "failed-123"
    const bugId = rawId.startsWith('failed-') ? rawId : parseInt(rawId, 10);
    onDrop(bugId, title);
  }, [onDrop, title]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        flex: 1,
        minWidth: 240,
        display: 'flex',
        flexDirection: 'column',
        background: dragOver ? 'rgba(200,230,74,.03)' : 'transparent',
        borderRadius: 14,
        border: dragOver
          ? '1.5px solid rgba(200,230,74,.35)'
          : '1.5px solid transparent',
        boxShadow: dragOver ? '0 0 16px rgba(200,230,74,.1)' : 'none',
        transition: 'all .2s ease',
        padding: 2,
      }}
    >
      {/* Column header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 14px',
        marginBottom: 8,
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: 'var(--tx)',
        }}>
          {title}
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--t3)',
          background: 'var(--b2)',
          padding: '2px 8px',
          borderRadius: 6,
          marginLeft: 'auto',
        }}>
          {bugs.length}
        </span>
      </div>

      {/* Cards container */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flex: 1,
        minHeight: 80,
        padding: '0 4px 4px',
      }}>
        {bugs.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px dashed var(--bd)',
            borderRadius: 12,
            padding: '24px 16px',
            minHeight: 80,
          }}>
            <span style={{ fontSize: 12.5, color: 'var(--t3)', fontStyle: 'italic' }}>
              No bugs
            </span>
          </div>
        ) : (
          bugs.map((bug, i) => (
            <BugCard
              key={bug.id}
              bug={bug}
              index={i}
              onCardClick={onCardClick}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── KanbanBoard (main export) ────────────────────────────────────────────────
export default function KanbanBoard({ bugs = [], onStatusChange, onCardClick }) {
  const [viewMode, setViewMode] = useState('status'); // 'status' | 'severity'
  const [draggingId, setDraggingId] = useState(null);
  const styleRef = useRef(null);

  // Inject keyframes once
  useEffect(() => {
    if (styleRef.current) return;
    const style = document.createElement('style');
    style.textContent = KANBAN_STYLES;
    document.head.appendChild(style);
    styleRef.current = style;
    return () => {
      if (style.parentNode) style.parentNode.removeChild(style);
      styleRef.current = null;
    };
  }, []);

  // ── Drag handlers ──
  const handleDragStart = useCallback((e, bug) => {
    setDraggingId(bug.id);
    e.dataTransfer.setData('text/bugId', String(bug.id));
    e.dataTransfer.setData('text/plain', String(bug.id));
    e.dataTransfer.effectAllowed = 'move';
    // Make the ghost slightly transparent
    if (e.target) {
      requestAnimationFrame(() => {
        e.target.style.opacity = '0.4';
      });
    }
  }, []);

  const handleDragEnd = useCallback(e => {
    setDraggingId(null);
    if (e.target) e.target.style.opacity = '1';
  }, []);

  const handleDrop = useCallback((bugId, newStatus) => {
    // Support both numeric and string IDs (e.g. "failed-123")
    const bug = bugs.find(b => String(b.id) === String(bugId));
    if (!bug || bug.status === newStatus) return;
    onStatusChange?.(bug.id, newStatus);
  }, [bugs, onStatusChange]);

  // ── Group bugs by status ──
  const statusGroups = useMemo(() => {
    const groups = {};
    STATUS_COLUMNS.forEach(s => { groups[s] = []; });
    bugs.forEach(bug => {
      const col = STATUS_COLUMNS.includes(bug.status) ? bug.status : 'Open';
      groups[col].push(bug);
    });
    return groups;
  }, [bugs]);

  // ── Group bugs by severity, then within each severity by status ──
  const severityGroups = useMemo(() => {
    const groups = {};
    SEVERITY_ORDER.forEach(s => { groups[s] = {}; STATUS_COLUMNS.forEach(c => { groups[s][c] = []; }); });
    bugs.forEach(bug => {
      const sev = SEVERITY_ORDER.includes(bug.severity) ? bug.severity : 'Medium';
      const col = STATUS_COLUMNS.includes(bug.status) ? bug.status : 'Open';
      groups[sev][col].push(bug);
    });
    return groups;
  }, [bugs]);

  // ── By-status view ──
  const renderStatusView = () => (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${STATUS_COLUMNS.length}, 1fr)`,
      gap: 12,
      alignItems: 'start',
    }}>
      {STATUS_COLUMNS.map(status => (
        <KanbanColumn
          key={status}
          title={status}
          color={COLUMN_COLORS[status]}
          bugs={statusGroups[status]}
          onDrop={handleDrop}
          onCardClick={onCardClick}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );

  // ── By-severity view (swimlanes) ──
  const renderSeverityView = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {SEVERITY_ORDER.map(severity => {
        const statusBugs = severityGroups[severity];
        const total = STATUS_COLUMNS.reduce((n, s) => n + statusBugs[s].length, 0);
        if (total === 0) return null;
        return (
          <div key={severity}>
            {/* Swimlane header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
              padding: '0 4px',
            }}>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: 6,
                background: SEVERITY_BG[severity],
                color: SEVERITY_COLORS[severity],
                border: `1px solid ${SEVERITY_COLORS[severity]}30`,
              }}>
                {severity}
              </span>
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>
                {total} bug{total !== 1 ? 's' : ''}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--bd)', marginLeft: 4 }} />
            </div>
            {/* Status columns within swimlane */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${STATUS_COLUMNS.length}, 1fr)`,
              gap: 12,
              alignItems: 'start',
            }}>
              {STATUS_COLUMNS.map(status => (
                <KanbanColumn
                  key={`${severity}-${status}`}
                  title={status}
                  color={COLUMN_COLORS[status]}
                  bugs={statusBugs[status]}
                  onDrop={handleDrop}
                  onCardClick={onCardClick}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>Kanban Board</span>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--t3)',
            background: 'var(--b2)',
            padding: '2px 9px',
            borderRadius: 6,
          }}>
            {bugs.length} total
          </span>
        </div>

        {/* Swimlane toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--b2)',
          borderRadius: 8,
          padding: 3,
          border: '1px solid var(--bd)',
        }}>
          {[
            { key: 'status', label: 'By Status' },
            { key: 'severity', label: 'By Severity' },
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setViewMode(opt.key)}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: 'none',
                background: viewMode === opt.key ? 'var(--bc)' : 'transparent',
                color: viewMode === opt.key ? 'var(--tx)' : 'var(--t3)',
                fontSize: 12,
                fontWeight: viewMode === opt.key ? 600 : 500,
                cursor: 'pointer',
                transition: 'all .2s',
                boxShadow: viewMode === opt.key ? '0 1px 4px rgba(0,0,0,.18)' : 'none',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers (visible in status view) */}
      {viewMode === 'status' && renderStatusView()}
      {viewMode === 'severity' && renderSeverityView()}

      {/* Empty state */}
      {bugs.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          color: 'var(--t3)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12, opacity: .5 }}>🐛</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 6 }}>
            No Bugs Tracked
          </div>
          <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6 }}>
            Bugs will appear here once they are reported.
          </div>
        </div>
      )}
    </div>
  );
}
