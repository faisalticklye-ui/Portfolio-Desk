'use client';
import { useEffect, useRef, useState } from 'react';
import { Holding, Settings, SipLog, WatchItem } from './types';
import { defaultSettings, seedHoldings, seedWatch } from './seed';

export interface AppData {
  holdings: Holding[];
  settings: Settings;
  watch: WatchItem[];
  sipLog: SipLog;
}

const LS_PORTFOLIO = 'pfd_portfolio';
const LS_WATCH = 'pfd_watchlist';
const LS_SIPLOG = 'pfd_sipLog';

function loadInitial(): AppData {
  if (typeof window === 'undefined') {
    return { holdings: seedHoldings(), settings: defaultSettings(), watch: seedWatch(), sipLog: { entries: {} } };
  }
  try {
    const p = localStorage.getItem(LS_PORTFOLIO);
    const w = localStorage.getItem(LS_WATCH);
    const sl = localStorage.getItem(LS_SIPLOG);
    const portfolio = p ? JSON.parse(p) : null;
    const watchData = w ? JSON.parse(w) : null;
    const sipLog = sl ? JSON.parse(sl) : null;
    return {
      holdings: portfolio && Array.isArray(portfolio.holdings) ? portfolio.holdings : seedHoldings(),
      settings: portfolio && portfolio.settings ? { ...defaultSettings(), ...portfolio.settings } : defaultSettings(),
      watch: watchData && Array.isArray(watchData.items) ? watchData.items : seedWatch(),
      sipLog: sipLog && sipLog.entries ? sipLog : { entries: {} },
    };
  } catch {
    return { holdings: seedHoldings(), settings: defaultSettings(), watch: seedWatch(), sipLog: { entries: {} } };
  }
}

export function usePortfolioStore() {
  const [data, setData] = useState<AppData>(() => ({ holdings: [], settings: defaultSettings(), watch: [], sipLog: { entries: {} } }));
  const [ready, setReady] = useState(false);
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    setData(loadInitial());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(LS_PORTFOLIO, JSON.stringify({ holdings: data.holdings, settings: data.settings, v: 2 }));
    } catch {}
  }, [data.holdings, data.settings, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(LS_WATCH, JSON.stringify({ items: data.watch, v: 2 }));
    } catch {}
  }, [data.watch, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(LS_SIPLOG, JSON.stringify(data.sipLog));
    } catch {}
  }, [data.sipLog, ready]);

  return { data, setData, ready };
}
