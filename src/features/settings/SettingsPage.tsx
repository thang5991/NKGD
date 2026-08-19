import React, { useState, useRef } from 'react';
import { exportBackup, importBackup, clearAllDatabase } from '../../utils/exportImport';
import { seedDemoData } from '../../utils/demoData';
import { useToast } from '../../hooks/useToast';
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
} from 'lucide-react';

interface SettingsPageProps {
  onRefreshAll: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onRefreshAll }) => {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const res = await seedDemoData();
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
        <div className="bg-[#0b0d0b] border border-line/80 rounded-lg p-3.5">
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
              <span className="text-accent">📁 data/uploads/</span>
              <span className="text-[11px] text-muted">→ Các file ảnh chụp biểu đồ (.jpg)</span>
            </div>
          </div>
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
            className="flex items-center gap-2 bg-accent hover:bg-[#c5ff68] text-bg font-bold py-2.5 px-5 rounded-lg text-xs shadow-sm transition-all disabled:opacity-50"
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
      <div className="bg-[#170e0e] border border-loss/20 rounded-xl p-5 shadow-sm space-y-3">
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
    </div>
  );
};
