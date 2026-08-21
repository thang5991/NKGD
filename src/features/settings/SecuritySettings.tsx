import React, { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

export const SecuritySettings: React.FC = () => {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 6) return showToast('Mật khẩu mới phải có ít nhất 6 ký tự', 'warn');
    if (newPassword !== confirmPassword) return showToast('Mật khẩu xác nhận chưa khớp', 'warn');
    try {
      setBusy(true);
      const response = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Không thể đổi mật khẩu');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      showToast('Đã đổi mật khẩu đăng nhập', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể đổi mật khẩu', 'error');
    } finally { setBusy(false); }
  };

  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start gap-2.5 border-b border-line pb-3">
        <span className="rounded-lg bg-accent-soft p-2 text-accent"><ShieldCheck className="h-5 w-5" /></span>
        <div><h3 className="text-sm font-bold text-text">Bảo mật đăng nhập</h3><p className="mt-0.5 text-xs text-muted">Đổi mật khẩu bảo vệ dữ liệu local. Các phiên đăng nhập khác sẽ bị khóa.</p></div>
      </div>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-[11px] font-semibold text-muted">Mật khẩu hiện tại<input required type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="account-input mt-1.5" /></label>
        <label className="text-[11px] font-semibold text-muted">Mật khẩu mới<input required minLength={6} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="account-input mt-1.5" /></label>
        <label className="text-[11px] font-semibold text-muted">Xác nhận mật khẩu<input required type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="account-input mt-1.5" /></label>
        <div className="sm:col-span-3 flex justify-end"><button disabled={busy} className="flex items-center gap-1.5 rounded-lg border border-accent-border bg-accent-soft px-4 py-2 text-xs font-bold text-accent disabled:opacity-50"><KeyRound className="h-4 w-4" />{busy ? 'Đang đổi...' : 'Đổi mật khẩu'}</button></div>
      </form>
    </section>
  );
};
