import React from 'react';
import { useTrades } from '../../hooks/useTrades';
import { StatCard } from '../../components/common/StatCard';
import { EquityCurve } from './EquityCurve';
import { QuickStats } from './QuickStats';
import { RecentTrades } from './RecentTrades';
import { formatMoney, formatPercent, formatR } from '../../utils/formatters';
import { DollarSign, Percent, TrendingUp, Target, PlusCircle, Sparkles } from 'lucide-react';
import { Trade } from '../../types/trade';

interface DashboardPageProps {
  onNavigateToTrades: () => void;
  onOpenAddModal: () => void;
  onSelectTrade: (trade: Trade) => void;
  onSeedDemo: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToTrades,
  onOpenAddModal,
  onSelectTrade,
  onSeedDemo,
}) => {
  const { trades, stats, loading } = useTrades();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted text-xs">
        Đang tải dữ liệu giao dịch...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Tổng P&L"
          value={formatMoney(stats.totalPnl, true)}
          subValue={`${stats.totalTrades} giao dịch đã đóng`}
          trend={stats.totalPnl > 0 ? 'profit' : stats.totalPnl < 0 ? 'loss' : 'neutral'}
          icon={<DollarSign className="w-4 h-4 text-accent" />}
        />

        <StatCard
          label="Win Rate"
          value={formatPercent(stats.winRate)}
          subValue={`${stats.wins} Thắng / ${stats.losses} Thua`}
          trend={stats.winRate >= 50 ? 'profit' : stats.winRate > 0 ? 'loss' : 'neutral'}
          icon={<Percent className="w-4 h-4 text-accent" />}
        />

        <StatCard
          label="Profit Factor"
          value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
          subValue="Gross Profit / Gross Loss"
          trend={stats.profitFactor >= 1.5 ? 'profit' : stats.profitFactor < 1 ? 'loss' : 'neutral'}
          icon={<TrendingUp className="w-4 h-4 text-accent" />}
        />

        <StatCard
          label="Trung bình R Thực tế"
          value={formatR(stats.avgR)}
          subValue="Lợi nhuận theo bội số rủi ro ban đầu"
          trend={stats.avgR > 0 ? 'profit' : stats.avgR < 0 ? 'loss' : 'neutral'}
          icon={<Target className="w-4 h-4 text-accent" />}
        />
      </div>

      {/* Main Grid: Equity Curve (2/3) + Quick Stats (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface border border-line rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-line pb-2.5">
            <div>
              <h3 className="text-sm font-semibold text-text tracking-tight">Equity Curve</h3>
              <p className="text-[11px] text-muted">Lợi nhuận tích lũy theo dòng thời gian</p>
            </div>
          </div>
          <EquityCurve trades={trades} />
        </div>

        <div className="lg:col-span-1">
          <QuickStats stats={stats} />
        </div>
      </div>

      {/* Recent Trades Section */}
      <div>
        <RecentTrades
          trades={trades}
          onViewAll={onNavigateToTrades}
          onSelectTrade={onSelectTrade}
        />
      </div>

      {/* Empty State Banner if no trades */}
      {trades.length === 0 && (
        <div className="bg-gradient-to-r from-surface to-surface-2 border border-line-strong rounded-xl p-6 text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-accent-soft text-accent mx-auto flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-text mb-1">Bắt đầu ghi nhận Nhật ký Giao dịch</h3>
          <p className="text-xs text-muted max-w-md mx-auto mb-4 leading-relaxed">
            Hệ thống hỗ trợ tính Lot chuẩn theo Pip Value, ghi lại biểu đồ chart trước/sau lệnh và phân tích hiệu suất chuyên sâu.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-2 bg-accent hover:bg-[#c5ff68] text-bg font-bold py-2.5 px-5 rounded-lg text-xs shadow transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Thêm giao dịch đầu tiên</span>
            </button>
            <button
              onClick={onSeedDemo}
              className="flex items-center gap-2 bg-surface-3 hover:bg-surface-2 border border-line text-text font-medium py-2.5 px-4 rounded-lg text-xs transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Tạo dữ liệu mẫu</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
