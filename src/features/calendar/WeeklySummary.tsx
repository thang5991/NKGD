import React from 'react';
import { Trade } from '../../types/trade';
import { formatMoney, localDateKey } from '../../utils/formatters';
import { useAccounts } from '../../hooks/useAccounts';
import { classifyTradeResult } from '../../utils/calculator';

interface WeeklySummaryProps {
  currentDate: Date;
  trades: Trade[];
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ currentDate, trades }) => {
  const { activeAccount } = useAccounts();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const weeksData = React.useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const jsDay = firstDay.getDay();
    const mondayOffset = (jsDay + 6) % 7;
    let cursor = new Date(year, month, 1 - mondayOffset);

    // Map trades by date
    const dailyPnlMap: Record<string, { pnl: number; count: number; wins: number }> = {};
    trades.forEach((t) => {
      const key = localDateKey(t.date);
      if (!key) return;
      if (!dailyPnlMap[key]) dailyPnlMap[key] = { pnl: 0, count: 0, wins: 0 };
      dailyPnlMap[key].pnl += t.pnl;
      dailyPnlMap[key].count += 1;
      if (classifyTradeResult(t.pnl, t.riskAmount, t.rMultiple) === 'win') dailyPnlMap[key].wins += 1;
    });

    const weeks = [];
    let weekIndex = 1;

    while (cursor <= lastDay) {
      const weekStart = new Date(cursor);
      const weekEnd = new Date(cursor);
      weekEnd.setDate(weekEnd.getDate() + 6);

      let weekPnl = 0;
      let weekTrades = 0;
      let weekWins = 0;

      for (let i = 0; i < 7; i++) {
        const d = new Date(cursor);
        d.setDate(cursor.getDate() + i);

        // only count days in this month
        if (d.getMonth() === month) {
          const rec = dailyPnlMap[localDateKey(d)];
          if (rec) {
            weekPnl += rec.pnl;
            weekTrades += rec.count;
            weekWins += rec.wins;
          }
        }
      }

      const displayStart = weekStart < firstDay ? firstDay : weekStart;
      const displayEnd = weekEnd > lastDay ? lastDay : weekEnd;

      weeks.push({
        weekNum: weekIndex,
        startDay: displayStart.getDate(),
        endDay: displayEnd.getDate(),
        monthNum: month + 1,
        pnl: Number(weekPnl.toFixed(2)),
        tradesCount: weekTrades,
        winRate: weekTrades > 0 ? (weekWins / weekTrades) * 100 : 0,
      });

      cursor.setDate(cursor.getDate() + 7);
      weekIndex++;
    }

    return weeks;
  }, [year, month, trades]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {weeksData.map((w) => {
        const isProfit = w.pnl > 0;
        const isLoss = w.pnl < 0;

        return (
          <div
            key={w.weekNum}
            className="bg-surface border border-line rounded-xl p-3.5 flex flex-col justify-between shadow-sm hover:border-line-strong transition-colors"
          >
            <div>
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span className="font-semibold text-text">Tuần {w.weekNum}</span>
                <span className="text-[10px] text-muted-2">
                  {w.startDay}–{w.endDay}/{w.monthNum}
                </span>
              </div>

              <div
                className={`font-mono font-bold text-base mt-2 ${
                  isProfit ? 'text-profit' : isLoss ? 'text-loss' : 'text-muted'
                }`}
              >
                {formatMoney(w.pnl, true, activeAccount?.currency)}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-muted-2 mt-2 pt-2 border-t border-line/60">
              <span>{w.tradesCount} giao dịch</span>
              {w.tradesCount > 0 && <span>WR: {w.winRate.toFixed(0)}%</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
