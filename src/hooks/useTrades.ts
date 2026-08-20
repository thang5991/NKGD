import { createContext, createElement, useState, useEffect, useCallback, useMemo, useContext } from 'react';
import type { PropsWithChildren } from 'react';
import { Trade } from '../types/trade';
import { getAllTrades, saveTrade, deleteTrade } from '../db/tradeRepository';
import { getImagesByIds, saveImage, deleteImage } from '../db/imageRepository';
import { compressImageFile } from '../utils/imageCompressor';
import { calculateTrade } from '../utils/calculator';
import { ImageRecord } from '../types/trade';

export interface TradeStats {
  totalPnl: number;
  totalTrades: number;
  wins: number;
  losses: number;
  be: number;
  winRate: number;
  profitFactor: number;
  avgR: number;
  avgPnl: number;
  bestTrade: number;
  worstTrade: number;
  grossProfit: number;
  grossLoss: number;
}

function useTradesStore() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshTrades = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getAllTrades();
      setTrades(list);
    } catch (err) {
      console.error('Failed to load trades:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTrades().catch(() => undefined);
  }, [refreshTrades]);

  const saveTradeWithImages = async (
    tradeData: Omit<Trade, 'id' | 'pnl' | 'riskAmount' | 'rMultiple' | 'plannedRR' | 'result' | 'createdAt' | 'updatedAt' | 'imageRefs'> & {
      id?: string;
      imageRefs?: string[];
      newImages?: File[];
      existingImages?: ImageRecord[];
    }
  ): Promise<Trade> => {
    const id = tradeData.id || `trade-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // Calculate trade metrics
    const calc = calculateTrade({
      side: tradeData.side,
      entry: tradeData.entry,
      exit: tradeData.exit,
      stopLoss: tradeData.stopLoss,
      takeProfit: tradeData.takeProfit,
      lot: tradeData.lot,
      units: tradeData.units,
      fee: tradeData.fee,
      symbol: tradeData.symbol,
      accountCurrency: tradeData.accountCurrency,
      conversionRate: tradeData.conversionRate,
    });

    // Handle Image uploads and preservation
    const finalImageRefs: string[] = [];

    // Keep existing images
    if (tradeData.existingImages && tradeData.existingImages.length > 0) {
      for (const img of tradeData.existingImages) {
        finalImageRefs.push(img.id);
      }
    }

    // Process new images (compress and save blob)
    if (tradeData.newImages && tradeData.newImages.length > 0) {
      for (const file of tradeData.newImages) {
        const { blob, mimeType } = await compressImageFile(file);
        const imageId = `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const imageRecord: ImageRecord = {
          id: imageId,
          ownerType: 'trade',
          ownerId: id,
          name: file.name,
          mimeType,
          blob,
          createdAt: now,
        };
        await saveImage(imageRecord);
        finalImageRefs.push(imageId);
      }
    }

    // Clean up any removed images
    const oldTrade = trades.find((t) => t.id === id);
    if (oldTrade && oldTrade.imageRefs) {
      const removedIds = oldTrade.imageRefs.filter((oldId) => !finalImageRefs.includes(oldId));
      for (const remId of removedIds) {
        await deleteImage(remId);
      }
    }

    const tradeToSave: Trade = {
      id,
      date: tradeData.date,
      exitDate: tradeData.exitDate || tradeData.date,
      symbol: tradeData.symbol.toUpperCase().trim(),
      timeframe: tradeData.timeframe || 'M15',
      side: tradeData.side,
      market: tradeData.market,
      setup: tradeData.setup.trim(),
      emotion: tradeData.emotion,
      entry: tradeData.entry,
      stopLoss: tradeData.stopLoss,
      takeProfit: tradeData.takeProfit,
      exit: tradeData.exit,
      lot: calc.lot,
      units: calc.units,
      fee: tradeData.fee || 0,
      accountCurrency: tradeData.accountCurrency || 'USD',
      quoteCurrency: tradeData.quoteCurrency,
      conversionRate: calc.conversionRate,
      conversionDate: tradeData.conversionDate,
      conversionSource: tradeData.conversionSource,
      pnlQuote: calc.pnlQuote,
      riskAmountQuote: calc.riskAmountQuote,
      notes: tradeData.notes.trim(),
      imageRefs: finalImageRefs,
      pnl: calc.pnl,
      riskAmount: calc.riskAmount,
      rMultiple: calc.rMultiple,
      plannedRR: calc.plannedRR,
      result: calc.result,
      createdAt: oldTrade?.createdAt || now,
      updatedAt: now,
    };

    await saveTrade(tradeToSave);
    await refreshTrades();
    return tradeToSave;
  };

  const removeTrade = async (id: string): Promise<void> => {
    await deleteTrade(id);
    await refreshTrades();
  };

  const loadTradeImages = async (imageRefs: string[]): Promise<ImageRecord[]> => {
    return getImagesByIds(imageRefs);
  };

  const stats: TradeStats = useMemo(() => {
    const totalTrades = trades.length;
    if (totalTrades === 0) {
      return {
        totalPnl: 0,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        be: 0,
        winRate: 0,
        profitFactor: 0,
        avgR: 0,
        avgPnl: 0,
        bestTrade: 0,
        worstTrade: 0,
        grossProfit: 0,
        grossLoss: 0,
      };
    }

    const pnls = trades.map((t) => t.pnl);
    const winTrades = trades.filter((t) => t.pnl > 0);
    const lossTrades = trades.filter((t) => t.pnl < 0);
    const beTrades = trades.filter((t) => t.pnl === 0);

    const grossProfit = winTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(lossTrades.reduce((sum, t) => sum + t.pnl, 0));
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

    const validRs = trades.map((t) => t.rMultiple).filter((r) => !isNaN(r) && isFinite(r));
    const avgR = validRs.length > 0 ? validRs.reduce((sum, r) => sum + r, 0) / validRs.length : 0;

    const winRate = (winTrades.length / totalTrades) * 100;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const avgPnl = totalPnl / totalTrades;

    const bestTrade = pnls.length > 0 ? Math.max(...pnls) : 0;
    const worstTrade = pnls.length > 0 ? Math.min(...pnls) : 0;

    return {
      totalPnl: Number(totalPnl.toFixed(2)),
      totalTrades,
      wins: winTrades.length,
      losses: lossTrades.length,
      be: beTrades.length,
      winRate: Number(winRate.toFixed(1)),
      profitFactor: Number(profitFactor.toFixed(2)),
      avgR: Number(avgR.toFixed(2)),
      avgPnl: Number(avgPnl.toFixed(2)),
      bestTrade: Number(bestTrade.toFixed(2)),
      worstTrade: Number(worstTrade.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      grossLoss: Number(grossLoss.toFixed(2)),
    };
  }, [trades]);

  return {
    trades,
    loading,
    stats,
    saveTradeWithImages,
    removeTrade,
    refreshTrades,
    loadTradeImages,
  };
}

type TradesContextValue = ReturnType<typeof useTradesStore>;

const TradesContext = createContext<TradesContextValue | null>(null);

export function TradesProvider({ children }: PropsWithChildren) {
  const value = useTradesStore();
  return createElement(TradesContext.Provider, { value }, children);
}

export function useTrades(): TradesContextValue {
  const context = useContext(TradesContext);
  if (!context) {
    throw new Error('useTrades must be used within TradesProvider');
  }
  return context;
}
