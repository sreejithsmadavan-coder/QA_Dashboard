import React, { useState } from 'react';

export function Donut({ value, max = 100, size = 96, sw = 9, color = 'var(--lime)', label, suffix = '' }) {
  const [hov, setHov] = useState(false);
  const r = (size - sw) / 2, ci = 2 * Math.PI * r, off = ci * (1 - Math.min(value / max, 1));
  const disp = (typeof value === 'number' ? (value % 1 === 0 ? String(value) : value.toFixed(1)) : value) + suffix;
  const fs = Math.round(suffix ? size * .19 : size * .22);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div className="donut-wrap" style={{ width: size, height: size, position: 'relative', filter: hov ? `drop-shadow(0 0 10px ${color}55)` : 'none', transition: 'filter .3s' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', top: 0, left: 0 }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bd)" strokeWidth={sw} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={ci} strokeDashoffset={off} strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)' }} />
        </svg>
        <div style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: fs, fontWeight: 800, color: 'var(--tx)', lineHeight: 1 }}>{disp}</span>
        </div>
      </div>
      {label && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 11.5, color: 'var(--t2)', fontWeight: 400 }}>{label}</span>
      </div>}
    </div>
  );
}

export function AreaChart({ data, w = 260, h = 60, color = 'var(--lime)' }) {
  const d = Array.isArray(data) && data.length > 1 ? data : [0, 0];
  const mx = Math.max(...d), mn = Math.min(...d);
  const pts = d.map((v, i) => ({ x: (i / (d.length - 1)) * w, y: h - ((v - mn) / (mx - mn || 1)) * (h - 8) - 4 }));
  const ln = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs><linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity=".25" />
        <stop offset="100%" stopColor={color} stopOpacity=".01" />
      </linearGradient></defs>
      <path d={`${ln} L${w},${h} L0,${h} Z`} fill="url(#ag2)" />
      <path d={ln} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3.5" fill={color} />
    </svg>
  );
}

export function SparkBar({ data, color = 'var(--lime)' }) {
  const mx = Math.max(...data.map(w => w.v));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 56 }}>
      {data.map((w, i) => {
        const h = Math.max((w.v / mx) * 48, 6), isHl = w.v === mx;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <div style={{ width: '100%', height: h, borderRadius: '4px 4px 0 0', background: isHl ? `linear-gradient(180deg,${color},${color}88)` : 'var(--bd)', transition: 'height .7s ease', boxShadow: isHl ? `0 0 8px ${color}44` : undefined }} />
            <span style={{ fontSize: 10, color: isHl ? 'var(--lime)' : 'var(--t3)', fontWeight: isHl ? 700 : 400 }}>{w.d}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ProgBar({ value, color, height = 6, style = {} }) {
  return (
    <div className="pb-track" style={{ ...style, height }}>
      <div className="pb-fill" style={{ width: `${Math.min(value || 0, 100)}%`, background: color || 'var(--lime)' }} />
    </div>
  );
}
