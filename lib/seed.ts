import { uid } from './format';
import { Holding, Settings, WatchItem, OZ } from './types';

export const SAMPLE_DATE = '2026-09-20';

function s(o: Partial<Holding> & { type: Holding['type']; name: string; broker: string; mode: Holding['mode']; qty: number; avg: number }): Holding {
  return {
    id: uid(),
    sample: true,
    currency: 'INR',
    exchange: 'NSE',
    priceAt: SAMPLE_DATE,
    sipStatus: 'Active',
    ...o,
  } as Holding;
}

export function seedHoldings(): Holding[] {
  return [
    s({ type: 'stock', sym: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy & Conglomerate', broker: 'ICICI Direct', mode: 'Lumpsum', qty: 40, avg: 1250, price: 1392, prev: 1378, date: '2023-06-12' }),
    s({ type: 'stock', sym: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', broker: 'ICICI Direct', mode: 'Lumpsum', qty: 120, avg: 780, price: 965, prev: 972, date: '2022-11-03' }),
    s({ type: 'stock', sym: 'INFY', name: 'Infosys', sector: 'IT Services', broker: 'ICICI Direct', mode: 'SIP', sipAmt: 3000, sipFreq: 'Monthly', sipDay: 7, qty: 50, avg: 1450, price: 1512, prev: 1489, date: '2023-02-07' }),
    s({ type: 'stock', sym: 'TITAN', name: 'Titan Company', sector: 'Consumer', broker: 'ICICI Direct', mode: 'Lumpsum', qty: 12, avg: 2900, price: 3410, prev: 3446, date: '2023-09-05' }),
    s({ type: 'stock', sym: 'ITC', name: 'ITC', sector: 'FMCG', broker: 'MOSL Rise', mode: 'Lumpsum', qty: 250, avg: 385, price: 412, prev: 409, date: '2023-04-18' }),
    s({ type: 'stock', sym: 'LT', name: 'Larsen & Toubro', sector: 'Capital Goods', broker: 'MOSL Rise', mode: 'Lumpsum', qty: 15, avg: 3150, price: 3620, prev: 3571, date: '2023-08-01' }),
    s({ type: 'stock', sym: 'SBIN', name: 'State Bank of India', sector: 'Banking', broker: 'MOSL Rise', mode: 'Lumpsum', qty: 100, avg: 590, price: 812, prev: 818, date: '2022-12-14' }),
    s({ type: 'stock', sym: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom', broker: 'MOSL Rise', mode: 'Lumpsum', qty: 30, avg: 1120, price: 1905, prev: 1880, date: '2023-11-22' }),
    s({ type: 'mf', name: 'Parag Parikh Flexi Cap', code: '122639', category: 'Flexi cap', plan: 'Direct', option: 'Growth', broker: 'ICICI Direct', mode: 'SIP', sipAmt: 10000, sipFreq: 'Monthly', sipDay: 5, qty: 1850.4, avg: 58.2, price: 86.5, prev: 86.1, date: '2023-03-05', exchange: '' }),
    s({ type: 'mf', name: 'SBI Small Cap', code: '125497', category: 'Small cap', plan: 'Direct', option: 'Growth', broker: 'ICICI Direct', mode: 'SIP', sipAmt: 5000, sipFreq: 'Monthly', sipDay: 10, qty: 420.7, avg: 128, price: 185, prev: 186.2, date: '2023-01-10', exchange: '' }),
    s({ type: 'mf', name: 'HDFC Mid-Cap Opportunities', code: '118989', category: 'Mid cap', plan: 'Direct', option: 'Growth', broker: 'MOSL Rise', mode: 'SIP', sipAmt: 7500, sipFreq: 'Monthly', sipDay: 15, qty: 610.2, avg: 120, price: 205, prev: 204.1, date: '2022-10-15', exchange: '' }),
    s({ type: 'mf', name: 'Mirae Asset Large Cap', code: '118825', category: 'Large cap', plan: 'Regular', option: 'Growth', broker: 'MOSL Rise', mode: 'SIP', sipAmt: 5000, sipFreq: 'Monthly', sipDay: 20, qty: 900.5, avg: 92, price: 118, prev: 117.6, date: '2023-05-20', exchange: '' }),
    s({ type: 'mf', name: 'Axis Large Cap', code: '120465', category: 'Large cap', plan: 'Direct', option: 'Growth', broker: 'MOSL Rise', mode: 'Lumpsum', qty: 1500, avg: 48, price: 62, prev: 62.2, date: '2022-08-08', exchange: '' }),
    s({ type: 'etf', sym: 'NIFTYBEES', name: 'Nippon India ETF Nifty 50 BeES', underlying: 'Nifty 50', category: 'Equity index', broker: 'ICICI Direct', mode: 'SIP', sipAmt: 5000, sipFreq: 'Monthly', sipDay: 3, qty: 380, avg: 238, price: 284, prev: 283.1, date: '2023-07-03' }),
    s({ type: 'etf', sym: 'MON100', name: 'Motilal Oswal Nasdaq 100 ETF', underlying: 'Nasdaq-100', category: 'International', broker: 'MOSL Rise', mode: 'Lumpsum', qty: 600, avg: 128, price: 176, prev: 177.4, date: '2023-10-11' }),
    s({ type: 'etf', sym: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', underlying: 'Gold (domestic price)', category: 'Gold', broker: 'MOSL Rise', mode: 'Lumpsum', qty: 900, avg: 52, price: 88, prev: 87.4, date: '2024-01-16' }),
    s({ type: 'gold', name: '24K coins & bars', form: 'Physical', purity: '24K', broker: 'Jeweller / Physical', mode: 'Lumpsum', qty: 20, avg: 6200, useRef: true, date: '2023-11-10', exchange: '' }),
    s({ type: 'gold', name: 'Digital gold', form: 'Digital gold', purity: '24K', broker: 'ICICI Direct', mode: 'SIP', sipAmt: 2000, sipFreq: 'Monthly', sipDay: 25, qty: 6.2, avg: 8100, useRef: true, date: '2024-12-25', exchange: '' }),
    s({ type: 'btc', name: 'Bitcoin', custody: 'Exchange', broker: 'CoinDCX', mode: 'SIP', sipAmt: 2500, sipFreq: 'Monthly', sipDay: 1, qty: 0.0125, avg: 5600000, useRef: true, date: '2024-06-01', exchange: '' }),
  ];
}

export function defaultSettings(): Settings {
  const usdInr = 88.2;
  return {
    fx: { usdInr, usdKwd: 0.306 },
    ref: { gold: Math.round((3650 * usdInr) / OZ), silver: Math.round(((42 * usdInr) / OZ) * 1000), btc: Math.round(112000 * usdInr), at: null },
    refHist: { gold: [], silver: [], btc: [] },
  };
}

export function seedWatch(): WatchItem[] {
  return [
    { t: 'TCS', ex: 'NSE', name: 'Tata Consultancy Services', ltp: null, ltpAt: null, added: SAMPLE_DATE, sample: true },
    { t: 'MSFT', ex: 'NASDAQ', name: 'Microsoft', ltp: null, ltpAt: null, added: SAMPLE_DATE, sample: true },
  ];
}
