import React, { useState, useEffect } from 'react';
import { Trade, ImageRecord } from '../../types/trade';
import { Modal } from '../../components/common/Modal';
import { Lightbox } from '../../components/common/Lightbox';
import { formatMoney, formatR, formatDateTime } from '../../utils/formatters';
import {
  ArrowUpRight,
  ArrowDownRight,
  Edit2,
  Trash2,
  Layers,
  Smile,
  FileText,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { calculateComplianceScore, complianceGrade, COMPLIANCE_RULES } from '../../utils/compliance';

interface TradeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: Trade | null;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  loadImages: (refs: string[]) => Promise<ImageRecord[]>;
}

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({
  isOpen,
  onClose,
  trade,
  onEdit,
  onDelete,
  loadImages,
}) => {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState('');

  useEffect(() => {
    if (trade && trade.imageRefs && trade.imageRefs.length > 0) {
      loadImages(trade.imageRefs).then((imgs) => setImages(imgs));
    } else {
      setImages([]);
    }
  }, [trade, loadImages]);

  if (!trade) return null;

  const isProfit = trade.pnl > 0;
  const isLoss = trade.pnl < 0;
  const complianceScore = Number.isFinite(trade.complianceScore)
    ? Number(trade.complianceScore)
    : calculateComplianceScore(trade.violatedRules || []);
  const complianceStatus = complianceGrade(complianceScore);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`${trade.symbol} · ${trade.side}`}
        subtitle={`Giao dịch vào lúc ${formatDateTime(trade.date)}`}
        maxWidth="2xl"
      >
        <div className="space-y-5">
          {/* Top Banner with P&L */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isProfit
                ? 'bg-gradient-to-r from-profit-soft to-surface border-profit/30'
                : isLoss
                ? 'bg-gradient-to-r from-loss-soft to-surface border-loss/30'
                : 'bg-surface-2 border-line'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold border flex items-center gap-1 ${
                    trade.side === 'Long'
                      ? 'bg-profit-soft text-profit border-profit/30'
                      : 'bg-loss-soft text-loss border-loss/30'
                  }`}
                >
                  {trade.side === 'Long' ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {trade.side}
                </span>

                <span className="text-xs font-semibold text-muted bg-surface-3 px-2 py-0.5 rounded">
                  {trade.market}
                </span>

                <span className="text-xs text-muted-2">Setup: {trade.setup || '—'}</span>
              </div>

              <div
                className={`text-2xl font-mono font-bold mt-2 ${
                  isProfit ? 'text-profit' : isLoss ? 'text-loss' : 'text-text'
                }`}
              >
                {formatMoney(trade.pnl, true)}
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-muted">Bội số R</div>
                <div
                  className={`text-lg font-mono font-bold ${
                    trade.rMultiple > 0
                      ? 'text-profit'
                      : trade.rMultiple < 0
                      ? 'text-loss'
                      : 'text-text'
                  }`}
                >
                  {formatR(trade.rMultiple)}
                </div>
              </div>

              {trade.plannedRR > 0 && (
                <div className="text-right pl-3 border-l border-line">
                  <div className="text-[10px] uppercase font-bold text-muted">Kế hoạch R:R</div>
                  <div className="text-lg font-mono font-bold text-text">{trade.plannedRR}:1</div>
                </div>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-bg-soft p-3.5 rounded-xl border border-line">
            <div>
              <span className="text-[10px] text-muted block uppercase font-semibold">Entry</span>
              <span className="font-mono font-bold text-text text-sm">{trade.entry}</span>
            </div>

            <div>
              <span className="text-[10px] text-muted block uppercase font-semibold">Stop Loss</span>
              <span className="font-mono font-bold text-text text-sm">{trade.stopLoss || '—'}</span>
            </div>

            <div>
              <span className="text-[10px] text-muted block uppercase font-semibold">Take Profit</span>
              <span className="font-mono font-bold text-text text-sm">{trade.takeProfit || '—'}</span>
            </div>

            <div>
              <span className="text-[10px] text-muted block uppercase font-semibold">Exit (Đóng)</span>
              <span className="font-mono font-bold text-text text-sm">{trade.exit}</span>
            </div>

            <div className="pt-2 border-t border-line/50">
              <span className="text-[10px] text-muted block uppercase font-semibold">Khối lượng</span>
              <span className="font-mono text-xs text-text">{trade.lot} lot ({trade.units} u)</span>
            </div>

            <div className="pt-2 border-t border-line/50">
              <span className="text-[10px] text-muted block uppercase font-semibold">Phí (Fee)</span>
              <span className="font-mono text-xs text-text">${trade.fee}</span>
            </div>

            <div className="pt-2 border-t border-line/50">
              <span className="text-[10px] text-muted block uppercase font-semibold">Risk Ban đầu</span>
              <span className="font-mono text-xs text-text">{formatMoney(trade.riskAmount)}</span>
            </div>

            <div className="pt-2 border-t border-line/50">
              <span className="text-[10px] text-muted block uppercase font-semibold">Tâm lý</span>
              <span className="text-xs text-text flex items-center gap-1">
                <Smile className="w-3 h-3 text-accent" />
                {trade.emotion}
              </span>
            </div>
          </div>

          {/* Compliance review */}
          {trade.complianceReviewed ? (
            <div className="rounded-xl border border-accent-border bg-accent-soft/15 p-3.5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-muted">Điểm tuân thủ</span>
                    <strong className={`font-mono text-lg ${complianceStatus.className}`}>
                      {complianceScore}/100 · {complianceStatus.label}
                    </strong>
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3 sm:w-44">
                  <div
                    className={`h-full rounded-full ${
                      complianceScore === 100 ? 'bg-profit' : complianceScore >= 60 ? 'bg-amber' : 'bg-loss'
                    }`}
                    style={{ width: complianceScore + '%' }}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {(trade.violatedRules || []).length === 0 ? (
                  <span className="rounded-lg border border-profit/25 bg-profit-soft px-2 py-1 text-[10px] font-semibold text-profit">
                    Không ghi nhận vi phạm
                  </span>
                ) : (
                  COMPLIANCE_RULES
                    .filter((rule) => (trade.violatedRules || []).includes(rule.id))
                    .map((rule) => (
                      <span key={rule.id} className="inline-flex items-center gap-1 rounded-lg border border-loss/25 bg-loss-soft px-2 py-1 text-[10px] text-loss">
                        <ShieldAlert className="h-3 w-3" />
                        {rule.violationLabel}
                      </span>
                    ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2/30 px-3 py-2 text-[10px] text-muted">
              <ShieldCheck className="h-3.5 w-3.5" />
              Lệnh này chưa được đánh giá mức độ tuân thủ.
            </div>
          )}

          {/* Notes */}
          {trade.notes && (
            <div className="bg-surface-2/40 p-4 rounded-xl border border-line space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
                <FileText className="w-3.5 h-3.5 text-accent" />
                <span>Ghi chú & Bài học</span>
              </div>
              <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap">{trade.notes}</p>
            </div>
          )}

          {/* Images Section */}
          <div>
            <div className="text-xs font-semibold text-text mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span>Ảnh chụp màn hình Chart ({images.length})</span>
            </div>

            {images.length === 0 ? (
              <p className="text-xs text-muted italic">Không có ảnh đính kèm cho lệnh này.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => {
                      setLightboxUrl(img.dataUrl || '');
                      setLightboxTitle(`${trade.symbol} · ${img.name}`);
                    }}
                    className="relative rounded-lg overflow-hidden border border-line bg-bg aspect-video cursor-zoom-in hover:border-accent transition-all group shadow-sm"
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                      Phóng to
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-line">
            <button
              onClick={() => {
                if (confirm('Bạn có chắc muốn xóa giao dịch này? Ảnh liên quan cũng sẽ bị xóa.')) {
                  onDelete(trade.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-loss hover:bg-loss-soft px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-loss/30"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa giao dịch</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-muted hover:text-text rounded-lg hover:bg-surface-2 transition-colors"
              >
                Đóng
              </button>

              <button
                onClick={() => {
                  onClose();
                  onEdit(trade);
                }}
                className="flex items-center gap-1.5 bg-surface-2 hover:bg-surface-3 border border-line text-text px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-accent" />
                <span>Chỉnh sửa</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Lightbox for zooming trade chart */}
      <Lightbox
        isOpen={!!lightboxUrl}
        onClose={() => setLightboxUrl(null)}
        imageUrl={lightboxUrl || ''}
        title={lightboxTitle}
      />
    </>
  );
};
