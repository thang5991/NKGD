import React, { useState, useEffect, useMemo } from 'react';
import { PairOption } from '../../types/pair';
import { calculatePositionSize } from '../../utils/calculator';
import { formatMoney } from '../../utils/formatters';
import { useFxRate } from '../../hooks/useFxRate';
import { Calculator, ArrowRight, Layers, Sparkles, RefreshCw } from 'lucide-react';

interface PositionSizeCalculatorProps {
  pairOptions: PairOption[];
  onOpenPairModal: () => void;
  onUseCalculatedLot?: (calcData: {
    symbol: string;
    lot: number;
    units: number;
    entry: number;
    stopLoss: number;
  }) => void;
}

export const PositionSizeCalculator: React.FC<PositionSizeCalculatorProps> = ({
  pairOptions,
  onOpenPairModal,
  onUseCalculatedLot,
}) => {
  const [balance, setBalance] = useState<string>('10000');
  const [riskPercent, setRiskPercent] = useState<string>('1.0');
  const [symbol, setSymbol] = useState<string>('EURUSD');
  const [entry, setEntry] = useState<string>('');
  const [stopLoss, setStopLoss] = useState<string>('');
  const [stopLossPips, setStopLossPips] = useState<string>('');
  const today = useMemo(() => {
    const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return now.toISOString().slice(0, 10);
  }, []);
  const fxRate = useFxRate(symbol, today, 'USD');

  // Selected pair object
  const selectedPair = useMemo(() => {
    return pairOptions.find((p) => p.symbol === symbol) || pairOptions[0];
  }, [pairOptions, symbol]);

  // Position calculation
  const result = useMemo(() => {
    return calculatePositionSize({
      accountBalance: Number(balance) || 0,
      riskPercent: Number(riskPercent) || 0,
      symbol,
      entry: Number(entry) || undefined,
      stopLoss: Number(stopLoss) || undefined,
      stopLossPips: Number(stopLossPips) || undefined,
      conversionRate: fxRate.rate,
      customPipSize: selectedPair?.pipSize,
      customContractSize: selectedPair?.contractSize,
    });
  }, [balance, riskPercent, symbol, entry, stopLoss, stopLossPips, fxRate.rate, selectedPair]);

  // If entry & stopLoss change and user didn't enter pips directly, update pips
  useEffect(() => {
    const numEntry = Number(entry);
    const numSL = Number(stopLoss);
    if (numEntry > 0 && numSL > 0 && selectedPair) {
      const pips = Math.abs(numEntry - numSL) / selectedPair.pipSize;
      setStopLossPips(pips.toFixed(1));
    }
  }, [entry, stopLoss, selectedPair]);

  const handleUseSize = () => {
    if (onUseCalculatedLot && !result.conversionMissing && !fxRate.loading) {
      onUseCalculatedLot({
        symbol,
        lot: result.lot,
        units: result.units,
        entry: Number(entry) || 0,
        stopLoss: Number(stopLoss) || 0,
      });
    }
  };

  return (
    <div className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-sm space-y-5">
      <div className="flex flex-col gap-3 border-b border-line pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-accent-soft text-accent">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text tracking-tight">Tính Lot theo Pip Value</h3>
            <p className="text-xs text-muted">
              Quản lý vốn chuẩn xác theo Pip Value thực tế từng cặp Forex, Kim loại và Crypto
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenPairModal}
          className="flex w-full items-center justify-center gap-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-accent hover:underline sm:w-auto sm:py-1.5"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>+ Quản lý Cặp</span>
        </button>
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Số dư Tài khoản ($ Balance)</label>
          <input
            type="number"
            step="any"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="10000"
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text font-mono outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Rủi ro mong muốn (% Risk)</label>
          <input
            type="number"
            step="any"
            value={riskPercent}
            onChange={(e) => setRiskPercent(e.target.value)}
            placeholder="1.0"
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text font-mono outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Cặp giao dịch</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text outline-none font-semibold"
          >
            {pairOptions.map((opt) => (
              <option key={opt.symbol} value={opt.symbol}>
                {opt.displayName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Stop Loss (Số Pips)</label>
          <input
            type="number"
            step="any"
            value={stopLossPips}
            onChange={(e) => setStopLossPips(e.target.value)}
            placeholder="VD: 30"
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text font-mono outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Giá Entry (Giá vào)</label>
          <input
            type="number"
            step="any"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            placeholder="Tùy chọn: 1.0850"
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text font-mono outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-muted mb-1">Giá Stop Loss</label>
          <input
            type="number"
            step="any"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder="Tùy chọn: 1.0820"
            className="w-full bg-[#0c0e0c] border border-line focus:border-accent rounded-lg px-3 py-2 text-xs text-text font-mono outline-none"
          />
        </div>

        {/* Automatic conversion status */}
        {result.needsConversion && (
          <div className={`col-span-full flex items-center justify-between gap-3 p-3.5 rounded-xl border ${
            fxRate.error ? 'bg-loss/5 border-loss/40' : 'bg-surface-2/60 border-line'
          }`}>
            <div>
              <span className="block text-[11px] font-semibold text-accent mb-1">
                Tỷ giá tự động: {fxRate.quoteCurrency} → USD
              </span>
              <p className={`text-[10px] ${fxRate.error ? 'text-loss' : 'text-muted'}`}>
                {fxRate.loading
                  ? 'Đang lấy tỷ giá mới nhất...'
                  : fxRate.error
                    ? `Không thể lấy tỷ giá: ${fxRate.error}`
                    : `1 ${fxRate.quoteCurrency} = ${fxRate.rate?.toFixed(6)} USD · Frankfurter (${fxRate.rateDate})`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void fxRate.refresh()}
              disabled={fxRate.loading}
              className="shrink-0 flex items-center gap-1 rounded border border-line px-2 py-1 text-[10px] text-muted hover:text-text disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${fxRate.loading ? 'animate-spin' : ''}`} />
              Thử lại
            </button>
          </div>
        )}
      </div>

      {/* Output Results Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-bg-soft p-4 rounded-xl border border-line-strong">
        <div>
          <span className="text-[10px] uppercase font-bold text-muted block">Số tiền Rủi ro</span>
          <strong className="text-xl font-mono font-bold text-text block mt-1">
            {formatMoney(result.riskMoney)}
          </strong>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-muted block">Khoảng cách SL</span>
          <strong className="text-xl font-mono font-bold text-text block mt-1">
            {result.stopLossPips} pips
          </strong>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-muted block">Pip Value / Lot</span>
          <strong className="text-xl font-mono font-bold text-text block mt-1">
            {result.pipValuePerLotUSD > 0 ? `$${result.pipValuePerLotUSD.toFixed(2)}` : '—'}
          </strong>
        </div>

        <div className="bg-accent-soft/30 p-2.5 rounded-lg border border-accent/30">
          <span className="text-[10px] uppercase font-bold text-accent block">Khối lượng Đề xuất</span>
          <strong className="text-2xl font-mono font-black text-accent block mt-0.5">
            {fxRate.loading ? '...' : `${result.lot} Lot`}
          </strong>
          <span className="text-[10px] text-muted block mt-0.5">({result.units.toLocaleString()} units)</span>
        </div>
      </div>

      {/* Explanation formula */}
      <div className="text-[11px] text-muted-2 leading-relaxed bg-surface-2/30 p-3 rounded-lg border border-line/50">
        <strong className="text-text">Công thức chuẩn: </strong>
        <code>Lot = Risk $ ÷ (SL Pips × Pip Value/Lot)</code>.
        {result.meta.type === 'forex' && ' Với Forex chuẩn: 1 pip = 0.0001 (JPY = 0.01), 1 Lot = 100,000 đơn vị tiền tệ.'}
        {result.meta.type === 'xau' && ' Với Vàng (XAUUSD): 1 pip = 0.1, 1 Lot = 100 oz (~$10/pip).'}
        {result.meta.type === 'btc' && ' Với Bitcoin (BTCUSDT): 1 pip = 1.0, 1 Lot = 1 BTC.'}
      </div>

      {/* Use size button */}
      {onUseCalculatedLot && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleUseSize}
            disabled={fxRate.loading || result.conversionMissing || result.lot <= 0}
            className="flex w-full items-center justify-center gap-2 bg-accent hover:bg-[#c5ff68] text-bg font-bold py-2.5 px-5 rounded-lg text-xs shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Sparkles className="w-4 h-4" />
            <span>Dùng Khối lượng này cho Giao dịch</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
