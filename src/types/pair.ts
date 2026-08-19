export type AssetType = 'forex' | 'crypto' | 'index' | 'commodity' | 'stock' | 'custom';

export interface CustomPair {
  id: string;
  symbol: string; // e.g. "XAUUSD"
  displayName: string; // e.g. "Gold / US Dollar"
  assetType: AssetType;
  pipSize: number; // e.g. 0.01 for JPY or 0.1 for XAU
  contractSize: number; // e.g. 100 for XAU, 100000 for standard forex
  unitsPerLot?: number;
  baseCurrency?: string;
  quoteCurrency?: string;
  createdAt: string;
}

export interface PairOption {
  symbol: string;
  displayName: string;
  isCustom?: boolean;
  assetType: AssetType;
  pipSize: number;
  contractSize: number;
}
