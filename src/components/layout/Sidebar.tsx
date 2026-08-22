import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  BookOpen,
  PlusCircle,
  FileText,
  Calculator,
  Database,
  Layers,
} from 'lucide-react';

export type ActiveView =
  | 'dashboard'
  | 'calendar'
  | 'economic'
  | 'trades'
  | 'add-trade'
  | 'calculator'
  | 'blog'
  | 'settings';

interface SidebarProps {
  activeView: ActiveView;
  onViewChange: (view: ActiveView) => void;
  onOpenAddModal: () => void;
  onOpenPairModal: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  onOpenAddModal,
  onOpenPairModal,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'dashboard' as ActiveView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar' as ActiveView, label: 'Calendar P&L', icon: CalendarDays },
    { id: 'economic' as ActiveView, label: 'Lịch kinh tế', icon: CalendarClock },
    { id: 'trades' as ActiveView, label: 'Nhật ký giao dịch', icon: BookOpen },
    { id: 'blog' as ActiveView, label: 'Blog / Notes', icon: FileText },
    { id: 'calculator' as ActiveView, label: 'Lot Calculator', icon: Calculator },
    { id: 'settings' as ActiveView, label: 'Dữ liệu & Cài đặt', icon: Database },
  ];

  const handleNavClick = (view: ActiveView) => {
    onViewChange(view);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/75 md:hidden backdrop-blur-sm"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-bg-soft border-r border-line flex flex-col justify-between p-4 transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div>
          {/* Brand */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-text text-bg font-black flex items-center justify-center text-sm shadow-md">
              TJ
            </div>
            <div>
              <div className="font-bold text-sm text-text leading-tight tracking-tight">Trading Journal</div>
              <div className="text-[10px] text-accent tracking-wider uppercase font-semibold mt-0.5">
                Personal OS
              </div>
            </div>
          </div>

          {/* Quick Action Button */}
          <button
            onClick={() => {
              onOpenAddModal();
              onCloseMobile();
            }}
            className="w-full mb-5 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-bg font-bold py-2.5 px-4 rounded-lg text-xs shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Thêm giao dịch</span>
          </button>

          {/* Nav List */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-surface-2 text-text border border-line-strong font-semibold shadow-inner'
                      : 'text-muted hover:text-text hover:bg-surface/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-muted'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer / Custom pairs */}
        <div className="pt-4 border-t border-line space-y-2">
          <button
            onClick={() => {
              onOpenPairModal();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-[11px] text-muted hover:text-text rounded-md hover:bg-surface/50 transition-colors border border-transparent hover:border-line"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span>Quản lý Cặp tùy chỉnh</span>
            </div>
            <span className="text-[10px] bg-surface-3 px-1.5 py-0.5 rounded text-muted-2">+</span>
          </button>

          <div className="px-3 py-2 text-[10px] text-muted-2 leading-relaxed bg-surface/30 rounded-md border border-line/40">
            Dữ liệu lưu an toàn trên máy tính của bạn.
          </div>
        </div>
      </aside>
    </>
  );
};
