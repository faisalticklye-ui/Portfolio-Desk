'use client';
import React, { useEffect, useState } from 'react';
import { Holding, Settings, TYPE_ORDER, TYPES } from '../lib/types';
import { fmtDate, todayISO } from '../lib/format';

export default function PricesModal({
  holdings,
  settings,
  onClose,
  onSave,
}: {
  holdings: Holding[];
  settings: Settings;
  onClose: () => void;
  onSave: (settings: Settings, holdings: Holding[]) => void;
}) {
  const [d, setD] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {
      fx_usdInr: String(settings.fx.usdInr),
      fx_usdKwd: String(settings.fx.usdKwd),
      ref_gold: String(settings.ref.gold),
      ref_silver: String(settings.ref.silver),
      ref_btc: String(settings.ref.btc),
      ref_prem: String(settings.ref.prem ?? 0),
    };
    holdings.forEach((h) => { if (!h.useRef) { init['p_' + h.id] = h.price != null ? String(h.price) : ''; init['v_' + h.id] = h.prev != null ? String(h.prev) : ''; } });
    return init;
  });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const set = (k: string, v: string) => setD((p) => ({ ...p, [k]: v }));

  function save() {
    const pos = (v: string) => (v !== '' && v != null && +v > 0 ? +v : null);
    const S: Settings = JSON.parse(JSON.stringify(settings));
    const today = todayISO();
    if (pos(d.fx_usdInr)) S.fx.usdInr = +d.fx_usdInr;
    if (pos(d.fx_usdKwd)) S.fx.usdKwd = +d.fx_usdKwd;
    S.refHist = S.refHist || { gold: [], silver: [], btc: [] };
    (['gold', 'silver', 'btc'] as const).forEach((k) => {
      const v = pos(d['ref_' + k]);
      if (!v) return;
      const h = (S.refHist![k] = (S.refHist![k] || []).filter((p) => p.t !== today));
      h.push({ t: today, v });
      if (h.length > 90) h.splice(0, h.length - 90);
      S.ref[k] = v;
    });
    if (d.ref_prem !== '' && isFinite(+d.ref_prem) && +d.ref_prem >= 0 && +d.ref_prem < 50) S.ref.prem = +d.ref_prem;
    S.ref.at = today;
    const newHoldings = holdings.map((h) => {
      if (h.useRef) return h;
      const p = pos(d['p_' + h.id]);
      const v = d['v_' + h.id] === '' ? null : pos(d['v_' + h.id]);
      if (p == null) return h;
      return p !== h.price || v !== h.prev ? { ...h, price: p, prev: v, priceAt: today, priceSrc: 'manual' } : h;
    });
    onSave(S, newHoldings);
  }

  const rows = TYPE_ORDER.map((t) => {
    const hs = holdings.filter((h) => h.type === t && !h.useRef);
    if (!hs.length) return null;
    return (
      <div className="fs" key={t}>
        <div className="lg">{TYPES[t].label}</div>
        <div className="upd-row" style={{ borderTop: 'none', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', paddingBottom: 0 }}>
          <span>Holding</span><span>{t === 'mf' ? 'Current NAV' : 'Current price'}</span><span>Previous close</span>
        </div>
        {hs.map((h) => (
          <div className="upd-row" key={h.id}>
            <span style={{ minWidth: 0 }}>
              <b style={{ fontSize: 13 }}>{h.sym || h.name}</b><br />
              <span className="sub" style={{ fontSize: 11 }}>{h.broker || ''} · {h.priceAt ? 'last set ' + fmtDate(h.priceAt) : 'never set'}</span>
            </span>
            <input className="inp mono" type="number" value={d['p_' + h.id] ?? ''} onChange={(e) => set('p_' + h.id, e.target.value)} />
            <input className="inp mono" type="number" value={d['v_' + h.id] ?? ''} onChange={(e) => set('v_' + h.id, e.target.value)} />
          </div>
        ))}
      </div>
    );
  });

  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="mhead">
          <h2>Update prices</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <form className="mbody" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <p className="sub" style={{ margin: 0, lineHeight: 1.55 }}>This page can&apos;t pull live quotes, so enter today&apos;s prices from your broker app, NSE/BSE, or AMFI for NAVs. Everything recalculates as soon as you save.</p>
          <div className="fs">
            <div className="lg">Market reference &amp; FX</div>
            <div className="fgrid">
              <div className="f"><label>Gold 24K (₹ per gram)</label><input className="inp mono" type="number" value={d.ref_gold} onChange={(e) => set('ref_gold', e.target.value)} /></div>
              <div className="f"><label>Silver 999 (₹ per kg)</label><input className="inp mono" type="number" value={d.ref_silver} onChange={(e) => set('ref_silver', e.target.value)} /></div>
              <div className="f"><label>Bitcoin (₹ per BTC)</label><input className="inp mono" type="number" value={d.ref_btc} onChange={(e) => set('ref_btc', e.target.value)} /></div>
              <div className="f"><label>Indian premium over spot %</label><input className="inp mono" type="number" value={d.ref_prem} onChange={(e) => set('ref_prem', e.target.value)} /></div>
              <div className="f"><label>USD → INR</label><input className="inp mono" type="number" value={d.fx_usdInr} onChange={(e) => set('fx_usdInr', e.target.value)} /></div>
              <div className="f"><label>USD → KWD</label><input className="inp mono" type="number" value={d.fx_usdKwd} onChange={(e) => set('fx_usdKwd', e.target.value)} /></div>
            </div>
          </div>
          {rows}
        </form>
        <div className="mfoot">
          <span className="sub">Leave a field blank to keep it unchanged</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={save}>Save prices</button>
          </span>
        </div>
      </div>
    </div>
  );
}
