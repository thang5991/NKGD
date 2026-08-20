import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FxRateResult, getQuoteCurrency, getTradeFxRate } from '../db/fxRateRepository';

function localToday(): string {
  const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return now.toISOString().slice(0, 10);
}

export function useFxRate(symbol: string, date: string, accountCurrency = 'USD') {
  const quoteCurrency = useMemo(() => getQuoteCurrency(symbol), [symbol]);
  const normalizedAccount = accountCurrency.toUpperCase() === 'USDT' ? 'USD' : accountCurrency.toUpperCase();
  const needsConversion = quoteCurrency !== normalizedAccount;
  const requestedDate = date?.slice(0, 10) || localToday();
  const requestKey = `${symbol}-${quoteCurrency}-${normalizedAccount}-${requestedDate}`;
  const requestId = useRef(0);
  const [state, setState] = useState<{
    key: string;
    result: FxRateResult | null;
    loading: boolean;
    error: string | null;
  }>({ key: '', result: null, loading: needsConversion, error: null });

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!needsConversion) {
      setState({
        key: requestKey,
        result: {
          requestedDate,
          rateDate: requestedDate,
          base: quoteCurrency,
          quote: normalizedAccount,
          rate: 1,
          source: 'identity',
        },
        loading: false,
        error: null,
      });
      return;
    }

    setState({ key: requestKey, result: null, loading: true, error: null });
    try {
      const next = await getTradeFxRate(symbol, normalizedAccount, requestedDate);
      if (requestId.current === currentRequest) {
        setState({ key: requestKey, result: next, loading: false, error: null });
      }
    } catch (err) {
      if (requestId.current === currentRequest) {
        setState({
          key: requestKey,
          result: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Không thể lấy tỷ giá',
        });
      }
    }
  }, [needsConversion, normalizedAccount, quoteCurrency, requestKey, requestedDate, symbol]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isCurrent = state.key === requestKey;
  const currentResult = isCurrent ? state.result : null;

  return {
    rate: currentResult?.rate,
    rateDate: currentResult?.rateDate,
    source: currentResult?.source,
    quoteCurrency,
    accountCurrency: normalizedAccount,
    needsConversion,
    loading: !isCurrent || state.loading,
    error: isCurrent ? state.error : null,
    refresh,
  };
}
