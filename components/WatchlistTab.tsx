'use client';
import React, { useState } from 'react';
import { Holding, WatchItem } from '../lib/types';
import { fmtDate, num, todayISO } from '../lib/format';

const EXCH_LIST = ['NSE', 'BSE', 'NASDAQ', 'NYSE', 'NYSE Arca', 'LSE', 'Other'];
const CUR_SYM: Record<string, string> = { NSE: '₹', BSE: '₹', NASDAQ: '$', NYSE: '$', 'NYSE Arca': '$', LSE: '£', Other: '₹' };

export default function WatchlistTab({
  watch,
  setWatch,
  holdings,
  toast,
}: {
  watch: WatchItem[];
  setWatch: (f: (w: WatchItem[]) => WatchItem[]) => void;
  holdings: Holding[];
  toast: (m: string) => void;
}) {
  const [t, setT] = useState('');
  const [ex, setEx] = useState('NSE');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [wDel, setWDel] = useState<string | null>(null);
  const [ltpEdits, setLtpEdits] = useState<Record<string, string>>({});

  const wKey = (w: WatchItem) => w.t + ':' + w.ex;

  function addWatch(tv: string, exv: string, nv: string, pv: string) {
    const tt = String(tv || '').trim().toUpperCase().replace(/\s+/g, '');
    if (!tt) return 'Enter a ticker symbol.';
    if (!/^[A-Z0-9&.\-_^]{1,20}$/.test(tt)) return 'Tickers use letters, numbers, &, . or - only.';
    if (watch.some((w) => w.t === tt && w.ex === exv)) return `${tt} on ${exv} is already on your watchlist.`;
    const p = pv ? parseFloat(pv) : null;
    setWatch((ws) => [{ t: tt, ex: exv, name: String(nv || '').trim(), ltp: p && p > 0 ? p : null, ltpAt: p ? todayISO() : null, added: todayISO() }, ...ws]);
    setOpen((o) => ({ ...o, [tt + ':' + exv]: true }));
    toast(`${tt} added to watchlist`);
    return null;
  }

  function handleAdd() {
    const e = addWatch(t, ex, name, price);
    if (e) { setErr(e); return; }
    setErr(''); setT(''); setName(''); setPrice('');
  }

  const have = new Set(watch.map((w) => w.t));
  const quick = [...new Set(
    holdings
      .filter((h) => (h.type === 'stock' || h.type === 'etf') && h.sym && !have.has((h.quoteSym && !h.quoteSym.includes('.') ? h.quoteSym : h.sym).toUpperCase()))
      .map((h) => (h.quoteSym && !h.quoteSym.includes('.') ? h.quoteSym : h.sym!).toUpperCase() + '|' + (h.exchange || 'NSE') + '|' + (h.name || ''))
  )].slice(0, 12);

  function saveLtp(k: string, w: WatchItem) {
    const v = ltpEdits[k];
    const n = v !== undefined ? parseFloat(v) : null;
    setWatch((ws) => ws.map((x) => (wKey(x) === k ? { ...x, ltp: n && n > 0 ? n : null, ltpAt: n && n > 0 ? todayISO() : null } : x)));
    toast(n && n > 0 ? `Price saved for ${w.t}` : 'Price cleared');
  }

  function removeWatch(k: string) {
    const w = watch.find((x) => wKey(x) === k);
    setWatch((ws) => ws.filter((x) => wKey(x) !== k));
    setWDel(null);
    toast('Removed ' + (w ? w.t : ''));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
      <section className="panel pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="ph"><h2>Add a ticker to watch</h2><span className="sub">Indian (NSE/BSE) and international listings</span></div>
        <form className="wadd" onSubmit={(e) => { e.preventDefault(); handleAdd(); }}>
          <div className="f"><label>Ticker <span className="req" style={{ color: 'var(--accent)' }}>*</span></label><input className="inp mono" style={{ textTransform: 'uppercase' }} placeholder="Symbol or company" value={t} onChange={(e) => { setT(e.target.value); setErr(''); }} /></div>
          <div className="f"><label>Exchange</label><select className="inp" value={ex} onChange={(e) => setEx(e.target.value)}>{EXCH_LIST.map((o) => <option key={o}>{o}</option>)}</select></div>
          <div className="f wide"><label>Company name <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label><input className="inp" placeholder="e.g. Tata Consultancy Services" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="f"><label>Current price <span className="muted" style={{ fontWeight: 400 }}>(recommended)</span></label><input className="inp mono" type="number" placeholder="LTP today" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          <button className="btn primary" type="submit" style={{ minHeight: 40 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Add
          </button>
        </form>
        {err && <div className="sub" style={{ color: 'var(--bad)' }}>{err}</div>}
        {quick.length > 0 && (
          <div className="chips">
            <span className="flabel">From holdings</span>
            {quick.map((q) => {
              const [qt, qex, qn] = q.split('|');
              return <button className="chip" key={q} onClick={() => addWatch(qt, qex, qn, '')}>+ {qt}</button>;
            })}
          </div>
        )}
        <div className="banner" style={{ background: 'transparent' }}>
          <span>AI-powered fundamentals lookup and stock analysis run on Claude from inside the original Claude.ai artifact page and are not available in this standalone app. Manual price entry and watchlist tracking work fully below.</span>
        </div>
      </section>

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="hhead"><h2>Fundamentals scorecard</h2></div>
        <div style={{ padding: '14px 16px' }}>
          <div className="thinking" style={{ borderStyle: 'dashed' }}>
            Fundamentals (P/E, ROIC, D/E, EPS growth, ROE, margins) are normally filled by Claude&apos;s AI lookup or a nightly web sync — both unavailable here. This section is disabled.
          </div>
        </div>
      </section>

      <section className="panel" style={{ overflow: 'hidden' }}>
        <div className="hhead"><h2>Watchlist <span className="muted" style={{ fontWeight: 400 }}>· {watch.length}</span></h2><span className="sub">Tap a ticker to enter its price or remove it</span></div>
        {watch.length ? watch.map((w) => {
          const k = wKey(w);
          const isOpen = !!open[k];
          const cs = CUR_SYM[w.ex] || '₹';
          return (
            <div className={`witem ${isOpen ? 'open' : ''}`} key={k}>
              <button className="wsum" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [k]: !o[k] }))}>
                <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="tk">{w.t}</span><span className="tag" style={{ color: 'var(--text2)' }}>{w.ex}</span>{w.sample && <span className="tag sample">EXAMPLE</span>}
                  </span>
                  <span className="sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name || ''}</span>
                </span>
                <span className="wmid mono" style={{ display: 'flex', flexDirection: 'column', gap: 3, textAlign: 'right', fontSize: 13 }}>
                  {w.ltp != null ? <><span>{cs}{num(w.ltp, 2)}</span><span className="sub" style={{ fontSize: 11 }}>your price · {w.ltpAt ? fmtDate(w.ltpAt) : ''}</span></> : <span className="sub" style={{ fontSize: 12 }}>no price entered</span>}
                </span>
                <span className="wbadges"><span className="badge b-mute">Not analysed</span></span>
                <svg className="chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {isOpen && (
                <div className="wbody">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div className="f" style={{ width: 170 }}>
                        <label>Current price ({cs})</label>
                        <input className="inp mono" type="number" value={ltpEdits[k] ?? (w.ltp ?? '')} onChange={(e) => setLtpEdits((p) => ({ ...p, [k]: e.target.value }))} placeholder="Today's LTP" />
                      </div>
                      <button className="btn sm" style={{ minHeight: 40 }} onClick={() => saveLtp(k, w)}>Save price</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="btn sm" disabled title="Open this page in Claude.ai to run AI analysis" style={{ minHeight: 40 }}>Run analysis</button>
                      {wDel === k ? (
                        <>
                          <button className="btn sm danger" style={{ minHeight: 40 }} onClick={() => removeWatch(k)}>Remove {w.t}</button>
                          <button className="btn sm" style={{ minHeight: 40 }} onClick={() => setWDel(null)}>Keep</button>
                        </>
                      ) : (
                        <button className="btn sm ghost" style={{ minHeight: 40 }} onClick={() => setWDel(k)}>Remove</button>
                      )}
                    </div>
                  </div>
                  <div className="thinking" style={{ borderStyle: 'dashed' }}>
                    Not analysed yet. The AI-powered check-up (P/E, growth, debt, dividend, moat, targets, risk, entry zone) runs on Claude inside Claude.ai and is unavailable here.
                  </div>
                </div>
              )}
            </div>
          );
        }) : <div className="empty">No tickers yet. Add one above to track it.</div>}
      </section>
    </div>
  );
}
