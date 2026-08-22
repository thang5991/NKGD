import React from 'react';
import { Trade } from '../../types/trade';
import { formatMoney, formatR, formatDateTime } from '../../utils/formatters';
import { ArrowUpRight, ArrowDownRight, Image as ImageIcon } from 'lucide-react';
import { classifyTradeResult } from '../../utils/calculator';

interface RecentTradesProps {
  trades: Trade[];
  onViewAll: () => void;
  onSelectTrade: (trade: Trade) => void;
}

export const RecentTrades: React.FC<RecentTradesProps> = ({
  trades,
  onViewAll,
  onSelectTrade,
}) => {
  const recent = trades.slice(0, 6);

  if (recent.length === 0) {
    return (
      <div className="bg-surface border border-line rounded-xl p-6 text-center">
        <p className="text-xs text-muted">Chưa có giao dịch nào được ghi lại.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-line bg-surface-2/30">
        <div>
          <h3 className="text-sm font-semibold text-text tracking-tight">Giao dịch Gần đây</h3>
          <p className="text-[11px] text-muted mt-0.5">Các lệnh giao dịch mới nhất của bạn</p>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-accent hover:text-[#c5ff68] transition-colors"
        >
          Xem tất cả ({trades.length}) →
        </button>
      </div>

      <div className="divide-y divide-line/60 sm:hidden">
        {recent.map((trade) => {
          const result = classifyTradeResult(trade.pnl, trade.riskAmount, trade.rMultiple);
          const isProfit = result === 'win';
          const isLoss = result === 'loss';
          return (
            <button
              key={trade.id}
              type="button"
              onClick={() => onSelectTrade(trade)}
              className="block w-full p-3.5 text-left transition-colors hover:bg-surface-2/60"
            >
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="flex items-center gap-2">
                    <strong className="font-mono text-sm text-text">{trade.symbol}</strong>
                    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${
                      trade.side === 'Long'
                        ? 'border-profit/25 bg-profit-soft text-profit'
                        : 'border-loss/25 bg-loss-soft text-loss'
                    }`}>
                      {trade.side}
                    </span>
                  </span>
                  <span className="mt-1 block font-mono text-[10px] text-muted">{formatDateTime(trade.date)}</span>
                </span>
                <span className="text-right">
                  <strong className={`block font-mono text-sm ${
                    isProfit ? 'text-profit' : isLoss ? 'text-loss' : 'text-muted'
                  }`}>
                    {formatMoney(trade.pnl, true, trade.accountCurrency)}
                  </strong>
                  <span className="mt-1 block font-mono text-[10px] text-muted">{formatR(trade.rMultiple)}</span>
                </span>
              </span>
              <span className="mt-3 flex items-center justify-between border-t border-line/50 pt-2 text-[10px] text-muted">
                <span className="truncate pr-3">{trade.setup || 'Chưa có setup'}</span>
                <span>{trade.lot} lot</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-line bg-bg-soft/50 text-[10px] uppercase tracking-wider text-muted font-semibold">
              <th className="py-2.5 px-4">Thời gian</th>
              <th className="py-2.5 px-4">Cặp</th>
              <th className="py-2.5 px-4">Side</th>
              <th className="py-2.5 px-4">Setup</th>
              <th className="py-2.5 px-4">Entry / Exit</th>
              <th className="py-2.5 px-4">Khối lượng</th>
              <th className="py-2.5 px-4">P&L ($)</th>
              <th className="py-2.5 px-4">R Thực tế</th>
              <th className="py-2.5 px-4 text-center">Ảnh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60 text-xs">
            {recent.map((trade) => {
              const result = classifyTradeResult(trade.pnl, trade.riskAmount, trade.rMultiple);
              const isProfit = result === 'win';
              const isLoss = result === 'loss';

              return (
                <tr
                  key={trade.id}
                  onClick={() => onSelectTrade(trade)}
                  className="hover:bg-surface-2/60 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 text-muted font-mono text-[11px]">
                    {formatDateTime(trade.date)}
                  </td>

                  <td className="py-3 px-4 font-bold text-text">
                    {trade.symbol}
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
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
                  </td>

                  <td className="py-3 px-4 text-muted truncate max-w-[150px]">
                    {trade.setup || '—'}
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-muted">
                    <span className="text-text font-medium">{trade.entry}</span> → {trade.exit}
                  </td>

                  <td className="py-3 px-4 font-mono text-muted text-[11px]">
                    {trade.lot > 0 ? `${trade.lot} lot` : `${trade.units} u`}
                  </td>

                  <td
                    className={`py-3 px-4 font-mono font-bold ${
                      isProfit ? 'text-profit' : isLoss ? 'text-loss' : 'text-muted'
                    }`}
                  >
                    {formatMoney(trade.pnl, true, trade.accountCurrency)}
                  </td>

                  <td
                    className={`py-3 px-4 font-mono font-semibold ${
                      isProfit
                        ? 'text-profit'
                        : isLoss
                        ? 'text-loss'
                        : 'text-muted'
                    }`}
                  >
                    {formatR(trade.rMultiple)}
                  </td>

                  <td className="py-3 px-4 text-center">
                    {trade.imageRefs && trade.imageRefs.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-3 text-[10px] text-muted">
                        <ImageIcon className="w-3 h-3 text-accent" />
                        {trade.imageRefs.length}
                      </span>
                    ) : (
                      <span className="text-muted-2 text-[10px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
