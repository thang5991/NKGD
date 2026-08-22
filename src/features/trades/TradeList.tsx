import React, { useState, useMemo } from 'react';
import { Trade } from '../../types/trade';
import { formatMoney, formatR, formatDateTime } from '../../utils/formatters';
import {
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { classifyTradeResult } from '../../utils/calculator';

interface TradeListProps {
  trades: Trade[];
  onSelectTrade: (trade: Trade) => void;
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (id: string) => void;
}

export const TradeList: React.FC<TradeListProps> = ({
  trades,
  onSelectTrade,
  onEditTrade,
  onDeleteTrade,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSide, setFilterSide] = useState<string>('all');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [filterMarket, setFilterMarket] = useState<string>('all');
  const [filterTimeframe, setFilterTimeframe] = useState<string>('all');

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        t.symbol.toLowerCase().includes(q) ||
        (t.timeframe && t.timeframe.toLowerCase().includes(q)) ||
        (t.setup && t.setup.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q)) ||
        (t.emotion && t.emotion.toLowerCase().includes(q));

      const matchSide = filterSide === 'all' || t.side === filterSide;
      const matchResult =
        filterResult === 'all' ||
        classifyTradeResult(t.pnl, t.riskAmount, t.rMultiple) === filterResult;

      const matchMarket = filterMarket === 'all' || t.market === filterMarket;
      const matchTimeframe = filterTimeframe === 'all' || t.timeframe === filterTimeframe;

      return matchSearch && matchSide && matchResult && matchMarket && matchTimeframe;
    });
  }, [trades, searchTerm, filterSide, filterResult, filterMarket, filterTimeframe]);

  return (
    <div className="space-y-4">
      {/* Search and Filters Toolbar */}
      <div className="bg-surface border border-line rounded-xl p-3.5 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã, setup, ghi chú..."
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg pl-9 pr-3 py-2 text-xs text-text outline-none"
          />
        </div>

        {/* Filter Side */}
        <div>
          <select
            value={filterSide}
            onChange={(e) => setFilterSide(e.target.value)}
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text outline-none"
          >
            <option value="all">Tất cả Vị thế (Side)</option>
            <option value="Long">Long (Mua)</option>
            <option value="Short">Short (Bán)</option>
          </select>
        </div>

        {/* Filter Timeframe */}
        <div>
          <select
            value={filterTimeframe}
            onChange={(e) => setFilterTimeframe(e.target.value)}
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text outline-none font-semibold"
          >
            <option value="all">Tất cả Timeframe</option>
            <option value="M1">M1</option>
            <option value="M5">M5</option>
            <option value="M15">M15</option>
            <option value="M30">M30</option>
            <option value="H1">H1</option>
            <option value="H4">H4</option>
            <option value="D1">D1</option>
            <option value="W1">W1</option>
            <option value="MN">MN</option>
          </select>
        </div>

        {/* Filter Result */}
        <div>
          <select
            value={filterResult}
            onChange={(e) => setFilterResult(e.target.value)}
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text outline-none"
          >
            <option value="all">Tất cả Kết quả</option>
            <option value="win">Thắng (Win / Profit)</option>
            <option value="loss">Thua (Loss)</option>
            <option value="be">Hòa vốn (Breakeven)</option>
          </select>
        </div>

        {/* Filter Market */}
        <div>
          <select
            value={filterMarket}
            onChange={(e) => setFilterMarket(e.target.value)}
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text outline-none"
          >
            <option value="all">Tất cả Thị trường</option>
            <option value="Forex">Forex</option>
            <option value="Commodities">Commodities / Vàng</option>
            <option value="Crypto">Crypto</option>
            <option value="Indices">Indices</option>
            <option value="Stock">Stock</option>
            <option value="Futures">Futures</option>
            <option value="Other">Khác</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-sm">
        <div className="divide-y divide-line/60 sm:hidden">
          {filteredTrades.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted">
              Không tìm thấy giao dịch nào phù hợp với bộ lọc.
            </div>
          ) : (
            filteredTrades.map((trade) => {
              const result = classifyTradeResult(trade.pnl, trade.riskAmount, trade.rMultiple);
              const isProfit = result === 'win';
              const isLoss = result === 'loss';
              return (
                <article
                  key={trade.id}
                  onClick={() => onSelectTrade(trade)}
                  className="cursor-pointer p-3.5 transition-colors hover:bg-surface-2/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <strong className="font-mono text-sm text-text">{trade.symbol}</strong>
                        <span className="rounded border border-line bg-surface-3 px-1.5 py-0.5 font-mono text-[9px] font-bold text-accent">
                          {trade.timeframe || 'M15'}
                        </span>
                        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${
                          trade.side === 'Long'
                            ? 'border-profit/25 bg-profit-soft text-profit'
                            : 'border-loss/25 bg-loss-soft text-loss'
                        }`}>
                          {trade.side}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-muted">{formatDateTime(trade.date)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <strong className={`block font-mono text-sm ${
                        isProfit ? 'text-profit' : isLoss ? 'text-loss' : 'text-text'
                      }`}>
                        {formatMoney(trade.pnl, true, trade.accountCurrency)}
                      </strong>
                      <span className={`mt-1 block font-mono text-[10px] ${
                        isProfit ? 'text-profit' : isLoss ? 'text-loss' : 'text-muted'
                      }`}>
                        {formatR(trade.rMultiple)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-line/60 bg-bg-soft p-2.5 text-[10px]">
                    <div>
                      <span className="block text-muted-2">Entry → Exit</span>
                      <strong className="mt-0.5 block truncate font-mono text-text">{trade.entry} → {trade.exit}</strong>
                    </div>
                    <div>
                      <span className="block text-muted-2">Khối lượng</span>
                      <strong className="mt-0.5 block font-mono text-text">
                        {trade.lot > 0 ? `${trade.lot} lot` : `${trade.units} units`}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[10px] text-muted">{trade.setup || 'Chưa có setup'}</span>
                    <div className="flex shrink-0 items-center gap-1" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onEditTrade(trade)}
                        className="rounded-lg border border-line p-2 text-muted transition-colors hover:bg-surface-3 hover:text-text"
                        aria-label={`Chỉnh sửa ${trade.symbol}`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Xóa giao dịch ${trade.symbol} (${formatDateTime(trade.date)})?`)) {
                            onDeleteTrade(trade.id);
                          }
                        }}
                        className="rounded-lg border border-line p-2 text-muted transition-colors hover:bg-surface-3 hover:text-loss"
                        aria-label={`Xóa ${trade.symbol}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-line bg-bg-soft text-[10px] uppercase tracking-wider text-muted font-bold">
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Cặp</th>
                <th className="py-3 px-4">TF</th>
                <th className="py-3 px-4">Side</th>
                <th className="py-3 px-4">Setup</th>
                <th className="py-3 px-4">Entry / Exit</th>
                <th className="py-3 px-4">Khối lượng</th>
                <th className="py-3 px-4">Phí ($)</th>
                <th className="py-3 px-4">P&L ($)</th>
                <th className="py-3 px-4">R Thực tế</th>
                <th className="py-3 px-4 text-center">Ảnh</th>
                <th className="py-3 px-4 text-right">Hành động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-line text-xs">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-muted">
                    Không tìm thấy giao dịch nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredTrades.map((trade) => {
                  const result = classifyTradeResult(trade.pnl, trade.riskAmount, trade.rMultiple);
                  const isProfit = result === 'win';
                  const isLoss = result === 'loss';

                  return (
                    <tr
                      key={trade.id}
                      onClick={() => onSelectTrade(trade)}
                      className="hover:bg-surface-2/70 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 text-muted font-mono text-[11px]">
                        {formatDateTime(trade.date)}
                      </td>

                      <td className="py-3 px-4 font-bold text-text">
                        {trade.symbol}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-surface-3 text-accent border border-line">
                          {trade.timeframe || 'M15'}
                        </span>
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

                      <td className="py-3 px-4 text-muted truncate max-w-[140px]">
                        {trade.setup || '—'}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-muted">
                        <span className="text-text font-medium">{trade.entry}</span> → {trade.exit}
                      </td>

                      <td className="py-3 px-4 font-mono text-muted text-[11px]">
                        {trade.lot > 0 ? `${trade.lot} lot` : `${trade.units} u`}
                      </td>

                      <td className="py-3 px-4 font-mono text-muted text-[11px]">
                        ${trade.fee}
                      </td>

                      <td
                        className={`py-3 px-4 font-mono font-bold ${
                          isProfit ? 'text-profit' : isLoss ? 'text-loss' : 'text-text'
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

                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={() => onEditTrade(trade)}
                            className="p-1.5 text-muted hover:text-text rounded-md hover:bg-surface-3 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Xóa giao dịch ${trade.symbol} (${formatDateTime(trade.date)})?`)) {
                                onDeleteTrade(trade.id);
                              }
                            }}
                            className="p-1.5 text-muted hover:text-loss rounded-md hover:bg-surface-3 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
