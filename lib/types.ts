export type HoldingType = 'stock' | 'mf' | 'etf' | 'gold' | 'btc';
export type Mode = 'SIP' | 'Lumpsum';

export interface Holding {
  id: string;
  sample?: boolean;
  type: HoldingType;
  sym?: string;
  name: string;
  sector?: string;
  category?: string;
  plan?: string;
  option?: string;
  folio?: string;
  code?: string;
  underlying?: string;
  form?: string;
  purity?: string;
  custody?: string;
  broker: string;
  mode: Mode;
  exchange?: string;
  currency: string;
  qty: number;
  avg: number;
  price?: number | null;
  prev?: number | null;
  useRef?: boolean;
  priceAt?: string;
  priceSrc?: string;
  navDate?: string;
  date?: string;
  sipAmt?: number | null;
  sipFreq?: 'Monthly' | 'Weekly' | 'Quarterly';
  sipDay?: number | null;
  sipWeekday?: string;
  stepUp?: number | null;
  sipStatus?: 'Active' | 'Paused';
  sipEnd?: string | null;
  notes?: string;
  quoteSym?: string;
}

export interface EnrichedHolding extends Holding {
  p: number;
  value: number;
  inv: number;
  pnl: number;
  pnlPct: number;
  day: number;
  dayPct: number;
  held: number;
}

export interface WatchItem {
  t: string;
  ex: string;
  name?: string;
  ltp: number | null;
  ltpAt: string | null;
  added: string;
  sample?: boolean;
}

export interface FxSettings {
  usdInr: number;
  usdKwd: number;
}
export interface RefPrices {
  gold: number;
  silver: number;
  btc: number;
  at: string | null;
  prem?: number;
}
export interface Settings {
  fx: FxSettings;
  ref: RefPrices;
  refHist?: { gold: { t: string; v: number }[]; silver: { t: string; v: number }[]; btc: { t: string; v: number }[] };
  lastLive?: string | null;
}

export interface SipLogEntry {
  hid: string;
  name: string;
  due: string;
  status: 'approved' | 'skipped';
  amt?: number;
  units?: number;
  nav?: number;
  chg?: number;
  date?: string;
  ref?: string;
  notes?: string;
  prev?: { qty: number; avg: number };
  next?: { qty: number; avg: number };
  at: string;
}

export interface SipLog {
  entries: Record<string, SipLogEntry>;
}

export interface Finding {
  sev: 'high' | 'med' | 'info' | 'good';
  title: string;
  detail: string;
  tag: string;
}

export const TYPES: Record<HoldingType, { label: string; one: string; hex: string }> = {
  stock: { label: 'Stocks', one: 'Stock', hex: '#6FA8FF' },
  mf: { label: 'Mutual funds', one: 'Mutual fund', hex: '#A08CF5' },
  etf: { label: 'ETFs', one: 'ETF', hex: '#43C6C0' },
  gold: { label: 'Gold', one: 'Gold', hex: '#D9B45B' },
  btc: { label: 'Bitcoin', one: 'Bitcoin', hex: '#F07B3F' },
};
export const TYPE_ORDER: HoldingType[] = ['stock', 'mf', 'etf', 'gold', 'btc'];
export const EXCH: Record<string, string> = { NSE: 'INR', BSE: 'INR', NASDAQ: 'USD', NYSE: 'USD', 'NYSE Arca': 'USD', LSE: 'GBP', Other: 'INR' };
export const CUR_SYM: Record<string, string> = { INR: '₹', USD: '$', GBP: '£' };
export const BROKER_COL: Record<string, string> = { 'ICICI Direct': '#F08A3E', 'MOSL Rise': '#6FA8FF', Zerodha: '#5AA9E6', Groww: '#4CC38A', Upstox: '#A08CF5', CoinDCX: '#F07B3F' };
export const PALETTE = ['#E58FB8', '#8FD3E5', '#C8B560', '#9BD88F', '#E5A98F', '#B3A4F2'];
export const BROKERS = ['ICICI Direct', 'MOSL Rise', 'Zerodha', 'Groww', 'Upstox', 'Angel One', 'HDFC Sky', 'Kotak Neo', 'Coin by Zerodha', 'Kuvera', 'INDmoney', 'Vested', 'Interactive Brokers', 'CoinDCX', 'WazirX', 'Binance', 'Jeweller / Physical', 'RBI Retail Direct'];
export const OZ = 31.1035;
