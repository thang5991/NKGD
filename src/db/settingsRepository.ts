import { dbGet, dbPut, STORES } from './indexedDb';
import { AppSettings } from '../types/database';

const DEFAULT_SETTINGS: AppSettings = {
  accountBalance: 10000,
  riskPercent: 1.0,
  accountCurrency: 'USD',
  defaultMarket: 'Forex',
  theme: 'dark',
};

export async function getSettings(): Promise<AppSettings> {
  const result = await dbGet<{ key: string; value: AppSettings }>(STORES.settings, 'app_settings');
  return result ? { ...DEFAULT_SETTINGS, ...result.value } : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  await dbPut(STORES.settings, {
    key: 'app_settings',
    value: { ...current, ...settings },
  });
}
