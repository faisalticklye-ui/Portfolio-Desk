'use client';
import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Tabs, { TabKey } from '../components/Tabs';
import PortfolioTab from '../components/PortfolioTab';
import WatchlistTab from '../components/WatchlistTab';
import FindingsTab from '../components/FindingsTab';
import HoldingModal from '../components/HoldingModal';
import PricesModal from '../components/PricesModal';
import Toast from '../components/Toast';
import { usePortfolioStore } from '../lib/store';
import { computeFindings } from '../lib/calc';
import { Holding, Settings } from '../lib/types';

export default function Home() {
  const { data, setData, ready } = usePortfolioStore();
  const [tab, setTab] = useState<TabKey>('portfolio');
  const [modal, setModal] = useState<null | { kind: 'holding'; editId: string | null; initType?: string } | { kind: 'prices' }>(null);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 2600);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const toast = (m: string) => setToastMsg(m);

  const setHoldings = (f: (h: Holding[]) => Holding[]) => setData((d) => ({ ...d, holdings: f(d.holdings) }));
  const setSettings = (f: (s: Settings) => Settings) => setData((d) => ({ ...d, settings: f(d.settings) }));
  const setWatch = (f: (w: typeof data.watch) => typeof data.watch) => setData((d) => ({ ...d, watch: f(d.watch) }));
  const setSipLog = (f: (s: typeof data.sipLog) => typeof data.sipLog) => setData((d) => ({ ...d, sipLog: f(d.sipLog) }));

  if (!ready) {
    return (
      <div className="wrap">
        <div className="sub" style={{ padding: 40 }}>Loading…</div>
      </div>
    );
  }

  const findingsCount = computeFindings(data.holdings, data.settings, data.watch, {}, data.sipLog).filter((f) => f.sev === 'high' || f.sev === 'med').length;

  function uidGen() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function saveHolding(h: Holding, editId: string | null) {
    if (editId) {
      setHoldings((hs) => hs.map((x) => (x.id === editId ? { ...h, id: editId } : x)));
      toast('Updated ' + (h.sym || h.name));
    } else {
      setHoldings((hs) => [...hs, { ...h, id: uidGen() }]);
      toast('Added ' + (h.sym || h.name));
    }
    setModal(null);
  }

  return (
    <div className="wrap">
      <Header holdings={data.holdings} onAdd={() => setModal({ kind: 'holding', editId: null })} onPrices={() => setModal({ kind: 'prices' })} />
      <Tabs tab={tab} onChange={setTab} counts={{ portfolio: data.holdings.length, watchlist: data.watch.length, findings: findingsCount }} />
      <main>
        {tab === 'portfolio' && (
          <PortfolioTab
            holdings={data.holdings}
            setHoldings={setHoldings}
            settings={data.settings}
            setSettings={setSettings}
            sipLog={data.sipLog}
            setSipLog={setSipLog}
            onAdd={(type) => setModal({ kind: 'holding', editId: null, initType: type })}
            onEdit={(id) => setModal({ kind: 'holding', editId: id })}
            toast={toast}
          />
        )}
        {tab === 'watchlist' && <WatchlistTab watch={data.watch} setWatch={setWatch} holdings={data.holdings} toast={toast} />}
        {tab === 'findings' && <FindingsTab holdings={data.holdings} settings={data.settings} watch={data.watch} sipLog={data.sipLog} />}
      </main>
      <footer>
        <div>
          <b>Live data</b> is not available in this standalone export — the original artifact&apos;s AI-powered stock lookup (Claude sampling) and the Alpha Vantage market connector only exist inside Claude.ai&apos;s sandbox. Enter prices manually via <b>Update prices</b>; everything else recalculates instantly.
        </div>
        <div>Watchlist analysis and the analyst brief normally use Claude from training knowledge, not live data, and are disabled here exactly as the original falls back when that connector is absent. This is research support, not SEBI-registered investment advice.</div>
      </footer>
      {modal?.kind === 'holding' && (
        <HoldingModal
          editId={modal.editId}
          holdings={data.holdings}
          settings={data.settings}
          initialType={modal.initType}
          onClose={() => setModal(null)}
          onSave={saveHolding}
        />
      )}
      {modal?.kind === 'prices' && (
        <PricesModal
          holdings={data.holdings}
          settings={data.settings}
          onClose={() => setModal(null)}
          onSave={(s, hs) => { setData((d) => ({ ...d, settings: s, holdings: hs })); setModal(null); toast('Prices saved'); }}
        />
      )}
      <Toast msg={toastMsg} />
    </div>
  );
}
