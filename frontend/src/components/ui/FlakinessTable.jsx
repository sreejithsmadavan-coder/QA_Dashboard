import React, { useState, useEffect } from 'react';
import { getFlakinessData } from '../../api/client';

function ScoreBar({ score }) {
  const color = score > 50 ? '#ef4444' : score > 20 ? '#eab308' : '#22c55e';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 80, height: 8, borderRadius: 4, background: 'var(--bg2, rgba(255,255,255,.08))' }}>
        <div style={{ width: `${Math.min(score, 100)}%`, height: '100%', borderRadius: 4,
          background: color, transition: 'width .3s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 42 }}>{score.toFixed(1)}%</span>
    </div>
  );
}

function TrendDots({ trend }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {trend.map((status, i) => {
        let color = '#6b7280'; // gray for skip
        if (status === 'Passed') color = '#22c55e';
        else if (status === 'Failed') color = '#ef4444';
        return (
          <div key={i} title={status} style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        );
      })}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Passed: { bg: 'rgba(34,197,94,.15)', color: '#22c55e' },
    Failed: { bg: 'rgba(239,68,68,.15)', color: '#ef4444' },
    Skipped: { bg: 'rgba(107,114,128,.15)', color: '#6b7280' },
  };
  const s = styles[status] || styles.Skipped;
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: s.bg, color: s.color, fontWeight: 600 }}>
      {status}
    </span>
  );
}

export default function FlakinessTable({ projectId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getFlakinessData(projectId)
      .then(res => { if (!cancelled) setData(res.data || []); })
      .catch(err => { if (!cancelled) setError(err.response?.data?.error || 'Failed to load flakiness data'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  if (!projectId) {
    return <div style={{ padding: 24, color: 'var(--tx2)', fontSize: 13, textAlign: 'center' }}>Select a project to view flakiness data.</div>;
  }

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--tx2)', fontSize: 13, textAlign: 'center' }}>Analyzing test flakiness...</div>;
  }

  if (error) {
    return <div style={{ padding: 24, color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{error}</div>;
  }

  if (data.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--tx2)', fontSize: 13 }}>
        No flaky tests detected. All tests have stable results.
      </div>
    );
  }

  const thStyle = {
    padding: '10px 12px', fontSize: 11, fontWeight: 600, color: 'var(--tx2)',
    textAlign: 'left', borderBottom: '1px solid var(--bd)', textTransform: 'uppercase',
    letterSpacing: '.5px', whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '10px 12px', fontSize: 13, color: 'var(--tx)', borderBottom: '1px solid var(--bd, rgba(255,255,255,.06))',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Test Name</th>
            <th style={thStyle}>Runs</th>
            <th style={thStyle}>Flips</th>
            <th style={thStyle}>Score</th>
            <th style={thStyle}>Trend (last 10)</th>
            <th style={thStyle}>Last Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.testCaseId}
              style={{ transition: 'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2, rgba(255,255,255,.03))'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <td style={{ ...tdStyle, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.testCaseName}
              </td>
              <td style={tdStyle}>{row.totalRuns}</td>
              <td style={tdStyle}>{row.flips}</td>
              <td style={tdStyle}><ScoreBar score={row.flakinessScore} /></td>
              <td style={tdStyle}><TrendDots trend={row.trend} /></td>
              <td style={tdStyle}><StatusBadge status={row.lastStatus} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
