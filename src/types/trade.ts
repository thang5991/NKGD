export type Side = 'Long' | 'Short';
export type Market = 'Forex' | 'Crypto' | 'Stock' | 'Futures' | 'Indices' | 'Commodities' | 'Other';
export type Emotion = 'Bình tĩnh' | 'Tự tin' | 'FOMO' | 'Sợ hãi' | 'Tham lam' | 'Mệt mỏi' | 'Kỷ luật';
export type Timeframe = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1' | 'W1' | 'MN' | string;

export interface ImageRecord {
  id: string;
  ownerType: 'trade' | 'blog';
  ownerId: string;
  name: string;
  mimeType: string;
  blob: Blob;
  dataUrl?: string; // transient/preview
  createdAt: string;
}

export interface Trade {
  id: string;
  date: string; // ISO or YYYY-MM-DDTHH:mm
  exitDate?: string; // Closing timestamp, used for historical FX conversion
  symbol: string;
  timeframe?: Timeframe;
  side: Side;
  market: Market;
  setup: string;
  emotion: Emotion;
  entry: number;
  stopLoss?: number;
  takeProfit?: number;
  exit: number;
  lot: number;
  units: number;
  fee: number;
  accountCurrency?: string;
  quoteCurrency?: string;
  conversionRate?: number;
  conversionDate?: string;
  conversionSource?: string;
  pnlQuote?: number;
  riskAmountQuote?: number;
  importSource?: 'mt5' | 'ctrader';
  externalId?: string;
  notes: string;
  imageRefs: string[]; // List of ImageRecord IDs
  pnl: number;
  riskAmount: number;
  rMultiple: number;
  plannedRR: number;
  result: 'win' | 'loss' | 'be';
  createdAt: string;
  updatedAt: string;
}

export type TradeFormData = Omit<Trade, 'id' | 'pnl' | 'riskAmount' | 'rMultiple' | 'plannedRR' | 'result' | 'createdAt' | 'updatedAt' | 'imageRefs'> & {
  id?: string;
  imageRefs?: string[];
  newImages?: File[];
  existingImages?: ImageRecord[];
};
