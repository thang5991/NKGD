import React, { useMemo, useState } from 'react';
import { Archive, Pencil, Plus, RotateCcw, Trash2, WalletCards } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useAccounts } from '../../hooks/useAccounts';
import { useTrades } from '../../hooks/useTrades';
import { useToast } from '../../hooks/useToast';
import { TradingAccount, TradingAccountInput, TradingAccountType } from '../../types/account';

const COLORS = ['#b7f34a', '#60a5fa', '#a78bfa', '#fb923c', '#f472b6', '#2dd4bf'];

const emptyForm = (): TradingAccountInput => ({
  name: '', broker: '', type: 'live', currency: 'USD', balance: 10000, riskPercent: 1, color: COLORS[0],
});

export const AccountManager: React.FC = () => {
  const { accounts, activeAccountId, setActiveAccountId, upsertAccount, setAccountArchived, removeAccount } = useAccounts();
  const { allTrades } = useTrades();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<TradingAccount | null | 'new'>(null);
  const [form, setForm] = useState<TradingAccountInput>(emptyForm);
  const [saving, setSaving] = useState(false);

  const tradeCounts = useMemo(() => allTrades.reduce<Record<string, number>>((counts, trade) => {
    if (trade.accountId) counts[trade.accountId] = (counts[trade.accountId] || 0) + 1;
    return counts;
  }, {}), [allTrades]);

  const openForm = (account?: TradingAccount) => {
    setEditing(account || 'new');
    setForm(account ? {
      name: account.name, broker: account.broker, type: account.type, currency: account.currency,
      balance: account.balance, riskPercent: account.riskPercent, color: account.color,
    } : emptyForm());
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.currency.trim() || form.balance < 0 || form.riskPercent <= 0) return;
    try {
      setSaving(true);
      await upsertAccount({ ...form, name: form.name.trim(), broker: form.broker.trim() }, editing === 'new' ? undefined : editing?.id);
      setEditing(null);
      showToast(editing === 'new' ? 'Đã tạo tài khoản giao dịch' : 'Đã cập nhật tài khoản', 'success');
    } finally { setSaving(false); }
  };

  const handleDelete = async (account: TradingAccount) => {
    if (tradeCounts[account.id]) {
      showToast(`Không thể xóa: tài khoản đang có ${tradeCounts[account.id]} giao dịch. Hãy lưu trữ tài khoản thay thế.`, 'warn');
      return;
    }
    if (accounts.length <= 1 || (!account.archived && accounts.filter((item) => !item.archived).length <= 1)) {
      showToast('Ứng dụng cần ít nhất một tài khoản giao dịch', 'warn');
      return;
    }
    if (!confirm(`Xóa tài khoản “${account.name}”?`)) return;
    await removeAccount(account.id);
    showToast('Đã xóa tài khoản', 'info');
  };

  const toggleArchived = async (account: TradingAccount) => {
    if (!account.archived && accounts.filter((item) => !item.archived).length <= 1) {
      showToast('Cần giữ lại ít nhất một tài khoản đang hoạt động', 'warn');
      return;
    }
    await setAccountArchived(account.id, !account.archived);
    showToast(account.archived ? 'Đã khôi phục tài khoản' : 'Đã lưu trữ tài khoản', 'info');
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
        <div className="flex gap-2.5">
          <span className="rounded-lg bg-accent-soft p-2 text-accent"><WalletCards className="h-5 w-5" /></span>
          <div>
            <h3 className="text-sm font-bold text-text">Quản lý Tài khoản Giao dịch</h3>
            <p className="mt-0.5 text-xs text-muted">Tách riêng lịch sử, hiệu suất, số dư và mức rủi ro cho từng broker hoặc tài khoản prop.</p>
          </div>
        </div>
        <button type="button" onClick={() => openForm()} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-bg hover:bg-[#c5ff68]">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Thêm tài khoản</span>
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {accounts.map((account) => (
          <div key={account.id} className={`rounded-xl border p-4 ${account.id === activeAccountId ? 'border-accent-border bg-accent-soft/10' : 'border-line bg-bg-soft'} ${account.archived ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-2">
              <button type="button" disabled={account.archived} onClick={() => setActiveAccountId(account.id)} className="min-w-0 text-left disabled:cursor-default">
                <span className="mb-1 block h-2 w-8 rounded-full" style={{ backgroundColor: account.color }} />
                <strong className="block truncate text-sm text-text">{account.name}</strong>
                <span className="text-[11px] text-muted">{account.broker || 'Chưa đặt broker'} · {account.type.toUpperCase()}</span>
              </button>
              {account.id === activeAccountId && !account.archived && <span className="rounded-full bg-accent-soft px-2 py-1 text-[10px] font-bold text-accent">Đang dùng</span>}
              {account.archived && <span className="rounded-full bg-surface-3 px-2 py-1 text-[10px] text-muted">Đã lưu trữ</span>}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <div><span className="block text-muted">Số dư</span><b className="font-mono text-text">{account.balance.toLocaleString()} {account.currency}</b></div>
              <div><span className="block text-muted">Rủi ro</span><b className="font-mono text-text">{account.riskPercent}%</b></div>
              <div><span className="block text-muted">Giao dịch</span><b className="font-mono text-text">{tradeCounts[account.id] || 0}</b></div>
            </div>
            <div className="mt-3 flex justify-end gap-1 border-t border-line/60 pt-2">
              <button type="button" onClick={() => openForm(account)} className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-text" title="Chỉnh sửa"><Pencil className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => void toggleArchived(account)} className="rounded p-1.5 text-muted hover:bg-surface-2 hover:text-text" title={account.archived ? 'Khôi phục' : 'Lưu trữ'}>
                {account.archived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
              </button>
              <button type="button" onClick={() => void handleDelete(account)} className="rounded p-1.5 text-muted hover:bg-loss-soft hover:text-loss" title="Xóa"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={!!editing} onClose={() => !saving && setEditing(null)} title={editing === 'new' ? 'Thêm tài khoản giao dịch' : 'Chỉnh sửa tài khoản'} maxWidth="lg">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <AccountField label="Tên tài khoản"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: IC Markets Live" className="account-input" /></AccountField>
            <AccountField label="Broker"><input value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} placeholder="VD: IC Markets" className="account-input" /></AccountField>
            <AccountField label="Loại tài khoản"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TradingAccountType })} className="account-input"><option value="live">Live</option><option value="demo">Demo</option><option value="prop">Prop firm</option></select></AccountField>
            <AccountField label="Tiền tệ"><input required disabled={editing !== 'new' && !!editing && !!tradeCounts[editing.id]} title={editing !== 'new' && !!editing && tradeCounts[editing.id] ? 'Không thể đổi tiền tệ khi tài khoản đã có giao dịch' : undefined} maxLength={5} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} className="account-input disabled:cursor-not-allowed disabled:opacity-50" /></AccountField>
            <AccountField label="Số dư"><input required type="number" min="0" step="any" value={form.balance} onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })} className="account-input" /></AccountField>
            <AccountField label="Rủi ro mặc định (%)"><input required type="number" min="0.01" step="0.01" value={form.riskPercent} onChange={(e) => setForm({ ...form, riskPercent: Number(e.target.value) })} className="account-input" /></AccountField>
          </div>
          <div><label className="mb-1.5 block text-[11px] font-semibold text-muted">Màu nhận diện</label><div className="flex gap-2">{COLORS.map((color) => <button key={color} type="button" onClick={() => setForm({ ...form, color })} className={`h-7 w-7 rounded-full border-2 ${form.color === color ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: color }} />)}</div></div>
          <div className="flex justify-end gap-2 border-t border-line pt-4"><button type="button" onClick={() => setEditing(null)} className="rounded-lg px-4 py-2 text-xs text-muted hover:bg-surface-2">Hủy</button><button disabled={saving} className="rounded-lg bg-accent px-5 py-2 text-xs font-bold text-bg disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu tài khoản'}</button></div>
        </form>
      </Modal>
    </div>
  );
};

const AccountField: React.FC<React.PropsWithChildren<{ label: string }>> = ({ label, children }) => <label><span className="mb-1.5 block text-[11px] font-semibold text-muted">{label}</span>{children}</label>;
