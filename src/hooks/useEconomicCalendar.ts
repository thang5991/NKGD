import { useCallback, useEffect, useState } from 'react';
import { EconomicCalendarResponse, EconomicEvent } from '../types/economic';

export function useEconomicCalendar(from: string, to: string) {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [source, setSource] = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => setRefreshToken((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const query = new URLSearchParams({ from, to });
        if (refreshToken > 0) query.set('refresh', String(refreshToken));
        const response = await fetch('/api/economic-calendar?' + query.toString(), {
          signal: controller.signal,
        });
        const payload = await response.json() as EconomicCalendarResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error || 'Không thể tải lịch kinh tế');
        setEvents(Array.isArray(payload.events) ? payload.events : []);
        setSource(payload.source || '');
        setFetchedAt(payload.fetchedAt || '');
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : 'Không thể tải lịch kinh tế');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [from, to, refreshToken]);

  return { events, source, fetchedAt, loading, error, refresh };
}
