import React, { useMemo } from 'react';
import { AlertTriangle, Banknote, ClipboardCheck, ShieldCheck, Target } from 'lucide-react';
import { Trade } from '../../types/trade';
import { calculateComplianceScore, COMPLIANCE_RULES } from '../../utils/compliance';
import { formatMoney, formatPercent } from '../../utils/formatters';
import { useAccounts } from '../../hooks/useAccounts';
import { classifyTradeResult } from '../../utils/calculator';

interface DisciplineAnalyticsProps {
  trades: Trade[];
}

export const DisciplineAnalytics: React.FC<DisciplineAnalyticsProps> = ({ trades }) => {
  const { activeAccount } = useAccounts();
  const currency = activeAccount?.currency;
  const analytics = useMemo(() => {
    const reviewed = trades.filter((trade) => trade.complianceReviewed);
    const withScore = reviewed.map((trade) => ({
      trade,
      score: Number.isFinite(trade.complianceScore)
        ? Number(trade.complianceScore)
        : calculateComplianceScore(trade.violatedRules || []),
    }));
    const compliant = withScore.filter(({ trade, score }) => score === 100 && (trade.violatedRules || []).length === 0);
    const broken = withScore.filter(({ trade, score }) => score < 100 || (trade.violatedRules || []).length > 0);
    const compliantWins = compliant.filter(({ trade }) => classifyTradeResult(trade.pnl, trade.riskAmount, trade.rMultiple) === 'win').length;
    const compliantPnl = compliant.reduce((sum, { trade }) => sum + trade.pnl, 0);
    const brokenPnl = broken.reduce((sum, { trade }) => sum + trade.pnl, 0);
    const mistakeCost = broken.reduce((sum, { trade }) => sum + Math.abs(Math.min(0, trade.pnl)), 0);
    const averageScore = withScore.length > 0
      ? withScore.reduce((sum, item) => sum + item.score, 0) / withScore.length
      : 0;

    const violations = COMPLIANCE_RULES.map((rule) => {
      const affectedTrades = reviewed.filter((trade) => (trade.violatedRules || []).includes(rule.id));
      return {
        ...rule,
        count: affectedTrades.length,
        pnl: affectedTrades.reduce((sum, trade) => sum + trade.pnl, 0),
      };
    }).filter((rule) => rule.count > 0).sort((a, b) => b.count - a.count);

    return {
      reviewedCount: reviewed.length,
      compliantCount: compliant.length,
      brokenCount: broken.length,
      compliantWinRate: compliant.length > 0 ? (compliantWins / compliant.length) * 100 : null,
      compliantPnl,
      brokenPnl,
      mistakeCost,
      averageScore,
      violations,
    };
  }, [trades]);

  if (analytics.reviewedCount === 0) {
    return (
      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
        <div className="flex flex-col items-center justify-center py-5 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h3 className="mt-3 text-sm font-bold text-text">Chưa có dữ liệu tuân thủ</h3>
          <p className="mt-1 max-w-md text-xs leading-relaxed text-muted">
            Mở một giao dịch, bật “Đánh giá lệnh này” và chọn các quy tắc đã vi phạm. Thống kê kỷ luật sẽ tự động xuất hiện tại đây.
          </p>
        </div>
      </section>
    );
  }

  const maxViolation = Math.max(...analytics.violations.map((rule) => rule.count), 1);

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <header className="flex flex-col gap-3 border-b border-line bg-surface-2/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-text">Hiệu suất & Kỷ luật giao dịch</h3>
            <p className="mt-0.5 text-[10px] text-muted">
              Chỉ tính {analytics.reviewedCount}/{trades.length} lệnh đã được đánh giá tuân thủ
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg-soft px-3 py-2 sm:justify-start">
          <span className="text-[9px] uppercase text-muted-2">Điểm trung bình</span>
          <strong className={`font-mono text-sm ${
            analytics.averageScore >= 80 ? 'text-profit' : analytics.averageScore >= 60 ? 'text-amber' : 'text-loss'
          }`}>
            {analytics.averageScore.toFixed(0)}/100
          </strong>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
        <div className="min-w-0 bg-surface p-3.5 sm:p-4">
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-muted">
            <Target className="h-3.5 w-3.5 text-accent" />
            Win rate đúng kế hoạch
          </div>
          <strong className="mt-2 block font-mono text-xl text-profit">
            {analytics.compliantWinRate == null ? '—' : formatPercent(analytics.compliantWinRate)}
          </strong>
          <span className="mt-1 block text-[10px] text-muted-2">{analytics.compliantCount} lệnh đạt 100 điểm</span>
        </div>

        <div className="min-w-0 bg-surface p-3.5 sm:p-4">
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-muted">
            <ClipboardCheck className="h-3.5 w-3.5 text-profit" />
            P&L đúng kế hoạch
          </div>
          <strong className={`mt-2 block break-words font-mono text-xl ${
            analytics.compliantPnl >= 0 ? 'text-profit' : 'text-loss'
          }`}>
            {formatMoney(analytics.compliantPnl, true, currency)}
          </strong>
          <span className="mt-1 block text-[10px] text-muted-2">{analytics.compliantCount} lệnh tuân thủ đầy đủ</span>
        </div>

        <div className="min-w-0 bg-surface p-3.5 sm:p-4">
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-muted">
            <AlertTriangle className="h-3.5 w-3.5 text-amber" />
            P&L phá kỷ luật
          </div>
          <strong className={`mt-2 block break-words font-mono text-xl ${
            analytics.brokenPnl >= 0 ? 'text-profit' : 'text-loss'
          }`}>
            {formatMoney(analytics.brokenPnl, true, currency)}
          </strong>
          <span className="mt-1 block text-[10px] text-muted-2">{analytics.brokenCount} lệnh có vi phạm</span>
        </div>

        <div className="min-w-0 bg-surface p-3.5 sm:p-4">
          <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-muted">
            <Banknote className="h-3.5 w-3.5 text-loss" />
            Chi phí lỗi ghi nhận
          </div>
          <strong className="mt-2 block break-words font-mono text-xl text-loss">
            {formatMoney(analytics.mistakeCost, false, currency)}
          </strong>
          <span className="mt-1 block text-[10px] leading-relaxed text-muted-2">Tổng phần lỗ của lệnh có vi phạm</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 border-t border-line p-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-bold text-text">Quy tắc thường bị vi phạm</h4>
            <span className="text-[9px] uppercase text-muted-2">{analytics.violations.length} loại lỗi</span>
          </div>

          {analytics.violations.length === 0 ? (
            <div className="rounded-lg border border-profit/20 bg-profit-soft p-4 text-center text-xs text-profit">
              Tất cả lệnh đã review đều tuân thủ đầy đủ.
            </div>
          ) : (
            <div className="space-y-3">
              {analytics.violations.slice(0, 5).map((rule) => (
                <div key={rule.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-[10px]">
                    <span className="min-w-0 truncate font-semibold text-text">{rule.violationLabel}</span>
                    <span className="shrink-0 font-mono text-muted">{rule.count} lần</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-loss/80"
                      style={{ width: (rule.count / maxViolation) * 100 + '%' }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[9px] text-muted-2">
                    <span>{((rule.count / analytics.reviewedCount) * 100).toFixed(0)}% số lệnh đã review</span>
                    <span className={rule.pnl >= 0 ? 'font-mono text-profit' : 'font-mono text-loss'}>
                      P&L liên quan {formatMoney(rule.pnl, true, currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-line bg-bg-soft p-3.5">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted">Cách đọc số liệu</h4>
          <ul className="mt-2.5 space-y-2 text-[10px] leading-relaxed text-muted">
            <li>• “Đúng kế hoạch” là lệnh đã review và đạt đủ 100 điểm.</li>
            <li>• Một lệnh có từ một quy tắc vi phạm trở lên được xếp vào nhóm phá kỷ luật.</li>
            <li>• Chi phí lỗi là tổng phần P&L âm của nhóm phá kỷ luật, không phải lợi nhuận giả định.</li>
            <li>• Một lệnh vi phạm nhiều quy tắc sẽ được tính vào từng thống kê lỗi tương ứng.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
};
