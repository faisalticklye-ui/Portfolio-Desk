'use client';
import React, { useEffect, useState } from 'react';
import { BROKERS, CUR_SYM, EXCH, Holding, HoldingType, Mode, TYPE_ORDER, TYPES } from '../lib/types';
import { num, todayISO } from '../lib/format';
import { curPrice, sipCount } from '../lib/calc';
import { Settings } from '../lib/types';

type Draft = Record<string, string | boolean>;

function blankDraft(type?: string): Draft {
  return {
    type: type || 'stock', mode: 'Lumpsum', exchange: 'NSE', currency: 'INR', broker: '', sym: '', name: '', sector: '',
    category: '', plan: 'Direct', option: 'Growth', folio: '', code: '', underlying: '', form: 'Physical', purity: '24K',
    custody: 'Exchange', qty: '', avg: '', price: '', prev: '', useRef: true, date: '', sipAmt: '', sipFreq: 'Monthly',
    sipDay: '', sipWeekday: '1', stepUp: '', sipStatus: 'Active', sipEnd: '', notes: '', quoteSym: '',
  };
}

function holdingToDraft(h: Holding): Draft {
  const base = blankDraft(h.type);
  const out: Draft = { ...base };
  Object.entries(h).forEach(([k, v]) => {
    out[k] = (v === null || v === undefined ? '' : (v as string | boolean));
  });
  return out;
}

