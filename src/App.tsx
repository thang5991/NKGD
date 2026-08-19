import React, { useState } from 'react';
import { ToastProvider, useToast } from './hooks/useToast';
import { ToastContainer } from './components/common/Toast';
import { Sidebar, ActiveView } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { CalendarPage } from './features/calendar/CalendarPage';
import { TradesPage } from './features/trades/TradesPage';
import { CalculatorPage } from './features/calculator/CalculatorPage';
import { BlogPage } from './features/blog/BlogPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { PairModal } from './features/pairs/PairModal';
import { useTrades } from './hooks/useTrades';
import { useBlog } from './hooks/useBlog';
import { usePairs } from './hooks/usePairs';
import { Trade } from './types/trade';

export const MainLayout: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [selectedTradeForDetail, setSelectedTradeForDetail] = useState<Trade | null>(null);

  const { refreshTrades } = useTrades();
  const { refreshPosts } = useBlog();
  const { refreshPairs } = usePairs();
  const { showToast } = useToast();

  const handleRefreshAll = async () => {
    await Promise.all([refreshTrades(), refreshPosts(), refreshPairs()]);
  };

  const handleUseCalculatedLot = (calcData: {
    symbol: string;
    lot: number;
    units: number;
    entry: number;
    stopLoss: number;
  }) => {
    setActiveView('trades');
    setIsAddTradeOpen(true);
    showToast(`Đã áp dụng khối lượng ${calcData.lot} lot cho cặp ${calcData.symbol}!`, 'success');
  };

  return (
    <div className="flex min-h-screen bg-bg text-text">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={(view) => setActiveView(view)}
        onOpenAddModal={() => setIsAddTradeOpen(true)}
        onOpenPairModal={() => setIsPairModalOpen(true)}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Header
          activeView={activeView}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          onOpenAddModal={() => setIsAddTradeOpen(true)}
          onRefresh={handleRefreshAll}
        />

        {/* Views */}
        <div className="flex-1">
          {activeView === 'dashboard' && (
            <DashboardPage
              onNavigateToTrades={() => setActiveView('trades')}
              onOpenAddModal={() => setIsAddTradeOpen(true)}
              onSelectTrade={(trade) => setSelectedTradeForDetail(trade)}
              onSeedDemo={async () => {
                await handleRefreshAll();
              }}
            />
          )}

          {activeView === 'calendar' && (
            <CalendarPage
              onSelectTrade={(trade) => setSelectedTradeForDetail(trade)}
            />
          )}

          {activeView === 'trades' && (
            <TradesPage
              isAddOpen={isAddTradeOpen}
              onCloseAddModal={() => setIsAddTradeOpen(false)}
              onOpenAddModal={() => setIsAddTradeOpen(true)}
              onOpenPairModal={() => setIsPairModalOpen(true)}
              selectedTradeForDetail={selectedTradeForDetail}
              onSelectTradeForDetail={setSelectedTradeForDetail}
            />
          )}

          {activeView === 'calculator' && (
            <CalculatorPage
              onOpenPairModal={() => setIsPairModalOpen(true)}
              onUseCalculatedLot={handleUseCalculatedLot}
            />
          )}

          {activeView === 'blog' && <BlogPage />}

          {activeView === 'settings' && (
            <SettingsPage onRefreshAll={handleRefreshAll} />
          )}
        </div>
      </main>

      {/* Pair Manager Modal */}
      <PairModal
        isOpen={isPairModalOpen}
        onClose={() => setIsPairModalOpen(false)}
      />

      {/* Global Toast Container */}
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <MainLayout />
    </ToastProvider>
  );
};

export default App;
