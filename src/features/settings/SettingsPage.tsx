import React, { useState, useRef } from 'react';
import { exportBackup, importBackup, clearAllDatabase } from '../../utils/exportImport';
import { seedDemoData } from '../../utils/demoData';
import { useToast } from '../../hooks/useToast';
import { BrokerParseResult, BrokerPlatform, importBrokerTrades, parseBrokerStatement } from '../../utils/brokerImport';
import { Modal } from '../../components/common/Modal';
import { formatDateTime, formatMoney } from '../../utils/formatters';
import { AccountManager } from './AccountManager';
import { useAccounts } from '../../hooks/useAccounts';
import {
  Download,
  Upload,
  Sparkles,
  Trash2,
  FolderTree,
  HardDrive,
  ShieldCheck,
  FileCode,
  Image as ImageIcon,
  CandlestickChart,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface SettingsPageProps {
  onRefreshAll: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onRefreshAll }) => {
  const { showToast } = useToast();
  const { activeAccount } = useAccounts();
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mt5InputRef = useRef<HTMLInputElement>(null);
  const cTraderInputRef = useRef<HTMLInputElement>(null);
  const [brokerPreview, setBrokerPreview] = useState<BrokerParseResult | null>(null);

  const handleExport = async () => {
    try {
      setBusy(true);
      await exportBackup();
      showToast('Đã xuất file sao lưu JSON thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Không thể xuất file sao lưu', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Nhập file sao lưu sẽ ghi đè dữ liệu hiện tại trong thư mục data/. Bạn có muốn tiếp tục?')) {
      e.target.value = '';
      return;
    }

    try {
      setBusy(true);
      const result = await importBackup(file);
      await onRefreshAll();
      showToast(
        `Đã nhập thành công ${result.tradesCount} giao dịch và ${result.blogCount} bài viết vào ổ cứng!`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast('File backup không hợp lệ hoặc bị lỗi', 'error');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const handleSeedDemo = async () => {
    if (!confirm('Tạo dữ liệu giao dịch và blog mẫu vào thư mục data/?')) return;

    try {
      setBusy(true);
      const res = await seedDemoData(activeAccount?.id);
      await onRefreshAll();
      showToast(`Đã tạo mẫu ${res.trades} giao dịch và ${res.blog} bài viết blog vào local data!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Không thể tạo dữ liệu mẫu', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleClearAll = async () => {
    const promptText = prompt(
      'CẢNH BÁO: Toàn bộ giao dịch, bài viết blog, file ảnh trong thư mục data/ sẽ bị xóa vĩnh viễn!\n\nNhập chữ "XOA" để xác nhận:'
    );

    if (promptText === 'XOA' || promptText === 'xoa') {
      try {
        setBusy(true);
        await clearAllDatabase();
        await onRefreshAll();
        showToast('Đã xóa toàn bộ dữ liệu trong thư mục data/ thành công', 'info');
      } catch (err) {
        console.error(err);
        showToast('Có lỗi xảy ra khi xóa dữ liệu', 'error');
      } finally {
        setBusy(false);
      }
    } else if (promptText !== null) {
      showToast('Mã xác nhận không đúng. Đã hủy thao tác.', 'warn');
    }
  };

  const handleBrokerFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
    platform: BrokerPlatform
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setBusy(true);
      const preview = await parseBrokerStatement(file, platform);
      setBrokerPreview(preview);
    } catch (error) {
      console.error(error);
      showToast(
        error instanceof Error ? error.message : 'Không thể đọc file lịch sử giao dịch',
        'error'
      );
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  const confirmBrokerImport = async () => {
    if (!brokerPreview) return;
    try {
      setBusy(true);
      const result = await importBrokerTrades(brokerPreview, activeAccount?.id, activeAccount?.currency);
      await onRefreshAll();
      setBrokerPreview(null);
      showToast(
        `Đã nhập ${result.imported} giao dịch · Bỏ qua ${result.duplicates} trùng lặp${
          result.failed ? ` · ${result.failed} lỗi` : ''
        }`,
        result.failed > 0 ? 'warn' : 'success'
      );
    } catch (error) {
      console.error(error);
      showToast('Không thể nhập lịch sử giao dịch', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AccountManager />
      {/* Storage Architecture Info */}
      <div className="bg-surface border border-line rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-accent-soft text-accent">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text tracking-tight">Lưu trữ Dữ liệu Ổ cứng Cá nhân (Local Disk Storage)</h3>
            <p className="text-xs text-muted">Toàn bộ dữ liệu được lưu thành các file JSON và file hình ảnh trực tiếp trong thư mục dự án</p>
          </div>
        </div>

        {/* Highlight Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-lg bg-bg-soft border border-line/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text mb-1">
              <ShieldCheck className="w-4 h-4 text-profit" />
              <span>Không phụ thuộc Trình duyệt</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Dữ liệu không lưu vào cache/IndexedDB của trình duyệt. Xóa lịch sử duyệt web hoặc đổi trình duyệt không làm mất dữ liệu.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-bg-soft border border-line/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text mb-1">
              <FolderTree className="w-4 h-4 text-accent" />
              <span>Quản lý Tệp Trực quan</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Bạn có thể mở và chỉnh sửa trực tiếp các file <code className="text-accent font-mono">.json</code> bằng VS Code hoặc bất kỳ trình soạn thảo văn bản nào.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-bg-soft border border-line/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text mb-1">
              <ImageIcon className="w-4 h-4 text-accent" />
              <span>Thư mục Ảnh Riêng biệt</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Ảnh biểu đồ được nén tối ưu và lưu thành các file ảnh thực tế tại thư mục <code className="text-accent font-mono">data/uploads/</code>.
            </p>
          </div>
        </div>

        {/* File Structure Map */}
        <div className="bg-bg-soft border border-line/80 rounded-lg p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-muted mb-2">
            <FileCode className="w-4 h-4 text-accent" />
            <span>Cấu trúc Thư mục Dữ liệu Local</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 text-muted-2">
              <span className="text-accent">📁 data/trades.json</span>
              <span className="text-[11px] text-muted">→ Lịch sử & thông số giao dịch</span>
            </div>
            <div className="flex items-center gap-2 text-muted-2">
              <span className="text-accent">📁 data/blog.json</span>
              <span className="text-[11px] text-muted">→ Bài viết, chiến lược & nhật ký</span>
            </div>
            <div className="flex items-center gap-2 text-muted-2">
              <span className="text-accent">📁 data/customPairs.json</span>
              <span className="text-[11px] text-muted">→ Cặp tiền & tài sản tùy chỉnh</span>
            </div>
            <div className="flex items-center gap-2 text-muted-2">
              <span className="text-accent">📁 data/accounts.json</span>
              <span className="text-[11px] text-muted">→ Tài khoản giao dịch & cấu hình vốn</span>
            </div>
            <div className="flex items-center gap-2 text-muted-2">
              <span className="text-accent">📁 data/uploads/</span>
              <span className="text-[11px] text-muted">→ Các file ảnh chụp biểu đồ (.jpg)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Broker statement import */}
      <div className="bg-surface border border-line rounded-xl p-5 shadow-sm space-y-4">
        <div className="border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <CandlestickChart className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-bold text-text tracking-tight">Nhập Nhật ký từ Nền tảng Giao dịch</h3>
          </div>
          <p className="text-xs text-muted mt-1">
            Tự động lấy lệnh đã đóng, thời gian, symbol, side, giá, lot, SL/TP, phí và P&L. Dữ liệu hiện có không bị ghi đè.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => mt5InputRef.current?.click()}
            className="group flex items-center gap-3 rounded-xl border border-line bg-bg-soft p-4 text-left transition-colors hover:border-accent-border hover:bg-surface-2 disabled:opacity-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <span>
              <strong className="block text-sm text-text">Import MetaTrader 5</strong>
              <span className="mt-0.5 block text-[11px] text-muted">Báo cáo Account History định dạng HTML hoặc CSV</span>
            </span>
          </button>
          <input
            ref={mt5InputRef}
            type="file"
            accept=".html,.htm,.csv,.txt,text/html,text/csv"
            onChange={(event) => void handleBrokerFile(event, 'mt5')}
            className="hidden"
          />

          <button
            type="button"
            disabled={busy}
            onClick={() => cTraderInputRef.current?.click()}
            className="group flex items-center gap-3 rounded-xl border border-line bg-bg-soft p-4 text-left transition-colors hover:border-accent-border hover:bg-surface-2 disabled:opacity-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <CandlestickChart className="h-5 w-5" />
            </span>
            <span>
              <strong className="block text-sm text-text">Import cTrader</strong>
              <span className="mt-0.5 block text-[11px] text-muted">Statement hoặc History đã lưu dưới dạng CSV</span>
            </span>
          </button>
          <input
            ref={cTraderInputRef}
            type="file"
            accept=".csv,.txt,text/csv"
            onChange={(event) => void handleBrokerFile(event, 'ctrader')}
            className="hidden"
          />
        </div>

        <div className="rounded-lg border border-line/60 bg-surface-2/30 px-3.5 py-3 text-[11px] leading-relaxed text-muted">
          <strong className="text-text">Cách xuất file:</strong> MT5 → History → Report → HTML. cTrader → History → Statement → Save CSV.
          Chỉ các vị thế đã đóng mới được nhập; lệnh trùng ID sẽ tự động bỏ qua.
        </div>
      </div>

      {/* Backup and Restore Actions */}
      <div className="bg-surface border border-line rounded-xl p-5 shadow-sm space-y-4">
        <div className="border-b border-line pb-3">
          <h3 className="text-sm font-bold text-text tracking-tight">Sao lưu & Khôi phục Dữ liệu</h3>
          <p className="text-xs text-muted mt-0.5">
            Đóng gói toàn bộ giao dịch, bài viết và hình ảnh vào 1 file JSON độc lập để chia sẻ, cất giữ hoặc chuyển sang thiết bị khác
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Export button */}
          <button
            type="button"
            disabled={busy}
            onClick={handleExport}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-bg font-bold py-2.5 px-5 rounded-lg text-xs shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Xuất file Đóng gói JSON</span>
          </button>

          {/* Import button */}
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-surface-2 hover:bg-surface-3 border border-line text-text font-bold py-2.5 px-5 rounded-lg text-xs transition-all disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-accent" />
            <span>Nhập file Đóng gói JSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />

          {/* Seed demo data */}
          <button
            type="button"
            disabled={busy}
            onClick={handleSeedDemo}
            className="flex items-center gap-2 bg-surface-2 hover:bg-surface-3 border border-line text-text font-semibold py-2.5 px-4 rounded-lg text-xs transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-accent" />
            <span>Nạp Dữ liệu Mẫu (Demo)</span>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-loss-soft border border-loss/20 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-loss/20 pb-3">
          <div>
            <h3 className="text-sm font-bold text-loss tracking-tight">Vùng Nguy hiểm (Danger Zone)</h3>
            <p className="text-xs text-muted mt-0.5">Xóa sạch toàn bộ dữ liệu và file ảnh trong thư mục <code className="font-mono text-loss">data/</code></p>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={handleClearAll}
            className="flex items-center gap-1.5 bg-loss-soft hover:bg-loss text-loss hover:text-white border border-loss/30 font-bold py-2 px-4 rounded-lg text-xs transition-all disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa Toàn bộ Dữ liệu</span>
          </button>
        </div>

        <p className="text-[11px] text-muted-2 leading-relaxed">
          Lưu ý: Thao tác này sẽ làm rỗng các file JSON và xóa toàn bộ file ảnh trong thư mục <code className="font-mono text-text">data/uploads/</code>. Hãy chắc chắn đã xuất file sao lưu trước khi thực hiện.
        </p>
      </div>

      <Modal
        isOpen={!!brokerPreview}
        onClose={() => !busy && setBrokerPreview(null)}
        title={`Xem trước Import ${brokerPreview?.platform === 'mt5' ? 'MetaTrader 5' : 'cTrader'}`}
        subtitle={brokerPreview?.fileName}
        maxWidth="4xl"
      >
        {brokerPreview && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-line bg-bg-soft p-3">
                <span className="block text-[10px] uppercase font-bold text-muted">Lệnh hợp lệ</span>
                <strong className="mt-1 block font-mono text-lg text-accent">{brokerPreview.trades.length}</strong>
              </div>
              <div className="rounded-lg border border-line bg-bg-soft p-3">
                <span className="block text-[10px] uppercase font-bold text-muted">Dòng bỏ qua</span>
                <strong className="mt-1 block font-mono text-lg text-text">{brokerPreview.skippedRows}</strong>
              </div>
              <div className="col-span-2 sm:col-span-1 rounded-lg border border-line bg-bg-soft p-3">
                <span className="block text-[10px] uppercase font-bold text-muted">P&L từ Broker</span>
                <strong className="mt-1 block font-mono text-lg text-text">
                  {formatMoney(brokerPreview.trades.reduce((sum, trade) => sum + trade.pnl, 0), true, activeAccount?.currency)}
                </strong>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-line">
              <div className="max-h-80 overflow-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="sticky top-0 bg-surface-2 text-[10px] uppercase text-muted">
                    <tr>
                      <th className="px-3 py-2.5">Thời gian</th>
                      <th className="px-3 py-2.5">Symbol</th>
                      <th className="px-3 py-2.5">Side</th>
                      <th className="px-3 py-2.5 text-right">Lot</th>
                      <th className="px-3 py-2.5 text-right">Entry</th>
                      <th className="px-3 py-2.5 text-right">Exit</th>
                      <th className="px-3 py-2.5 text-right">P&L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {brokerPreview.trades.map((trade, index) => (
                      <tr key={`${trade.externalId}-${index}`} className="bg-bg-soft/40">
                        <td className="px-3 py-2.5 font-mono text-[11px] text-muted">{formatDateTime(trade.openTime)}</td>
                        <td className="px-3 py-2.5 font-bold text-text">{trade.symbol}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 font-semibold ${trade.side === 'Long' ? 'text-profit' : 'text-loss'}`}>
                            {trade.side === 'Long' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {trade.side}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-text">{trade.lot}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-muted">{trade.entry}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-muted">{trade.exit}</td>
                        <td className={`px-3 py-2.5 text-right font-mono font-bold ${trade.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {formatMoney(trade.pnl, true, activeAccount?.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => setBrokerPreview(null)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-text disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmBrokerImport()}
                className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-xs font-bold text-bg hover:bg-accent-hover disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {busy ? 'Đang import...' : `Import ${brokerPreview.trades.length} giao dịch`}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
