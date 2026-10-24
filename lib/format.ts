export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const num = (v: number, d = 0) => (isFinite(v) ? v : 0).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
export const inr = (v: number, d = 0) => (v < 0 ? '−₹' : '₹') + num(Math.abs(v), d);
export const sInr = (v: number) => (v >= 0 ? '+₹' : '−₹') + num(Math.abs(v));
export const pct = (v: number) => (isFinite(v) ? (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2) + '%' : '—');
export const cls = (v: number) => (v >= 0 ? 'good' : 'bad');
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 864e5);
export const fmtDate = (d: string | number | Date) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const N = (v: unknown): number | null => {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && isFinite(+v.replace(/,/g, ''))) return +v.replace(/,/g, '');
  return null;
};

export function brokerCol(b: string | undefined): string {
  if (!b) return '#8B98A5';
  const BROKER_COL: Record<string, string> = { 'ICICI Direct': '#F08A3E', 'MOSL Rise': '#6FA8FF', Zerodha: '#5AA9E6', Groww: '#4CC38A', Upstox: '#A08CF5', CoinDCX: '#F07B3F' };
  const PALETTE = ['#E58FB8', '#8FD3E5', '#C8B560', '#9BD88F', '#E5A98F', '#B3A4F2'];
  if (BROKER_COL[b]) return BROKER_COL[b];
  let sum = 0;
  for (const c of String(b)) sum += c.charCodeAt(0);
  return PALETTE[sum % PALETTE.length];
}
