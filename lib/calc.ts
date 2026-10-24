import { EnrichedHolding, Finding, Holding, Settings, WatchItem } from './types';
import { daysBetween, fmtDate, inr, num, pct } from './format';

export function curPrice(h: Holding, settings: Settings): number {
  const fx = settings.fx.usdInr;
  if (h.type === 'gold' && h.useRef) return settings.ref.gold * (h.purity === '22K' ? 0.916 : 1);
  if (h.type === 'btc' && h.useRef) return h.currency === 'USD' ? settings.ref.btc / fx : settings.ref.btc;
  return +(h.price || 0);
}

export function fxRate(cur: string, settings: Settings): number {
  return cur === 'USD' ? settings.fx.usdInr : cur === 'GBP' ? settings.fx.usdInr * 1.27 : 1;
}

export function sipCount(h: Holding, to: Date = new Date()): number {
  if (h.mode !== 'SIP' || !h.date) return 0;
  const st = new Date(h.date);
  if (isNaN(st.getTime())) return 0;
  const end = h.sipEnd && new Date(h.sipEnd) < to ? new Date(h.sipEnd) : to;
  if (end < st) return 0;
  const f = h.sipFreq || 'Monthly';
  if (f === 'Weekly') return Math.floor(daysBetween(st, end) / 7) + 1;
  const months = (end.getFullYear() - st.getFullYear()) * 12 + end.getMonth() - st.getMonth() + (end.getDate() >= st.getDate() ? 1 : 0);
  return Math.max(1, f === 'Quarterly' ? Math.ceil(months / 3) : months);
}

export function sipMonthly(h: Holding): number {
  const a = +(h.sipAmt || 0);
  const f = h.sipFreq || 'Monthly';
  return f === 'Weekly' ? (a * 52) / 12 : f === 'Quarterly' ? a / 3 : a;
}

export function nextSip(h: Holding, today: Date): Date | null {
  if (h.mode !== 'SIP' || h.sipStatus === 'Paused') return null;
  if (h.sipEnd && new Date(h.sipEnd) < today) return null;
  const f = h.sipFreq || 'Monthly';
  if (f === 'Weekly') {
    const wd = +(h.sipWeekday ?? '1');
    const d = new Date(today);
    d.setDate(d.getDate() + ((wd - d.getDay() + 7) % 7));
    return d;
  }
  const day = Math.min(28, Math.max(1, +(h.sipDay || 1)));
  let d = new Date(today.getFullYear(), today.getMonth(), day);
  if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, day);
  if (f === 'Quarterly') {
    const sm = new Date(h.date || today).getMonth();
    let g = 0;
    while (((d.getMonth() - sm + 12) % 3 !== 0) && g++ < 4) d = new Date(d.getFullYear(), d.getMonth() + 1, day);
  }
  return d;
}

export function enrich(h: Holding, settings: Settings): EnrichedHolding {
  const p = curPrice(h, settings);
  const fx = fxRate(h.currency, settings);
  const q = +(h.qty || 0);
  const value = q * p * fx;
  const inv = q * +(h.avg || 0) * fx;
  const pnl = value - inv;
  const hasPrev = h.prev != null && (h.prev as unknown as string) !== '' && +h.prev > 0 && !h.useRef;
  const day = hasPrev ? (p - (h.prev as number)) * q * fx : 0;
  const dayPct = hasPrev ? (p / (h.prev as number) - 1) * 100 : NaN;
  const held = h.date ? daysBetween(new Date(h.date), new Date()) : 0;
  return { ...h, p, value, inv, pnl, pnlPct: inv ? (pnl / inv) * 100 : 0, day, dayPct, held };
}

export function xirr(flows: { d: number; v: number }[]): number {
  if (flows.length < 2) return NaN;
  flows = [...flows].sort((a, b) => a.d - b.d);
  const t0 = flows[0].d;
  if (flows[flows.length - 1].d - t0 < 864e5 * 30) return NaN;
  let r = 0.12;
  for (let i = 0; i < 80; i++) {
    let f = 0, df = 0;
    for (const c of flows) {
      const t = (c.d - t0) / 31557600000;
      f += c.v / Math.pow(1 + r, t);
      df -= (t * c.v) / Math.pow(1 + r, t + 1);
    }
    const nr = r - f / df;
    if (!isFinite(nr)) return NaN;
    if (Math.abs(nr - r) < 1e-8) return nr;
    r = Math.max(-0.99, nr);
  }
  return r;
}

