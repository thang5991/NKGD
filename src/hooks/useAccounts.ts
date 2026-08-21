import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { deleteAccount, getAllAccounts, saveAccount } from '../db/accountRepository';
import { TradingAccount, TradingAccountInput } from '../types/account';

const ACTIVE_ACCOUNT_KEY = 'nkgd-active-account';

function useAccountsStore() {
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [activeAccountId, setActiveAccountIdState] = useState(() => localStorage.getItem(ACTIVE_ACCOUNT_KEY) || '');
  const [loading, setLoading] = useState(true);

  const refreshAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getAllAccounts();
      setAccounts(list);
      setActiveAccountIdState((current) => {
        const selected = list.find((account) => account.id === current && !account.archived)
          || list.find((account) => !account.archived)
          || list[0];
        if (selected) localStorage.setItem(ACTIVE_ACCOUNT_KEY, selected.id);
        return selected?.id || '';
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refreshAccounts(); }, [refreshAccounts]);

  const setActiveAccountId = useCallback((id: string) => {
    setActiveAccountIdState(id);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
  }, []);

  const upsertAccount = useCallback(async (input: TradingAccountInput, id?: string) => {
    const old = accounts.find((account) => account.id === id);
    const now = new Date().toISOString();
    const account: TradingAccount = {
      ...input,
      id: old?.id || `account-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      currency: input.currency.toUpperCase().trim(),
      archived: old?.archived || false,
      createdAt: old?.createdAt || now,
      updatedAt: now,
    };
    await saveAccount(account);
    await refreshAccounts();
    if (!old) setActiveAccountId(account.id);
    return account;
  }, [accounts, refreshAccounts, setActiveAccountId]);

  const setAccountArchived = useCallback(async (id: string, archived: boolean) => {
    const account = accounts.find((item) => item.id === id);
    if (!account) return;
    await saveAccount({ ...account, archived, updatedAt: new Date().toISOString() });
    await refreshAccounts();
  }, [accounts, refreshAccounts]);

  const removeAccount = useCallback(async (id: string) => {
    await deleteAccount(id);
    await refreshAccounts();
  }, [refreshAccounts]);

  const activeAccount = useMemo(
    () => accounts.find((account) => account.id === activeAccountId) || accounts[0] || null,
    [accounts, activeAccountId]
  );

  return { accounts, activeAccount, activeAccountId, loading, setActiveAccountId, upsertAccount, setAccountArchived, removeAccount, refreshAccounts };
}

type AccountsContextValue = ReturnType<typeof useAccountsStore>;
const AccountsContext = createContext<AccountsContextValue | null>(null);

export function AccountsProvider({ children }: PropsWithChildren) {
  return createElement(AccountsContext.Provider, { value: useAccountsStore() }, children);
}

export function useAccounts(): AccountsContextValue {
  const context = useContext(AccountsContext);
  if (!context) throw new Error('useAccounts must be used within AccountsProvider');
  return context;
}
