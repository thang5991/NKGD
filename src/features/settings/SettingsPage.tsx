import React, { useState, useRef } from 'react';
import { exportBackup, importBackup, clearAllDatabase } from '../../utils/exportImport';
import { seedDemoData } from '../../utils/demoData';
import { useToast } from '../../hooks/useToast';
import {
  Download,
  Upload,
  Sparkles,
  Trash2,
  Database,
  CheckCircle2,
  HardDrive,
  ShieldCheck,
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

    if (!confirm('Nhập file sao lưu sẽ ghi đè dữ liệu hiện tại trong trình duyệt. Bạn có muốn tiếp tục?')) {
      e.target.value = '';
      return;
    }

    try {
      setBusy(true);
      const result = await importBackup(file);
      await onRefreshAll();
      showToast(
        `Đã nhập thành công ${result.tradesCount} giao dịch và ${result.blogCount} bài viết!`,
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
    if (!confirm('Tạo dữ liệu giao dịch và blog mẫu vào hệ thống?')) return;

    try {
      setBusy(true);
      const res = await seedDemoData();
      await onRefreshAll();
      showToast(`Đã tạo mẫu ${res.trades} giao dịch và ${res.blog} bài viết blog!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Không thể tạo dữ liệu mẫu', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleClearAll = async () => {
    const promptText = prompt(
      'CẢNH BÁO: Toàn bộ giao dịch, bài viết blog, ảnh đính kèm và cài đặt sẽ bị xóa vĩnh viễn!\n\nNhập chữ "XOA" để xác nhận:'
    );

    if (promptText === 'XOA' || promptText === 'xoa') {
      try {
        setBusy(true);
        await clearAllDatabase();
        await onRefreshAll();
        showToast('Đã xóa toàn bộ cơ sở dữ liệu thành công', 'info');
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
      <div className="bg-surface border border-line rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-accent-soft text-accent">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text tracking-tight">Cơ sở dữ liệu Trình duyệt (IndexedDB)</h3>
            <p className="text-xs text-muted">Hệ thống lưu trữ độc lập, an toàn và hoạt động hoàn toàn offline</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-bg-soft border border-line/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text mb-1">
              <ShieldCheck className="w-4 h-4 text-profit" />
              <span>Dữ liệu Nội bộ</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Dữ liệu của bạn được lưu 100% trong trình duyệt (IndexedDB), không gửi ra máy chủ trung gian.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-bg-soft border border-line/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text mb-1">
              <Database className="w-4 h-4 text-accent" />
              <span>Blob Image Storage</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Ảnh chart được tự động resize và nén JPEG, lưu dưới dạng Binary Blob giúp hiệu suất mượt mà.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-bg-soft border border-line/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-text mb-1">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span>Sẵn sàng Mở rộng</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Kiến trúc Database Abstraction Layer độc lập, sẵn sàng kết nối Supabase/PostgreSQL trong tương lai.
            </p>
          </div>
        </div>
      </div>

      {/* Backup and Restore Actions */}
      <div className="bg-surface border border-line rounded-xl p-5 shadow-sm space-y-4">
        <div className="border-b border-line pb-3">
          <h3 className="text-sm font-bold text-text tracking-tight">Sao lưu & Khôi phục Dữ liệu</h3>
          <p className="text-xs text-muted mt-0.5">
            Xuất file JSON để chuyển sang máy tính khác hoặc lưu trữ định kỳ phòng trường hợp xóa lịch sử duyệt web
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
            <span>Xuất file Sao lưu JSON</span>
          </button>

          {/* Import button */}
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-surface-2 hover:bg-surface-3 border border-line text-text font-bold py-2.5 px-5 rounded-lg text-xs transition-all disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-accent" />
            <span>Nhập file Sao lưu JSON</span>
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
            <span>Tạo Dữ liệu mẫu (Demo)</span>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[#170e0e] border border-loss/20 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-loss/20 pb-3">
          <div>
            <h3 className="text-sm font-bold text-loss tracking-tight">Vùng Nguy hiểm (Danger Zone)</h3>
            <p className="text-xs text-muted mt-0.5">Xóa sạch toàn bộ giao dịch, bài viết và hình ảnh trong IndexedDB</p>
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
          Lưu ý: Thao tác này không thể hoàn tác. Hãy đảm bảo bạn đã bấm "Xuất file Sao lưu JSON" trước khi xóa.
        </p>
      </div>
    </div>
  );
};
