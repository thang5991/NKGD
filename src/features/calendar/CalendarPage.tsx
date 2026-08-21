import React, { useState, useMemo } from 'react';
import { useTrades } from '../../hooks/useTrades';
import { StatCard } from '../../components/common/StatCard';
import { CalendarGrid } from './CalendarGrid';
import { WeeklySummary } from './WeeklySummary';
import { formatMoney, localDateKey, formatDateTime, formatR } from '../../utils/formatters';
import { DateRangePicker } from '../../components/common/DateRangePicker';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, DollarSign, Award, ArrowUpRight, ArrowDownRight, X, Filter, RotateCcw } from 'lucide-react';
import { Trade } from '../../types/trade';
import { useAccounts } from '../../hooks/useAccounts';

interface CalendarPageProps {
  onSelectTrade: (trade: Trade) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ onSelectTrade }) => {
  const { trades } = useTrades();
  const { activeAccount } = useAccounts();
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);

  const changeMonth = (offset: number) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + offset);
      if (dateRange) {
        const targetKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const firstMonth = dateRange.from.slice(0, 7);
        const lastMonth = dateRange.to.slice(0, 7);
        if (targetKey < firstMonth || targetKey > lastMonth) return prev;
      }
      return d;
    });
    setSelectedDayKey(null);
  };

  const prevMonth = () => changeMonth(-1);
  const nextMonth = () => changeMonth(1);

  const resetToToday = () => {
    const d = new Date();
    d.setDate(1);
    setCurrentDate(d);
    setSelectedDayKey(null);
  };

  const rangeTrades = useMemo(() => {
    if (!dateRange) return trades;
    return trades.filter((trade) => {
      const key = localDateKey(trade.date);
      return key >= dateRange.from && key <= dateRange.to;
    });
  }, [trades, dateRange]);

  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const monthTrades = useMemo(
    () => rangeTrades.filter((trade) => localDateKey(trade.date).startsWith(monthKey)),
    [rangeTrades, monthKey]
  );
  const statsTrades = dateRange ? rangeTrades : monthTrades;

  const periodStats = useMemo(() => {
    const totalPnl = statsTrades.reduce((sum, t) => sum + t.pnl, 0);

    // Group by day to find win/loss days & best day
    const dayMap: Record<string, number> = {};
    statsTrades.forEach((t) => {
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
        const [year, month, day] = k.split('-');
        bestDayDate = `${day}/${month}/${year}`;
      }
    });

    return {
      totalPnl,
      totalTrades: statsTrades.length,
      winDays,
      lossDays,
      bestDayPnl,
      bestDayDate,
    };
  }, [statsTrades]);

  const selectedDayTrades = useMemo(() => {
    if (!selectedDayKey) return [];
    return rangeTrades.filter((t) => localDateKey(t.date) === selectedDayKey);
  }, [rangeTrades, selectedDayKey]);

  const activateDateRange = (from: string, to: string) => {
    setDateRange({ from, to });
    const [year, month] = from.split('-').map(Number);
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayKey(null);
  };

  const dateToKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPresetRange = (preset: '7d' | '30d' | 'month' | 'year') => {
    const to = new Date();
    const from = new Date(to);
    if (preset === '7d') from.setDate(to.getDate() - 6);
    if (preset === '30d') from.setDate(to.getDate() - 29);
    if (preset === 'month') from.setDate(1);
    if (preset === 'year') from.setMonth(0, 1);
    return { from: dateToKey(from), to: dateToKey(to) };
  };

  const applyPreset = (preset: '7d' | '30d' | 'month' | 'year') => {
    const range = getPresetRange(preset);
    activateDateRange(range.from, range.to);
  };

  const isPresetActive = (preset: '7d' | '30d' | 'month' | 'year') => {
    if (!dateRange) return false;
    const range = getPresetRange(preset);
    return dateRange.from === range.from && dateRange.to === range.to;
  };

  const clearDateFilter = () => {
    setDateRange(null);
    setSelectedDayKey(null);
  };

  const formatRangeDate = (key: string) => {
    const [year, month, day] = key.split('-');
    return `${day}/${month}/${year}`;
  };

  const monthTitle = `Tháng ${currentDate.getMonth() + 1} / ${currentDate.getFullYear()}`;
  const currentMonthKey = monthKey;
  const firstRangeMonth = dateRange?.from.slice(0, 7);
  const lastRangeMonth = dateRange?.to.slice(0, 7);
  const cannotGoPrevious = !!dateRange && currentMonthKey <= (firstRangeMonth || '');
  const cannotGoNext = !!dateRange && currentMonthKey >= (lastRangeMonth || '');

  const rangeMonths = useMemo(() => {
    if (!dateRange) return [];
    const [startYear, startMonth] = dateRange.from.split('-').map(Number);
    const [endYear, endMonth] = dateRange.to.split('-').map(Number);
    const cursor = new Date(startYear, startMonth - 1, 1);
    const end = new Date(endYear, endMonth - 1, 1);
    const months: Array<{ key: string; year: number; month: number; trades: number; pnl: number }> = [];

    while (cursor <= end && months.length < 120) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      const tradesInMonth = rangeTrades.filter((trade) => localDateKey(trade.date).startsWith(key));
      months.push({
        key,
        year,
        month,
        trades: tradesInMonth.length,
        pnl: tradesInMonth.reduce((sum, trade) => sum + trade.pnl, 0),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  }, [dateRange, rangeTrades]);

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
            disabled={cannotGoPrevious}
            className="p-2 text-muted hover:text-text rounded-lg hover:bg-surface-2 border border-line transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            title="Tháng trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (!dateRange) {
                resetToToday();
                return;
              }
              const [year, month] = dateRange.from.split('-').map(Number);
              setCurrentDate(new Date(year, month - 1, 1));
              setSelectedDayKey(null);
            }}
            className="px-4 py-1.5 text-xs font-bold text-text bg-surface-2 hover:bg-surface-3 rounded-lg border border-line-strong transition-all min-w-[150px] text-center"
          >
            {monthTitle}
          </button>

          <button
            onClick={nextMonth}
            disabled={cannotGoNext}
            className="p-2 text-muted hover:text-text rounded-lg hover:bg-surface-2 border border-line transition-colors disabled:cursor-not-allowed disabled:opacity-30"
            title="Tháng sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date range filter */}
      <section
        className={`rounded-xl border p-4 shadow-sm transition-colors ${
          dateRange ? 'border-accent-border bg-accent-soft/20' : 'border-line bg-surface'
        }`}
      >
        <div className="flex flex-col gap-3 border-b border-line/70 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Filter className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-text">Khoảng thời gian</h3>
                {dateRange && <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-black uppercase text-bg">Đang lọc</span>}
              </div>
              <p className="text-[10px] text-muted">Chọn nhanh hoặc mở lịch để chọn khoảng tùy chỉnh</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {([
              ['7d', '7 ngày'],
              ['30d', '30 ngày'],
              ['month', 'Tháng này'],
              ['year', 'Năm nay'],
            ] as const).map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${
                  isPresetActive(preset)
                    ? 'border-accent-border bg-accent-soft text-accent'
                    : 'border-line bg-surface-2 text-muted hover:border-line-strong hover:text-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div className="min-w-0 flex-1">
            <DateRangePicker
              from={dateRange?.from}
              to={dateRange?.to}
              onApply={activateDateRange}
            />
          </div>
          {dateRange && (
            <button
              type="button"
              onClick={clearDateFilter}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-2 px-4 py-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-3 hover:text-text"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Xóa lọc
            </button>
          )}
        </div>

        {dateRange && (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-accent-border bg-bg-soft px-3 py-2 text-[11px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span>
              <span className="font-semibold text-text">{formatRangeDate(dateRange.from)}</span>
              {' → '}
              <span className="font-semibold text-text">{formatRangeDate(dateRange.to)}</span>
            </span>
            <span className="text-muted-2">·</span>
            <span>{rangeTrades.length} giao dịch</span>
            <span className="text-muted-2">·</span>
            <span className={periodStats.totalPnl >= 0 ? 'font-mono font-bold text-profit' : 'font-mono font-bold text-loss'}>
              {formatMoney(periodStats.totalPnl, true, activeAccount?.currency)}
            </span>
          </div>
        )}
      </section>

      {/* Period KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={dateRange ? 'P&L Trong Khoảng' : 'P&L Trong Tháng'}
          value={formatMoney(periodStats.totalPnl, true, activeAccount?.currency)}
          subValue={`${periodStats.totalTrades} giao dịch ${dateRange ? 'trong khoảng' : 'trong tháng'}`}
          trend={periodStats.totalPnl > 0 ? 'profit' : periodStats.totalPnl < 0 ? 'loss' : 'neutral'}
          icon={<DollarSign className="w-4 h-4 text-accent" />}
        />

        <StatCard
          label="Ngày Thắng (Win Days)"
          value={`${periodStats.winDays} ngày`}
          subValue="Số ngày kết thúc P&L dương"
          trend={periodStats.winDays > 0 ? 'profit' : 'neutral'}
        />

        <StatCard
          label="Ngày Thua (Loss Days)"
          value={`${periodStats.lossDays} ngày`}
          subValue="Số ngày kết thúc P&L âm"
          trend={periodStats.lossDays > 0 ? 'loss' : 'neutral'}
        />

        <StatCard
          label="Ngày Tốt Nhất"
          value={periodStats.bestDayPnl > 0 ? formatMoney(periodStats.bestDayPnl, true, activeAccount?.currency) : '—'}
          subValue={periodStats.bestDayPnl > 0 ? `Ngày ${periodStats.bestDayDate}` : 'Chưa có lệnh thắng'}
          trend={periodStats.bestDayPnl > 0 ? 'profit' : 'neutral'}
          icon={<Award className="w-4 h-4 text-accent" />}
        />
      </div>

      {rangeMonths.length > 1 && (
        <div className="-mb-3 overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted-2">Xem tháng</span>
            {rangeMonths.map((item) => {
              const active = item.key === currentMonthKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setCurrentDate(new Date(item.year, item.month, 1));
                    setSelectedDayKey(null);
                  }}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
                    active
                      ? 'border-accent bg-accent-soft text-text'
                      : 'border-line bg-surface text-muted hover:border-line-strong hover:text-text'
                  }`}
                >
                  <span className="text-[11px] font-bold">T{item.month + 1}/{item.year}</span>
                  <span className="text-[9px] text-muted-2">{item.trades} lệnh</span>
                  <span className={`font-mono text-[10px] font-bold ${
                    item.pnl > 0 ? 'text-profit' : item.pnl < 0 ? 'text-loss' : 'text-muted-2'
                  }`}>
                    {formatMoney(item.pnl, true, activeAccount?.currency)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <CalendarGrid
        currentDate={currentDate}
        trades={rangeTrades}
        dateRange={dateRange}
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
                    true,
                    activeAccount?.currency
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
                      {formatMoney(trade.pnl, true, trade.accountCurrency)}
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
          <p className="text-[11px] text-muted">
            Hiệu suất và số giao dịch từng tuần trong tháng đang xem{dateRange ? ' theo bộ lọc' : ''}
          </p>
        </div>
        <WeeklySummary currentDate={currentDate} trades={rangeTrades} />
      </div>
    </div>
  );
};
