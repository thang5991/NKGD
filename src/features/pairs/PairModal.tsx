import React, { useState } from 'react';
import { usePairs } from '../../hooks/usePairs';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../hooks/useToast';
import { AssetType } from '../../types/pair';
import { Plus, Trash2 } from 'lucide-react';

interface PairModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PairModal: React.FC<PairModalProps> = ({ isOpen, onClose }) => {
  const { customPairs, addCustomPair, removeCustomPair } = usePairs();
  const { showToast } = useToast();

  const [symbol, setSymbol] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('forex');
  const [pipSize, setPipSize] = useState('0.0001');
  const [contractSize, setContractSize] = useState('100000');
  const [errors, setErrors] = useState<Partial<Record<'symbol' | 'pipSize' | 'contractSize', string>>>({});

  const handleAssetTypeChange = (type: AssetType) => {
    setAssetType(type);
    if (type === 'forex') {
      setPipSize('0.0001');
      setContractSize('100000');
    } else if (type === 'commodity') {
      setPipSize('0.1');
      setContractSize('100');
    } else if (type === 'crypto') {
      setPipSize('1.0');
      setContractSize('1');
    } else if (type === 'index' || type === 'stock') {
      setPipSize('1.0');
      setContractSize('1');
    }
  };

  const handleCreatePair = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
    const nextErrors: typeof errors = {};
    if (!cleanSymbol) nextErrors.symbol = 'Vui lòng nhập mã cặp giao dịch';
    if (!Number.isFinite(Number(pipSize)) || Number(pipSize) <= 0) {
      nextErrors.pipSize = 'Pip Size phải lớn hơn 0';
    }
    if (!Number.isFinite(Number(contractSize)) || Number(contractSize) <= 0) {
      nextErrors.contractSize = 'Contract Size phải lớn hơn 0';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast('Vui lòng kiểm tra lại thông tin cặp giao dịch', 'error');
      return;
    }

    try {
      await addCustomPair({
        symbol: cleanSymbol,
        displayName: displayName.trim() || cleanSymbol,
        assetType,
        pipSize: Number(pipSize) || 0.0001,
        contractSize: Number(contractSize) || 100000,
      });

      showToast(`Đã thêm cặp tùy chỉnh: ${cleanSymbol}`, 'success');
      setSymbol('');
      setDisplayName('');
      setErrors({});
    } catch (err) {
      console.error(err);
      showToast('Không thể thêm cặp tùy chỉnh', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quản lý Cặp Giao dịch Tùy chỉnh"
      subtitle="Tạo và lưu trữ các mã giao dịch riêng ngoài danh sách mặc định"
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Create Form */}
        <form noValidate onSubmit={handleCreatePair} className="bg-bg-soft p-4 rounded-xl border border-line space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-text mb-1">
            <Plus className="w-4 h-4 text-accent" />
            <span>Tạo Cặp Mới</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Mã Symbol *</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value);
                  setErrors((current) => ({ ...current, symbol: undefined }));
                }}
                placeholder="VD: US30, NAS100, SOLUSDT, EURSGD"
                required
                className={`w-full rounded-lg border bg-bg-soft px-3 py-2 text-xs text-text uppercase font-mono outline-none ${
                  errors.symbol ? 'border-loss/70 focus:border-loss' : 'border-line focus:border-accent'
                }`}
              />
              {errors.symbol && <p className="mt-1 text-[10px] font-medium normal-case text-loss">{errors.symbol}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Tên Hiển thị</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="VD: Dow Jones 30, Solana / Tether"
                className="w-full bg-bg-soft border border-line focus:border-accent rounded-lg px-3 py-1.5 text-xs text-text outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Loại Tài sản</label>
              <select
                value={assetType}
                onChange={(e) => handleAssetTypeChange(e.target.value as AssetType)}
                className="w-full bg-bg-soft border border-line focus:border-accent rounded-lg px-3 py-1.5 text-xs text-text outline-none"
              >
                <option value="forex">Forex</option>
                <option value="commodity">Commodity / Kim loại</option>
                <option value="crypto">Crypto</option>
                <option value="index">Indices / Chỉ số</option>
                <option value="stock">Stock / Cổ phiếu</option>
                <option value="custom">Tùy biến khác</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Pip Size</label>
              <input
                type="number"
                step="any"
                value={pipSize}
                onChange={(e) => {
                  setPipSize(e.target.value);
                  setErrors((current) => ({ ...current, pipSize: undefined }));
                }}
                placeholder="0.0001"
                required
                className={`w-full rounded-lg border bg-bg-soft px-3 py-2 text-xs text-text font-mono outline-none ${
                  errors.pipSize ? 'border-loss/70 focus:border-loss' : 'border-line focus:border-accent'
                }`}
              />
              {errors.pipSize && <p className="mt-1 text-[10px] font-medium normal-case text-loss">{errors.pipSize}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Contract Size (Đơn vị/Lot)</label>
              <input
                type="number"
                step="any"
                value={contractSize}
                onChange={(e) => {
                  setContractSize(e.target.value);
                  setErrors((current) => ({ ...current, contractSize: undefined }));
                }}
                placeholder="100000"
                required
                className={`w-full rounded-lg border bg-bg-soft px-3 py-2 text-xs text-text font-mono outline-none ${
                  errors.contractSize ? 'border-loss/70 focus:border-loss' : 'border-line focus:border-accent'
                }`}
              />
              {errors.contractSize && <p className="mt-1 text-[10px] font-medium normal-case text-loss">{errors.contractSize}</p>}
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-accent hover:bg-accent-hover text-bg font-bold py-2 px-4 rounded-lg text-xs shadow-sm transition-all"
              >
                Lưu Cặp Mới
              </button>
            </div>
          </div>
        </form>

        {/* Custom Pairs List */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-text mb-2">
            <span>Danh sách Cặp Tùy chỉnh đã lưu ({customPairs.length})</span>
          </div>

          {customPairs.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted border border-line rounded-lg bg-surface-2/20">
              Chưa có cặp tùy chỉnh nào. Các cặp chính như EURUSD, XAUUSD, BTCUSDT đã có sẵn trong danh sách mặc định.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {customPairs.map((pair) => (
                <div
                  key={pair.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-bg-soft border border-line hover:border-line-strong transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-bold font-mono text-xs text-text mr-2">{pair.symbol}</span>
                    <span className="break-words text-xs text-muted">{pair.displayName}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-2 sm:ml-2 sm:mt-0 sm:inline">
                      (Pip: {pair.pipSize}, Contract: {pair.contractSize.toLocaleString()})
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Xóa cặp ${pair.symbol}?`)) {
                        removeCustomPair(pair.id);
                        showToast(`Đã xóa cặp ${pair.symbol}`, 'info');
                      }
                    }}
                    className="p-1 text-muted hover:text-loss rounded transition-colors"
                    title="Xóa cặp này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
