import React from 'react';
import { Trade } from '../../types/trade';
import { formatMoney, formatR, localDateKey } from '../../utils/formatters';
import { useAccounts } from '../../hooks/useAccounts';

interface CalendarGridProps {
  currentDate: Date;
  trades: Trade[];
  dateRange?: { from: string; to: string } | null;
  onSelectDate?: (dateKey: string) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  trades,
  dateRange,
  onSelectDate,
}) => {
  const { activeAccount } = useAccounts();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Aggregate trades by YYYY-MM-DD
  const dailyMap = React.useMemo(() => {
    const map: Record<string, { pnl: number; count: number; rTotal: number; trades: Trade[] }> = {};
    trades.forEach((t) => {
      const key = localDateKey(t.date);
      if (!key) return;
      if (!map[key]) {
        map[key] = { pnl: 0, count: 0, rTotal: 0, trades: [] };
      }
      map[key].pnl += t.pnl;
      map[key].count += 1;
      map[key].rTotal += t.rMultiple;
      map[key].trades.push(t);
    });
    return map;
  }, [trades]);

  // Calendar grid: Start on Monday
  const gridCells = React.useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const jsDay = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon ...
    const mondayOffset = (jsDay + 6) % 7;

    const startDate = new Date(year, month, 1 - mondayOffset);
    const cells = [];

    const todayKey = localDateKey(new Date());

    for (let i = 0; i < 42; i++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + i);

      const isOutside = cellDate.getMonth() !== month;
      const key = localDateKey(cellDate);
      // Adjacent-month cells are visual padding only. Showing their trades made
      // the grid disagree with the selected month's KPI cards.
      const dayData = isOutside ? undefined : dailyMap[key];
      const isInRange = !dateRange || (key >= dateRange.from && key <= dateRange.to);

      cells.push({
        date: cellDate,
        dayNumber: cellDate.getDate(),
        key,
        isOutside,
        isToday: key === todayKey,
        isInRange,
        isRangeStart: !isOutside && dateRange?.from === key,
        isRangeEnd: !isOutside && dateRange?.to === key,
        data: dayData,
      });
    }

    return cells;
  }, [year, month, dailyMap, dateRange]);

  const weekdays = [
    { short: 'T2', full: 'Thứ 2' },
    { short: 'T3', full: 'Thứ 3' },
    { short: 'T4', full: 'Thứ 4' },
    { short: 'T5', full: 'Thứ 5' },
    { short: 'T6', full: 'Thứ 6' },
    { short: 'T7', full: 'Thứ 7' },
    { short: 'CN', full: 'Chủ Nhật' },
  ];

  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-sm">
      {/* Weekdays Header */}
      <div className="grid grid-cols-7 border-b border-line bg-[#0c0e0c]">
        {weekdays.map((day, i) => (
          <div
            key={i}
            className={`py-2 text-center text-[9px] uppercase font-bold tracking-wider text-muted sm:py-2.5 sm:text-[10px] ${
              i < 6 ? 'border-r border-line' : ''
            }`}
          >
            <span className="sm:hidden">{day.short}</span>
            <span className="hidden sm:inline">{day.full}</span>
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 bg-bg divide-x divide-y divide-line">
        {gridCells.map((cell, idx) => {
          const hasTrades = !!cell.data && cell.data.count > 0;
          const pnl = cell.data?.pnl || 0;
          const isWin = hasTrades && pnl > 0;
          const isLoss = hasTrades && pnl < 0;

          return (
            <div
              key={idx}
              onClick={() => !cell.isOutside && cell.isInRange && onSelectDate && cell.key && onSelectDate(cell.key)}
              className={`relative flex min-h-[76px] min-w-0 flex-col justify-between overflow-hidden p-1 transition-colors sm:min-h-[110px] sm:p-2 md:min-h-[120px] ${
                cell.isOutside ? 'opacity-30 bg-[#0a0c0a]' : 'bg-[#0d0f0d] hover:bg-[#131713]'
              } ${cell.isToday ? 'ring-1 ring-inset ring-accent/60' : ''} ${
                !cell.isOutside && !cell.isInRange ? 'opacity-35 bg-[#090b09]' : ''
              } ${dateRange && !cell.isOutside && cell.isInRange ? 'bg-[#10150d]' : ''} ${
                cell.isRangeStart || cell.isRangeEnd ? 'ring-1 ring-inset ring-accent bg-accent-soft/20' : ''
              } ${
                isWin ? 'bg-gradient-to-br from-profit-soft/40 to-transparent' : ''
              } ${isLoss ? 'bg-gradient-to-br from-loss-soft/40 to-transparent' : ''} ${
                hasTrades && cell.isInRange ? 'cursor-pointer' : ''
              }`}
            >
              {/* Day Number and badges */}
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded text-[10px] font-semibold sm:h-5 sm:w-5 sm:text-xs ${
                    cell.isToday
                      ? 'bg-accent text-bg font-bold'
                      : cell.isOutside
                      ? 'text-muted-2'
                      : 'text-muted'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {hasTrades && (
                  <span className="truncate text-[8px] font-medium text-muted sm:text-[10px]">
                    <span className="sm:hidden">{cell.data?.count}L</span>
                    <span className="hidden sm:inline">{cell.data?.count} lệnh</span>
                  </span>
                )}
              </div>

              {/* Day Performance */}
              {hasTrades ? (
                <div className="mt-1 min-w-0 space-y-1 sm:mt-2">
                  <div
                    className={`truncate font-mono text-[9px] font-bold tracking-tight sm:text-sm md:text-base ${
                      isWin ? 'text-profit' : isLoss ? 'text-loss' : 'text-text'
                    }`}
                  >
                    {formatMoney(pnl, true, activeAccount?.currency)}
                  </div>

                  <div className="hidden items-center justify-between font-mono text-[10px] text-muted-2 sm:flex">
                    <span>R:</span>
                    <span className={cell.data!.rTotal >= 0 ? 'text-profit font-medium' : 'text-loss font-medium'}>
                      {formatR(cell.data!.rTotal)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
