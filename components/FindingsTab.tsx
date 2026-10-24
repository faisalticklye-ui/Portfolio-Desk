'use client';
import React, { useMemo } from 'react';
import { Holding, Settings, SipLog, WatchItem } from '../lib/types';
import { computeFindings, enrich, sum } from '../lib/calc';
import { cls, inr, num, pct } from '../lib/format';
import LineChart from './LineChart';

export default function FindingsTab({
  holdings,
  settings,
  watch,
  sipLog,
}: {
  holdings: Holding[];
  settings: Settings;
  watch: WatchItem[];
  sipLog: SipLog;
}) {
  const F = useMemo(() => computeFindings(holdings, settings, watch, {}, sipLog), [holdings, settings, watch, sipLog]);
  const all = useMemo(() => holdings.map((h) => enrich(h, settings)), [holdings, settings]);
  const now = new Date();
  const sevB: Record<string, [string, string]> = { high: ['Act now', 'b-bad'], med: ['Review', 'b-warn'], info: ['Note', 'b-mute'], good: ['On track', 'b-good'] };
  const nH = F.filter((f) => f.sev === 'high').length;
  const nM = F.filter((f) => f.sev === 'med').length;

  // simple sector panel
  const sg: Record<string, { v: number; i: number; n: number }> = {};
  all.forEach((h) => {
    const key = h.type === 'gold' ? 'Gold' : h.type === 'btc' ? 'Crypto' : h.type === 'stock' ? h.sector || 'Other stocks' : h.type === 'etf' ? h.category || 'ETF' : h.category || 'Fund';
    sg[key] = sg[key] || { v: 0, i: 0, n: 0 };
    sg[key].v += h.value; sg[key].i += h.inv; sg[key].n++;
  });
  const sectorRows = Object.entries(sg).sort((a, b) => b[1].v - a[1].v);
  const sectorTv = sectorRows.reduce((a, r) => a + r[1].v, 0) || 1;
  const sectorMx = Math.max(...sectorRows.map((r) => Math.max(r[1].v, r[1].i)), 1);
  const colors = ['#6FA8FF', '#A08CF5', '#43C6C0', '#D9B45B', '#F07B3F', '#E58FB8', '#8FD3E5', '#9BD88F', '#E5A98F', '#C8B560'];

  // simple invested-vs-value timeline (yearly points from earliest buy date to now)
  const dates = holdings.map((h) => h.date).filter(Boolean) as string[];
  let timeline: [string, number][] = [];
  let timelineInv: [string, number][] = [];
  if (dates.length) {
    const first = new Date(Math.min(...dates.map((d) => new Date(d).getTime())));
    const months: Date[] = [];
    const cur = new Date(first.getFullYear(), first.getMonth(), 1);
    const end = new Date();
    while (cur <= end) { months.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1); }
    const sampled = months.filter((_, i) => i % Math.max(1, Math.ceil(months.length / 36)) === 0);
    timeline = sampled.map((m) => {
      const upTo = holdings.filter((h) => h.date && new Date(h.date) <= m);
      const v = sum(upTo.map((h) => enrich(h, settings)), 'value');
      return [m.toISOString().slice(0, 10), v];
    });
    timelineInv = sampled.map((m) => {
      const upTo = holdings.filter((h) => h.date && new Date(h.date) <= m);
      const inv = sum(upTo.map((h) => enrich(h, settings)), 'inv');
      return [m.toISOString().slice(0, 10), inv];
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
      <section className="panel pad" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div className="eyebrow">Desk note · {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <h2 style={{ fontSize: 19, marginTop: 6 }}>{nH ? `${nH} item${nH > 1 ? 's' : ''} need action` : 'Nothing urgent today'}{nM ? ` · ${nM} to review` : ''}</h2>
          <div className="sub" style={{ marginTop: 4 }}>Checks recalculate from your holdings, SIPs and watchlist every time you open this tab.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['high', 'med', 'info', 'good'] as const).map((s) => (
            <div className="tile" style={{ minWidth: 74, alignItems: 'center' }} key={s}>
              <div className="v">{F.filter((f) => f.sev === s).length}</div>
              <span className={`badge ${sevB[s][1]}`}>{sevB[s][0]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid2" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,460px),1fr))' }}>
        <div className="panel pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="ph"><h2>Invested vs current value</h2><span className="sub">Sampled monthly since first purchase</span></div>
          {timeline.length >= 2 ? (
            <>
              <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--muted)', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 14, height: 2, background: 'var(--accent)' }} />Portfolio value</span>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 14, height: 0, borderTop: '2px dashed #8B98A5' }} />Cumulative invested</span>
              </div>
              <LineChart points={timeline} points2={timelineInv} color="#D9B45B" color2="#8B98A5" height={200} fmt={(v) => inr(v)} />
            </>
          ) : <p className="sub">Add holdings with dates to see this chart.</p>}
          <p className="note" style={{ margin: 0 }}>Simplified local estimate using today&apos;s price projected across months — not a full historical reconstruction.</p>
        </div>
        <div className="panel pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="ph"><h2>By sector &amp; theme</h2><span className="sub">Current value vs amount invested</span></div>
          <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--muted)' }}>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span className="sw" style={{ background: 'var(--accent)' }} />Current value</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ width: 2, height: 12, background: 'var(--text)' }} />Invested</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sectorRows.map(([k, r], idx) => {
              const pl = r.i ? (r.v / r.i - 1) * 100 : 0;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,150px) minmax(0,1fr) auto', gap: 10, alignItems: 'center', fontSize: 12.5 }} key={k}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={`${k} · ${r.n} holding${r.n > 1 ? 's' : ''}`}>{k} <span className="muted mono" style={{ fontSize: 10.5 }}>{r.n}</span></span>
                  <div style={{ position: 'relative', height: 14, background: 'var(--line)', borderRadius: 3 }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${((r.v / sectorMx) * 100).toFixed(1)}%`, background: colors[idx % colors.length], borderRadius: 3, opacity: 0.9 }} />
                    <div title={`Invested ${inr(r.i)}`} style={{ position: 'absolute', top: -3, bottom: -3, left: `calc(${((r.i / sectorMx) * 100).toFixed(1)}% - 1px)`, width: 2, background: 'var(--text)' }} />
                  </div>
                  <span className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{((r.v / sectorTv) * 100).toFixed(1)}% <span className={cls(pl)} style={{ fontSize: 11 }}>{pct(pl)}</span></span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="hhead">
          <h2>Analyst&apos;s note for today</h2>
          <button className="btn sm primary" disabled title="Open this page in Claude.ai to generate">Write today&apos;s note</button>
        </div>
        <div style={{ padding: '0 16px 18px' }}>
          <div className="thinking" style={{ borderStyle: 'dashed' }}>
            The written desk note is generated by Claude from the figures on this page and is only available inside Claude.ai. The automated checks below work fully without it.
          </div>
          <p className="note" style={{ margin: '10px 0 0' }}>Not SEBI-registered advice.</p>
        </div>
      </section>

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="hhead"><h2>Automated checks <span className="muted" style={{ fontWeight: 400 }}>· {F.length}</span></h2><span className="sub">Rules of thumb, computed locally</span></div>
        {F.map((f, i) => (
          <div className="frow" key={i}>
            <span className={`badge sev ${sevB[f.sev][1]}`}>{sevB[f.sev][0]}</span>
            <div>
              <div className="t">{f.title}</div>
              <div className="d">{f.detail}</div>
              <div className="sub" style={{ marginTop: 4, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.06em' }}>{f.tag}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="panel pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="ph"><h2>Any queries? Ask your analyst</h2></div>
        <div className="thinking" style={{ borderStyle: 'dashed' }}>
          The AI chat assistant runs on Claude inside Claude.ai and is unavailable in this standalone app.
        </div>
        <form className="ask">
          <textarea className="inp" rows={2} placeholder="Available when this page is opened in Claude" disabled />
          <button className="btn primary" disabled>Ask</button>
        </form>
      </section>
    </div>
  );
}
