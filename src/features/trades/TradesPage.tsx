import React from 'react';
import { useTrades } from '../../hooks/useTrades';
import { TradeList } from './TradeList';
import { Trade } from '../../types/trade';
import { formatMoney, formatPercent, formatR } from '../../utils/formatters';

interface TradesPageProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (trade: Trade) => void;
  onSelectTradeForDetail: (trade: Trade | null) => void;
}

export const TradesPage: React.FC<TradesPageProps> = ({
  onOpenEditModal,
  onSelectTradeForDetail,
}) => {
  const { trades, stats, loading, removeTrade } = useTrades();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted text-xs">
        Đang tải danh sách giao dịch...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface border border-line rounded-xl p-3.5 shadow-sm">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted block">Tổng Giao dịch</span>
          <span className="text-base font-mono font-bold text-text mt-0.5 block">
            {stats.totalTrades} lệnh
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-muted block">Win Rate</span>
          <span
            className={`text-base font-mono font-bold mt-0.5 block ${
              stats.winRate >= 50 ? 'text-profit' : stats.winRate > 0 ? 'text-loss' : 'text-text'
            }`}
          >
            {formatPercent(stats.winRate)} ({stats.wins}W / {stats.losses}L)
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-muted block">Tổng P&L</span>
          <span
            className={`text-base font-mono font-bold mt-0.5 block ${
              stats.totalPnl > 0 ? 'text-profit' : stats.totalPnl < 0 ? 'text-loss' : 'text-text'
            }`}
          >
            {formatMoney(stats.totalPnl, true)}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-muted block">Trung bình R</span>
          <span
            className={`text-base font-mono font-bold mt-0.5 block ${
              stats.avgR > 0 ? 'text-profit' : stats.avgR < 0 ? 'text-loss' : 'text-text'
            }`}
          >
            {formatR(stats.avgR)}
          </span>
        </div>
      </div>

      {/* Main Trade List */}
      <TradeList
        trades={trades}
        onSelectTrade={(trade) => onSelectTradeForDetail(trade)}
        onEditTrade={onOpenEditModal}
        onDeleteTrade={removeTrade}
      />
    </div>
  );
};
