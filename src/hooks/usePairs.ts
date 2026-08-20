import { createContext, createElement, useState, useEffect, useCallback, useContext } from 'react';
import type { PropsWithChildren } from 'react';
import { CustomPair, PairOption } from '../types/pair';
import { getAllCustomPairs, saveCustomPair, deleteCustomPair, getAllPairOptions } from '../db/pairRepository';

function usePairsStore() {
  const [customPairs, setCustomPairs] = useState<CustomPair[]>([]);
  const [pairOptions, setPairOptions] = useState<PairOption[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshPairs = useCallback(async () => {
    try {
      setLoading(true);
      const [custom, options] = await Promise.all([
        getAllCustomPairs(),
        getAllPairOptions(),
      ]);
      setCustomPairs(custom);
      setPairOptions(options);
    } catch (err) {
      console.error('Failed to load pairs:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPairs().catch(() => undefined);
  }, [refreshPairs]);

  const addCustomPair = async (pair: Omit<CustomPair, 'id' | 'createdAt'>): Promise<CustomPair> => {
    const symbol = pair.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const newPair: CustomPair = {
      id: `pair-${symbol}`,
      symbol,
      displayName: pair.displayName.trim() || symbol,
      assetType: pair.assetType || 'custom',
      pipSize: Number(pair.pipSize) || 0.0001,
      contractSize: Number(pair.contractSize) || 100000,
      createdAt: new Date().toISOString(),
    };

    await saveCustomPair(newPair);
    await refreshPairs();
    return newPair;
  };

  const removeCustomPair = async (id: string): Promise<void> => {
    await deleteCustomPair(id);
    await refreshPairs();
  };

  return {
    customPairs,
    pairOptions,
    loading,
    addCustomPair,
    removeCustomPair,
    refreshPairs,
  };
}

type PairsContextValue = ReturnType<typeof usePairsStore>;

const PairsContext = createContext<PairsContextValue | null>(null);

export function PairsProvider({ children }: PropsWithChildren) {
  const value = usePairsStore();
  return createElement(PairsContext.Provider, { value }, children);
}

export function usePairs(): PairsContextValue {
  const context = useContext(PairsContext);
  if (!context) {
    throw new Error('usePairs must be used within PairsProvider');
  }
  return context;
}
