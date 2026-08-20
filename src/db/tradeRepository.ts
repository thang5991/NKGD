import { dbGet, dbGetAll, dbPut, dbDelete, STORES } from './indexedDb';
import { Trade } from '../types/trade';
import { deleteImagesByOwner } from './imageRepository';
import { calculateTrade } from '../utils/calculator';
import { getQuoteCurrency, getTradeFxRate } from './fxRateRepository';

export async function getAllTrades(): Promise<Trade[]> {
  const trades = await dbGetAll<Trade>(STORES.trades);
  const migrated: Trade[] = [];

  for (const trade of trades) {
    const alreadyConverted =
      Number(trade.conversionRate) > 0 &&
      trade.pnlQuote != null &&
      trade.riskAmountQuote != null;
    if (alreadyConverted) {
      migrated.push(trade);
      continue;
    }

    try {
      const accountCurrency = trade.accountCurrency || 'USD';
      const conversion = await getTradeFxRate(
        trade.symbol,
        accountCurrency,
        trade.exitDate || trade.date
      );
      const calc = calculateTrade({
        side: trade.side,
        entry: trade.entry,
        exit: trade.exit,
        stopLoss: trade.stopLoss,
        takeProfit: trade.takeProfit,
        lot: trade.lot,
        units: trade.units,
        fee: trade.fee,
        symbol: trade.symbol,
        accountCurrency,
        conversionRate: conversion.rate,
      });
      const updated: Trade = {
        ...trade,
        exitDate: trade.exitDate || trade.date,
        accountCurrency,
        quoteCurrency: getQuoteCurrency(trade.symbol),
        conversionRate: conversion.rate,
        conversionDate: conversion.rateDate,
        conversionSource: conversion.source,
        pnlQuote: calc.pnlQuote,
        riskAmountQuote: calc.riskAmountQuote,
        pnl: calc.pnl,
        riskAmount: calc.riskAmount,
        rMultiple: calc.rMultiple,
        plannedRR: calc.plannedRR,
        result: calc.result,
      };
      await dbPut(STORES.trades, updated);
      migrated.push(updated);
    } catch (error) {
      console.warn(`Could not migrate FX conversion for trade ${trade.id}:`, error);
      migrated.push(trade);
    }
  }

  return migrated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getTradeById(id: string): Promise<Trade | undefined> {
  return dbGet<Trade>(STORES.trades, id);
}

export async function saveTrade(trade: Trade): Promise<void> {
  await dbPut(STORES.trades, trade);
}

export async function deleteTrade(id: string): Promise<void> {
  await dbDelete(STORES.trades, id);
  // Auto clean associated trade images
  await deleteImagesByOwner('trade', id);
}
