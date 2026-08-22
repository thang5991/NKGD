import React, { useMemo } from 'react';
import { BarChart3, Clock3, Trophy } from 'lucide-react';
import { Trade } from '../../types/trade';
import { classifyTradeResult } from '../../utils/calculator';
import { formatMoney, formatPercent, formatR } from '../../utils/formatters';
import { useAccounts } from '../../hooks/useAccounts';

interface TimeframeAnalyticsProps {
  trades: Trade[];
}

interface TimeframeStats {
  timeframe: string;
  trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  profitFactor: number;
  pnl: number;
  avgPnl: number;
  avgR: number;
  avgHoldingTime: number | null;
  holdingSamples: number;
}

const TIMEFRAME_ORDER = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'];

function formatDuration(milliseconds: number | null): string {
  if (milliseconds === null) return '—';
  const minutes = Math.round(milliseconds / 60_000);
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return remainingMinutes ? `${hours}g ${remainingMinutes}p` : `${hours} giờ`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days} ngày ${remainingHours}g` : `${days} ngày`;
}

function formatProfitFactor(value: number): string {
  return value === Infinity ? '∞' : value.toFixed(2);
}

export const TimeframeAnalytics: React.FC<TimeframeAnalyticsProps> = ({ trades }) => {
  const { activeAccount } = useAccounts();
  const currency = activeAccount?.currency;

  const rows = useMemo<TimeframeStats[]>(() => {
    const groups = new Map<string, Trade[]>();
    for (const trade of trades) {
      const timeframe = String(trade.timeframe || 'Chưa đặt').toUpperCase();
      groups.set(timeframe, [...(groups.get(timeframe) || []), trade]);
    }

    return Array.from(groups.entries()).map(([timeframe, items]) => {
      const results = items.map((trade) => classifyTradeResult(trade.pnl, trade.riskAmount, trade.rMultiple));
      const wins = results.filter((result) => result === 'win').length;
      const losses = results.filter((result) => result === 'loss').length;
      const breakeven = results.filter((result) => result === 'be').length;
      const grossProfit = items.filter((trade) => trade.pnl > 0).reduce((sum, trade) => sum + trade.pnl, 0);
      const grossLoss = Math.abs(items.filter((trade) => trade.pnl < 0).reduce((sum, trade) => sum + trade.pnl, 0));
      const pnl = items.reduce((sum, trade) => sum + trade.pnl, 0);
      const validRs = items.map((trade) => trade.rMultiple).filter(Number.isFinite);
      const holdingTimes = items.flatMap((trade) => {
        if (!trade.exitDate) return [];
        const duration = new Date(trade.exitDate).getTime() - new Date(trade.date).getTime();
        return Number.isFinite(duration) && duration >= 0 ? [duration] : [];
      });

      return {
        timeframe,
        trades: items.length,
        wins,
        losses,
        breakeven,
        winRate: items.length ? (wins / items.length) * 100 : 0,
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
        pnl,
        avgPnl: items.length ? pnl / items.length : 0,
        avgR: validRs.length ? validRs.reduce((sum, value) => sum + value, 0) / validRs.length : 0,
        avgHoldingTime: holdingTimes.length ? holdingTimes.reduce((sum, value) => sum + value, 0) / holdingTimes.length : null,
        holdingSamples: holdingTimes.length,
      };
    }).sort((a, b) => {
      const aIndex = TIMEFRAME_ORDER.indexOf(a.timeframe);
      const bIndex = TIMEFRAME_ORDER.indexOf(b.timeframe);
      if (aIndex === -1 && bIndex === -1) return a.timeframe.localeCompare(b.timeframe);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [trades]);

  const bestTimeframe = rows.length
    ? [...rows].sort((a, b) => b.pnl - a.pnl || b.trades - a.trades)[0]
    : null;

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <header className="flex flex-col gap-3 border-b border-line bg-surface-2/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"><BarChart3 className="h-4 w-4" /></span>
          <div>
            <h3 className="text-sm font-bold text-text">Hiệu suất theo Timeframe</h3>
            <p className="mt-0.5 text-[10px] text-muted">So sánh thời gian giữ lệnh, Win Rate, Profit Factor, P&L và Average R giữa các khung thời gian.</p>
          </div>
        </div>
        {bestTimeframe && (
          <div className="flex items-center gap-2 rounded-lg border border-accent-border bg-accent-soft px-3 py-2">
            <Trophy className="h-3.5 w-3.5 text-accent" />
            <span className="text-[9px] uppercase text-muted">P&L cao nhất</span>
            <strong className="font-mono text-xs text-accent">{bestTimeframe.timeframe} · {formatMoney(bestTimeframe.pnl, true, currency)}</strong>
          </div>
        )}
      </header>

      {rows.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted">Chưa có giao dịch để phân tích theo timeframe.</div>
      ) : (
        <>
          <div className="divide-y divide-line sm:hidden">
            {rows.map((row) => <TimeframeCard key={row.timeframe} row={row} currency={currency} />)}
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[900px] text-left text-[11px]">
              <thead className="bg-bg-soft text-[9px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3">Timeframe</th>
                  <th className="px-3 py-3 text-center">Số lệnh</th>
                  <th className="px-3 py-3 text-center">W / L / BE</th>
                  <th className="px-3 py-3 text-right">Giữ lệnh TB</th>
                  <th className="px-3 py-3 text-right">Win Rate</th>
                  <th className="px-3 py-3 text-right">Profit Factor</th>
                  <th className="px-3 py-3 text-right">Average R</th>
                  <th className="px-3 py-3 text-right">P&L / lệnh</th>
                  <th className="px-4 py-3 text-right">Tổng P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {rows.map((row) => (
                  <tr key={row.timeframe} className="transition-colors hover:bg-surface-2/50">
                    <td className="px-4 py-3"><span className="rounded-md border border-line bg-bg-soft px-2 py-1 font-mono text-[10px] font-black text-accent">{row.timeframe}</span></td>
                    <td className="px-3 py-3 text-center font-mono text-text">{row.trades}</td>
                    <td className="px-3 py-3 text-center font-mono"><span className="text-profit">{row.wins}</span> / <span className="text-loss">{row.losses}</span> / <span className="text-muted">{row.breakeven}</span></td>
                    <td className="px-3 py-3 text-right"><strong className="font-mono text-text">{formatDuration(row.avgHoldingTime)}</strong><span className="ml-1 text-[9px] text-muted-2">({row.holdingSamples})</span></td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-text">{formatPercent(row.winRate)}</td>
                    <td className={`px-3 py-3 text-right font-mono font-bold ${row.profitFactor >= 1.5 ? 'text-profit' : row.profitFactor < 1 ? 'text-loss' : 'text-text'}`}>{formatProfitFactor(row.profitFactor)}</td>
                    <td className={`px-3 py-3 text-right font-mono font-bold ${row.avgR > 0 ? 'text-profit' : row.avgR < 0 ? 'text-loss' : 'text-muted'}`}>{formatR(row.avgR)}</td>
                    <td className={`px-3 py-3 text-right font-mono ${row.avgPnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatMoney(row.avgPnl, true, currency)}</td>
                    <td className={`px-4 py-3 text-right font-mono font-black ${row.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatMoney(row.pnl, true, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <footer className="border-t border-line bg-bg-soft/40 px-4 py-2.5 text-[9px] leading-relaxed text-muted-2">
            Win Rate tính trên toàn bộ lệnh, gồm Breakeven trong mẫu số. Lệnh lãi dưới 0.1R được tính là BE. Số trong ngoặc cạnh thời gian giữ lệnh là số lệnh có dữ liệu thời gian hợp lệ.
          </footer>
        </>
      )}
    </section>
  );
};

function TimeframeCard({ row, currency }: { row: TimeframeStats; currency?: string }) {
  return (
    <article className="p-4">
      <div className="flex items-center justify-between"><span className="rounded-md border border-line bg-bg-soft px-2 py-1 font-mono text-[10px] font-black text-accent">{row.timeframe}</span><strong className={`font-mono text-sm ${row.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>{formatMoney(row.pnl, true, currency)}</strong></div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <Metric label="Số lệnh" value={`${row.trades} · ${row.wins}W/${row.losses}L/${row.breakeven}BE`} />
        <Metric label="Giữ lệnh TB" value={formatDuration(row.avgHoldingTime)} icon={<Clock3 className="h-3 w-3" />} />
        <Metric label="Win Rate" value={formatPercent(row.winRate)} />
        <Metric label="Profit Factor" value={formatProfitFactor(row.profitFactor)} />
        <Metric label="Average R" value={formatR(row.avgR)} />
        <Metric label="P&L / lệnh" value={formatMoney(row.avgPnl, true, currency)} />
      </div>
    </article>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="rounded-lg border border-line/60 bg-bg-soft p-2.5"><span className="flex items-center gap-1 text-muted-2">{icon}{label}</span><strong className="mt-1 block font-mono text-text">{value}</strong></div>;
}
