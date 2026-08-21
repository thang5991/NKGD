import { Trade } from './trade';
import { BlogPost } from './blog';
import { CustomPair } from './pair';
import { TradingAccount } from './account';

export interface AppSettings {
  accountBalance: number;
  riskPercent: number;
  accountCurrency: string;
  defaultMarket: string;
  theme: 'dark';
}

export interface BackupPayload {
  version: string;
  exportedAt: string;
  trades: Trade[];
  blog: BlogPost[];
  customPairs: CustomPair[];
  accounts?: TradingAccount[];
  settings?: Partial<AppSettings>;
  images: Array<{
    id: string;
    ownerType: 'trade' | 'blog';
    ownerId: string;
    name: string;
    mimeType: string;
    dataUrl: string; // Base64 encoded for JSON
    createdAt: string;
  }>;
}
