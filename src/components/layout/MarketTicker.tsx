import React, { useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { getFxRate } from '../../db/fxRateRepository';
import { getMarketSessions } from '../../utils/marketSessions';

const PAIRS = [
  { symbol: 'EUR/USD', base: 'EUR', quote: 'USD', decimals: 5 },
  { symbol: 'GBP/USD', base: 'GBP', quote: 'USD', decimals: 5 },
  { symbol: 'USD/JPY', base: 'USD', quote: 'JPY', decimals: 3 },
  { symbol: 'USD/CHF', base: 'USD', quote: 'CHF', decimals: 5 },
  { symbol: 'AUD/USD', base: 'AUD', quote: 'USD', decimals: 5 },
  { symbol: 'NZD/USD', base: 'NZD', quote: 'USD', decimals: 5 },
] as const;

interface TickerRate { symbol: string; value: string }

export const MarketTicker: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const [rates, setRates] = useState<TickerRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const loadRates = async () => {
      try {
        setError(false);
        const today = new Date().toISOString().slice(0, 10);
        const results = await Promise.all(PAIRS.map(async (pair) => {
          const result = await getFxRate(pair.base, pair.quote, today);
          return { symbol: pair.symbol, value: result.rate.toFixed(pair.decimals) };
        }));
        if (active) setRates(results);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadRates();
    const timer = window.setInterval(() => void loadRates(), 5 * 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const sessions = useMemo(() => getMarketSessions(now), [now]);
  const items = (
    <div className="flex shrink-0 items-center gap-5 pr-5">
      {sessions.map((session) => <span key={session.id} className="inline-flex items-center gap-1.5 whitespace-nowrap"><i className={`h-1.5 w-1.5 rounded-full ${session.isOpen ? 'bg-profit shadow-[0_0_6px_rgba(57,217,138,.7)]' : 'bg-muted-2'}`} /><b className="text-text">{session.name}</b><span>{session.localTime}</span><em className={session.isOpen ? 'not-italic text-profit' : 'not-italic text-muted-2'}>{session.isOpen ? 'Mở' : 'Đóng'}</em></span>)}
      <span className="h-3 w-px bg-line-strong" />
      {rates.map((rate) => <span key={rate.symbol} className="whitespace-nowrap"><b className="text-muted">{rate.symbol}</b> <strong className="ml-1 font-mono text-text">{rate.value}</strong></span>)}
      {loading && <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><RefreshCw className="h-3 w-3 animate-spin" /> Đang lấy tỷ giá...</span>}
      {error && !loading && <span className="whitespace-nowrap text-amber">Tỷ giá tạm thời gián đoạn</span>}
    </div>
  );

  return (
    <div className="mb-2 flex h-8 items-center overflow-hidden rounded-lg border border-line bg-bg-soft text-[10px] text-muted shadow-sm" aria-label="Thông tin thị trường">
      <div className="z-10 flex h-full shrink-0 items-center gap-1.5 border-r border-line bg-surface px-2.5 font-bold uppercase tracking-wider text-accent">
        <Activity className="h-3.5 w-3.5" /> Market
      </div>
      <div className="market-ticker-track flex min-w-max items-center pl-5 hover:[animation-play-state:paused]">
        {items}<div aria-hidden="true">{items}</div>
      </div>
    </div>
  );
};
