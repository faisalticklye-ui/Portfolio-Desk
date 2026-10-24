'use client';
import React from 'react';

export type TabKey = 'portfolio' | 'watchlist' | 'findings';

export default function Tabs({
  tab,
  onChange,
  counts,
}: {
  tab: TabKey;
  onChange: (t: TabKey) => void;
  counts: { portfolio: number; watchlist: number; findings: number };
}) {
  const items: [TabKey, string, number][] = [
    ['portfolio', 'Portfolio', counts.portfolio],
    ['watchlist', 'Watchlist', counts.watchlist],
    ['findings', 'Findings', counts.findings],
  ];
  return (
    <nav className="tabs" role="tablist">
      {items.map(([k, l, c]) => (
        <button key={k} className="tab" role="tab" aria-selected={tab === k} onClick={() => onChange(k)}>
          {l}
          <span className="count">{c}</span>
        </button>
      ))}
    </nav>
  );
}
