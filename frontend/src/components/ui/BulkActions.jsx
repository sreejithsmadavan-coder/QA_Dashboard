import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const BUG_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'];
const BUG_SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];
const TC_STATUSES = ['Pass', 'Fail', 'Blocked', 'Not Executed'];
const TC_CATEGORIES = ['Functional', 'Regression', 'Smoke', 'Integration', 'Performance', 'Security', 'Usability'];

function DropdownUp({ label, icon, options, onSelect, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{
        position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
        background: 'var(--bc)', border: '1px solid var(--bd)', borderRadius: 12,
        boxShadow: '0 -16px 48px rgba(0,0,0,.45)', minWidth: 180,
        padding: '6px 0', animation: 'fadeUp .15s ease', zIndex: 10002,
      }}>
        <div style={{
          padding: '8px 14px 6px', fontSize: 11, fontWeight: 700,
          color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: 0.8,
        }}>{label}</div>
        {options.map(opt => (
          <button key={opt} onClick={() => { onSelect(opt); onClose(); }} style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '8px 14px', background: 'transparent', border: 'none',
            color: 'var(--t2)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: "'DM Sans',sans-serif", transition: 'all .15s',
          }}
            onMouseEnter={e => { e.target.style.background = 'rgba(200,230,74,.06)'; e.target.style.color = 'var(--tx)'; }}
            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--t2)'; }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function AssignInput({ onSubmit, onClose }) {
  const [value, setValue] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      onClose();
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <form onSubmit={handleSubmit} style={{
        position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
        background: 'var(--bc)', border: '1px solid var(--bd)', borderRadius: 12,
        boxShadow: '0 -16px 48px rgba(0,0,0,.45)', padding: 12,
        animation: 'fadeUp .15s ease', zIndex: 10002, display: 'flex', gap: 8,
      }}>
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Assignee name..."
          style={{
            padding: '7px 12px', borderRadius: 8, border: '1px solid var(--bd)',
            background: 'var(--b2)', color: 'var(--tx)', fontSize: 13,
            outline: 'none', fontFamily: "'DM Sans',sans-serif", width: 160,
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(200,230,74,.3)'}
          onBlur={e => e.target.style.borderColor = 'var(--bd)'}
        />
        <button type="submit" className="btn btn-p" style={{ padding: '7px 14px', fontSize: 12 }}>
          Apply
        </button>
      </form>
    </div>
  );
}

export default function BulkActions({ selectedIds, entityType, onAction, onClearSelection }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [visible, setVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  const count = selectedIds?.length || 0;

  // Handle enter/exit animation
  useEffect(() => {
    if (count > 0) {
      setShouldRender(true);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setConfirmDelete(false);
        setOpenDropdown(null);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [count]);

  if (!shouldRender) return null;

  const closeDropdown = () => setOpenDropdown(null);

  const handleAction = (action, value) => {
    if (onAction) onAction(action, selectedIds, value);
    closeDropdown();
  };

  const handleDeleteConfirm = () => {
    handleAction('delete');
    setConfirmDelete(false);
  };

  const isBug = entityType === 'bug';

  const btnBase = {
    padding: '8px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 600,
    cursor: 'pointer', border: '1px solid var(--bd)', background: 'var(--b2)',
    color: 'var(--tx)', display: 'inline-flex', alignItems: 'center', gap: 6,
    transition: 'all .2s cubic-bezier(.22,1,.36,1)', fontFamily: "'DM Sans',sans-serif",
    position: 'relative', whiteSpace: 'nowrap',
  };

  const btnDanger = {
    ...btnBase,
    background: 'rgba(255,77,77,.1)',
    color: 'var(--rd)',
    border: '1px solid rgba(255,77,77,.15)',
  };

  return createPortal(
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10000,
      display: 'flex', justifyContent: 'center', padding: '0 24px 20px',
      pointerEvents: 'none',
      transform: visible ? 'translateY(0)' : 'translateY(100%)',
      opacity: visible ? 1 : 0,
      transition: 'transform .25s cubic-bezier(.22,1,.36,1), opacity .2s ease',
    }}>
      <div style={{
        background: 'var(--bc)', border: '1px solid var(--bd)', borderRadius: 16,
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: '0 -8px 40px rgba(0,0,0,.45), 0 0 0 1px rgba(200,230,74,.06)',
        pointerEvents: 'auto', maxWidth: 800, width: '100%',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Selection count */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 14px', borderRadius: 10,
          background: 'rgba(200,230,74,.08)', border: '1px solid rgba(200,230,74,.15)',
          flexShrink: 0,
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: 7, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 12,
            fontWeight: 800, background: 'var(--lime)', color: '#121418',
          }}>{count}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lime)' }}>selected</span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: 'var(--bd)', flexShrink: 0 }} />

        {/* Action buttons */}
        {!confirmDelete ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Change Status */}
            <div style={{ position: 'relative' }}>
              <button
                style={btnBase}
                onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                onMouseEnter={e => { e.target.style.borderColor = 'rgba(200,230,74,.22)'; e.target.style.background = 'var(--bc)'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--bd)'; e.target.style.background = 'var(--b2)'; }}
              >
                Status ▾
              </button>
              {openDropdown === 'status' && (
                <DropdownUp
                  label="Change Status"
                  options={isBug ? BUG_STATUSES : TC_STATUSES}
                  onSelect={val => handleAction('status', val)}
                  onClose={closeDropdown}
                />
              )}
            </div>

            {/* Bug: Change Severity */}
            {isBug && (
              <div style={{ position: 'relative' }}>
                <button
                  style={btnBase}
                  onClick={() => setOpenDropdown(openDropdown === 'severity' ? null : 'severity')}
                  onMouseEnter={e => { e.target.style.borderColor = 'rgba(200,230,74,.22)'; e.target.style.background = 'var(--bc)'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'var(--bd)'; e.target.style.background = 'var(--b2)'; }}
                >
                  Severity ▾
                </button>
                {openDropdown === 'severity' && (
                  <DropdownUp
                    label="Change Severity"
                    options={BUG_SEVERITIES}
                    onSelect={val => handleAction('severity', val)}
                    onClose={closeDropdown}
                  />
                )}
              </div>
            )}

            {/* Bug: Assign To */}
            {isBug && (
              <div style={{ position: 'relative' }}>
                <button
                  style={btnBase}
                  onClick={() => setOpenDropdown(openDropdown === 'assign' ? null : 'assign')}
                  onMouseEnter={e => { e.target.style.borderColor = 'rgba(200,230,74,.22)'; e.target.style.background = 'var(--bc)'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'var(--bd)'; e.target.style.background = 'var(--b2)'; }}
                >
                  Assign To
                </button>
                {openDropdown === 'assign' && (
                  <AssignInput
                    onSubmit={val => handleAction('assign', val)}
                    onClose={closeDropdown}
                  />
                )}
              </div>
            )}

            {/* Test Case: Change Category */}
            {!isBug && (
              <div style={{ position: 'relative' }}>
                <button
                  style={btnBase}
                  onClick={() => setOpenDropdown(openDropdown === 'category' ? null : 'category')}
                  onMouseEnter={e => { e.target.style.borderColor = 'rgba(200,230,74,.22)'; e.target.style.background = 'var(--bc)'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'var(--bd)'; e.target.style.background = 'var(--b2)'; }}
                >
                  Category ▾
                </button>
                {openDropdown === 'category' && (
                  <DropdownUp
                    label="Change Category"
                    options={TC_CATEGORIES}
                    onSelect={val => handleAction('category', val)}
                    onClose={closeDropdown}
                  />
                )}
              </div>
            )}

            {/* Delete */}
            <button
              style={btnDanger}
              onClick={() => setConfirmDelete(true)}
              onMouseEnter={e => { e.target.style.background = 'rgba(255,77,77,.18)'; }}
              onMouseLeave={e => { e.target.style.background = 'rgba(255,77,77,.1)'; }}
            >
              🗑 Delete
            </button>
          </div>
        ) : (
          /* Delete Confirmation Inline */
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, animation: 'fadeIn .15s ease' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--rd)' }}>
              Delete {count} item{count !== 1 ? 's' : ''}?
            </span>
            <button
              className="btn btn-d"
              style={{ padding: '7px 14px', fontSize: 12.5 }}
              onClick={handleDeleteConfirm}
            >
              Confirm
            </button>
            <button
              className="btn btn-s"
              style={{ padding: '7px 14px', fontSize: 12.5 }}
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Clear selection */}
        <button
          onClick={() => { onClearSelection(); setConfirmDelete(false); setOpenDropdown(null); }}
          title="Clear selection"
          style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid var(--bd)',
            background: 'var(--b2)', color: 'var(--t2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, transition: 'all .2s', flexShrink: 0,
            fontFamily: "'DM Sans',sans-serif",
          }}
          onMouseEnter={e => { e.target.style.borderColor = 'rgba(255,77,77,.3)'; e.target.style.color = 'var(--rd)'; }}
          onMouseLeave={e => { e.target.style.borderColor = 'var(--bd)'; e.target.style.color = 'var(--t2)'; }}
        >
          ✕
        </button>
      </div>
    </div>,
    document.body
  );
}
