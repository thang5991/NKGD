import React, { useState } from 'react';
import { useTrades } from '../../hooks/useTrades';
import { usePairs } from '../../hooks/usePairs';
import { TradeList } from './TradeList';
import { TradeForm } from './TradeForm';
import { TradeDetailModal } from './TradeDetailModal';
import { Modal } from '../../components/common/Modal';
import { Trade, TradeFormData } from '../../types/trade';
import { formatMoney, formatPercent, formatR } from '../../utils/formatters';
interface TradesPageProps {
  isAddOpen: boolean;
  onCloseAddModal: () => void;
  onOpenAddModal?: () => void;
  onOpenPairModal: () => void;
  selectedTradeForDetail: Trade | null;
  onSelectTradeForDetail: (trade: Trade | null) => void;
}

export const TradesPage: React.FC<TradesPageProps> = ({
  isAddOpen,
  onCloseAddModal,
  onOpenPairModal,
  selectedTradeForDetail,
  onSelectTradeForDetail,
}) => {
  const { trades, stats, loading, saveTradeWithImages, removeTrade, loadTradeImages } = useTrades();
  const { pairOptions } = usePairs();

  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);

  const handleOpenEdit = (trade: Trade) => {
    setEditingTrade(trade);
  };

  const handleCloseEdit = () => {
    setEditingTrade(null);
  };

  const handleFormSubmit = async (data: TradeFormData) => {
    await saveTradeWithImages(data);
    onCloseAddModal();
    handleCloseEdit();
  };

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
        onEditTrade={handleOpenEdit}
        onDeleteTrade={removeTrade}
      />

      {/* Add Trade Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={onCloseAddModal}
        title="Thêm Giao dịch Mới"
        subtitle="Ghi nhận lệnh, rủi ro ban đầu và phân tích chart"
        maxWidth="4xl"
      >
        <TradeForm
          pairOptions={pairOptions}
          onOpenPairModal={onOpenPairModal}
          onSubmit={handleFormSubmit}
          onCancel={onCloseAddModal}
          loadImages={loadTradeImages}
        />
      </Modal>

      {/* Edit Trade Modal */}
      <Modal
        isOpen={!!editingTrade}
        onClose={handleCloseEdit}
        title={`Chỉnh sửa: ${editingTrade?.symbol || ''}`}
        subtitle="Cập nhật thông số giá, khối lượng và hình ảnh"
        maxWidth="4xl"
      >
        {editingTrade && (
          <TradeForm
            initialTrade={editingTrade}
            pairOptions={pairOptions}
            onOpenPairModal={onOpenPairModal}
            onSubmit={handleFormSubmit}
            onCancel={handleCloseEdit}
            loadImages={loadTradeImages}
          />
        )}
      </Modal>

      {/* Trade Detail Modal */}
      <TradeDetailModal
        isOpen={!!selectedTradeForDetail}
        onClose={() => onSelectTradeForDetail(null)}
        trade={selectedTradeForDetail}
        onEdit={(trade) => {
          onSelectTradeForDetail(null);
          handleOpenEdit(trade);
        }}
        onDelete={(id) => {
          removeTrade(id);
          onSelectTradeForDetail(null);
        }}
        loadImages={loadTradeImages}
      />
    </div>
  );
};
