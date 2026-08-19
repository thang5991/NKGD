import React from 'react';
import { usePairs } from '../../hooks/usePairs';
import { PositionSizeCalculator } from './PositionSizeCalculator';
import { Info, CheckCircle2 } from 'lucide-react';

interface CalculatorPageProps {
  onOpenPairModal: () => void;
  onUseCalculatedLot: (calcData: {
    symbol: string;
    lot: number;
    units: number;
    entry: number;
    stopLoss: number;
  }) => void;
}

export const CalculatorPage: React.FC<CalculatorPageProps> = ({
  onOpenPairModal,
  onUseCalculatedLot,
}) => {
  const { pairOptions } = usePairs();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PositionSizeCalculator
        pairOptions={pairOptions}
        onOpenPairModal={onOpenPairModal}
        onUseCalculatedLot={onUseCalculatedLot}
      />

      {/* Educational & Risk Management Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-line rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-text font-bold text-xs">
            <CheckCircle2 className="w-4 h-4 text-accent" />
            <span>Quy tắc Vàng trong Quản lý Vốn (Risk Management)</span>
          </div>

          <ul className="text-xs text-muted space-y-2 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">•</span>
              <span>
                <strong>Quy tắc 1-2%:</strong> Không bao giờ rủi ro quá 1% đến 2% tổng số vốn tài khoản trên bất kỳ một lệnh nào.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">•</span>
              <span>
                <strong>Đặt SL trước khi tính Lot:</strong> Điểm Stop Loss phải dựa trên cấu trúc thị trường (hỗ trợ/kháng cự, swing high/low), không được đặt bừa theo số lot cố định.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent font-bold">•</span>
              <span>
                <strong>Điều chỉnh Lot linh hoạt:</strong> Khoảng cách SL xa thì giảm Lot, khoảng cách SL gần thì tăng Lot sao cho số tiền rủi ro ($ Risk) luôn không đổi.
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-text font-bold text-xs">
            <Info className="w-4 h-4 text-accent" />
            <span>Quy ước Pip Size & Contract Size</span>
          </div>

          <div className="space-y-2 text-xs text-muted leading-relaxed">
            <div className="p-2 rounded bg-bg-soft border border-line/50">
              <span className="text-text font-semibold">Forex Cặp chính (Major & Cross):</span>
              <p className="text-[11px] text-muted-2 mt-0.5">
                1 Pip = 0.0001 (riêng các cặp chứa JPY: 1 Pip = 0.01). 1 Standard Lot = 100,000 đơn vị tiền tệ cơ sở.
              </p>
            </div>

            <div className="p-2 rounded bg-bg-soft border border-line/50">
              <span className="text-text font-semibold">Vàng (XAU/USD) & Hàng hóa:</span>
              <p className="text-[11px] text-muted-2 mt-0.5">
                1 Pip = 0.1 (tương đương 10 cents). 1 Standard Lot = 100 troy ounces. Biến động $1 trên giá vàng = 10 pips.
              </p>
            </div>

            <div className="p-2 rounded bg-bg-soft border border-line/50">
              <span className="text-text font-semibold">Crypto (BTC/USDT):</span>
              <p className="text-[11px] text-muted-2 mt-0.5">
                1 Pip = $1.0 biến động giá. 1 Lot = 1 BTC.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
