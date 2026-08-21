import { dbDelete, dbGetAll, dbPut, STORES } from './indexedDb';
import { DEFAULT_ACCOUNT_ID, TradingAccount } from '../types/account';

export function createDefaultAccount(): TradingAccount {
  const now = new Date().toISOString();
  return {
    id: DEFAULT_ACCOUNT_ID,
    name: 'Tài khoản chính',
    broker: '',
    type: 'live',
    currency: 'USD',
    balance: 10000,
    riskPercent: 1,
    color: '#b7f34a',
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getAllAccounts(): Promise<TradingAccount[]> {
  const accounts = await dbGetAll<TradingAccount>(STORES.accounts);
  if (accounts.length > 0) {
    if (accounts.some((account) => !account.archived)) return accounts;
    const restored = { ...accounts[0], archived: false, updatedAt: new Date().toISOString() };
    await dbPut(STORES.accounts, restored);
    return [restored, ...accounts.slice(1)];
  }
  const defaultAccount = createDefaultAccount();
  await dbPut(STORES.accounts, defaultAccount);
  return [defaultAccount];
}

export async function saveAccount(account: TradingAccount): Promise<void> {
  await dbPut(STORES.accounts, account);
}

export async function deleteAccount(id: string): Promise<void> {
  await dbDelete(STORES.accounts, id);
}
