import React from 'react';
import { Trade } from '../../types/trade';
import { formatMoney, formatR, localDateKey } from '../../utils/formatters';

interface CalendarGridProps {
  currentDate: Date;
  trades: Trade[];
  onSelectDate?: (dateKey: string) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  trades,
  onSelectDate,
}) => {
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
      const dayData = dailyMap[key];

      cells.push({
        date: cellDate,
        dayNumber: cellDate.getDate(),
        key,
        isOutside,
        isToday: key === todayKey,
        data: dayData,
      });
    }

    return cells;
  }, [year, month, dailyMap]);

  const weekdays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-sm">
      {/* Weekdays Header */}
      <div className="grid grid-cols-7 border-b border-line bg-[#0c0e0c]">
        {weekdays.map((day, i) => (
          <div
            key={i}
            className={`py-2.5 text-center text-[10px] uppercase font-bold tracking-wider text-muted ${
              i < 6 ? 'border-r border-line' : ''
            }`}
          >
            {day}
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
              onClick={() => onSelectDate && cell.key && onSelectDate(cell.key)}
              className={`min-h-[110px] md:min-h-[120px] p-2 flex flex-col justify-between transition-colors relative ${
                cell.isOutside ? 'opacity-30 bg-[#0a0c0a]' : 'bg-[#0d0f0d] hover:bg-[#131713]'
              } ${cell.isToday ? 'ring-1 ring-inset ring-accent/60' : ''} ${
                isWin ? 'bg-gradient-to-br from-profit-soft/40 to-transparent' : ''
              } ${isLoss ? 'bg-gradient-to-br from-loss-soft/40 to-transparent' : ''} ${
                hasTrades ? 'cursor-pointer' : ''
              }`}
            >
              {/* Day Number and badges */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded ${
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
                  <span className="text-[10px] text-muted font-medium">
                    {cell.data?.count} {cell.data?.count === 1 ? 'lệnh' : 'lệnh'}
                  </span>
                )}
              </div>

              {/* Day Performance */}
              {hasTrades ? (
                <div className="mt-2 space-y-1">
                  <div
                    className={`font-mono font-bold text-sm md:text-base tracking-tight ${
                      isWin ? 'text-profit' : isLoss ? 'text-loss' : 'text-text'
                    }`}
                  >
                    {formatMoney(pnl, true)}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-2 font-mono">
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
