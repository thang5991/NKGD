import { dbGet, dbGetAll, dbPut, dbDelete, STORES } from './indexedDb';
import { Trade } from '../types/trade';
import { deleteImagesByOwner } from './imageRepository';

export async function getAllTrades(): Promise<Trade[]> {
  const trades = await dbGetAll<Trade>(STORES.trades);
  return trades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