export function flowsFor(list: EnrichedHolding[]): { d: number; v: number }[] {
  const flows: { d: number; v: number }[] = [];
  list.forEach((h) => {
    if (!h.inv) return;
    const st = new Date(h.date || Date.now());
    if (h.mode === 'SIP') {
      const n = Math.max(1, sipCount(h));
      const step = h.sipFreq === 'Weekly' ? 7 : null;
      for (let i = 0; i < n; i++) {
        const d = step ? new Date(st.getTime() + i * 7 * 864e5) : new Date(st.getFullYear(), st.getMonth() + i * (h.sipFreq === 'Quarterly' ? 3 : 1), st.getDate());
        if (d > new Date()) break;
        flows.push({ d: d.getTime(), v: -h.inv / n });
      }
    } else flows.push({ d: st.getTime(), v: -h.inv });
  });
  const tv = list.reduce((a, b) => a + b.value, 0);
  flows.push({ d: Date.now(), v: tv });
  return flows;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sum = (a: any[], k: string) => a.reduce((x, y) => x + (Number(y[k]) || 0), 0);

export function isEquity(h: Holding): boolean {
  return h.type === 'stock' || (h.type === 'mf' && !/debt|liquid|gilt|gold/i.test(h.category || '')) || (h.type === 'etf' && !/gold|silver|debt|liquid/i.test(h.category || ''));
}
export function isGoldLike(h: Holding): boolean {
  return h.type === 'gold' || (h.type === 'etf' && /gold/i.test(h.category || '')) || (h.type === 'mf' && /gold/i.test(h.category || ''));
}

export function heldStr(d: number): string {
  if (d < 31) return d + 'd held';
  const m = Math.floor(d / 30.44);
  return m < 12 ? m + 'm held' : (m / 12).toFixed(1) + 'y held';
}

/* ---------------- SIP approvals (due dates etc) ---------------- */
export function sipDueDates(h: Holding, from: string, to: string): string[] {
  if (h.mode !== 'SIP' || !h.date || h.sipStatus === 'Paused') return [];
  const st = new Date(h.date + 'T00:00:00');
  const F = new Date(from + 'T00:00:00');
  const T = new Date(to + 'T00:00:00');
  const end = h.sipEnd ? new Date(h.sipEnd + 'T00:00:00') : null;
  const out: string[] = [];
  const f = h.sipFreq || 'Monthly';
  const iso = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const ok = (d: Date) => d >= F && d >= st && d <= T && (!end || d <= end);
  if (f === 'Weekly') {
    const wd = +(h.sipWeekday ?? '1');
    for (let d = new Date(F); d <= T; d.setDate(d.getDate() + 1)) if (d.getDay() === wd && ok(d)) out.push(iso(d));
    return out;
  }
  const day = +(h.sipDay || st.getDate());
  for (let y = F.getFullYear(), m = F.getMonth() - 1; y < T.getFullYear() || (y === T.getFullYear() && m <= T.getMonth()); m++) {
    if (m > 11) { m = 0; y++; }
    if (m < 0) { m = 11; y--; }
    const dim = new Date(y, m + 1, 0).getDate();
    const d = new Date(y, m, Math.min(day, dim));
    if (f === 'Quarterly' && (((m - st.getMonth()) % 3) + 3) % 3 !== 0) continue;
    if (ok(d)) out.push(iso(d));
  }
  return out;
}
export const sipId = (h: Holding, due: string) => h.id + '_' + due;
export const hName = (h: Holding) => (h.type === 'stock' || h.type === 'etf' ? h.sym || h.name : h.name);

/* ---------------- Findings (local, rule-based) ---------------- */
export function sectorGroup(h: Holding): string {
  const n = (h.name || '').toLowerCase();
  const c = (h.category || '').toLowerCase();
  const u = (h.underlying || '').toLowerCase();
  if (h.type === 'gold') return 'Gold';
  if (h.type === 'btc') return 'Crypto';
  if (h.type === 'stock') return h.sector || 'Other stocks';
  if (h.type === 'etf') {
    if (/gold/.test(c)) return 'Gold';
    if (/silver/.test(c)) return 'Silver';
    if (/cpse|psu/.test(n + u)) return 'PSU / CPSE';
    if (/international/.test(c)) return 'International equity';
    if (/midcap|mid cap/.test(n + u)) return 'Mid cap';
    if (/debt|liquid/.test(c)) return 'Debt / liquid';
    return 'Large & broad market';
  }
  if (/health|pharma/.test(n)) return 'Healthcare & pharma';
  if (/psu/.test(n)) return 'PSU / CPSE';
  if (/manufactur/.test(n)) return 'Manufacturing';
  if (/ethical|shariah/.test(n)) return 'Ethical / Shariah';
  if (/small/.test(n + c)) return 'Small cap';
  if (/midcap|mid cap|momentum/.test(n) && !/large/.test(n)) return 'Mid cap';
  if (/large and mid|large & mid|large and midcap/.test(n + ' ' + c)) return 'Large & mid cap';
  if (/flexi|multi/.test(n + c)) return 'Flexi / multi cap';
  if (/gold/.test(n + c)) return 'Gold';
  if (/debt|liquid|gilt|bond/.test(c)) return 'Debt / liquid';
  return 'Large & broad market';
}

export function pendingSips(holdings: Holding[], sipLog: { entries: Record<string, { hid: string }> }): { h: Holding; due: string; id: string }[] {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const to = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
  const E = sipLog.entries || {};
  const out: { h: Holding; due: string; id: string }[] = [];
  holdings.forEach((h) => sipDueDates(h, todayFromStart(), to).forEach((due) => { const id = sipId(h, due); if (!E[id]) out.push({ h, due, id }); }));
  return out.sort((a, b) => (a.due < b.due ? -1 : 1));
}
function todayFromStart() {
  return '2000-01-01';
}

export function computeFindings(holdings: Holding[], settings: Settings, watch: WatchItem[], analyses: Record<string, { entry?: { zoneLow?: number; zoneHigh?: number; stopLoss?: number }; at?: string }>, sipLog: { entries: Record<string, { hid: string }> }): Finding[] {
  const all = holdings.map((h) => enrich(h, settings));
  const tv = sum(all, 'value') || 1;
  const F: Finding[] = [];
  const add = (sev: Finding['sev'], title: string, detail: string, tag: string) => F.push({ sev, title, detail, tag });
  const nm = (h: Holding) => (h.type === 'stock' || h.type === 'etf' ? h.sym || h.name : h.name);
  if (!all.length) {
    add('info', 'No holdings yet', 'Add your first holding with the + button to get daily checks.', 'Setup');
    return F;
  }

  [...all].sort((a, b) => b.value - a.value).forEach((h) => {
    const w = (h.value / tv) * 100;
    if (h.type === 'stock' && w > 12) add(w > 20 ? 'high' : 'med', `${nm(h)} is ${w.toFixed(1)}% of your portfolio`, 'A single stock above ~10–12% means one bad quarter can dent the whole portfolio. Consider directing new money elsewhere rather than selling, unless your thesis has changed.', 'Concentration');
  });
  const eq = all.filter((h) => h.type === 'stock');
  const eqV = sum(eq, 'value');
  const sectors: Record<string, number> = {};
  eq.forEach((h) => { const sc = h.sector || 'Unclassified'; sectors[sc] = (sectors[sc] || 0) + h.value; });
  Object.entries(sectors).forEach(([sc, v]) => { const w = (v / (eqV || 1)) * 100; if (w > 30 && sc !== 'Unclassified' && eq.length > 2) add('med', `${sc} is ${w.toFixed(0)}% of your direct stocks`, 'Sector-heavy portfolios move together on policy or rate news. Your mutual funds may add further exposure to the same sector.', 'Concentration'); });

  const btcW = (sum(all.filter((h) => h.type === 'btc'), 'value') / tv) * 100;
  const goldW = (sum(all.filter(isGoldLike), 'value') / tv) * 100;
  const eqW = (sum(all.filter(isEquity), 'value') / tv) * 100;
  if (btcW > 10) add('high', `Bitcoin is ${btcW.toFixed(1)}% of the portfolio`, 'Crypto can fall 50%+ in a bad year. Many planners keep it to a small single-digit share. India taxes crypto gains at a flat 30% plus 1% TDS on transfers (verify the current rules).', 'Asset mix');
  else if (btcW > 5) add('med', `Bitcoin is ${btcW.toFixed(1)}% of the portfolio`, 'Above a typical 1–5% "satellite" allocation. Fine if intentional — just size it so a 50% drawdown wouldn\'t change your plans.', 'Asset mix');
  else if (btcW > 0) add('info', `Bitcoin sits at ${btcW.toFixed(1)}%`, 'Within a common small-allocation range.', 'Asset mix');
  if (goldW < 5) add('info', `Gold is only ${goldW.toFixed(1)}% of the portfolio`, 'Many Indian investors hold roughly 5–15% in gold (SGB, gold ETF, digital) as a hedge against rupee weakness and equity drawdowns. A rule of thumb, not a requirement.', 'Asset mix');
  else if (goldW > 20) add('med', `Gold is ${goldW.toFixed(1)}% of the portfolio`, 'That is above the usual 5–15% hedge band; gold has no earnings growth, so a large share can drag long-run returns.', 'Asset mix');
  else if (goldW > 15) add('info', `Gold is ${goldW.toFixed(1)}% of the portfolio`, 'Slightly above the common 5–15% hedge band (gold holdings plus gold ETFs). Fine if deliberate; new money could tilt elsewhere.', 'Asset mix');
  else add('good', `Gold hedge at ${goldW.toFixed(1)}%`, 'Inside the common 5–15% band (gold holdings plus gold ETFs).', 'Asset mix');
  add('info', `Equity exposure is ${eqW.toFixed(0)}%`, 'Stocks, equity mutual funds and equity ETFs combined. Check this against your target (e.g. 100 minus age is one crude starting point; your goals and time horizon matter more).', 'Asset mix');

  all.forEach((h) => {
    if (h.pnlPct <= -25) add('high', `${nm(h)} is down ${Math.abs(h.pnlPct).toFixed(1)}%`, 'Re-check the original reason you bought it. If it still holds, averaging via SIP may be fine; if not, decide on an exit level rather than waiting.', 'Drawdown');
    else if (h.pnlPct <= -12) add('med', `${nm(h)} is down ${Math.abs(h.pnlPct).toFixed(1)}%`, `Worth a thesis check${h.type === 'stock' ? ' and a stop-loss decision' : ''}.`, 'Drawdown');
    if (h.pnlPct >= 60 && h.value / tv > 0.07 && (h.type === 'stock' || h.type === 'btc')) add('info', `${nm(h)} is up ${h.pnlPct.toFixed(0)}% and now ${((h.value / tv) * 100).toFixed(1)}% of the portfolio`, 'Strong winner. Consider a trailing stop or booking a slice to rebalance — after checking the tax impact.', 'Winners');
  });

  all.filter((h) => (h.type === 'stock' || (h.type === 'etf' && isEquity(h)) || (h.type === 'mf' && isEquity(h))) && h.mode === 'Lumpsum' && h.pnl > 0).forEach((h) => {
    const left = 365 - h.held;
    if (left > 0 && left <= 45) add('info', `${nm(h)} turns long-term in ${left} days`, `Selling before ${fmtDate(new Date(new Date(h.date!).getTime() + 366 * 864e5))} would make the gain short-term (taxed higher). Worth waiting if you plan to sell. Current slabs: verify with your CA.`, 'Tax timing');
  });

  const pend = pendingSips(holdings, sipLog);
  if (pend.length) add('med', `${pend.length} SIP instalment${pend.length > 1 ? 's' : ''} awaiting your approval`, `${pend.map((x) => hName(x.h) + ' (' + fmtDate(x.due) + ')').join(', ')}. Confirm the units allotted on the Portfolio tab so holdings stay accurate.`, 'SIP');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = all.map((h) => ({ h, d: nextSip(h, today) })).filter((x) => x.d && daysBetween(today, x.d) <= 7);
  if (due.length) {
    const amt = due.reduce((a, x) => a + (+(x.h.sipAmt || 0)) * fxRate(x.h.currency, settings), 0);
    add('info', `${due.length} SIP${due.length > 1 ? 's' : ''} due in the next 7 days · ${inr(amt)}`, `Keep this balance in the linked bank account to avoid bounce charges: ${due.map((x) => nm(x.h) + ' (' + x.d!.getDate() + ' ' + x.d!.toLocaleDateString('en-IN', { month: 'short' }) + ')').join(', ')}.`, 'SIP');
  }
  const paused = all.filter((h) => h.mode === 'SIP' && h.sipStatus === 'Paused');
  if (paused.length) add('med', `${paused.length} SIP${paused.length > 1 ? 's are' : ' is'} paused`, `${paused.map(nm).join(', ')}. Pausing through market dips gives up the cost-averaging benefit SIPs are designed for.`, 'SIP');
  const active = all.filter((h) => h.mode === 'SIP' && h.sipStatus !== 'Paused');
  if (active.length) {
    const noStep = active.filter((h) => !+(h.stepUp || 0)).length;
    if (noStep >= 2) add('info', `${noStep} active SIPs have no annual step-up`, 'A 5–10% yearly step-up keeps contributions in line with income growth and compounds noticeably over 10+ years.', 'SIP');
  }

  const reg = all.filter((h) => h.type === 'mf' && h.plan === 'Regular');
  if (reg.length) add('med', `${reg.length} fund${reg.length > 1 ? 's are' : ' is'} in the Regular plan`, `${reg.map(nm).join(', ')}. Direct plans of the same scheme usually cost roughly 0.5–1% a year less in expense ratio. Switching counts as a sale (tax + exit load), so check before moving.`, 'Costs');
  const lc = all.filter((h) => (h.type === 'mf' && /large cap|index/i.test(h.category || '')) || (h.type === 'etf' && /equity index/i.test(h.category || '')));
  if (lc.length >= 3) add('info', `${lc.length} large-cap / index products may overlap`, `${lc.map(nm).join(', ')} likely hold many of the same top-50 companies. Consolidating can simplify tracking without losing diversification.`, 'Overlap');

  const staleMf = all.filter((h) => h.type === 'mf' && h.priceAt && daysBetween(new Date(h.priceAt), new Date()) > 5);
  if (staleMf.length) add('med', `${staleMf.length} fund NAV${staleMf.length > 1 ? 's are' : ' is'} more than 5 days old`, `${staleMf.map(nm).join(', ')} — the nightly sync couldn't find a newer NAV. Check your broker app and enter it in Update prices.`, 'Data');
  const noCode = all.filter((h) => h.type === 'mf' && !h.code);
  if (noCode.length) add('med', `${noCode.length} fund${noCode.length > 1 ? 's have' : ' has'} no AMFI scheme code`, `${noCode.map(nm).join(', ')} can't sync automatically. Edit the fund and add its scheme code.`, 'Data');
  const stale = all.filter((h) => !h.useRef && h.priceAt && daysBetween(new Date(h.priceAt), new Date()) > 3);
  if (stale.length) add('med', `${stale.length} price${stale.length > 1 ? 's are' : ' is'} more than 3 days old`, 'Values and P&L use the last price you entered. Tap Update prices to refresh.', 'Data');
  if (!settings.ref.at) add('med', 'Gold, Bitcoin and FX rates are still sample values', 'Your gold and BTC holdings are valued from these references. Set today\'s rates in Update prices.', 'Data');

  watch.forEach((w) => {
    const key = w.t + ':' + w.ex;
    const a = analyses[key];
    const l = w.ltp;
    if (a && a.entry && l != null) {
      const { zoneLow: lo, zoneHigh: hi, stopLoss: sl } = a.entry;
      if (sl != null && l <= sl) add('high', `${w.t} is at or below its suggested stop-loss`, 'Re-check the story before buying; the setup may have broken down.', 'Watchlist');
      else if (lo != null && hi != null && l >= lo && l <= hi) add('good', `${w.t} is inside its entry zone`, `Your price sits within the suggested band. Stop-loss idea noted.`, 'Watchlist');
      else if (lo != null && l < lo) add('info', `${w.t} is below its entry zone`, 'Cheaper than the suggested band — find out why before acting.', 'Watchlist');
    }
    if (a && a.at && daysBetween(new Date(a.at), new Date()) > 30) add('info', `${w.t} analysis is over 30 days old`, 'Re-run it with a fresh price.', 'Watchlist');
    if (!l && a) add('info', `No current price for ${w.t}`, 'Add today\u2019s price in the Watchlist to compare it against the entry zone.', 'Watchlist');
  });

  const ord: Record<Finding['sev'], number> = { high: 0, med: 1, info: 2, good: 3 };
  return F.sort((a, b) => ord[a.sev] - ord[b.sev]);
}

export { num, pct };
