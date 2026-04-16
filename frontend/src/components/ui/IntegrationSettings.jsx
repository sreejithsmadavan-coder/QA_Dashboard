import React, { useState, useEffect } from 'react';
import { getWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook } from '../../api/client';

const EVENT_OPTIONS = [
  { key: 'bug_created', label: 'Bug Created' },
  { key: 'bug_updated', label: 'Bug Updated' },
  { key: 'test_failed', label: 'Test Failed' },
  { key: 'test_completed', label: 'Test Completed' },
  { key: 'project_created', label: 'Project Created' },
  { key: 'sprint_completed', label: 'Sprint Completed' },
];

const cardStyle = {
  background: 'var(--bc)', borderRadius: 18, border: '1px solid var(--bd)', padding: 24,
};

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--bd)',
  background: 'var(--bg2, rgba(255,255,255,.06))', color: 'var(--tx)', fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
};

const btnPrimary = {
  padding: '8px 20px', borderRadius: 10, border: 'none', background: 'var(--ac, #6366f1)',
  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const btnSecondary = {
  padding: '6px 14px', borderRadius: 8, border: '1px solid var(--bd)',
  background: 'transparent', color: 'var(--tx)', fontSize: 12, cursor: 'pointer',
};

function WebhookForm({ initial, onSave, onCancel, saving }) {
  const [platform, setPlatform] = useState(initial?.platform || 'slack');
  const [webhookUrl, setWebhookUrl] = useState(initial?.webhookUrl || '');
  const [events, setEvents] = useState(initial?.events || []);
  const [isActive, setIsActive] = useState(initial?.isActive !== undefined ? initial.isActive : true);

  const toggleEvent = (key) => {
    setEvents(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ platform, webhookUrl, events, isActive });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 4, display: 'block' }}>Platform</label>
        <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="slack">Slack</option>
          <option value="teams">Microsoft Teams</option>
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 4, display: 'block' }}>Webhook URL</label>
        <input type="url" required value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
          placeholder={platform === 'slack' ? 'https://hooks.slack.com/services/...' : 'https://outlook.office.com/webhook/...'}
          style={inputStyle} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 6, display: 'block' }}>Events</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {EVENT_OPTIONS.map(ev => (
            <label key={ev.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
              color: 'var(--tx)', cursor: 'pointer', padding: '4px 0' }}>
              <input type="checkbox" checked={events.includes(ev.key)} onChange={() => toggleEvent(ev.key)}
                style={{ accentColor: 'var(--ac)' }} />
              {ev.label}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
        <label style={{ fontSize: 12, color: 'var(--tx2)' }}>Active</label>
        <button type="button" onClick={() => setIsActive(v => !v)}
          style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', position: 'relative',
            background: isActive ? 'var(--ac, #6366f1)' : 'var(--bg2, rgba(255,255,255,.1))', transition: 'background .2s' }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute',
            top: 3, left: isActive ? 21 : 3, transition: 'left .2s' }} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="submit" disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving...' : initial ? 'Update' : 'Create'} Webhook
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={btnSecondary}>Cancel</button>
        )}
      </div>
    </form>
  );
}

export default function IntegrationSettings({ toast }) {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [testResults, setTestResults] = useState({});

  const notify = (msg, type = 'success') => {
    if (toast) toast(msg, type);
  };

  const fetchWebhooks = () => {
    setLoading(true);
    getWebhooks()
      .then(res => setWebhooks(res.data || []))
      .catch(() => notify('Failed to load webhooks', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchWebhooks(); }, []);

  const handleCreate = async (data) => {
    setSaving(true);
    try {
      await createWebhook(data);
      notify('Webhook created successfully');
      setShowForm(false);
      fetchWebhooks();
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to create webhook', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data) => {
    setSaving(true);
    try {
      await updateWebhook(editingId, data);
      notify('Webhook updated successfully');
      setEditingId(null);
      fetchWebhooks();
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to update webhook', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this webhook?')) return;
    try {
      await deleteWebhook(id);
      notify('Webhook deleted');
      fetchWebhooks();
    } catch (err) {
      notify('Failed to delete webhook', 'error');
    }
  };

  const handleTest = async (id) => {
    setTestingId(id);
    setTestResults(prev => ({ ...prev, [id]: null }));
    try {
      const res = await testWebhook(id);
      setTestResults(prev => ({ ...prev, [id]: { success: true, message: res.data.message } }));
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [id]: { success: false, message: err.response?.data?.message || 'Test failed' },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const editingWebhook = editingId ? webhooks.find(w => w.id === editingId) : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, color: 'var(--tx)' }}>Integrations</h3>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--tx2)' }}>
            Configure Slack and Teams webhook notifications
          </p>
        </div>
        {!showForm && !editingId && (
          <button onClick={() => setShowForm(true)} style={btnPrimary}>+ Add Webhook</button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', marginBottom: 16 }}>New Webhook</div>
          <WebhookForm onSave={handleCreate} onCancel={() => setShowForm(false)} saving={saving} />
        </div>
      )}

      {/* Edit form */}
      {editingWebhook && (
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', marginBottom: 16 }}>Edit Webhook</div>
          <WebhookForm initial={editingWebhook} onSave={handleUpdate} onCancel={() => setEditingId(null)} saving={saving} />
        </div>
      )}

      {/* Webhooks list */}
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--tx2)', fontSize: 13 }}>Loading...</div>
      ) : webhooks.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔗</div>
          <div style={{ fontSize: 14, color: 'var(--tx2)' }}>No webhooks configured yet</div>
          <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 4 }}>
            Add a Slack or Teams webhook to receive QA notifications
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {webhooks.map(wh => (
            <div key={wh.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{wh.platform === 'slack' ? '💬' : '👥'}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', textTransform: 'capitalize' }}>
                      {wh.platform}
                    </span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                      background: wh.isActive ? 'rgba(34,197,94,.15)' : 'rgba(107,114,128,.15)',
                      color: wh.isActive ? '#22c55e' : '#6b7280' }}>
                      {wh.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--tx2)', marginBottom: 6, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {wh.webhookUrl}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(wh.events || []).map(ev => (
                      <span key={ev} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4,
                        background: 'var(--bg2, rgba(255,255,255,.06))', color: 'var(--tx2)' }}>
                        {ev.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                  {wh.lastTriggeredAt && (
                    <div style={{ fontSize: 10, color: 'var(--tx2)', marginTop: 6 }}>
                      Last triggered: {new Date(wh.lastTriggeredAt).toLocaleString()}
                    </div>
                  )}
                  {/* Test result inline */}
                  {testResults[wh.id] && (
                    <div style={{ marginTop: 8, fontSize: 12, padding: '6px 10px', borderRadius: 8,
                      background: testResults[wh.id].success ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
                      color: testResults[wh.id].success ? '#22c55e' : '#ef4444' }}>
                      {testResults[wh.id].message}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                  <button onClick={() => handleTest(wh.id)} disabled={testingId === wh.id}
                    style={{ ...btnSecondary, opacity: testingId === wh.id ? 0.6 : 1 }}>
                    {testingId === wh.id ? 'Sending...' : 'Test'}
                  </button>
                  <button onClick={() => { setEditingId(wh.id); setShowForm(false); }} style={btnSecondary}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(wh.id)}
                    style={{ ...btnSecondary, color: '#ef4444', borderColor: 'rgba(239,68,68,.3)' }}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
