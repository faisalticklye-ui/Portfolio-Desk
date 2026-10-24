'use client';
import React, { useEffect, useState } from 'react';
import { Holding } from '../lib/types';

function marketOpen(tz: string, o: number, c: number): boolean {
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false }).formatToParts(new Date());
    const g = (t: string) => (p.find((x) => x.type === t) || {}).value || '';
    const m = (+g('hour') % 24) * 60 + +g('minute');
    return !['Sat', 'Sun'].includes(g('weekday')) && m >= o && m < c;
  } catch {
    return false;
  }
}

export default function Header({ holdings, onAdd, onPrices }: { holdings: Holding[]; onAdd: () => void; onPrices: () => void }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);
  const nse = marketOpen('Asia/Kolkata', 555, 930);
  const us = marketOpen('America/New_York', 570, 960);
  const brokers = [...new Set(holdings.map((h) => h.broker).filter(Boolean))];
  void tick;
  return (
    <header className="top">
      <div>
        <div className="eyebrow">{(brokers.length ? brokers.slice(0, 3).join(' + ') + (brokers.length > 3 ? ' +' + (brokers.length - 3) : '') : 'Portfolio desk') + ' · INR'}</div>
        <h1>My Portfolio</h1>
      </div>
      <div className="top-r">
        <span className="pill">
          <span className="dot" style={{ background: nse ? 'var(--good)' : 'var(--bad)' }} />
          NSE {nse ? 'open' : 'closed'}
        </span>
        <span className="pill">
          <span className="dot" style={{ background: us ? 'var(--good)' : 'var(--bad)' }} />
          US {us ? 'open' : 'closed'}
        </span>
        <span className="pill" title="Where your holdings are stored">
          <span className="dot" style={{ background: 'var(--warn)' }} />
          Saved in this browser only
        </span>
        <button className="btn" disabled title="Live refresh needs a market-data connector that only exists inside Claude.ai — unavailable here.">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 11a8 8 0 1 0-2.3 5.7" />
            <path d="M20 4v7h-7" />
          </svg>
          <span>Refresh</span>
        </button>
        <button className="btn" onClick={onPrices}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 17l6-6 4 4 8-8" />
            <path d="M15 7h6v6" />
          </svg>
          Update prices
        </button>
        <button className="fab" aria-label="Add a new holding" title="Add a new holding" onClick={onAdd}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </header>
  );
}
