import React, { useState, useEffect, useRef } from 'react';
import { Trade, TradeFormData, Side, Market, Emotion, Timeframe, ImageRecord, ComplianceRuleId } from '../../types/trade';
import { PairOption } from '../../types/pair';
import { calculateTrade, getPipMeta } from '../../utils/calculator';
import { formatMoney, formatR } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';
import { useFxRate } from '../../hooks/useFxRate';
import { Plus, X, Image as ImageIcon, Sparkles, Layers, RefreshCw, ShieldCheck, ShieldAlert, Check } from 'lucide-react';
import { DateTimePicker } from '../../components/common/DateTimePicker';
import { calculateComplianceScore, complianceGrade, COMPLIANCE_RULES } from '../../utils/compliance';
import { useAccounts } from '../../hooks/useAccounts';

interface TradeFormProps {
  initialTrade?: Partial<Trade> | Trade | null;
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
  const { activeAccount } = useAccounts();

  const [date, setDate] = useState(() => {
    if (initialTrade?.date) return initialTrade.date;
    const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return now.toISOString().slice(0, 16);
  });
  const [exitDate, setExitDate] = useState(initialTrade?.exitDate || initialTrade?.date || date);

  const [symbol, setSymbol] = useState(initialTrade?.symbol || 'EURUSD');
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTrade?.timeframe || 'M15');
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
  const [complianceReviewed, setComplianceReviewed] = useState(initialTrade?.complianceReviewed || false);
  const [violatedRules, setViolatedRules] = useState<ComplianceRuleId[]>(initialTrade?.violatedRules || []);

  const [existingImages, setExistingImages] = useState<ImageRecord[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<{ id: string; url: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'date' | 'exitDate' | 'symbol' | 'entry' | 'exit', string>>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const accountCurrency = initialTrade?.accountCurrency || activeAccount?.currency || 'USD';
  const fxRate = useFxRate(symbol, exitDate || date, accountCurrency);
  const complianceScore = React.useMemo(() => calculateComplianceScore(violatedRules), [violatedRules]);
  const complianceStatus = complianceGrade(complianceScore);

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
      accountCurrency: fxRate.accountCurrency,
      conversionRate: fxRate.rate,
    });
  }, [side, entry, exit, stopLoss, takeProfit, lot, units, fee, symbol, fxRate.accountCurrency, fxRate.rate]);

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

  const toggleViolation = (ruleId: ComplianceRuleId) => {
    setViolatedRules((current) => current.includes(ruleId)
      ? current.filter((item) => item !== ruleId)
      : [...current, ruleId]);
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

    const nextErrors: typeof fieldErrors = {};
    if (!date) nextErrors.date = 'Vui lòng chọn ngày giờ vào lệnh';
    if (!exitDate) nextErrors.exitDate = 'Vui lòng chọn ngày giờ đóng lệnh';
    if (!symbol.trim()) nextErrors.symbol = 'Vui lòng chọn cặp giao dịch';
    if (!Number.isFinite(numEntry) || numEntry <= 0) nextErrors.entry = 'Giá Entry phải lớn hơn 0';
    if (!Number.isFinite(numExit) || numExit <= 0) nextErrors.exit = 'Giá Exit phải lớn hơn 0';
    if (date && exitDate && exitDate < date) {
      nextErrors.exitDate = 'Thời gian đóng lệnh không được trước thời gian vào lệnh';
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast('Vui lòng kiểm tra lại các trường được đánh dấu', 'error');
      return;
    }
    if (fxRate.loading) {
      showToast('Đang lấy tỷ giá quy đổi, vui lòng chờ trong giây lát', 'info');
      return;
    }
    if (fxRate.needsConversion && !fxRate.rate) {
      showToast('Chưa lấy được tỷ giá quy đổi. Hãy thử tải lại tỷ giá.', 'error');
      return;
    }

    try {
      setSaving(true);
      await onSubmit({
        id: initialTrade?.id,
        accountId: initialTrade?.accountId || activeAccount?.id,
        date,
        exitDate: exitDate || date,
        symbol: symbol.toUpperCase().trim(),
        timeframe: timeframe || 'M15',
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
        accountCurrency: fxRate.accountCurrency,
        quoteCurrency: fxRate.quoteCurrency,
        conversionRate: fxRate.rate || 1,
        conversionDate: fxRate.rateDate || (exitDate || date).slice(0, 10),
        conversionSource: fxRate.source || 'frankfurter',
        pnlQuote: preview.pnlQuote,
        riskAmountQuote: preview.riskAmountQuote,
        complianceReviewed,
        complianceScore: complianceReviewed ? complianceScore : undefined,
        violatedRules: complianceReviewed ? violatedRules : [],
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
    <form noValidate onSubmit={handleSubmit} onPaste={handlePaste} className="space-y-4">
      {/* Basic row: Dates, Pair, Timeframe, Side, Market */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <DateTimePicker
          label="Ngày giờ vào lệnh"
          value={date}
          onChange={(value) => {
            setDate(value);
            setFieldErrors((current) => ({ ...current, date: undefined }));
          }}
          required
          error={fieldErrors.date}
        />

        <DateTimePicker
          label="Ngày giờ đóng lệnh"
          value={exitDate}
          onChange={(value) => {
            setExitDate(value);
            setFieldErrors((current) => ({ ...current, exitDate: undefined }));
          }}
          min={date}
          required
          error={fieldErrors.exitDate}
        />

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
            onChange={(e) => {
              setSymbol(e.target.value);
              setFieldErrors((current) => ({ ...current, symbol: undefined }));
            }}
            required
            className={`w-full rounded-lg border bg-[#0c0e0c] px-3 py-2 text-xs text-text outline-none ${
              fieldErrors.symbol ? 'border-loss/70 focus:border-loss' : 'border-line focus:border-accent'
            }`}
          >
            {pairOptions.map((opt) => (
              <option key={opt.symbol} value={opt.symbol}>
                {opt.displayName}
              </option>
            ))}
          </select>
          {fieldErrors.symbol && <p className="mt-1 text-[10px] font-medium text-loss">{fieldErrors.symbol}</p>}
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Timeframe *</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text outline-none font-semibold"
          >
            <option value="M1">M1 (1 phút)</option>
            <option value="M5">M5 (5 phút)</option>
            <option value="M15">M15 (15 phút)</option>
            <option value="M30">M30 (30 phút)</option>
            <option value="H1">H1 (1 giờ)</option>
            <option value="H4">H4 (4 giờ)</option>
            <option value="D1">D1 (1 ngày)</option>
            <option value="W1">W1 (1 tuần)</option>
            <option value="MN">MN (1 tháng)</option>
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

      {fxRate.needsConversion && (
        <div className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-[11px] ${
          fxRate.error ? 'border-loss/40 bg-loss/5 text-loss' : 'border-line bg-surface-2/40 text-muted'
        }`}>
          <span>
            {fxRate.loading
              ? `Đang lấy tỷ giá ${fxRate.quoteCurrency} → ${fxRate.accountCurrency}...`
              : fxRate.error
                ? `Không thể lấy tỷ giá: ${fxRate.error}`
                : `Tự động quy đổi: 1 ${fxRate.quoteCurrency} = ${fxRate.rate?.toFixed(6)} ${fxRate.accountCurrency} (${fxRate.rateDate})`}
          </span>
          <button
            type="button"
            onClick={() => void fxRate.refresh()}
            disabled={fxRate.loading}
            className="shrink-0 flex items-center gap-1 rounded border border-line px-2 py-1 text-muted hover:text-text disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${fxRate.loading ? 'animate-spin' : ''}`} />
            Thử lại
          </button>
        </div>
      )}

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
            onChange={(e) => {
              setEntry(e.target.value);
              setFieldErrors((current) => ({ ...current, entry: undefined }));
            }}
            required
            placeholder="1.0850"
            className={`w-full rounded-lg border bg-[#0c0e0c] px-3 py-2 text-xs text-text font-mono outline-none ${
              fieldErrors.entry ? 'border-loss/70 focus:border-loss' : 'border-line focus:border-accent'
            }`}
          />
          {fieldErrors.entry && <p className="mt-1 text-[10px] font-medium text-loss">{fieldErrors.entry}</p>}
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
            onChange={(e) => {
              setExit(e.target.value);
              setFieldErrors((current) => ({ ...current, exit: undefined }));
            }}
            required
            placeholder="1.0910"
            className={`w-full rounded-lg border bg-[#0c0e0c] px-3 py-2 text-xs text-text font-mono outline-none ${
              fieldErrors.exit ? 'border-loss/70 focus:border-loss' : 'border-line focus:border-accent'
            }`}
          />
          {fieldErrors.exit && <p className="mt-1 text-[10px] font-medium text-loss">{fieldErrors.exit}</p>}
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
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-line-strong bg-[#0e110e] p-3.5 sm:grid-cols-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted block">P&L Dự tính</span>
          <strong
            className={`text-lg font-mono font-bold block mt-1 ${
              preview.pnl > 0 ? 'text-profit' : preview.pnl < 0 ? 'text-loss' : 'text-text'
            }`}
          >
            {fxRate.loading ? 'Đang tính...' : preview.conversionMissing ? 'Chưa có tỷ giá' : formatMoney(preview.pnl, true, accountCurrency)}
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

      {/* Discipline & compliance review */}
      <section className={`rounded-xl border transition-colors ${
        complianceReviewed ? 'border-accent-border bg-accent-soft/15' : 'border-line bg-surface-2/20'
      }`}>
        <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              complianceReviewed ? 'bg-accent-soft text-accent' : 'bg-surface-3 text-muted'
            }`}>
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs font-bold text-text">Chấm điểm mức độ tuân thủ</h3>
                <span className="rounded-full border border-line px-2 py-0.5 text-[9px] font-semibold text-muted">
                  Không bắt buộc
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted">
                Review quy tắc sau giao dịch để đo lường chi phí của việc phá kỷ luật
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={complianceReviewed}
            onClick={() => setComplianceReviewed((value) => !value)}
            className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors sm:w-auto ${
              complianceReviewed
                ? 'border-accent-border bg-accent-soft text-accent'
                : 'border-line bg-surface-2 text-muted hover:text-text'
            }`}
          >
            <span>{complianceReviewed ? 'Đã đánh giá' : 'Đánh giá lệnh này'}</span>
            <span className={`relative h-5 w-9 rounded-full transition-colors ${
              complianceReviewed ? 'bg-accent' : 'bg-surface-3'
            }`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                complianceReviewed ? 'translate-x-[18px]' : 'translate-x-0.5'
              }`} />
            </span>
          </button>
        </div>

        {complianceReviewed && (
          <div className="border-t border-line/70 p-3.5">
            <div className="mb-3 flex flex-col gap-3 rounded-xl border border-line bg-bg-soft p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-2">Điểm tuân thủ</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <strong className={`font-mono text-2xl font-black ${complianceStatus.className}`}>{complianceScore}</strong>
                  <span className="text-[10px] text-muted">/ 100 · {complianceStatus.label}</span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3 sm:w-48">
                <div
                  className={`h-full rounded-full transition-all ${
                    complianceScore === 100 ? 'bg-profit' : complianceScore >= 60 ? 'bg-amber' : 'bg-loss'
                  }`}
                  style={{ width: complianceScore + '%' }}
                />
              </div>
            </div>

            <p className="mb-2 text-[10px] text-muted">
              Mặc định tất cả quy tắc được xem là đã tuân thủ. Chọn những quy tắc bạn đã vi phạm:
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {COMPLIANCE_RULES.map((rule) => {
                const violated = violatedRules.includes(rule.id);
                return (
                  <button
                    key={rule.id}
                    type="button"
                    onClick={() => toggleViolation(rule.id)}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                      violated
                        ? 'border-loss/40 bg-loss-soft/60'
                        : 'border-line bg-surface-2/40 hover:border-line-strong'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${
                      violated ? 'bg-loss text-white' : 'bg-profit-soft text-profit'
                    }`}>
                      {violated ? <ShieldAlert className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[11px] font-bold ${violated ? 'text-loss' : 'text-text'}`}>
                        {violated ? rule.violationLabel : rule.label}
                      </span>
                      <span className="mt-0.5 block text-[9px] leading-relaxed text-muted">
                        {rule.description} · {rule.weight} điểm
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

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
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <label className="text-[11px] font-semibold text-text block">Hình ảnh / Screenshot Chart</label>
            <span className="text-[10px] text-muted">
              Có thể chọn nhiều ảnh hoặc Paste (Ctrl+V) trực tiếp. Tự động nén và lưu dạng Blob.
            </span>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs font-semibold text-text transition-colors hover:bg-surface-3 sm:w-auto sm:py-1.5"
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
      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="w-full rounded-lg px-4 py-2.5 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-text sm:w-auto sm:py-2"
        >
          Hủy bỏ
        </button>

        <button
          type="submit"
          disabled={saving || fxRate.loading || (fxRate.needsConversion && !fxRate.rate)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-xs font-bold text-bg shadow-sm transition-all hover:bg-[#c5ff68] disabled:opacity-50 sm:w-auto sm:py-2"
        >
          <Sparkles className="w-4 h-4" />
          <span>{saving ? 'Đang lưu...' : initialTrade ? 'Cập nhật giao dịch' : 'Lưu giao dịch'}</span>
        </button>
      </div>
    </form>
  );
};
