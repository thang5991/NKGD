import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Trade } from '../../types/trade';
import { formatMoney, formatDate } from '../../utils/formatters';
import { useAccounts } from '../../hooks/useAccounts';

interface EquityCurveProps {
  trades: Trade[];
}

export const EquityCurve: React.FC<EquityCurveProps> = ({ trades }) => {
  const { activeAccount } = useAccounts();
  const currency = activeAccount?.currency;
  const chartData = useMemo(() => {
    if (trades.length === 0) {
      return [{ index: 0, date: 'Khởi đầu', tradePnl: 0, equity: 0 }];
    }

    // Sort chronologically ascending for equity curve
    const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningEquity = 0;
    const points = [{ index: 0, date: 'Khởi đầu', tradePnl: 0, equity: 0 }];

    sorted.forEach((trade, i) => {
      runningEquity += trade.pnl;
      points.push({
        index: i + 1,
        date: formatDate(trade.date),
        tradePnl: trade.pnl,
        equity: Number(runningEquity.toFixed(2)),
      });
    });

    return points;
  }, [trades]);

  const isProfitable = chartData[chartData.length - 1]?.equity >= 0;
  const strokeColor = isProfitable ? 'rgb(var(--profit))' : 'rgb(var(--loss))';

  if (trades.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-line rounded-xl bg-surface">
        <div className="text-sm font-medium text-text">Chưa có giao dịch</div>
        <div className="text-xs text-muted mt-1">
          Thêm giao dịch đầu tiên để bắt đầu vẽ biểu đồ tăng trưởng vốn (Equity Curve).
        </div>
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={strokeColor} stopOpacity={0.4} />
              <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line))" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="rgb(var(--muted-2))"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: 'rgb(var(--line))' }}
          />
          <YAxis
            stroke="rgb(var(--muted-2))"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: 'rgb(var(--line))' }}
            tickFormatter={(val) => `$${val}`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-surface border border-line-strong p-2.5 rounded-lg shadow-xl text-xs">
                    <div className="text-muted-2 text-[10px]">{data.date}</div>
                    <div className="flex items-center justify-between gap-4 mt-1">
                      <span className="text-muted">Equity:</span>
                      <strong
                        className={`font-mono font-bold ${
                          data.equity >= 0 ? 'text-profit' : 'text-loss'
                        }`}
                      >
                        {formatMoney(data.equity, true, currency)}
                      </strong>
                    </div>
                    {data.index > 0 && (
                      <div className="flex items-center justify-between gap-4 mt-0.5">
                        <span className="text-muted">Lệnh #{data.index}:</span>
                        <span
                          className={`font-mono ${
                            data.tradePnl >= 0 ? 'text-profit' : 'text-loss'
                          }`}
                        >
                          {formatMoney(data.tradePnl, true, currency)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={strokeColor}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#equityGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
