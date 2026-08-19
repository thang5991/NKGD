import React from 'react';
import { Menu, Plus, RefreshCw } from 'lucide-react';
import { ActiveView } from './Sidebar';

interface HeaderProps {
  activeView: ActiveView;
  onOpenMobileNav: () => void;
  onOpenAddModal: () => void;
  onRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onOpenMobileNav,
  onOpenAddModal,
  onRefresh,
}) => {
  const viewTitles: Record<ActiveView, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard Tổng quan',
      subtitle: 'Hiệu suất giao dịch và đường cong tăng trưởng vốn',
    },
    calendar: {
      title: 'Calendar P&L',
      subtitle: 'Xem lợi nhuận/thua lỗ theo ngày, tuần và tháng',
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
      title: 'Dữ liệu & Sao lưu',
      subtitle: 'Xuất/Nhập JSON backup, tạo dữ liệu mẫu và quản lý bộ nhớ',
    },
  };

  const current = viewTitles[activeView] || {
    title: 'Trading Journal',
    subtitle: 'Nhật ký giao dịch cá nhân',
  };

  return (
    <header className="flex items-center justify-between py-4 mb-6 border-b border-line/60">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="p-2 md:hidden text-muted hover:text-text rounded-lg hover:bg-surface border border-line"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-bold text-text tracking-tight">{current.title}</h1>
          </div>
          <p className="hidden sm:block text-xs text-muted mt-1">{current.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 text-muted hover:text-text rounded-lg hover:bg-surface border border-line transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className="w-4 h-4" />
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