export default function HoldingModal({
  editId,
  holdings,
  settings,
  onClose,
  onSave,
  initialType,
}: {
  editId: string | null;
  holdings: Holding[];
  settings: Settings;
  onClose: () => void;
  onSave: (h: Holding, editId: string | null) => void;
  initialType?: string;
}) {
  const existing = editId ? holdings.find((h) => h.id === editId) : null;
  const [d, setD] = useState<Draft>(existing ? holdingToDraft(existing) : blankDraft(initialType));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const set = (k: string, v: string | boolean) => setD((p) => ({ ...p, [k]: v }));
  const t = d.type as HoldingType;
  const cs = CUR_SYM[d.currency as string] || '₹';

  function previewPrice(): number {
    return curPrice({ ...(d as unknown as Holding), useRef: true, currency: d.currency as string }, settings);
  }

  function calcPreview(): string {
    const q = +(d.qty as string) || 0;
    const a = +(d.avg as string) || 0;
    const refUsed = (t === 'gold' || t === 'btc') && d.useRef !== false && d.useRef !== ('false' as unknown);
    const p = refUsed ? previewPrice() : +(d.price as string) || 0;
    const inv = q * a, val = q * p, pl = val - inv;
    const parts = [`Invested ${cs}${num(inv, 2)}`, `Current value ${cs}${num(val, 2)}`, `P&L ${pl >= 0 ? '+' : '−'}${cs}${num(Math.abs(pl), 2)}${inv ? ' (' + ((pl / inv) * 100).toFixed(2) + '%)' : ''}`];
    if (d.mode === 'SIP' && d.date) parts.push(sipCount({ ...(d as unknown as Holding) }) + ' instalments so far');
    return parts.join(' · ');
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    const need = (k: string, m?: string) => { if (!d[k]) e[k] = m || 'Required'; };
    const pos = (k: string) => { const v = d[k] as string; if (v !== '' && v != null && !(+v > 0)) e[k] = 'Enter a number above 0'; };
    if (t === 'stock' || t === 'etf') need('sym', 'Enter the ticker symbol');
    if (t === 'mf' || t === 'gold') need('name', 'Enter a name');
    need('broker', 'Where is this held?');
    need('qty'); pos('qty'); need('avg'); pos('avg');
    const refUsed = (t === 'gold' || t === 'btc') && d.useRef !== false;
    if (!refUsed) { need('price'); pos('price'); }
    need('date', 'Pick a date');
    if (d.mode === 'SIP') {
      need('sipAmt'); pos('sipAmt');
      if (d.sipFreq !== 'Weekly') { need('sipDay'); if (d.sipDay && !(+d.sipDay >= 1 && +d.sipDay <= 31)) e.sipDay = 'Day 1–31'; }
    }
    return e;
  }

  function save() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    const numK = ['qty', 'avg', 'price', 'prev', 'sipAmt', 'sipDay', 'stepUp'];
    const out: Record<string, unknown> = { ...d };
    numK.forEach((k) => { out[k] = d[k] === '' || d[k] == null ? null : +(d[k] as string); });
    out.useRef = (t === 'gold' || t === 'btc') ? !(d.useRef === false) : false;
    if (d.sym) out.sym = String(d.sym).trim().toUpperCase();
    if (t === 'btc' && !d.name) out.name = 'Bitcoin';
    if (t === 'mf' || t === 'gold' || t === 'btc') out.exchange = '';
    if (t === 'mf' || t === 'gold') out.currency = 'INR';
    if (d.mode !== 'SIP') ['sipAmt', 'sipDay', 'stepUp', 'sipEnd'].forEach((k) => (out[k] = null));
    delete out.sample;
    const old = existing;
    const priceChanged = !old || old.price !== out.price;
    out.priceAt = priceChanged ? todayISO() : old?.priceAt || todayISO();
    if (priceChanged) out.priceSrc = 'manual';
    out.id = editId || undefined;
    onSave(out as unknown as Holding, editId);
  }

  const exOpts = Object.keys(EXCH);
  const refable = t === 'gold' || t === 'btc';

  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="mhead">
          <h2>{editId ? 'Edit holding' : 'Add a new holding'}</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <form className="mbody" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="fs">
            <div className="lg">Holding type</div>
            <div className="seg" role="group" aria-label="Holding type">
              {TYPE_ORDER.map((k) => (
                <button key={k} type="button" aria-pressed={t === k} onClick={() => {
                  set('type', k);
                  if (k === 'stock' || k === 'etf') { if (!d.exchange) set('exchange', 'NSE'); } else set('exchange', '');
                  if (k === 'mf' || k === 'gold') set('currency', 'INR');
                  if (k === 'etf' && !d.category) set('category', 'Equity index');
                  setErrors({});
                }}>{TYPES[k].one}</button>
              ))}
            </div>
          </div>

          <div className="fs">
            <div className="lg">Instrument</div>
            <div className="fgrid">
              {(t === 'stock' || t === 'etf') && (
                <div className={`f ${errors.sym ? 'err' : ''}`}>
                  <label>{t === 'stock' ? 'Ticker symbol' : 'ETF symbol'} <span className="req">*</span></label>
                  <input className="inp mono" style={{ textTransform: 'uppercase' }} value={d.sym as string} onChange={(e) => set('sym', e.target.value)} placeholder="e.g. RELIANCE" />
                  {errors.sym && <span className="emsg">{errors.sym}</span>}
                </div>
              )}
              {t === 'stock' && (
                <>
                  <div className="f"><label>Company name</label><input className="inp" value={d.name as string} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Reliance Industries" /></div>
                  <div className="f"><label>Exchange</label><select className="inp" value={d.exchange as string} onChange={(e) => { set('exchange', e.target.value); set('currency', EXCH[e.target.value] || 'INR'); }}>{exOpts.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
                  <div className="f"><label>Trading currency</label><select className="inp" value={d.currency as string} onChange={(e) => set('currency', e.target.value)}>{['INR', 'USD', 'GBP'].map((o) => <option key={o}>{o}</option>)}</select></div>
                  <div className="f"><label>Sector</label><input className="inp" value={d.sector as string} onChange={(e) => set('sector', e.target.value)} placeholder="e.g. Banking, IT Services" /></div>
                </>
              )}
              {t === 'mf' && (
                <>
                  <div className={`f ${errors.name ? 'err' : ''}`}><label>Scheme name <span className="req">*</span></label><input className="inp" value={d.name as string} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Parag Parikh Flexi Cap Fund" />{errors.name && <span className="emsg">{errors.name}</span>}</div>
                  <div className="f"><label>Category</label><select className="inp" value={d.category as string} onChange={(e) => set('category', e.target.value)}>{['', 'Large cap', 'Mid cap', 'Small cap', 'Flexi cap', 'Multi cap', 'Large & Mid cap', 'ELSS (tax saver)', 'Index fund', 'Sectoral / Thematic', 'Hybrid', 'Debt', 'Liquid', 'Gold fund', 'International FoF', 'Other'].map((o) => <option key={o} value={o}>{o || 'Choose…'}</option>)}</select></div>
                  <div className="f"><label>Plan</label><select className="inp" value={d.plan as string} onChange={(e) => set('plan', e.target.value)}>{['Direct', 'Regular'].map((o) => <option key={o}>{o}</option>)}</select></div>
                  <div className="f"><label>Option</label><select className="inp" value={d.option as string} onChange={(e) => set('option', e.target.value)}>{['Growth', 'IDCW'].map((o) => <option key={o}>{o}</option>)}</select></div>
                  <div className="f"><label>AMFI scheme code</label><input className="inp mono" value={d.code as string} onChange={(e) => set('code', e.target.value)} placeholder="e.g. 122639" /></div>
                  <div className="f"><label>Folio number</label><input className="inp mono" value={d.folio as string} onChange={(e) => set('folio', e.target.value)} /></div>
                </>
              )}
              {t === 'etf' && (
                <>
                  <div className="f"><label>ETF name</label><input className="inp" value={d.name as string} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Nippon India ETF Nifty 50 BeES" /></div>
                  <div className="f"><label>Exchange</label><select className="inp" value={d.exchange as string} onChange={(e) => { set('exchange', e.target.value); set('currency', EXCH[e.target.value] || 'INR'); }}>{exOpts.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
                  <div className="f"><label>Trading currency</label><select className="inp" value={d.currency as string} onChange={(e) => set('currency', e.target.value)}>{['INR', 'USD', 'GBP'].map((o) => <option key={o}>{o}</option>)}</select></div>
                  <div className="f"><label>ETF category</label><select className="inp" value={d.category as string} onChange={(e) => set('category', e.target.value)}>{['Equity index', 'Sectoral / Thematic', 'International', 'Gold', 'Silver', 'Debt / Liquid', 'Other'].map((o) => <option key={o}>{o}</option>)}</select></div>
                  <div className="f"><label>Underlying index / asset</label><input className="inp" value={d.underlying as string} onChange={(e) => set('underlying', e.target.value)} placeholder="e.g. Nifty 50, S&amp;P 500" /></div>
                </>
              )}
              {t === 'gold' && (
                <>
                  <div className={`f ${errors.name ? 'err' : ''}`}><label>Description <span className="req">*</span></label><input className="inp" value={d.name as string} onChange={(e) => set('name', e.target.value)} placeholder="e.g. 24K coins, SGB 2023-24 Series III" />{errors.name && <span className="emsg">{errors.name}</span>}</div>
                  <div className="f"><label>Form</label><select className="inp" value={d.form as string} onChange={(e) => set('form', e.target.value)}>{['Physical', 'Digital gold', 'Sovereign Gold Bond'].map((o) => <option key={o}>{o}</option>)}</select></div>
                  <div className="f"><label>Purity</label><select className="inp" value={d.purity as string} onChange={(e) => set('purity', e.target.value)}>{['24K', '22K'].map((o) => <option key={o}>{o}</option>)}</select></div>
                </>
              )}
              {t === 'btc' && (
                <>
                  <div className="f"><label>Label</label><input className="inp" value={d.name as string} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Bitcoin on CoinDCX" /></div>
                  <div className="f"><label>Custody</label><select className="inp" value={d.custody as string} onChange={(e) => set('custody', e.target.value)}>{['Exchange', 'Self-custody wallet'].map((o) => <option key={o}>{o}</option>)}</select></div>
                  <div className="f"><label>Bought in</label><select className="inp" value={d.currency as string} onChange={(e) => set('currency', e.target.value)}>{['INR', 'USD'].map((o) => <option key={o}>{o}</option>)}</select></div>
                </>
              )}
            </div>
          </div>

          <div className="fs">
            <div className="lg">Where it&apos;s held</div>
            <div className="fgrid">
              <div className={`f ${errors.broker ? 'err' : ''}`}>
                <label>{t === 'btc' ? 'Exchange / wallet provider' : 'Broker / platform'} <span className="req">*</span></label>
                <input className="inp" list="dl_broker" value={d.broker as string} onChange={(e) => set('broker', e.target.value)} placeholder="e.g. ICICI Direct" />
                {errors.broker && <span className="emsg">{errors.broker}</span>}
              </div>
              <div className="f">
                <label>Investment mode <span className="req">*</span></label>
                <div className="seg" style={{ maxWidth: 320 }}>
                  {(['SIP', 'Lumpsum'] as Mode[]).map((k) => (
                    <button key={k} type="button" aria-pressed={d.mode === k} onClick={() => set('mode', k)}>{k === 'SIP' ? 'SIP (recurring)' : 'Lumpsum (one-time)'}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="fs">
            <div className="lg">Position</div>
            <div className="fgrid">
              <div className={`f ${errors.qty ? 'err' : ''}`}><label>{{ stock: 'Quantity (shares)', mf: 'Units held', etf: 'Units held', gold: 'Quantity (grams)', btc: 'Quantity (BTC)' }[t]} <span className="req">*</span></label><input className="inp mono" type="number" value={d.qty as string} onChange={(e) => set('qty', e.target.value)} />{errors.qty && <span className="emsg">{errors.qty}</span>}</div>
              <div className={`f ${errors.avg ? 'err' : ''}`}><label>{{ stock: 'Average buy price', mf: 'Average NAV', etf: 'Average buy price', gold: 'Average buy price per gram', btc: 'Average buy price per BTC' }[t]} ({cs}) <span className="req">*</span></label><input className="inp mono" type="number" value={d.avg as string} onChange={(e) => set('avg', e.target.value)} />{errors.avg && <span className="emsg">{errors.avg}</span>}</div>
              {refable && d.useRef !== false ? (
                <div className="f"><label>{{ stock: 'Current price (LTP)', mf: 'Current NAV', etf: 'Current price (LTP)', gold: 'Current price per gram', btc: 'Current price per BTC' }[t]}</label><div className="inp mono" style={{ display: 'flex', alignItems: 'center', color: 'var(--text2)' }}>{cs}{num(previewPrice(), 2)}</div><span className="hint">From the {t === 'gold' ? 'gold' : 'Bitcoin'} reference price</span></div>
              ) : (
                <div className={`f ${errors.price ? 'err' : ''}`}><label>{{ stock: 'Current price (LTP)', mf: 'Current NAV', etf: 'Current price (LTP)', gold: 'Current price per gram', btc: 'Current price per BTC' }[t]} ({cs}) <span className="req">*</span></label><input className="inp mono" type="number" value={d.price as string} onChange={(e) => set('price', e.target.value)} />{errors.price && <span className="emsg">{errors.price}</span>}</div>
              )}
              {!refable && <div className="f"><label>Previous close</label><input className="inp mono" type="number" value={d.prev as string} onChange={(e) => set('prev', e.target.value)} /><span className="hint">Optional — enables day change</span></div>}
              {refable && <div className="f" style={{ justifyContent: 'flex-end' }}><label className="check"><input type="checkbox" checked={d.useRef !== false} onChange={(e) => set('useRef', e.target.checked)} /> Use market reference price</label></div>}
            </div>
            <div className="calc">{calcPreview()}</div>
          </div>

          <div className="fs">
            <div className="lg">{d.mode === 'SIP' ? 'SIP details' : 'Transaction'}</div>
            <div className="fgrid">
              {d.mode === 'SIP' ? (
                <>
                  <div className={`f ${errors.sipAmt ? 'err' : ''}`}><label>SIP amount ({cs}) <span className="req">*</span></label><input className="inp mono" type="number" value={d.sipAmt as string} onChange={(e) => set('sipAmt', e.target.value)} />{errors.sipAmt && <span className="emsg">{errors.sipAmt}</span>}</div>
                  <div className="f"><label>Frequency</label><select className="inp" value={d.sipFreq as string} onChange={(e) => set('sipFreq', e.target.value)}>{['Monthly', 'Weekly', 'Quarterly'].map((o) => <option key={o}>{o}</option>)}</select></div>
                  {d.sipFreq === 'Weekly' ? (
                    <div className="f"><label>Debit day</label><select className="inp" value={d.sipWeekday as string} onChange={(e) => set('sipWeekday', e.target.value)}>{[['1', 'Monday'], ['2', 'Tuesday'], ['3', 'Wednesday'], ['4', 'Thursday'], ['5', 'Friday']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                  ) : (
                    <div className={`f ${errors.sipDay ? 'err' : ''}`}><label>SIP date (day of month) <span className="req">*</span></label><input className="inp mono" type="number" value={d.sipDay as string} onChange={(e) => set('sipDay', e.target.value)} placeholder="1–28" />{errors.sipDay && <span className="emsg">{errors.sipDay}</span>}</div>
                  )}
                  <div className={`f ${errors.date ? 'err' : ''}`}><label>SIP start date <span className="req">*</span></label><input className="inp" type="date" value={d.date as string} onChange={(e) => set('date', e.target.value)} />{errors.date && <span className="emsg">{errors.date}</span>}</div>
                  <div className="f"><label>Annual step-up %</label><input className="inp mono" type="number" value={d.stepUp as string} onChange={(e) => set('stepUp', e.target.value)} placeholder="e.g. 10" /></div>
                  <div className="f"><label>Status</label><select className="inp" value={d.sipStatus as string} onChange={(e) => set('sipStatus', e.target.value)}>{['Active', 'Paused'].map((o) => <option key={o}>{o}</option>)}</select></div>
                  <div className="f"><label>End date</label><input className="inp" type="date" value={d.sipEnd as string} onChange={(e) => set('sipEnd', e.target.value)} /><span className="hint">Optional — blank means until cancelled</span></div>
                </>
              ) : (
                <div className={`f ${errors.date ? 'err' : ''}`}><label>Purchase date <span className="req">*</span></label><input className="inp" type="date" value={d.date as string} onChange={(e) => set('date', e.target.value)} />{errors.date && <span className="emsg">{errors.date}</span>}<span className="hint">Used for holding period, XIRR and LTCG timing</span></div>
              )}
            </div>
          </div>

          <div className="fs">
            <div className="lg">Notes</div>
            <div className="f"><label>Your thesis or reminders</label><textarea className="inp" rows={2} value={d.notes as string} onChange={(e) => set('notes', e.target.value)} placeholder="Why you bought it, target, review date…" /></div>
          </div>
          <datalist id="dl_broker">{[...new Set([...holdings.map((h) => h.broker).filter(Boolean), ...BROKERS])].map((b) => <option key={b} value={b} />)}</datalist>
        </form>
        <div className="mfoot">
          <span className="sub"><span className="req" style={{ color: 'var(--accent)' }}>*</span> required</span>
          <span style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost" onClick={onClose}>Cancel</button>
            <button className="btn primary" onClick={save}>{editId ? 'Save changes' : 'Add holding'}</button>
          </span>
        </div>
      </div>
    </div>
  );
}
