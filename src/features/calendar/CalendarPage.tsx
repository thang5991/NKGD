import React, { useState, useMemo } from 'react';
import { useTrades } from '../../hooks/useTrades';
import { StatCard } from '../../components/common/StatCard';
import { CalendarGrid } from './CalendarGrid';
import { WeeklySummary } from './WeeklySummary';
import { formatMoney, localDateKey, formatDateTime, formatR } from '../../utils/formatters';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, DollarSign, Award, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import { Trade } from '../../types/trade';

interface CalendarPageProps {
  onSelectTrade: (trade: Trade) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ onSelectTrade }) => {
  const { trades } = useTrades();
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const prevMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
    setSelectedDayKey(null);
  };

  const nextMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
    setSelectedDayKey(null);
  };

  const resetToToday = () => {
    const d = new Date();
    d.setDate(1);
    setCurrentDate(d);
    setSelectedDayKey(null);
  };

  const monthStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthTrades = trades.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const monthPnl = monthTrades.reduce((sum, t) => sum + t.pnl, 0);

    // Group by day to find win/loss days & best day
    const dayMap: Record<string, number> = {};
    monthTrades.forEach((t) => {
      const k = localDateKey(t.date);
      dayMap[k] = (dayMap[k] || 0) + t.pnl;
    });

    const dayEntries = Object.entries(dayMap);
    const winDays = dayEntries.filter(([, pnl]) => pnl > 0).length;
    const lossDays = dayEntries.filter(([, pnl]) => pnl < 0).length;

    let bestDayPnl = 0;
    let bestDayDate = '—';

    dayEntries.forEach(([k, pnl]) => {
      if (pnl > bestDayPnl) {
        bestDayPnl = pnl;
        const d = new Date(k);
        bestDayDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
          .toString()
          .padStart(2, '0')}`;
      }
    });

    return {
      monthPnl,
      totalTrades: monthTrades.length,
      winDays,
      lossDays,
      bestDayPnl,
      bestDayDate,
    };
  }, [trades, currentDate]);

  const selectedDayTrades = useMemo(() => {
    if (!selectedDayKey) return [];
    return trades.filter((t) => localDateKey(t.date) === selectedDayKey);
  }, [trades, selectedDayKey]);

  const monthTitle = `Tháng ${currentDate.getMonth() + 1} / ${currentDate.getFullYear()}`;

  return (
    <div className="space-y-6">
      {/* Month Navigation Toolbar */}
      <div className="bg-surface border border-line rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-accent" />
          <h2 className="text-base font-bold text-text tracking-tight">Lịch Hiệu suất P&L</h2>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={prevMonth}
            className="p-2 text-muted hover:text-text rounded-lg hover:bg-surface-2 border border-line transition-colors"
            title="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={resetToToday}
            className="px-4 py-1.5 text-xs font-bold text-text bg-surface-2 hover:bg-surface-3 rounded-lg border border-line-strong transition-all min-w-[150px] text-center"
          >
            {monthTitle}
          </button>

          <button
            onClick={nextMonth}
            className="p-2 text-muted hover:text-text rounded-lg hover:bg-surface-2 border border-line transition-colors"
            title="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="P&L Trong Tháng"
          value={formatMoney(monthStats.monthPnl, true)}
          subValue={`${monthStats.totalTrades} giao dịch trong tháng`}
          trend={monthStats.monthPnl > 0 ? 'profit' : monthStats.monthPnl < 0 ? 'loss' : 'neutral'}
          icon={<DollarSign className="w-4 h-4 text-accent" />}
        />

        <StatCard
          label="Ngày Thắng (Win Days)"
          value={`${monthStats.winDays} ngày`}
          subValue="Số ngày kết thúc P&L dương"
          trend={monthStats.winDays > 0 ? 'profit' : 'neutral'}
        />

        <StatCard
          label="Ngày Thua (Loss Days)"
          value={`${monthStats.lossDays} ngày`}
          subValue="Số ngày kết thúc P&L âm"
          trend={monthStats.lossDays > 0 ? 'loss' : 'neutral'}
        />

        <StatCard
          label="Ngày Tốt Nhất"
          value={monthStats.bestDayPnl > 0 ? formatMoney(monthStats.bestDayPnl, true) : '—'}
          subValue={monthStats.bestDayPnl > 0 ? `Ngày ${monthStats.bestDayDate}` : 'Chưa có lệnh thắng'}
          trend={monthStats.bestDayPnl > 0 ? 'profit' : 'neutral'}
          icon={<Award className="w-4 h-4 text-accent" />}
        />
      </div>

      {/* Calendar Grid */}
      <CalendarGrid
        currentDate={currentDate}
        trades={trades}
        onSelectDate={(key) => setSelectedDayKey(key)}
      />

      {/* Selected Day Details Panel */}
      {selectedDayKey && (
        <div className="bg-surface border border-line-strong rounded-xl p-5 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
            <div>
              <h3 className="text-sm font-bold text-text">
                Chi tiết Giao dịch ngày {new Date(selectedDayKey).toLocaleDateString('vi-VN')}
              </h3>
              <p className="text-xs text-muted">
                {selectedDayTrades.length} giao dịch · Tổng P&L:{' '}
                <span
                  className={`font-mono font-bold ${
                    selectedDayTrades.reduce((s, t) => s + t.pnl, 0) >= 0
                      ? 'text-profit'
                      : 'text-loss'
                  }`}
                >
                  {formatMoney(
                    selectedDayTrades.reduce((s, t) => s + t.pnl, 0),
                    true
                  )}
                </span>
              </p>
            </div>
            <button
              onClick={() => setSelectedDayKey(null)}
              className="p-1.5 text-muted hover:text-text rounded-md hover:bg-surface-3 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedDayTrades.length === 0 ? (
            <div className="text-xs text-muted py-3">Không có giao dịch nào trong ngày này.</div>
          ) : (
            <div className="space-y-2">
              {selectedDayTrades.map((trade) => (
                <div
                  key={trade.id}
                  onClick={() => onSelectTrade(trade)}
                  className="flex items-center justify-between p-3 rounded-lg bg-bg-soft hover:bg-surface-2 border border-line/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                        trade.side === 'Long'
                          ? 'bg-profit-soft text-profit border-profit/25'
                          : 'bg-loss-soft text-loss border-loss/25'
                      }`}
                    >
                      {trade.side === 'Long' ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {trade.side}
                    </span>
                    <div>
                      <span className="font-bold text-xs text-text mr-2">{trade.symbol}</span>
                      <span className="text-[11px] text-muted">{trade.setup || 'Giao dịch'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-[11px] text-muted-2 font-mono">
                      {formatDateTime(trade.date)}
                    </span>
                    <span
                      className={`font-mono font-bold text-xs ${
                        trade.pnl > 0 ? 'text-profit' : trade.pnl < 0 ? 'text-loss' : 'text-muted'
                      }`}
                    >
                      {formatMoney(trade.pnl, true)}
                    </span>
                    <span
                      className={`font-mono text-xs font-semibold ${
                        trade.rMultiple > 0
                          ? 'text-profit'
                          : trade.rMultiple < 0
                          ? 'text-loss'
                          : 'text-muted'
                      }`}
                    >
                      {formatR(trade.rMultiple)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weekly Breakdown Summary */}
      <div className="bg-surface border border-line rounded-xl p-4 shadow-sm">
        <div className="border-b border-line pb-2.5 mb-3">
          <h3 className="text-sm font-semibold text-text tracking-tight">Tổng kết theo Tuần</h3>
          <p className="text-[11px] text-muted">Hiệu suất và số giao dịch từng tuần trong tháng</p>
        </div>
        <WeeklySummary currentDate={currentDate} trades={trades} />
      </div>
    </div>
  );
};
