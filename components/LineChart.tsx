'use client';
import React from 'react';

export default function LineChart({
  points,
  points2,
  color = '#D9B45B',
  color2 = '#8B98A5',
  height = 150,
  fmt = (v: number) => v.toFixed(2),
  label,
}: {
  points: [string, number][];
  points2?: [string, number][];
  color?: string;
  color2?: string;
  height?: number;
  fmt?: (v: number, axis?: boolean) => string;
  label?: string;
}) {
  const pts = points.filter((p) => p && isFinite(p[1]));
  if (pts.length < 2) {
    return (
      <div className="sub" style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--line3)', borderRadius: 8, textAlign: 'center', padding: 10 }}>
        No history yet.
      </div>
    );
  }
  const W = 1000;
  const H = height;
  const PT = 8;
  const PB = 8;
  const pw = W;
  const ph = H - PT - PB;
  const vs = pts.map((p) => p[1]);
  const v2 = points2 ? points2.map((p) => p[1]) : [];
  let mn = Math.min(...vs, ...v2);
  let mx = Math.max(...vs, ...v2);
  const pad = (mx - mn) * 0.08 || mx * 0.02 || 1;
  mn -= pad;
  mx += pad;
  const n = pts.length;
  const X = (i: number) => (i / (n - 1)) * pw;
  const Y = (v: number) => PT + (1 - (v - mn) / (mx - mn)) * ph;
  const line = pts.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ');
  const line2 = points2 ? points2.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ') : '';
  const ticks = [mx - pad, (mx + mn) / 2, mn + pad];
  const xi = [0, Math.floor((n - 1) / 2), n - 1];
  const pctY = (v: number) => ((Y(v) / H) * 100).toFixed(2) + '%';
  const gid = 'cg-' + Math.random().toString(36).slice(2, 8);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '0 8px' }}>
      <div className="chart" style={{ height }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }} role="img" aria-label={label || 'Price chart'}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity=".26" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t, i) => (
            <line key={i} x1="0" x2={pw} y1={Y(t).toFixed(1)} y2={Y(t).toFixed(1)} stroke="#1F2833" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ))}
          <path d={`${line} L${pw},${PT + ph} L0,${PT + ph} Z`} fill={`url(#${gid})`} />
          <path d={line} fill="none" stroke={color} strokeWidth={1.8} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {line2 && <path d={line2} fill="none" stroke={color2} strokeWidth={1.6} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />}
        </svg>
        <span style={{ position: 'absolute', right: -4, top: pctY(vs[n - 1]), width: 8, height: 8, borderRadius: '50%', background: color, transform: 'translateY(-50%)' }} />
      </div>
      <div style={{ position: 'relative', height, minWidth: 44 }}>
        {ticks.map((t, i) => (
          <span key={i} className="mono" style={{ position: 'absolute', right: 0, top: pctY(t), transform: 'translateY(-50%)', fontSize: 10.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            {fmt(t, true)}
          </span>
        ))}
      </div>
      <div className="mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--muted)', paddingTop: 4, gridColumn: '1 / 2' }}>
        {xi.map((i, k) => (
          <span key={k}>{new Date(pts[i][0] + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
        ))}
      </div>
    </div>
  );
}
