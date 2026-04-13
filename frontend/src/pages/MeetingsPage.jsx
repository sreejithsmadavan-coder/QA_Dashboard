import React, { useState, useEffect, useCallback } from 'react';
import { getMeetings, createMeeting, updateMeeting, deleteMeeting } from '../api/client';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import useSocket from '../hooks/useSocket';

function MeetingRow({ m, past, onEdit, onDelete, toast }) {
  const [hov, setHov] = useState(false);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '17px 0', borderBottom: '1px solid var(--bd)', paddingLeft: hov ? 8 : 0, borderLeft: hov ? '3px solid var(--lime)' : '3px solid transparent', paddingRight: 4, transition: 'all .15s', boxSizing: 'border-box' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--tx)' }}>{m.title}</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: m.tagBg || 'rgba(167,139,250,.12)', color: m.tagColor || 'var(--pu)' }}>{m.tag}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12.5, color: 'var(--t3)' }}>
          <span>📅 {m.date}</span>
          <span>🕐 {m.time}</span>
          <span>👥 {m.attendees} attendees</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button className="btn btn-s" style={{ fontSize: 12, padding: '7px 12px' }} onClick={() => onEdit(m)}>Edit</button>
        {past
          ? <button className="btn btn-s" style={{ fontSize: 13, padding: '8px 16px' }} onClick={() => toast('info', 'Opening meeting notes…')}>View Notes</button>
          : <button className="btn btn-p" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => toast('success', 'Joining meeting…')}>
              <span style={{ fontSize: 12 }}>💬</span>Join
            </button>}
        <button className="btn btn-d" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => onDelete(m)}>✕</button>
      </div>
    </div>
  );
}

const TAG_OPTIONS = [
  { tag: 'planning', tagColor: 'var(--pu)', tagBg: 'rgba(167,139,250,.12)' },
  { tag: 'review',   tagColor: 'var(--cy)', tagBg: 'rgba(56,189,248,.12)' },
  { tag: 'sync',     tagColor: 'var(--tl)', tagBg: 'rgba(74,230,200,.12)' },
  { tag: 'triage',   tagColor: 'var(--am)', tagBg: 'rgba(255,181,71,.12)' },
  { tag: 'strategy', tagColor: '#22c55e',   tagBg: 'rgba(34,197,94,.12)' },
  { tag: 'demo',     tagColor: 'var(--pu)', tagBg: 'rgba(167,139,250,.12)' },
];

function MeetingFormModal({ onClose, onSave, initial }) {
  const [form, setForm] = useState(initial || { title: '', tag: 'planning', tagColor: 'var(--pu)', tagBg: 'rgba(167,139,250,.12)', date: '', time: '', attendees: 0, meetingUrl: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const setTag = opt => setForm(f => ({ ...f, tag: opt.tag, tagColor: opt.tagColor, tagBg: opt.tagBg }));
  const inp = { width: '100%', background: 'var(--b2)', border: '1px solid var(--bd)', borderRadius: 10, color: 'var(--tx)', fontSize: 13.5, padding: '10px 14px', outline: 'none', fontFamily: "'DM Sans',sans-serif", marginBottom: 14 };
  const handle = async () => {
    setLoading(true);
    await onSave(form);
    setLoading(false);
    onClose();
  };
  return (
    <Modal title={initial ? 'Edit Meeting' : 'Schedule Meeting'} onClose={onClose}>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>Title *</label>
      <input value={form.title} onChange={set('title')} placeholder="Meeting title" style={inp} />
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--t2)', marginBottom: 8 }}>Tag</label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {TAG_OPTIONS.map(opt => (
          <button key={opt.tag} onClick={() => setTag(opt)}
            style={{ padding: '4px 12px', borderRadius: 20, border: `1px solid ${form.tag === opt.tag ? opt.tagColor : 'var(--bd)'}`, background: form.tag === opt.tag ? opt.tagBg : 'transparent', color: form.tag === opt.tag ? opt.tagColor : 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {opt.tag}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 0 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>Date *</label>
          <input type="date" value={form.date} onChange={set('date')} style={inp} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>Attendees</label>
          <input type="number" value={form.attendees} onChange={set('attendees')} min={0} style={inp} />
        </div>
      </div>
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>Time</label>
      <input value={form.time} onChange={set('time')} placeholder="10:00 AM - 11:00 AM" style={inp} />
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>Meeting URL</label>
      <input value={form.meetingUrl || ''} onChange={set('meetingUrl')} placeholder="https://..." style={inp} />
      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>Notes</label>
      <textarea value={form.notes || ''} onChange={set('notes')} rows={3} placeholder="Meeting agenda or notes..." style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button className="btn btn-s" onClick={onClose}>Cancel</button>
        <button className="btn btn-p" onClick={handle} disabled={loading || !form.title || !form.date}>{loading ? 'Saving…' : initial ? 'Update Meeting' : 'Schedule Meeting'}</button>
      </div>
    </Modal>
  );
}

export default function MeetingsPage({ toast }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await getMeetings();
      setMeetings(res.data);
    } catch { toast('error', 'Failed to load meetings'); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  useSocket({ 'meeting:created': load, 'meeting:updated': load, 'meeting:deleted': load });

  const upcoming = meetings.filter(m => m.status === 'upcoming');
  const past = meetings.filter(m => m.status === 'past');

  const handleSave = async (data) => {
    try {
      if (editTarget) {
        await updateMeeting(editTarget.id, data);
        toast('success', 'Meeting updated!');
      } else {
        await createMeeting(data);
        toast('success', 'Meeting scheduled!');
      }
      load();
    } catch { toast('error', 'Failed to save meeting'); }
  };

  const handleDelete = async () => {
    try {
      await deleteMeeting(deleteTarget.id);
      toast('success', 'Meeting deleted');
      setDeleteTarget(null);
      load();
    } catch { toast('error', 'Failed to delete meeting'); }
  };

  return (
    <div className="crossfade" style={{ maxWidth: 900, paddingBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button className="btn btn-p" onClick={() => { setEditTarget(null); setShowCreate(true); }}>+ Schedule Meeting</button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 12 }}>Upcoming Meetings</div>
        <div className="cd" style={{ padding: '0 22px', paddingTop: 4 }}>
          {loading
            ? <div style={{ padding: '24px 0', color: 'var(--t3)', textAlign: 'center' }}>Loading…</div>
            : upcoming.length === 0
              ? <div style={{ padding: '24px 0', color: 'var(--t3)', textAlign: 'center' }}>No upcoming meetings</div>
              : upcoming.map(m => <MeetingRow key={m.id} m={m} past={false} onEdit={m => { setEditTarget(m); setShowCreate(true); }} onDelete={setDeleteTarget} toast={toast} />)}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginBottom: 12 }}>Past Meetings</div>
        <div className="cd" style={{ padding: '0 22px', paddingTop: 4 }}>
          {loading
            ? <div style={{ padding: '24px 0', color: 'var(--t3)', textAlign: 'center' }}>Loading…</div>
            : past.length === 0
              ? <div style={{ padding: '24px 0', color: 'var(--t3)', textAlign: 'center' }}>No past meetings</div>
              : past.map(m => <MeetingRow key={m.id} m={m} past={true} onEdit={m => { setEditTarget(m); setShowCreate(true); }} onDelete={setDeleteTarget} toast={toast} />)}
        </div>
      </div>

      {showCreate && <MeetingFormModal onClose={() => { setShowCreate(false); setEditTarget(null); }} onSave={handleSave} initial={editTarget} />}
      {deleteTarget && <ConfirmModal title="Delete Meeting" message={`Delete "${deleteTarget.title}"?`} confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
