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
import { Modal } from './components/common/Modal';
import { TradeForm } from './features/trades/TradeForm';
import { TradeDetailModal } from './features/trades/TradeDetailModal';
import { useTrades } from './hooks/useTrades';
import { useBlog } from './hooks/useBlog';
import { usePairs } from './hooks/usePairs';
import { TradesProvider } from './hooks/useTrades';
import { BlogProvider } from './hooks/useBlog';
import { PairsProvider } from './hooks/usePairs';
import { Trade, TradeFormData } from './types/trade';
import { seedDemoData } from './utils/demoData';

export const MainLayout: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [selectedTradeForDetail, setSelectedTradeForDetail] = useState<Trade | null>(null);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial form prefill when using calculated lot
  const [initialFormTrade, setInitialFormTrade] = useState<Partial<Trade> | null>(null);

  const { refreshTrades, saveTradeWithImages, removeTrade, loadTradeImages } = useTrades();
  const { refreshPosts } = useBlog();
  const { pairOptions, refreshPairs } = usePairs();
  const { showToast } = useToast();

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshTrades(), refreshPosts(), refreshPairs()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    try {
      await handleRefreshAll();
      showToast('Dữ liệu đã được làm mới', 'success');
    } catch (err) {
      console.error('Failed to refresh application data:', err);
      showToast('Không thể làm mới dữ liệu. Vui lòng kiểm tra máy chủ.', 'error');
    }
  };

  const handleSeedDemo = async () => {
    try {
      const result = await seedDemoData();
      await handleRefreshAll();
      showToast(`Đã tạo ${result.trades} giao dịch và ${result.blog} bài viết mẫu`, 'success');
    } catch (err) {
      console.error('Failed to seed demo data:', err);
      showToast('Không thể tạo dữ liệu mẫu', 'error');
    }
  };

  const handleOpenAddTrade = (prefill?: Partial<Trade>) => {
    setInitialFormTrade(prefill || null);
    setIsAddTradeOpen(true);
  };

  const handleCloseAddTrade = () => {
    setIsAddTradeOpen(false);
    setInitialFormTrade(null);
  };

  const handleFormSubmit = async (data: TradeFormData) => {
    await saveTradeWithImages(data);
    handleCloseAddTrade();
    setEditingTrade(null);
    showToast('Đã lưu giao dịch thành công!', 'success');
  };

  const handleUseCalculatedLot = (calcData: {
    symbol: string;
    lot: number;
    units: number;
    entry: number;
    stopLoss: number;
  }) => {
    handleOpenAddTrade({
      symbol: calcData.symbol,
      lot: calcData.lot,
      units: calcData.units,
      entry: calcData.entry,
      stopLoss: calcData.stopLoss,
    });
    showToast(`Đã áp dụng khối lượng ${calcData.lot} lot cho cặp ${calcData.symbol}!`, 'success');
  };

  return (
    <div className="flex min-h-screen bg-bg text-text">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={(view) => setActiveView(view)}
        onOpenAddModal={() => handleOpenAddTrade()}
        onOpenPairModal={() => setIsPairModalOpen(true)}
        isOpenMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Header
          activeView={activeView}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          onOpenAddModal={() => handleOpenAddTrade()}
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Views */}
        <div className="flex-1">
          {activeView === 'dashboard' && (
            <DashboardPage
              onNavigateToTrades={() => setActiveView('trades')}
              onOpenAddModal={() => handleOpenAddTrade()}
              onSelectTrade={(trade) => setSelectedTradeForDetail(trade)}
              onSeedDemo={handleSeedDemo}
            />
          )}

          {activeView === 'calendar' && (
            <CalendarPage
              onSelectTrade={(trade) => setSelectedTradeForDetail(trade)}
            />
          )}

          {activeView === 'trades' && (
            <TradesPage
              onOpenAddModal={() => handleOpenAddTrade()}
              onOpenEditModal={(trade) => setEditingTrade(trade)}
              onSelectTradeForDetail={(trade) => setSelectedTradeForDetail(trade)}
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

      {/* Global Add Trade Modal (Works from ANY page) */}
      <Modal
        isOpen={isAddTradeOpen}
        onClose={handleCloseAddTrade}
        title="Thêm Giao dịch Mới"
        subtitle="Ghi nhận lệnh, rủi ro ban đầu và phân tích chart"
        maxWidth="4xl"
      >
        <TradeForm
          initialTrade={initialFormTrade || undefined}
          pairOptions={pairOptions}
          onOpenPairModal={() => setIsPairModalOpen(true)}
          onSubmit={handleFormSubmit}
          onCancel={handleCloseAddTrade}
          loadImages={loadTradeImages}
        />
      </Modal>

      {/* Global Edit Trade Modal (Works from ANY page) */}
      <Modal
        isOpen={!!editingTrade}
        onClose={() => setEditingTrade(null)}
        title={`Chỉnh sửa: ${editingTrade?.symbol || ''}`}
        subtitle="Cập nhật thông số giá, khối lượng và hình ảnh"
        maxWidth="4xl"
      >
        {editingTrade && (
          <TradeForm
            initialTrade={editingTrade}
            pairOptions={pairOptions}
            onOpenPairModal={() => setIsPairModalOpen(true)}
            onSubmit={handleFormSubmit}
            onCancel={() => setEditingTrade(null)}
            loadImages={loadTradeImages}
          />
        )}
      </Modal>

      {/* Global Trade Detail Modal (Works from ANY page) */}
      <TradeDetailModal
        isOpen={!!selectedTradeForDetail}
        onClose={() => setSelectedTradeForDetail(null)}
        trade={selectedTradeForDetail}
        onEdit={(trade) => {
          setSelectedTradeForDetail(null);
          setEditingTrade(trade);
        }}
        onDelete={async (id) => {
          await removeTrade(id);
          setSelectedTradeForDetail(null);
          showToast('Đã xóa giao dịch', 'info');
        }}
        loadImages={loadTradeImages}
      />

      {/* Global Pair Manager Modal */}
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
      <TradesProvider>
        <BlogProvider>
          <PairsProvider>
            <MainLayout />
          </PairsProvider>
        </BlogProvider>
      </TradesProvider>
    </ToastProvider>
  );
};

export default App;
