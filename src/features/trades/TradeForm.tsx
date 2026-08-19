import React, { useState, useEffect, useRef } from 'react';
import { Trade, TradeFormData, Side, Market, Emotion, ImageRecord } from '../../types/trade';
import { PairOption } from '../../types/pair';
import { calculateTrade, getPipMeta } from '../../utils/calculator';
import { formatMoney, formatR } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';
import { Plus, X, Image as ImageIcon, Sparkles, Layers } from 'lucide-react';

interface TradeFormProps {
  initialTrade?: Trade | null;
  pairOptions: PairOption[];
  onOpenPairModal: () => void;
  onSubmit: (data: TradeFormData) => Promise<void>;
  onCancel: () => void;
  loadImages?: (refs: string[]) => Promise<ImageRecord[]>;
}

export const TradeForm: React.FC<TradeFormProps> = ({
  initialTrade,
  pairOptions,
  onOpenPairModal,
  onSubmit,
  onCancel,
  loadImages,
}) => {
  const { showToast } = useToast();

  const [date, setDate] = useState(() => {
    if (initialTrade?.date) return initialTrade.date;
    const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return now.toISOString().slice(0, 16);
  });

  const [symbol, setSymbol] = useState(initialTrade?.symbol || 'EURUSD');
  const [side, setSide] = useState<Side>(initialTrade?.side || 'Long');
  const [market, setMarket] = useState<Market>(initialTrade?.market || 'Forex');
  const [setup, setSetup] = useState(initialTrade?.setup || '');
  const [emotion, setEmotion] = useState<Emotion>(initialTrade?.emotion || 'Bình tĩnh');

  const [entry, setEntry] = useState<string>(initialTrade?.entry?.toString() || '');
  const [stopLoss, setStopLoss] = useState<string>(initialTrade?.stopLoss?.toString() || '');
  const [takeProfit, setTakeProfit] = useState<string>(initialTrade?.takeProfit?.toString() || '');
  const [exit, setExit] = useState<string>(initialTrade?.exit?.toString() || '');

  const [lot, setLot] = useState<string>(initialTrade?.lot?.toString() || '1');
  const [units, setUnits] = useState<string>(initialTrade?.units?.toString() || '');
  const [fee, setFee] = useState<string>(initialTrade?.fee?.toString() || '0');
  const [notes, setNotes] = useState(initialTrade?.notes || '');

  const [existingImages, setExistingImages] = useState<ImageRecord[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<{ id: string; url: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing images if editing
  useEffect(() => {
    if (initialTrade && initialTrade.imageRefs && initialTrade.imageRefs.length > 0 && loadImages) {
      loadImages(initialTrade.imageRefs).then((imgs) => setExistingImages(imgs));
    }
  }, [initialTrade, loadImages]);

  // Sync units when lot changes
  useEffect(() => {
    const meta = getPipMeta(symbol);
    const numLot = Number(lot);
    if (!isNaN(numLot) && numLot > 0) {
      setUnits((numLot * meta.contractSize).toString());
    }
  }, [lot, symbol]);

  // Calculate live preview metrics
  const preview = React.useMemo(() => {
    const numEntry = Number(entry);
    const numExit = Number(exit);
    const numSL = stopLoss ? Number(stopLoss) : undefined;
    const numTP = takeProfit ? Number(takeProfit) : undefined;
    const numLot = Number(lot) || 0;
    const numUnits = Number(units) || 0;
    const numFee = Number(fee) || 0;

    return calculateTrade({
      side,
      entry: numEntry,
      exit: numExit,
      stopLoss: numSL,
      takeProfit: numTP,
      lot: numLot,
      units: numUnits,
      fee: numFee,
      symbol,
    });
  }, [side, entry, exit, stopLoss, takeProfit, lot, units, fee, symbol]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    addFiles(files);
    e.target.value = '';
  };

  const addFiles = (files: File[]) => {
    const valid = files.filter((f) => {
      if (!f.type.startsWith('image/')) {
        showToast(`Tệp ${f.name} không phải là hình ảnh`, 'warn');
        return false;
      }
      if (f.size > 12 * 1024 * 1024) {
        showToast(`Tệp ${f.name} vượt quá dung lượng 12MB`, 'warn');
        return false;
      }
      return true;
    });

    const newPreviews = valid.map((f) => ({
      id: `preview-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      url: URL.createObjectURL(f),
      name: f.name,
    }));

    setNewImageFiles((prev) => [...prev, ...valid]);
    setNewImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeExistingImage = (id: string) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(newImagePreviews[index].url);
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Paste image handler (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
      showToast(`Đã dán ${files.length} ảnh từ bộ nhớ tạm.`, 'info');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numEntry = Number(entry);
    const numExit = Number(exit);

    if (isNaN(numEntry) || numEntry <= 0) {
      showToast('Vui lòng nhập giá Entry hợp lệ', 'error');
      return;
    }
    if (isNaN(numExit) || numExit <= 0) {
      showToast('Vui lòng nhập giá Exit hợp lệ', 'error');
      return;
    }

    try {
      setSaving(true);
      await onSubmit({
        id: initialTrade?.id,
        date,
        symbol: symbol.toUpperCase().trim(),
        side,
        market,
        setup,
        emotion,
        entry: numEntry,
        stopLoss: stopLoss ? Number(stopLoss) : undefined,
        takeProfit: takeProfit ? Number(takeProfit) : undefined,
        exit: numExit,
        lot: Number(lot) || 1,
        units: Number(units) || 100000,
        fee: Number(fee) || 0,
        notes,
        existingImages,
        newImages: newImageFiles,
      });

      showToast(initialTrade ? 'Đã cập nhật giao dịch thành công' : 'Đã thêm giao dịch mới', 'success');
    } catch (err) {
      console.error(err);
      showToast('Không thể lưu giao dịch', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-4">
      {/* Basic row: Date, Pair, Side, Market */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Ngày giờ vào lệnh *</label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text outline-none"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-muted">Cặp giao dịch *</label>
            <button
              type="button"
              onClick={onOpenPairModal}
              className="text-[10px] text-accent hover:underline flex items-center gap-0.5"
            >
              <Layers className="w-2.5 h-2.5" /> + Cặp mới
            </button>
          </div>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            required
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text outline-none"
          >
            {pairOptions.map((opt) => (
              <option key={opt.symbol} value={opt.symbol}>
                {opt.displayName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Side (Vị thế) *</label>
          <select
            value={side}
            onChange={(e) => setSide(e.target.value as Side)}
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text outline-none"
          >
            <option value="Long">Long (Mua)</option>
            <option value="Short">Short (Bán)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Thị trường</label>
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value as Market)}
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text outline-none"
          >
            <option value="Forex">Forex</option>
            <option value="Commodities">Commodities / Vàng</option>
            <option value="Crypto">Crypto</option>
            <option value="Indices">Indices / Chỉ số</option>
            <option value="Stock">Stock / Cổ phiếu</option>
            <option value="Futures">Futures</option>
            <option value="Other">Khác</option>
          </select>
        </div>
      </div>

      {/* Setup & Emotion */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Setup / Chiến lược</label>
          <input
            type="text"
            value={setup}
            onChange={(e) => setSetup(e.target.value)}
            placeholder="VD: Breakout, Pullback OTE, Sweep Liquidity, CHoCH..."
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Tâm lý / Cảm xúc</label>
          <select
            value={emotion}
            onChange={(e) => setEmotion(e.target.value as Emotion)}
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text outline-none"
          >
            <option value="Bình tĩnh">Bình tĩnh (Calm)</option>
            <option value="Kỷ luật">Kỷ luật (Disciplined)</option>
            <option value="Tự tin">Tự tin (Confident)</option>
            <option value="FOMO">FOMO (Sợ bỏ lỡ)</option>
            <option value="Sợ hãi">Sợ hãi (Fearful)</option>
            <option value="Tham lam">Tham lam (Greedy)</option>
            <option value="Mệt mỏi">Mệt mỏi / Căng thẳng (Tired)</option>
          </select>
        </div>
      </div>

      {/* Price Grid: Entry, Stop Loss, Take Profit, Exit */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-2/30 p-3.5 rounded-xl border border-line/70">
        <div>
          <label className="block text-[11px] font-semibold text-text mb-1">Giá Entry (Vào lệnh) *</label>
          <input
            type="number"
            step="any"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            required
            placeholder="1.0850"
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text font-mono outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Stop Loss (SL)</label>
          <input
            type="number"
            step="any"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder="1.0820"
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text font-mono outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Take Profit (TP)</label>
          <input
            type="number"
            step="any"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            placeholder="1.0920"
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text font-mono outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-text mb-1">Giá Exit (Đóng lệnh) *</label>
          <input
            type="number"
            step="any"
            value={exit}
            onChange={(e) => setExit(e.target.value)}
            required
            placeholder="1.0910"
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text font-mono outline-none"
          />
        </div>
      </div>

      {/* Volume: Lot, Units, Fee */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Khối lượng (Lot)</label>
          <input
            type="number"
            step="any"
            value={lot}
            onChange={(e) => setLot(e.target.value)}
            placeholder="1.0"
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text font-mono outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Số lượng đơn vị (Units)</label>
          <input
            type="number"
            step="any"
            value={units}
            onChange={(e) => {
              setUnits(e.target.value);
              const meta = getPipMeta(symbol);
              const u = Number(e.target.value);
              if (u > 0) setLot((u / meta.contractSize).toFixed(4));
            }}
            placeholder="100000"
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text font-mono outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Phí giao dịch ($ Fee)</label>
          <input
            type="number"
            step="any"
            value={fee}
            onChange={(e) => setFee(e.target.value)}
            placeholder="0"
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text font-mono outline-none"
          />
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-[#0e110e] border border-line-strong">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted block">P&L Dự tính</span>
          <strong
            className={`text-lg font-mono font-bold block mt-1 ${
              preview.pnl > 0 ? 'text-profit' : preview.pnl < 0 ? 'text-loss' : 'text-text'
            }`}
          >
            {formatMoney(preview.pnl, true)}
          </strong>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-muted block">R:R Kế hoạch (TP/SL)</span>
          <strong className="text-lg font-mono font-bold text-text block mt-1">
            {preview.plannedRR > 0 ? `${preview.plannedRR}:1` : '—'}
          </strong>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-muted block">Bội số R Thực tế</span>
          <strong
            className={`text-lg font-mono font-bold block mt-1 ${
              preview.rMultiple > 0 ? 'text-profit' : preview.rMultiple < 0 ? 'text-loss' : 'text-text'
            }`}
          >
            {formatR(preview.rMultiple)}
          </strong>
        </div>
      </div>

      {/* Notes / Lessons */}
      <div>
        <label className="block text-[11px] font-semibold text-muted mb-1">Ghi chú / Bài học / Lý do vào lệnh</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Lý do vào lệnh, điều làm tốt, điều cần cải thiện, diễn biến tâm lý..."
          className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg p-3 text-xs text-text leading-relaxed outline-none"
        />
      </div>

      {/* Images Upload Section */}
      <div className="space-y-2 border-t border-line pt-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-[11px] font-semibold text-text block">Hình ảnh / Screenshot Chart</label>
            <span className="text-[10px] text-muted">
              Có thể chọn nhiều ảnh hoặc Paste (Ctrl+V) trực tiếp. Tự động nén và lưu dạng Blob.
            </span>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-2 hover:bg-surface-3 border border-line text-text transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm ảnh
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Images List */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {existingImages.map((img) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border border-line bg-bg aspect-video">
              <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeExistingImage(img.id)}
                className="absolute top-1 right-1 p-1 rounded bg-black/80 text-loss hover:text-white transition-colors"
                title="Xóa ảnh này"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {newImagePreviews.map((prev, idx) => (
            <div key={prev.id} className="relative group rounded-lg overflow-hidden border border-accent/40 bg-bg aspect-video">
              <img src={prev.url} alt={prev.name} className="w-full h-full object-cover" />
              <span className="absolute bottom-1 left-1 bg-accent text-bg font-bold text-[9px] px-1 rounded">Mới</span>
              <button
                type="button"
                onClick={() => removeNewImage(idx)}
                className="absolute top-1 right-1 p-1 rounded bg-black/80 text-loss hover:text-white transition-colors"
                title="Xóa ảnh này"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {existingImages.length === 0 && newImagePreviews.length === 0 && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="col-span-full border border-dashed border-line rounded-lg p-4 text-center cursor-pointer hover:border-line-strong transition-colors flex items-center justify-center gap-2 text-xs text-muted"
            >
              <ImageIcon className="w-4 h-4 text-accent" />
              <span>Bấm vào đây để chọn ảnh biểu đồ hoặc nhấn Ctrl+V để dán ảnh screenshot</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-semibold text-muted hover:text-text rounded-lg hover:bg-surface-2 transition-colors"
        >
          Hủy bỏ
        </button>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-accent hover:bg-[#c5ff68] text-bg rounded-lg shadow-sm transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{saving ? 'Đang lưu...' : initialTrade ? 'Cập nhật giao dịch' : 'Lưu giao dịch'}</span>
        </button>
      </div>
    </form>
  );
};
