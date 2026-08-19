import { dbGet, dbGetAll, dbPut, dbDelete, STORES } from './indexedDb';
import { CustomPair, PairOption } from '../types/pair';

export const BUILTIN_FOREX_PAIRS: PairOption[] = [
  // Majors
  { symbol: 'EURUSD', displayName: 'EUR/USD', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },
  { symbol: 'GBPUSD', displayName: 'GBP/USD', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },
  { symbol: 'USDJPY', displayName: 'USD/JPY', assetType: 'forex', pipSize: 0.01, contractSize: 100000 },
  { symbol: 'USDCHF', displayName: 'USD/CHF', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },
  { symbol: 'USDCAD', displayName: 'USD/CAD', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },
  { symbol: 'AUDUSD', displayName: 'AUD/USD', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },
  { symbol: 'NZDUSD', displayName: 'NZD/USD', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },

  // EUR Crosses
  { symbol: 'EURGBP', displayName: 'EUR/GBP', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },
  { symbol: 'EURJPY', displayName: 'EUR/JPY', assetType: 'forex', pipSize: 0.01, contractSize: 100000 },
  { symbol: 'EURCHF', displayName: 'EUR/CHF', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },
  { symbol: 'EURAUD', displayName: 'EUR/AUD', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },
  { symbol: 'EURCAD', displayName: 'EUR/CAD', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },
  { symbol: 'EURNZD', displayName: 'EUR/NZD', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },

  // GBP Crosses
  { symbol: 'GBPJPY', displayName: 'GBP/JPY', assetType: 'forex', pipSize: 0.01, contractSize: 100000 },
  { symbol: 'GBPCHF', displayName: 'GBP/CHF', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },
  { symbol: 'GBPAUD', displayName: 'GBP/AUD', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },
  { symbol: 'GBPCAD', displayName: 'GBP/CAD', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },
  { symbol: 'GBPNZD', displayName: 'GBP/NZD', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },

  // AUD Crosses
  { symbol: 'AUDJPY', displayName: 'AUD/JPY', assetType: 'forex', pipSize: 0.01, contractSize: 100000 },
  { symbol: 'AUDCHF', displayName: 'AUD/CHF', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },
  { symbol: 'AUDCAD', displayName: 'AUD/CAD', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },
  { symbol: 'AUDNZD', displayName: 'AUD/NZD', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },

  // CAD Crosses
  { symbol: 'CADJPY', displayName: 'CAD/JPY', assetType: 'forex', pipSize: 0.01, contractSize: 100000 },
  { symbol: 'CADCHF', displayName: 'CAD/CHF', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },

  // CHF Crosses
  { symbol: 'CHFJPY', displayName: 'CHF/JPY', assetType: 'forex', pipSize: 0.01, contractSize: 100000 },

  // NZD Crosses
  { symbol: 'NZDJPY', displayName: 'NZD/JPY', assetType: 'forex', pipSize: 0.01, contractSize: 100000 },
  { symbol: 'NZDCHF', displayName: 'NZD/CHF', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },
  { symbol: 'NZDCAD', displayName: 'NZD/CAD', assetType: 'forex', pipSize: 0.0001, contractSize: 100000 },

  // Popular Metals / Crypto default entries
  { symbol: 'XAUUSD', displayName: 'Gold (XAU/USD)', assetType: 'commodity', pipSize: 0.1, contractSize: 100 },
  { symbol: 'BTCUSDT', displayName: 'Bitcoin (BTC/USDT)', assetType: 'crypto', pipSize: 1.0, contractSize: 1 },
  { symbol: 'ETHUSDT', displayName: 'Ethereum (ETH/USDT)', assetType: 'crypto', pipSize: 0.1, contractSize: 1 },
];

export async function getAllCustomPairs(): Promise<CustomPair[]> {
  const pairs = await dbGetAll<CustomPair>(STORES.customPairs);
  return pairs.sort((a, b) => a.symbol.localeCompare(b.symbol));
}

export async function getCustomPairById(id: string): Promise<CustomPair | undefined> {
  return dbGet<CustomPair>(STORES.customPairs, id);
}

export async function saveCustomPair(pair: CustomPair): Promise<void> {
  await dbPut(STORES.customPairs, pair);
}

export async function deleteCustomPair(id: string): Promise<void> {
  await dbDelete(STORES.customPairs, id);
}

export async function getAllPairOptions(): Promise<PairOption[]> {
  const customPairs = await getAllCustomPairs();
  const customOptions: PairOption[] = customPairs.map((p) => ({
    symbol: p.symbol,
    displayName: p.displayName ? `${p.displayName} (${p.symbol})` : p.symbol,
    isCustom: true,
    assetType: p.assetType,
    pipSize: p.pipSize,
    contractSize: p.contractSize,
  }));

  // Combine builtin and custom, avoiding symbol duplicates
  const map = new Map<string, PairOption>();
  BUILTIN_FOREX_PAIRS.forEach((p) => map.set(p.symbol, p));
  customOptions.forEach((p) => map.set(p.symbol, p));

  return Array.from(map.values());
}
