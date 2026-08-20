import { getPipMeta } from '../utils/calculator';

export interface FxRateResult {
  requestedDate: string;
  rateDate: string;
  base: string;
  quote: string;
  rate: number;
  source: 'frankfurter' | 'identity';
}

function normalizeCurrency(currency: string): string {
  const normalized = currency.toUpperCase().trim();
  return normalized === 'USDT' ? 'USD' : normalized;
}

export function getQuoteCurrency(symbol: string): string {
  return normalizeCurrency(getPipMeta(symbol).quote);
}

export async function getFxRate(
  baseCurrency: string,
  quoteCurrency: string,
  date: string
): Promise<FxRateResult> {
  const base = normalizeCurrency(baseCurrency);
  const quote = normalizeCurrency(quoteCurrency);
  const requestedDate = date.slice(0, 10);

  if (base === quote) {
    return {
      requestedDate,
      rateDate: requestedDate,
      base,
      quote,
      rate: 1,
      source: 'identity',
    };
  }

  const params = new URLSearchParams({ base, quote, date: requestedDate });
  const response = await fetch(`/api/fx-rate?${params.toString()}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error || `Không thể lấy tỷ giá (${response.status})`);
  }

  const result = await response.json() as FxRateResult;
  if (!Number.isFinite(result.rate) || result.rate <= 0) {
    throw new Error('Tỷ giá trả về không hợp lệ');
  }
  return result;
}

export function getTradeFxRate(symbol: string, accountCurrency: string, date: string): Promise<FxRateResult> {
  return getFxRate(getQuoteCurrency(symbol), accountCurrency, date);
}
