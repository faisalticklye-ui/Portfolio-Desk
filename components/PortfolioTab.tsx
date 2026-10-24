'use client';
import React, { useMemo, useState } from 'react';
import {
  EnrichedHolding,
  Holding,
  Settings,
  SipLog,
  TYPE_ORDER,
  TYPES,
} from '../lib/types';
import { brokerCol, cls, fmtDate, inr, num, pct, sInr } from '../lib/format';
import {
  enrich,
  fxRate,
  heldStr,
  nextSip,
  pendingSips,
  sipCount,
  sipId,
  sipMonthly,
  sum,
  xirr,
  flowsFor,
  hName,
} from '../lib/calc';

const CUR_SYM: Record<string, string> = { INR: '₹', USD: '$', GBP: '£' };

function N(v: unknown): number | null {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && isFinite(+v)) return +v;
  return null;
}

export default function PortfolioTab({
  holdings,
  setHoldings,
  settings,
  setSettings,
  sipLog,
  setSipLog,
  onAdd,
  onEdit,
  toast,
}: {
  holdings: Holding[];
  setHoldings: (f: (h: Holding[]) => Holding[]) => void;
  settings: Settings;
  setSettings: (f: (s: Settings) => Settings) => void;
  sipLog: SipLog;
  setSipLog: (f: (s: SipLog) => SipLog) => void;
  onAdd: (type?: string) => void;
  onEdit: (id: string) => void;
  toast: (m: string) => void;
}) {
  const [typeF, setTypeF] = useState('All');
  const [brokerF, setBrokerF] = useState('All');
  const [modeF, setModeF] = useState('All');
  const [delId, setDelId] = useState<string | null>(null);
  const [convAmt, setConvAmt] = useState('1000');
  const [convFrom, setConvFrom] = useState<'INR' | 'USD' | 'KWD'>('INR');
  const [sipDraft, setSipDraft] = useState<Record<string, Record<string, string>>>({});
  const [sipErr, setSipErr] = useState<Record<string, string>>({});

  const all: EnrichedHolding[] = useMemo(() => holdings.map((h) => enrich(h, settings)), [holdings, settings]);
  const tv = sum(all, 'value');
  const ti = sum(all, 'inv');
  const tp = tv - ti;
  const td = sum(all, 'day');
  const x = xirr(flowsFor(all)) * 100;
  const sipAll = all.filter((h) => h.mode === 'SIP' && h.sipStatus !== 'Paused');
  const sipMo = sipAll.reduce((a, h) => a + sipMonthly(h) * fxRate(h.currency, settings), 0);
  const counts = TYPE_ORDER.map((t) => [t, all.filter((h) => h.type === t).length] as const).filter((c) => c[1]);
  const samples = holdings.some((h) => h.sample);

  const stats: [string, string, string, string, string?][] = [
    ['Current value', inr(tv), '', 'Invested ' + inr(ti)],
    ["Day's change", sInr(td), cls(td), tv - td ? pct((td / (tv - td)) * 100) : '—', cls(td)],
    ['Total P&L', sInr(tp), cls(tp), (ti ? pct((tp / ti) * 100) : '—') + ' absolute', cls(tp)],
    ['XIRR', isFinite(x) ? pct(x).replace('+', '') : '—', isFinite(x) ? cls(x) : '', 'Annualised · approx.'],
    ['Monthly SIPs', inr(sipMo), '', sipAll.length + ' active SIP' + (sipAll.length === 1 ? '' : 's')],
    ['Holdings', String(all.length), '', counts.map(([t, n]) => n + ' ' + (t === 'mf' ? 'MF' : t === 'btc' ? 'BTC' : TYPES[t].one.toLowerCase())).join(' · ') || 'none yet'],
  ];

  const C = 2 * Math.PI * 44;
  let acc = 0;
  const alloc = TYPE_ORDER.map((t) => ({ t, v: sum(all.filter((h) => h.type === t), 'value') })).filter((a) => a.v > 0);
  const donut = alloc.map((a) => {
    const f = a.v / (tv || 1);
    const len = f * C;
    const el = (
      <circle key={a.t} cx={60} cy={60} r={44} fill="none" stroke={TYPES[a.t].hex} strokeWidth={16} strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`} strokeDashoffset={-acc} />
    );
    acc += len;
    return el;
  });

  const brokers = [...new Set(all.map((h) => h.broker || '—'))]
    .map((b) => {
      const hs = all.filter((a) => (a.broker || '—') === b);
      const v = sum(hs, 'value');
      const i = sum(hs, 'inv');
      return { b, v, p: v - i, pp: i ? ((v - i) / i) * 100 : 0, n: hs.length };
    })
    .sort((a, b) => b.v - a.v);
  const sipV = sum(all.filter((h) => h.mode === 'SIP'), 'value');
  const lumpV = tv - sipV;
  const sipI = sum(all.filter((h) => h.mode === 'SIP'), 'inv');
  const lumpI = ti - sipI;
  const brokerList = [...new Set(holdings.map((h) => h.broker).filter(Boolean))];

  const vis = all.filter((h) => (typeF === 'All' || h.type === typeF) && (brokerF === 'All' || h.broker === brokerF) && (modeF === 'All' || h.mode === modeF));
  const groups = TYPE_ORDER.filter((t) => typeF === 'All' || typeF === t)
    .map((t) => ({ t, rows: vis.filter((h) => h.type === t) }))
    .filter((g) => g.rows.length || typeF === g.t);

  function deleteHolding(id: string) {
    const h = holdings.find((x) => x.id === id);
    setHoldings((hs) => hs.filter((x) => x.id !== id));
    setDelId(null);
    toast('Deleted ' + (h ? h.sym || h.name : 'holding'));
  }
  function clearSamples() {
    setHoldings((hs) => hs.filter((h) => !h.sample));
    toast('Sample holdings cleared');
  }

  // SIP schedule
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sipList = all
    .filter((h) => h.mode === 'SIP')
    .map((h) => ({ h, d: nextSip(h, today) }))
    .sort((a, b) => (a.d ? a.d.getTime() : 9e15) - (b.d ? b.d.getTime() : 9e15));
  const sipMoActive = sipList.filter((x) => x.d).reduce((a, x) => a + sipMonthly(x.h) * fxRate(x.h.currency, settings), 0);

  // movers
  const moversAll = all
    .filter((h) => isFinite(h.dayPct))
    .map((h) => ({ n: h.type === 'mf' || h.type === 'gold' ? h.name : h.sym || h.name, p: h.dayPct, pr: h.p, cs: CUR_SYM[h.currency] || '₹' }))
    .sort((a, b) => b.p - a.p);
  const up = moversAll.filter((x) => x.p >= 0).slice(0, 5);
  const dn = moversAll.filter((x) => x.p < 0).reverse().slice(0, 5);

  // SIP approvals
  const pend = pendingSips(holdings, sipLog);

  function sipCalc(h: Holding, dr: Record<string, string>) {
    const amt = N(dr.amt);
    const nav = N(dr.nav);
    const units = N(dr.units);
    const chg = N(dr.chg) || 0;
    const cs = CUR_SYM[h.currency] || '₹';
    const u = units ?? (amt && nav ? (amt - chg) / nav : null);
    const q = +(h.qty || 0);
    const avg = +(h.avg || 0);
    if (!u || !amt) return 'Enter units (or the NAV and units will be worked out) to preview the update.';
    const nq = q + u;
    const navg = (q * avg + amt) / nq;
    return `${units == null ? 'Est. units ' + num(u, 4) + ' · ' : ''}Holding after approval: ${num(q, 3)} → ${num(nq, 3)} units · Avg cost ${cs}${num(avg, 2)} → ${cs}${num(navg, 2)} · Invested +${cs}${num(amt, 2)}`;
  }

  function approveSip(id: string, status: 'approved' | 'skipped') {
    const P = pend.find((x) => x.id === id);
    if (!P) return;
    const h = holdings.find((x) => x.id === P.h.id);
    if (!h) return;
    const dr = sipDraft[id] || {};
    if (status === 'skipped') {
      setSipLog((s) => ({ entries: { ...s.entries, [id]: { hid: h.id, name: hName(h), due: P.due, status: 'skipped', notes: dr.notes || '', at: new Date().toISOString() } } }));
      toast('Marked as not processed');
      return;
    }
    const amt = N(dr.amt);
    const chg = N(dr.chg) || 0;
    let nav = N(dr.nav);
    let units = N(dr.units);
    if (!(amt && amt > 0)) { setSipErr((e) => ({ ...e, [id]: 'Enter the SIP amount.' })); return; }
    if (!(units && units > 0) && nav && nav > 0) units = +(((amt - chg) / nav).toFixed(4));
    if (!(units && units > 0)) { setSipErr((e) => ({ ...e, [id]: 'Enter the units allotted (or the NAV/price so units can be worked out).' })); return; }
    if (!(nav && nav > 0)) nav = +(((amt - chg) / units).toFixed(4));
    const q = +(h.qty || 0);
    const avg = +(h.avg || 0);
    const nq = +((q + units).toFixed(6));
    const navg = +(((q * avg + amt) / nq).toFixed(4));
    setSipLog((s) => ({
      entries: {
        ...s.entries,
        [id]: { hid: h.id, name: hName(h), due: P.due, status: 'approved', amt, units: units as number, nav: nav as number, chg, date: dr.date || '', ref: dr.ref || '', notes: dr.notes || '', prev: { qty: q, avg }, next: { qty: nq, avg: navg }, at: new Date().toISOString() },
      },
    }));
    setHoldings((hs) => hs.map((x) => (x.id !== h.id ? x : { ...x, qty: nq, avg: navg })));
    setSipDraft((d) => { const n = { ...d }; delete n[id]; return n; });
    setSipErr((e) => { const n = { ...e }; delete n[id]; return n; });
    toast('Approved · ' + num(units as number, 4) + ' units added to ' + hName(h));
  }

  const chip = (grp: 'type' | 'broker' | 'mode', val: string, label: string, cur: string, set: (v: string) => void) => (
    <button key={val} className="chip" aria-pressed={cur === val} onClick={() => set(val)}>
      {label}
    </button>
  );

  const typeHdr: Record<string, [string, string, string, string]> = {
    stock: ['Symbol · Qty @ Avg', 'LTP · Day', 'Invested', 'Value · P&L'],
    mf: ['Fund · Units @ Avg NAV', 'NAV · Day', 'Invested', 'Value · P&L'],
    etf: ['ETF · Units @ Avg', 'LTP · Day', 'Invested', 'Value · P&L'],
    gold: ['Holding · Grams @ Avg', 'Price /g', 'Invested', 'Value · P&L'],
    btc: ['Holding · BTC @ Avg', 'Price /BTC', 'Invested', 'Value · P&L'],
  };

  const fxConv = settings.fx;
  const fxMap: Record<string, number> = { INR: fxConv.usdInr, USD: 1, KWD: fxConv.usdKwd };
  const fxNames: Record<string, [string, string, number]> = { INR: ['Indian Rupee', '₹', 2], USD: ['US Dollar', '$', 2], KWD: ['Kuwaiti Dinar', 'KD ', 3] };
  const amt = parseFloat(convAmt) || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
      {samples && (
        <div className="banner">
          <span>
            You&apos;re looking at <b>sample holdings</b> (marked <span className="tag sample">SAMPLE</span>). Edit them into your real positions, or clear them and add your own with <b>+</b>.
          </span>
          <button className="btn sm" onClick={clearSamples}>Clear sample holdings</button>
        </div>
      )}

      <section className="stats">
        {stats.map((s, i) => (
          <div className="stat" key={i}>
            <div className="l">{s[0]}</div>
            <div className={`v ${s[2]}`}>{s[1]}</div>
            <div className={`s ${s[4] || ''}`}>{s[3]}</div>
          </div>
        ))}
      </section>

      {/* SIP approvals */}
      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="hhead">
          <h2>SIP approvals {pend.length ? <span className="badge b-acc" style={{ marginLeft: 6 }}>{pend.length} pending</span> : null}</h2>
          <span className="sub">A box appears the day after each SIP date</span>
        </div>
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pend.length === 0 && <div className="thinking" style={{ borderStyle: 'dashed' }}>Nothing to approve.</div>}
          {pend.map(({ h, due, id }) => {
            const dr = sipDraft[id] || { amt: String(h.sipAmt ?? ''), date: '', nav: '', units: '', chg: '', ref: '', notes: '' };
            const cs = CUR_SYM[h.currency] || '₹';
            const err = sipErr[id];
            const unitLab = h.type === 'gold' ? 'Grams allotted' : h.type === 'btc' ? 'BTC bought' : h.type === 'stock' ? 'Shares bought' : 'Units allotted';
            const navLab = h.type === 'mf' ? 'NAV applied' : 'Price per unit';
            const upd = (k: string, v: string) => setSipDraft((d) => ({ ...d, [id]: { ...dr, [k]: v } }));
            return (
              <div className="sipbox" key={id}>
                <div className="top">
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 14 }}>{hName(h)}</b>
                      <span className="tag" style={{ color: brokerCol(h.broker) }}>{h.broker}</span>
                      <span className="tag sip">SIP</span>
                    </div>
                    <div className="sub" style={{ marginTop: 3 }}>
                      Instalment due {fmtDate(due)} · confirm what your broker actually allotted
                    </div>
                  </div>
                  <span className="badge b-acc">Awaiting approval</span>
                </div>
                <div className="fgrid">
                  <div className="f"><label>SIP amount ({cs})</label><input className="inp mono" type="number" value={dr.amt} onChange={(e) => upd('amt', e.target.value)} /></div>
                  <div className="f"><label>Allotment date</label><input className="inp" type="date" value={dr.date} onChange={(e) => upd('date', e.target.value)} /></div>
                  <div className="f"><label>{navLab} ({cs})</label><input className="inp mono" type="number" placeholder="from contract note" value={dr.nav} onChange={(e) => upd('nav', e.target.value)} /></div>
                  <div className="f"><label>{unitLab}</label><input className="inp mono" type="number" placeholder="from contract note" value={dr.units} onChange={(e) => upd('units', e.target.value)} /></div>
                  <div className="f"><label>Stamp duty / charges ({cs})</label><input className="inp mono" type="number" placeholder="optional" value={dr.chg} onChange={(e) => upd('chg', e.target.value)} /></div>
                  <div className="f"><label>Order / folio ref</label><input className="inp" placeholder="optional" value={dr.ref} onChange={(e) => upd('ref', e.target.value)} /></div>
                </div>
                <div className="f"><label>Notes</label><input className="inp" placeholder="optional" value={dr.notes} onChange={(e) => upd('notes', e.target.value)} /></div>
                <div className="calc">{sipCalc(h, dr)}</div>
                {err && <div className="note" style={{ color: 'var(--bad)' }}>{err}</div>}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button className="btn sm ghost" onClick={() => approveSip(id, 'skipped')}>Mark not processed</button>
                  <button className="btn sm primary" onClick={() => approveSip(id, 'approved')}>Approve &amp; add to holding</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid3">
        <div className="panel pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="ph"><h2>Asset allocation</h2><span className="sub">By holding type</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center' }}>
            <svg viewBox="0 0 120 120" width={128} height={128} style={{ flex: 'none', transform: 'rotate(-90deg)' }} aria-hidden="true">
              <circle cx={60} cy={60} r={44} fill="none" stroke="#1F2833" strokeWidth={16} />
              {donut}
            </svg>
            <div style={{ flex: 1, minWidth: 170, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alloc.length ? alloc.map((a) => (
                <div className="legend-row" key={a.t}>
                  <span className="sw" style={{ background: TYPES[a.t].hex }} />
                  <span style={{ flex: 1, color: 'var(--text2)' }}>{TYPES[a.t].label}</span>
                  <span className="mono muted" style={{ fontSize: 12 }}>{inr(a.v)}</span>
                  <span className="mono" style={{ width: 50, textAlign: 'right' }}>{((a.v / (tv || 1)) * 100).toFixed(1)}%</span>
                </div>
              )) : <span className="sub">Add a holding to see your mix.</span>}
            </div>
          </div>
        </div>
        <div className="panel pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="ph"><h2>Broker split</h2><span className="sub">Current value</span></div>
          <div className="bar">{brokers.map((b) => <div key={b.b} style={{ flex: b.v || 0.0001, background: brokerCol(b.b) }} />)}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {brokers.map((b) => (
              <div className="kv" style={{ paddingInline: 0, fontFamily: 'var(--sans)', fontSize: 13, alignItems: 'center' }} key={b.b}>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center', minWidth: 0 }}>
                  <span className="sw" style={{ background: brokerCol(b.b) }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.b}</span>
                  <span className="muted mono" style={{ fontSize: 11 }}>{b.n}</span>
                </span>
                <span className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {inr(b.v)} <span className={cls(b.p)} style={{ fontSize: 11 }}>{pct(b.pp)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="panel pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="ph"><h2>SIP vs Lumpsum</h2><span className="sub">How the money went in</span></div>
          <div className="bar">
            <div style={{ flex: sipV || 0.0001, background: 'var(--good)' }} />
            <div style={{ flex: lumpV || 0.0001, background: 'var(--text2)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[['SIP', sipV, sipI, 'var(--good)', all.filter((h) => h.mode === 'SIP').length], ['Lumpsum', lumpV, lumpI, 'var(--text2)', all.filter((h) => h.mode !== 'SIP').length]].map(([l, v, i, c, n]) => (
              <div className="tile" key={l as string}>
                <div className="l" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span className="sw" style={{ background: c as string }} />{l as string} · {n as number}</div>
                <div className="v">{inr(v as number)}</div>
                <div className={`mono ${cls((v as number) - (i as number))}`} style={{ fontSize: 12 }}>{sInr((v as number) - (i as number))} · {(i as number) ? pct(((v as number) - (i as number)) / (i as number) * 100) : '—'}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="filters">
        <div className="chips"><span className="flabel">Type</span>{chip('type', 'All', 'All types', typeF, setTypeF)}{TYPE_ORDER.map((t) => chip('type', t, TYPES[t].label, typeF, setTypeF))}</div>
        <div className="chips"><span className="flabel">Broker</span>{chip('broker', 'All', 'All brokers', brokerF, setBrokerF)}{brokerList.map((b) => chip('broker', b!, b!, brokerF, setBrokerF))}</div>
        <div className="chips"><span className="flabel">Mode</span>{chip('mode', 'All', 'SIP + Lumpsum', modeF, setModeF)}{chip('mode', 'SIP', 'SIP only', modeF, setModeF)}{chip('mode', 'Lumpsum', 'Lumpsum only', modeF, setModeF)}</div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {groups.length ? groups.map((g) => {
          const v = sum(g.rows, 'value');
          const p = v - sum(g.rows, 'inv');
          const hdr = typeHdr[g.t];
          return (
            <div className="panel hcard" key={g.t}>
              <div className="hhead">
                <h2><span className="sw" style={{ background: TYPES[g.t].hex }} />{TYPES[g.t].label} <span className="muted" style={{ fontWeight: 400 }}>· {g.rows.length}</span></h2>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className={`mono ${cls(p)}`} style={{ fontSize: 12 }}>{inr(v)} · {sInr(p)}</span>
                  <button className="btn sm ghost" onClick={() => onAdd(g.t)}>+ Add</button>
                </span>
              </div>
              <div className="hscroll">
                <div className="htable">
                  <div className="hrow head"><span>{hdr[0]}</span><span style={{ textAlign: 'right' }}>{hdr[1]}</span><span style={{ textAlign: 'right' }}>{hdr[2]}</span><span style={{ textAlign: 'right' }}>{hdr[3]}</span><span /></div>
                  {g.rows.length ? g.rows.map((h) => {
                    const cs = CUR_SYM[h.currency] || '₹';
                    const title = h.type === 'stock' || h.type === 'etf' ? h.sym || h.name : h.name;
                    const subName = (h.type === 'stock' || h.type === 'etf') && h.name && h.name !== h.sym ? h.name : '';
                    const qtyS = h.type === 'btc' ? num(+h.qty, 6) + ' BTC' : h.type === 'gold' ? num(+h.qty, 2) + ' g' : h.type === 'mf' ? num(+h.qty, 3) + ' u' : num(+h.qty, 0);
                    const meta: string[] = [qtyS + ' @ ' + cs + num(+h.avg, 2)];
                    if (h.type === 'mf') meta.push([h.category, h.plan].filter(Boolean).join(' · '));
                    if (h.type === 'gold') meta.push([h.form, h.purity].filter(Boolean).join(' · '));
                    if ((h.type === 'stock' || h.type === 'etf') && h.exchange) meta.push(h.exchange + (h.sector ? ' · ' + h.sector : h.underlying ? ' · ' + h.underlying : ''));
                    if (h.mode === 'SIP') meta.push(cs + num(+(h.sipAmt || 0)) + ' ' + (h.sipFreq || 'Monthly').toLowerCase() + ' · ' + sipCount(h) + ' instalments');
                    else if (h.date) meta.push('Bought ' + fmtDate(h.date));
                    const modeTag = h.mode === 'SIP' ? (h.sipStatus === 'Paused' ? <span className="tag paused">SIP · PAUSED</span> : <span className="tag sip">SIP</span>) : <span className="tag lump">LUMPSUM</span>;
                    const dayS = isFinite(h.dayPct) ? <span className={cls(h.dayPct)}>{pct(h.dayPct)}</span> : <span className="muted">{h.useRef ? 'market ref' : '—'}</span>;
                    return (
                      <div className="hrow" key={h.id}>
                        <div className="hname">
                          <div className="t">
                            <span className="n">{title}</span>
                            <span className="tag" style={{ color: brokerCol(h.broker) }}>{h.broker || '—'}</span>
                            {modeTag}
                            {h.sample && <span className="tag sample">SAMPLE</span>}
                          </div>
                          {subName && <div className="m" style={{ fontFamily: 'var(--sans)' }}>{subName}</div>}
                          <div className="m">{meta.join(' · ')}</div>
                        </div>
                        <div className="r"><span>{cs}{num(h.p, h.type === 'btc' ? 0 : 2)}</span>{dayS}</div>
                        <div className="r"><span>{inr(h.inv)}</span><span className="muted">{h.held > 0 ? heldStr(h.held) : ''}</span></div>
                        <div className="r"><span>{inr(h.value)}</span><span className={cls(h.pnl)}>{sInr(h.pnl)} {pct(h.pnlPct)}</span></div>
                        <div className="acts">
                          <button className="icon-btn" aria-label={`Edit ${title}`} title="Edit" onClick={() => onEdit(h.id)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>
                          </button>
                          <button className="icon-btn del" aria-label={`Delete ${title}`} title="Delete" onClick={() => setDelId(h.id)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                          </button>
                        </div>
                        {delId === h.id && (
                          <div className="confirm">
                            <span>Delete <b>{title}</b> ({h.broker || ''})? This can&apos;t be undone.</span>
                            <span style={{ display: 'flex', gap: 8 }}>
                              <button className="btn sm" onClick={() => setDelId(null)}>Keep it</button>
                              <button className="btn sm danger" onClick={() => deleteHolding(h.id)}>Delete</button>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }) : (
                    <div className="empty">No {TYPES[g.t].label.toLowerCase()} yet. <button className="btn sm" style={{ marginLeft: 6 }} onClick={() => onAdd(g.t)}>+ Add {TYPES[g.t].one.toLowerCase()}</button></div>
                  )}
                </div>
              </div>
            </div>
          );
        }) : <div className="panel empty">No holdings match these filters.</div>}
      </section>

      {/* SIP schedule */}
      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="hhead"><h2>SIP schedule</h2><span className="mono muted" style={{ fontSize: 12 }}>{inr(sipMoActive)} / month · {sipList.filter((x) => x.d).length} active</span></div>
        {sipList.length ? sipList.map(({ h, d }) => {
          const days = d ? Math.round((d.getTime() - today.getTime()) / 864e5) : null;
          const cs = CUR_SYM[h.currency] || '₹';
          const when = d == null ? 'Paused' : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days} days`;
          const soon = d != null && days! <= 3;
          const freq = h.sipFreq === 'Weekly' ? 'every ' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][+(h.sipWeekday ?? '1')] : (h.sipFreq === 'Quarterly' ? 'quarterly' : 'monthly') + ' on day ' + (h.sipDay || 1);
          return (
            <div className="siprow" key={h.id} style={{ opacity: d ? 1 : 0.55 }}>
              <div className={`cal ${soon ? 'soon' : ''}`}><b>{d ? d.getDate() : '—'}</b><span>{d ? d.toLocaleDateString('en-IN', { month: 'short' }) : 'paused'}</span></div>
              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  {h.type === 'stock' || h.type === 'etf' ? h.sym || h.name : h.name}
                  <span className="tag" style={{ color: TYPES[h.type].hex }}>{TYPES[h.type].one.toUpperCase()}</span>
                </span>
                <span className="sub">{h.broker || ''} · {freq}{+(h.stepUp || 0) ? ` · step-up ${h.stepUp}%/yr` : ''}</span>
              </div>
              <div className="r" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 3, fontFamily: 'var(--mono)' }}>
                <span style={{ fontSize: 14 }}>{cs}{num(+(h.sipAmt || 0))}</span>
                <span style={{ fontSize: 11, color: soon ? 'var(--accent)' : 'var(--muted)' }}>{when}</span>
              </div>
            </div>
          );
        }) : <div className="empty">No SIPs yet. When you add a holding, choose <b>SIP</b> as the investment mode.</div>}
      </section>

      {/* movers */}
      <section className="grid2" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,280px),1fr))' }}>
        {[
          ['My gainers today', 'var(--good)', 'Holdings with a previous close', up, 'No holding with a previous close is up.'],
          ['My losers today', 'var(--bad)', 'Holdings with a previous close', dn, 'No holding with a previous close is down.'],
        ].map(([title, col, sub, items, empty], idx) => (
          <div className="panel pad" style={{ display: 'flex', flexDirection: 'column', gap: 4 }} key={idx}>
            <div className="ph" style={{ marginBottom: 6 }}><h2 style={{ color: col as string, fontSize: 14 }}>{title as string}</h2><span className="sub">{sub as string}</span></div>
            {(items as typeof up).length ? (items as typeof up).map((it, i) => (
              <div className="mover" key={i}>
                <span className="n">{it.n}</span>
                <span className="mono muted" style={{ fontSize: 12 }}>{it.cs}{num(it.pr, 2)}</span>
                <span className={`pctbox ${it.p >= 0 ? 'up' : 'dn'}`}>{pct(it.p)}</span>
              </div>
            )) : <div className="sub" style={{ padding: '8px 0' }}>{empty as string}</div>}
          </div>
        ))}
      </section>

      {/* FX */}
      <section className="panel pad grid2" style={{ gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="ph"><h2>Currency</h2><span className="sub">Rates set {settings.ref.at ? fmtDate(settings.ref.at) : 'as sample — update them'}</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
            <div className="tile"><div className="l">USD → INR</div><div className="v">₹{num(fxConv.usdInr, 2)}</div></div>
            <div className="tile"><div className="l">KWD → INR</div><div className="v">₹{num(fxConv.usdInr / fxConv.usdKwd, 2)}</div></div>
            <div className="tile"><div className="l">KWD → USD</div><div className="v">${num(1 / fxConv.usdKwd, 3)}</div></div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2>Converter</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input className="inp mono" type="number" value={convAmt} onChange={(e) => setConvAmt(e.target.value)} style={{ flex: 1, minWidth: 130, fontSize: 18 }} aria-label="Amount to convert" />
            <div className="seg" style={{ flex: 'none' }}>
              {(['INR', 'USD', 'KWD'] as const).map((c) => (
                <button key={c} aria-pressed={convFrom === c} className="mono" onClick={() => setConvFrom(c)}>{c}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(['INR', 'USD', 'KWD'] as const).filter((c) => c !== convFrom).map((c) => (
              <div className="kv" style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '12px 14px', fontFamily: 'var(--sans)', alignItems: 'baseline' }} key={c}>
                <span className="muted" style={{ fontSize: 13 }}>{fxNames[c][0]}</span>
                <span className="mono" style={{ fontSize: 19, fontWeight: 500 }}>{fxNames[c][1]}{(amt / fxMap[convFrom] * fxMap[c]).toLocaleString('en-IN', { minimumFractionDigits: fxNames[c][2], maximumFractionDigits: fxNames[c][2] })}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
