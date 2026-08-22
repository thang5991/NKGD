import { Side } from '../types/trade';
import { BUILTIN_FOREX_PAIRS } from '../db/pairRepository';

export interface PipMeta {
  type: 'forex' | 'xau' | 'btc' | 'crypto' | 'custom';
  pipSize: number;
  contractSize: number;
  base: string;
  quote: string;
}

export function getPipMeta(symbol: string, customPipSize?: number, customContractSize?: number): PipMeta {
  const s = (symbol || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (customPipSize && customContractSize) {
    return {
      type: 'custom',
      pipSize: customPipSize,
      contractSize: customContractSize,
      base: s.slice(0, 3) || s,
      quote: s.slice(3) || 'USD',
    };
  }

  const builtin = BUILTIN_FOREX_PAIRS.find((p) => p.symbol === s);
  if (builtin) {
    const base = s.slice(0, 3);
    const quote = s.slice(3, 6);
    return {
      type: 'forex',
      pipSize: builtin.pipSize,
      contractSize: builtin.contractSize,
      base,
      quote,
    };
  }

  if (s.startsWith('XAU')) {
    return { type: 'xau', pipSize: 0.1, contractSize: 100, base: 'XAU', quote: s.slice(3) || 'USD' };
  }
  if (s.startsWith('BTC')) {
    return { type: 'btc', pipSize: 1.0, contractSize: 1, base: 'BTC', quote: s.slice(3) || 'USDT' };
  }
  if (s.startsWith('ETH')) {
    return { type: 'crypto', pipSize: 0.1, contractSize: 1, base: 'ETH', quote: s.slice(3) || 'USDT' };
  }

  if (s.length >= 6) {
    const base = s.slice(0, 3);
    const quote = s.slice(3, 6);
    return {
      type: 'forex',
      pipSize: quote === 'JPY' ? 0.01 : 0.0001,
      contractSize: 100000,
      base,
      quote,
    };
  }

  return {
    type: 'custom',
    pipSize: 0.0001,
    contractSize: 100000,
    base: s.slice(0, 3) || s,
    quote: s.slice(3) || 'USD',
  };
}

export interface TradeCalculationInput {
  side: Side;
  entry: number;
  exit: number;
  stopLoss?: number;
  takeProfit?: number;
  lot?: number;
  units?: number;
  fee?: number;
  symbol?: string;
  contractSize?: number;
  accountCurrency?: string;
  conversionRate?: number;
}

export interface TradeCalculationOutput {
  pnl: number;
  riskAmount: number;
  rMultiple: number;
  plannedRR: number;
  result: 'win' | 'loss' | 'be';
  lot: number;
  units: number;
  pnlQuote: number;
  riskAmountQuote: number;
  conversionRate: number;
  conversionMissing: boolean;
}

export const BREAKEVEN_R_THRESHOLD = 0.1;

export function classifyTradeResult(
  pnl: number,
  riskAmount?: number,
  rMultiple?: number
): 'win' | 'loss' | 'be' {
  if (pnl < -0.0001) return 'loss';
  if (pnl <= 0.0001) return 'be';

  const effectiveR = Number(riskAmount) > 0
    ? pnl / Number(riskAmount)
    : Number(rMultiple) > 0
      ? Number(rMultiple)
      : null;

  return effectiveR !== null && effectiveR < BREAKEVEN_R_THRESHOLD ? 'be' : 'win';
}

export function calculateTrade(input: TradeCalculationInput): TradeCalculationOutput {
  const entry = Number(input.entry) || 0;
  const exit = Number(input.exit) || 0;
  const stopLoss = input.stopLoss != null && input.stopLoss !== 0 ? Number(input.stopLoss) : undefined;
  const takeProfit = input.takeProfit != null && input.takeProfit !== 0 ? Number(input.takeProfit) : undefined;
  const fee = Math.abs(Number(input.fee) || 0);

  const meta = getPipMeta(input.symbol || '', undefined, input.contractSize);
  const contractSize = input.contractSize || meta.contractSize;
  const accountCurrency = (input.accountCurrency || 'USD').toUpperCase();
  const quoteCurrency = meta.quote === 'USDT' ? 'USD' : meta.quote;
  const normalizedAccountCurrency = accountCurrency === 'USDT' ? 'USD' : accountCurrency;
  const needsConversion = quoteCurrency !== normalizedAccountCurrency;
  const suppliedRate = Number(input.conversionRate) || 0;
  const conversionMissing = needsConversion && suppliedRate <= 0;
  const conversionRate = needsConversion ? suppliedRate : 1;

  let lot = Number(input.lot) || 0;
  let units = Number(input.units) || 0;

  if (units > 0 && lot <= 0) {
    lot = units / contractSize;
  } else if (lot > 0 && units <= 0) {
    units = lot * contractSize;
  } else if (lot <= 0 && units <= 0) {
    lot = 1;
    units = contractSize;
  }

  // P&L Math
  // Long: (Exit - Entry) * units - fee
  // Short: (Entry - Exit) * units - fee
  const direction = input.side === 'Long' ? 1 : -1;
  const grossPnlQuote = (exit - entry) * units * direction;
  const pnl = conversionMissing ? 0 : grossPnlQuote * conversionRate - fee;

  // Initial Risk math
  let riskAmountQuote = 0;
  if (stopLoss !== undefined && stopLoss > 0 && entry > 0) {
    riskAmountQuote = Math.abs(entry - stopLoss) * units;
  }
  const riskAmount = conversionMissing ? 0 : riskAmountQuote * conversionRate;

  // R multiple calculation
  // Critical rule: R sign must match P&L sign!
  let rMultiple = 0;
  if (riskAmount > 0) {
    rMultiple = pnl / riskAmount;
  }

  // Planned R:R calculation (TP reward vs SL risk)
  let plannedRR = 0;
  if (stopLoss !== undefined && takeProfit !== undefined && entry > 0) {
    const plannedRisk = Math.abs(entry - stopLoss);
    const plannedReward = input.side === 'Long' ? takeProfit - entry : entry - takeProfit;
    if (plannedRisk > 0 && plannedReward > 0) {
      plannedRR = plannedReward / plannedRisk;
    }
  }

  const result = classifyTradeResult(pnl, riskAmount, rMultiple);

  return {
    pnl: Number(pnl.toFixed(2)),
    riskAmount: Number(riskAmount.toFixed(2)),
    rMultiple: Number(rMultiple.toFixed(2)),
    plannedRR: Number(plannedRR.toFixed(2)),
    result,
    lot: Number(lot.toFixed(4)),
    units: Number(units.toFixed(2)),
    pnlQuote: Number(grossPnlQuote.toFixed(2)),
    riskAmountQuote: Number(riskAmountQuote.toFixed(2)),
    conversionRate,
    conversionMissing,
  };
}

export interface PositionSizeInput {
  accountBalance: number;
  riskPercent: number;
  symbol: string;
  entry?: number;
  stopLoss?: number;
  stopLossPips?: number;
  conversionRate?: number;
  accountCurrency?: string;
  customPipSize?: number;
  customContractSize?: number;
}

export interface PositionSizeOutput {
  riskMoney: number;
  stopLossPips: number;
  pipValuePerLotUSD: number;
  lot: number;
  units: number;
  meta: PipMeta;
  needsConversion: boolean;
  conversionLabel: string;
  conversionRate: number;
  conversionMissing: boolean;
}

export function calculatePositionSize(input: PositionSizeInput): PositionSizeOutput {
  const balance = Math.abs(Number(input.accountBalance) || 0);
  const riskPercent = Math.abs(Number(input.riskPercent) || 0);
  const entry = Number(input.entry) || 0;
  const stopLoss = Number(input.stopLoss) || 0;

  const meta = getPipMeta(input.symbol, input.customPipSize, input.customContractSize);

  // Derive SL pips if entry & stopLoss are provided and SL pips is not directly specified
  let stopLossPips = Number(input.stopLossPips) || 0;
  if (stopLossPips <= 0 && entry > 0 && stopLoss > 0) {
    stopLossPips = Number((Math.abs(entry - stopLoss) / meta.pipSize).toFixed(2));
  }

  const riskMoney = balance * (riskPercent / 100);

  // Conversion rate to Account Currency (assumed USD default)
  const isUSDQuote = meta.quote === 'USD' || meta.quote === 'USDT';
  const isUSDBase = meta.base === 'USD';
  const needsConversion = !isUSDQuote;

  let quoteToUSD = 0;
  if (isUSDQuote) {
    quoteToUSD = 1;
  } else if (input.conversionRate && input.conversionRate > 0) {
    quoteToUSD = input.conversionRate;
  } else if (isUSDBase && entry > 0) {
    // e.g. USDJPY: 1 JPY = 1 / USDJPY USD
    quoteToUSD = 1 / entry;
  }
  const conversionMissing = quoteToUSD <= 0;

  // Pip Value per Standard Lot in Quote Currency = pipSize * contractSize
  const pipValueQuote = meta.pipSize * meta.contractSize;
  const pipValuePerLotUSD = pipValueQuote * quoteToUSD;

  // Lot = Risk Money / (SL Pips * Pip Value per Lot)
  let lot = 0;
  if (riskMoney > 0 && stopLossPips > 0 && pipValuePerLotUSD > 0) {
    lot = riskMoney / (stopLossPips * pipValuePerLotUSD);
  }

  const units = lot * meta.contractSize;

  return {
    riskMoney: Number(riskMoney.toFixed(2)),
    stopLossPips: Number(stopLossPips.toFixed(2)),
    pipValuePerLotUSD: Number(pipValuePerLotUSD.toFixed(2)),
    lot: Number(lot.toFixed(2)),
    units: Math.round(units),
    meta,
    needsConversion,
    conversionLabel: `1 ${meta.quote} = ? USD`,
    conversionRate: quoteToUSD,
    conversionMissing,
  };
}
