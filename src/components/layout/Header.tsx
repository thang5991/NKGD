import React from 'react';
import { Menu, Plus, RefreshCw, WalletCards } from 'lucide-react';
import { ActiveView } from './Sidebar';
import { useAccounts } from '../../hooks/useAccounts';

interface HeaderProps {
  activeView: ActiveView;
  onOpenMobileNav: () => void;
  onOpenAddModal: () => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onOpenMobileNav,
  onOpenAddModal,
  onRefresh,
  isRefreshing = false,
}) => {
  const { accounts, activeAccount, activeAccountId, setActiveAccountId } = useAccounts();
  const viewTitles: Record<ActiveView, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard Tổng quan',
      subtitle: 'Hiệu suất giao dịch và đường cong tăng trưởng vốn',
    },
    calendar: {
      title: 'Calendar P&L',
      subtitle: 'Xem lợi nhuận/thua lỗ theo ngày, tuần và tháng',
    },
    economic: {
      title: 'Economic Calendar',
      subtitle: 'Theo dõi phiên giao dịch và các sự kiện kinh tế quan trọng',
    },
    trades: {
      title: 'Nhật ký giao dịch',
      subtitle: 'Lịch sử vào lệnh, tỷ lệ R:R và bài học từng lệnh',
    },
    'add-trade': {
      title: 'Thêm giao dịch mới',
      subtitle: 'Ghi lại chi tiết lệnh giao dịch cùng biểu đồ phân tích',
    },
    blog: {
      title: 'Blog / Notes',
      subtitle: 'Hệ thống tri thức giao dịch, phân tích chiến lược và bài học',
    },
    calculator: {
      title: 'Lot & Position Size Calculator',
      subtitle: 'Tính khối lượng vào lệnh theo Pip Value chuẩn Forex & Crypto',
    },
    settings: {
      title: 'Tài khoản & Dữ liệu',
      subtitle: 'Quản lý tài khoản giao dịch, backup và bộ nhớ local',
    },
  };

  const current = viewTitles[activeView] || {
    title: 'Trading Journal',
    subtitle: 'Nhật ký giao dịch cá nhân',
  };

  return (
    <header className="mb-4 flex items-center justify-between gap-2 border-b border-line/60 py-3 sm:mb-6 sm:gap-3 sm:py-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          onClick={onOpenMobileNav}
          className="p-2 md:hidden text-muted hover:text-text rounded-lg hover:bg-surface border border-line"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-base font-bold tracking-tight text-text sm:text-xl md:text-2xl">{current.title}</h1>
          </div>
          <p className="hidden sm:block text-xs text-muted mt-1">{current.subtitle}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <label className="relative flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1.5 text-xs">
          <WalletCards className="h-4 w-4 shrink-0 text-accent" />
          <span className="sr-only">Tài khoản giao dịch</span>
          <select
            value={activeAccountId}
            onChange={(event) => setActiveAccountId(event.target.value)}
            className="max-w-[105px] bg-transparent font-semibold text-text outline-none sm:max-w-[180px]"
            title={activeAccount ? `${activeAccount.name} · ${activeAccount.currency}` : 'Chọn tài khoản'}
          >
            {accounts.filter((account) => !account.archived).map((account) => (
              <option key={account.id} value={account.id} className="bg-surface text-text">
                {account.name} · {account.currency}
              </option>
            ))}
          </select>
        </label>

        {onRefresh && (
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={isRefreshing}
            className="p-2 text-muted hover:text-text rounded-lg hover:bg-surface border border-line transition-colors disabled:cursor-wait disabled:opacity-60"
            title={isRefreshing ? 'Đang làm mới dữ liệu' : 'Làm mới dữ liệu'}
            aria-label={isRefreshing ? 'Đang làm mới dữ liệu' : 'Làm mới dữ liệu'}
            aria-busy={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}

        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 bg-accent hover:bg-[#c5ff68] text-bg font-bold py-2 px-3.5 rounded-lg text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Giao dịch mới</span>
          <span className="sm:hidden">Thêm</span>
        </button>
      </div>
    </header>
  );
};
