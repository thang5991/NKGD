import React from 'react';
import { TradeStats } from '../../hooks/useTrades';
import { formatMoney, formatR } from '../../utils/formatters';
import { useAccounts } from '../../hooks/useAccounts';

interface QuickStatsProps {
  stats: TradeStats;
}

export const QuickStats: React.FC<QuickStatsProps> = ({ stats }) => {
  const { activeAccount } = useAccounts();
  const currency = activeAccount?.currency;
  const rows = [
    { label: 'Tổng lãi (Gross Profit)', value: formatMoney(stats.grossProfit, false, currency), className: 'text-profit font-semibold' },
    { label: 'Tổng lỗ (Gross Loss)', value: formatMoney(stats.grossLoss, false, currency), className: 'text-loss font-semibold' },
    { label: 'P&L Trung bình / Lệnh', value: formatMoney(stats.avgPnl, true, currency), className: stats.avgPnl >= 0 ? 'text-profit font-semibold' : 'text-loss font-semibold' },
    { label: 'Lệnh thắng lớn nhất', value: formatMoney(stats.bestTrade, true, currency), className: 'text-profit font-semibold' },
    { label: 'Lệnh thua lớn nhất', value: formatMoney(stats.worstTrade, true, currency), className: 'text-loss font-semibold' },
    { label: 'Lệnh Hòa vốn (P&L ≈ 0 hoặc lãi < 0.1R)', value: `${stats.be} lệnh`, className: 'text-text' },
    { label: 'Trung bình R thực tế', value: formatR(stats.avgR), className: stats.avgR >= 0 ? 'text-profit font-semibold' : 'text-loss font-semibold' },
  ];

  return (
    <div className="bg-surface border border-line rounded-xl p-4 flex flex-col justify-between h-full">
      <div className="border-b border-line pb-3 mb-3">
        <h3 className="text-sm font-semibold text-text tracking-tight">Thống kê Chi tiết</h3>
        <p className="text-[11px] text-muted mt-0.5">Hiệu suất và quản trị rủi ro tổng thể</p>
      </div>

      <div className="space-y-2.5">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between text-xs py-1.5 px-2 rounded-md bg-bg-soft border border-line/40"
          >
            <span className="text-muted">{row.label}</span>
            <span className={`font-mono ${row.className}`}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
