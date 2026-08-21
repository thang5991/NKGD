import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Filter,
  ExternalLink,
  Globe2,
  Radio,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useEconomicCalendar } from '../../hooks/useEconomicCalendar';
import { EconomicEvent, EconomicImpact } from '../../types/economic';
import { getActiveSessionLabel, getMarketSessions } from '../../utils/marketSessions';

type DateScope = 'today' | 'tomorrow' | 'week';
type ImpactFilter = 'all' | EconomicImpact;

const CURRENCY_FILTERS = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY'];

const IMPACT_META: Record<EconomicImpact, { label: string; className: string; dot: string }> = {
  3: { label: 'Quan trọng cao', className: 'border-loss/30 bg-loss-soft text-loss', dot: 'bg-loss' },
  2: { label: 'Trung bình', className: 'border-amber/30 bg-amber/10 text-amber', dot: 'bg-amber' },
  1: { label: 'Tác động thấp', className: 'border-line bg-surface-3 text-muted', dot: 'bg-muted' },
};

function dateKey(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

function addDays(key: string, days: number): string {
  const date = new Date(key + 'T00:00:00+07:00');
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

function formatVietnamTime(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function formatVietnamDate(value: string): string {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function parseComparable(value?: string): number | null {
  if (!value) return null;
  const normalized = value.replace(/,/g, '').trim().toUpperCase();
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  let number = Number(match[0]);
  if (normalized.includes('K')) number *= 1_000;
  if (normalized.includes('M')) number *= 1_000_000;
  if (normalized.includes('B')) number *= 1_000_000_000;
  return Number.isFinite(number) ? number : null;
}

function affectedMarkets(currency: string): string[] {
  const mapping: Record<string, string[]> = {
    USD: ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'],
    EUR: ['EURUSD', 'EURJPY', 'EURGBP'],
    GBP: ['GBPUSD', 'GBPJPY', 'EURGBP'],
    JPY: ['USDJPY', 'EURJPY', 'GBPJPY'],
    AUD: ['AUDUSD', 'AUDJPY', 'XAUUSD'],
    CAD: ['USDCAD', 'CADJPY', 'Dầu WTI'],
    CHF: ['USDCHF', 'EURCHF'],
    NZD: ['NZDUSD', 'NZDJPY'],
    CNY: ['AUDUSD', 'NZDUSD', 'XAUUSD', 'Chỉ số châu Á'],
  };
  return mapping[currency] || [currency || 'Thị trường liên quan'];
}

function eventAnalysis(event: EconomicEvent): string {
  const title = event.title.toLowerCase();
  const actual = parseComparable(event.actual);
  const forecast = parseComparable(event.forecast);
  const hasComparison = actual !== null && forecast !== null;
  const stronger = hasComparison && actual > forecast;
  const weaker = hasComparison && actual < forecast;
  const inverse = /unemployment|jobless|claims|inventor|storage/.test(title);

  if (/cpi|inflation|ppi|price index/.test(title)) {
    if (hasComparison) {
      const supportsCurrency = inverse ? weaker : stronger;
      return supportsCurrency
        ? 'Số liệu lạm phát vượt kỳ vọng có thể làm tăng kỳ vọng thắt chặt tiền tệ và hỗ trợ đồng ' + event.currency + '.'
        : 'Số liệu lạm phát thấp hơn kỳ vọng có thể làm giảm kỳ vọng lãi suất và gây áp lực lên đồng ' + event.currency + '.';
    }
    return 'Tin lạm phát có thể thay đổi kỳ vọng lãi suất. Cao hơn dự báo thường hỗ trợ đồng tiền; thấp hơn dự báo thường gây áp lực.';
  }

  if (/interest rate|rate decision|fomc|ecb|boe|boj|rba|boc|central bank/.test(title)) {
    return 'Có thể tạo biến động mạnh trên tiền tệ, vàng và chỉ số. Thông điệp hawkish thường hỗ trợ đồng tiền; dovish thường gây áp lực.';
  }

  if (/employment|payroll|unemployment|jobless|claims|earnings/.test(title)) {
    if (hasComparison) {
      const positive = inverse ? weaker : stronger;
      return positive
        ? 'Thị trường lao động tốt hơn kỳ vọng thường hỗ trợ đồng ' + event.currency + ' và lợi suất trái phiếu.'
        : 'Thị trường lao động yếu hơn kỳ vọng có thể gây áp lực lên đồng ' + event.currency + ' và tăng kỳ vọng nới lỏng.';
    }
    return 'Phản ánh sức khỏe thị trường lao động. Việc làm mạnh hoặc tỷ lệ thất nghiệp thấp hơn dự báo thường hỗ trợ đồng tiền.';
  }

  if (/gdp|pmi|retail sales|industrial production|confidence|sentiment/.test(title)) {
    return 'Phản ánh sức khỏe tăng trưởng. Số liệu cao hơn dự báo thường tích cực cho đồng tiền; thấp hơn dự báo có thể gây áp lực.';
  }

  if (/oil|crude|gas|inventor|storage/.test(title)) {
    return 'Có thể tác động trực tiếp đến giá năng lượng và CAD. Tồn kho tăng mạnh thường gây áp lực lên giá dầu; tồn kho giảm thường hỗ trợ.';
  }

  if (/speak|speech|minutes|press conference|testifies/.test(title)) {
    return 'Rủi ro biến động đến từ phát biểu và định hướng chính sách. Hướng tác động chưa xác định trước, cần theo dõi từ khóa hawkish/dovish.';
  }

  return event.importance === 3
    ? 'Sự kiện có khả năng tạo biến động lớn. Nên giảm đòn bẩy và tránh vào lệnh ngay trước thời điểm công bố.'
    : 'Có thể tác động ngắn hạn đến đồng tiền liên quan; mức phản ứng phụ thuộc chênh lệch giữa thực tế và dự báo.';
}

function relativeEventTime(eventDate: string, now: Date): { label: string; isPast: boolean; isNear: boolean } {
  const difference = new Date(eventDate).getTime() - now.getTime();
  const minutes = Math.round(Math.abs(difference) / 60000);
  const isPast = difference < 0;
  if (minutes < 1) return { label: 'Đang công bố', isPast: false, isNear: true };
  if (minutes < 60) {
    return { label: isPast ? 'Đã qua ' + minutes + ' phút' : 'Còn ' + minutes + ' phút', isPast, isNear: !isPast && minutes <= 30 };
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { label: isPast ? 'Đã qua ' + hours + ' giờ' : 'Còn ' + hours + ' giờ', isPast, isNear: false };
  return { label: isPast ? 'Đã công bố' : 'Sắp tới', isPast, isNear: false };
}

export const EconomicCalendarPage: React.FC = () => {
  const [now, setNow] = useState(new Date());
  const [scope, setScope] = useState<DateScope>('today');
  const [impactFilter, setImpactFilter] = useState<ImpactFilter>('all');
  const [currencies, setCurrencies] = useState<string[]>([]);

  useEffect(() => {
    const updateClock = () => setNow(new Date());
    updateClock();
    const timer = window.setInterval(updateClock, 1_000);
    document.addEventListener('visibilitychange', updateClock);
    window.addEventListener('focus', updateClock);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', updateClock);
      window.removeEventListener('focus', updateClock);
    };
  }, []);

  const today = dateKey(now);
  const range = useMemo(() => {
    if (scope === 'tomorrow') {
      const tomorrow = addDays(today, 1);
      return { from: tomorrow, to: tomorrow };
    }
    if (scope === 'week') return { from: today, to: addDays(today, 6) };
    return { from: today, to: today };
  }, [scope, today]);

  const { events, source, fetchedAt, loading, error, refresh } = useEconomicCalendar(range.from, range.to);
  const sessions = useMemo(() => getMarketSessions(now), [now]);
  const activeSession = getActiveSessionLabel(sessions);

  const filteredEvents = useMemo(() => events.filter((event) => {
    const matchesImpact = impactFilter === 'all' || event.importance === impactFilter;
    const matchesCurrency = currencies.length === 0 || currencies.includes(event.currency);
    return matchesImpact && matchesCurrency;
  }), [events, impactFilter, currencies]);

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, EconomicEvent[]>();
    filteredEvents.forEach((event) => {
      const key = dateKey(new Date(event.date));
      groups.set(key, [...(groups.get(key) || []), event]);
    });
    return Array.from(groups.entries());
  }, [filteredEvents]);

  const highImpactCount = events.filter((event) => event.importance === 3).length;
  const nextHighImpact = events.find((event) => event.importance === 3 && new Date(event.date) > now);

  const toggleCurrency = (currency: string) => {
    setCurrencies((current) => current.includes(currency)
      ? current.filter((item) => item !== currency)
      : [...current, currency]);
  };

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="flex flex-col gap-4 border-b border-line bg-gradient-to-r from-accent-soft/50 to-transparent p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Globe2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Thời gian hiện tại · Việt Nam</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <strong className="font-mono text-2xl font-black text-text">
                  {new Intl.DateTimeFormat('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  }).format(now)}
                </strong>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-border bg-accent-soft px-2.5 py-1 text-[10px] font-bold text-accent">
                  <Radio className="h-3 w-3 animate-pulse" />
                  {activeSession}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-muted">Phiên được xác định theo giờ địa phương của Tokyo, London và New York; tự điều chỉnh DST.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-line bg-bg-soft px-3.5 py-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-loss" />
            <div>
              <span className="block text-[10px] text-muted">Tin quan trọng trong kỳ</span>
              <strong className="font-mono text-sm text-text">{highImpactCount} sự kiện</strong>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {sessions.map((session) => (
            <div key={session.id} className={session.isOpen ? 'bg-accent-soft/25 p-3.5' : 'p-3.5'}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={session.isOpen ? 'h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_rgba(184,243,90,0.7)]' : 'h-2 w-2 rounded-full bg-muted-2'} />
                    <strong className={session.isOpen ? 'text-xs text-text' : 'text-xs text-muted'}>{session.name}</strong>
                  </div>
                  <span className="mt-1 block text-[10px] text-muted-2">{session.city} · 08:00–17:00</span>
                </div>
                <div className="text-right">
                  <strong className={session.isOpen ? 'block font-mono text-sm text-accent' : 'block font-mono text-sm text-muted'}>
                    {session.localTime}
                  </strong>
                  <span className="text-[9px] uppercase text-muted-2">{session.isOpen ? 'Đang mở' : 'Đã đóng'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {nextHighImpact && (
        <section className="flex flex-col gap-3 rounded-xl border border-loss/25 bg-loss-soft/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-loss-soft text-loss">
              <CalendarClock className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-loss">Tin quan trọng tiếp theo</span>
              <strong className="mt-0.5 block truncate text-xs text-text">{nextHighImpact.currency} · {nextHighImpact.title}</strong>
            </div>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <strong className="block font-mono text-sm text-text">{formatVietnamTime(nextHighImpact.date)}</strong>
            <span className="text-[10px] text-loss">{relativeEventTime(nextHighImpact.date, now).label}</span>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-line bg-surface p-3.5 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 border-b border-line pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Filter className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-xs font-bold text-text">Bộ lọc lịch kinh tế</h3>
              <p className="text-[10px] text-muted">Giờ hiển thị theo múi giờ Việt Nam (UTC+7)</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {([
              ['today', 'Hôm nay'],
              ['tomorrow', 'Ngày mai'],
              ['week', '7 ngày'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                className={scope === value
                  ? 'rounded-lg border border-accent-border bg-accent-soft px-3 py-2 text-[10px] font-bold text-accent'
                  : 'rounded-lg border border-line bg-surface-2 px-3 py-2 text-[10px] font-semibold text-muted hover:text-text'}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {([
              ['all', 'Mọi mức độ'],
              [3, 'Quan trọng cao'],
              [2, 'Trung bình'],
              [1, 'Tác động thấp'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setImpactFilter(value)}
                className={impactFilter === value
                  ? 'rounded-full border border-accent-border bg-accent-soft px-2.5 py-1.5 text-[10px] font-bold text-accent'
                  : 'rounded-full border border-line px-2.5 py-1.5 text-[10px] text-muted hover:bg-surface-2 hover:text-text'}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {CURRENCY_FILTERS.map((currency) => (
              <button
                key={currency}
                type="button"
                onClick={() => toggleCurrency(currency)}
                className={currencies.includes(currency)
                  ? 'shrink-0 rounded-lg border border-accent bg-accent-soft px-2.5 py-1.5 font-mono text-[10px] font-bold text-accent'
                  : 'shrink-0 rounded-lg border border-line bg-bg-soft px-2.5 py-1.5 font-mono text-[10px] font-semibold text-muted hover:text-text'}
              >
                {currency}
              </button>
            ))}
            {currencies.length > 0 && (
              <button type="button" onClick={() => setCurrencies([])} className="shrink-0 px-2 text-[10px] text-muted hover:text-text">
                Xóa lọc
              </button>
            )}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl border border-line bg-surface" />)}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-loss/30 bg-loss-soft p-6 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-loss" />
          <p className="mt-2 text-sm font-semibold text-text">Không thể tải lịch kinh tế</p>
          <p className="mt-1 text-xs text-muted">{error}</p>
          <button type="button" onClick={refresh} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-bg">
            <RefreshCw className="h-3.5 w-3.5" /> Thử lại
          </button>
        </div>
      ) : groupedEvents.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface p-8 text-center">
          <CheckCircle2 className="mx-auto h-7 w-7 text-accent" />
          <p className="mt-2 text-sm font-semibold text-text">Không có tin phù hợp</p>
          <p className="mt-1 text-xs text-muted">Hãy đổi ngày hoặc bỏ bớt điều kiện lọc.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedEvents.map(([day, dayEvents]) => (
            <section key={day}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold capitalize text-text">{formatVietnamDate(day + 'T12:00:00+07:00')}</h3>
                <span className="text-[10px] text-muted">{dayEvents.length} sự kiện</span>
              </div>
              <div className="space-y-2">
                {dayEvents.map((event) => {
                  const meta = IMPACT_META[event.importance];
                  const relative = relativeEventTime(event.date, now);
                  return (
                    <article
                      key={event.id}
                      className={relative.isNear
                        ? 'overflow-hidden rounded-xl border border-loss/40 bg-surface shadow-[0_0_0_1px_rgba(255,102,95,0.08)]'
                        : 'overflow-hidden rounded-xl border border-line bg-surface shadow-sm'}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-[90px_1fr]">
                        <div className="flex items-center justify-between border-b border-line bg-bg-soft px-3.5 py-3 sm:block sm:border-b-0 sm:border-r sm:text-center">
                          <div>
                            <strong className="block font-mono text-base text-text">{formatVietnamTime(event.date)}</strong>
                            <span className={relative.isNear ? 'mt-1 block text-[9px] font-bold text-loss' : 'mt-1 block text-[9px] text-muted'}>
                              {relative.label}
                            </span>
                          </div>
                          <strong className="font-mono text-xs text-accent sm:mt-3 sm:block">{event.currency || '—'}</strong>
                        </div>

                        <div className="min-w-0 p-3.5 sm:p-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-bold ' + meta.className}>
                                  <span className={'h-1.5 w-1.5 rounded-full ' + meta.dot} />
                                  {meta.label}
                                </span>
                                {event.country && event.country !== event.currency && (
                                  <span className="text-[9px] text-muted">{event.country}</span>
                                )}
                              </div>
                              <h4 className="mt-2 text-sm font-bold leading-snug text-text">{event.title}</h4>
                            </div>
                            <div className="grid shrink-0 grid-cols-3 gap-1.5 sm:min-w-[230px]">
                              {[
                                ['Thực tế', event.actual],
                                ['Dự báo', event.forecast],
                                ['Trước đó', event.previous],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-lg border border-line bg-bg-soft px-2 py-1.5 text-center">
                                  <span className="block text-[8px] uppercase text-muted-2">{label}</span>
                                  <strong className="mt-0.5 block truncate font-mono text-[10px] text-text">{value || '—'}</strong>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="mt-3 rounded-lg border border-line/70 bg-surface-2/30 p-3">
                            <div className="flex items-start gap-2">
                              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                              <p className="text-[10px] leading-relaxed text-muted">{eventAnalysis(event)}</p>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="text-[9px] text-muted-2">Có thể ảnh hưởng:</span>
                              {affectedMarkets(event.currency).map((market) => (
                                <span key={market} className="rounded border border-line bg-bg-soft px-1.5 py-0.5 font-mono text-[9px] text-muted">
                                  {market}
                                </span>
                              ))}
                              {event.sourceUrl && (
                                <a
                                  href={event.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="ml-auto inline-flex items-center gap-1 text-[9px] text-muted hover:text-accent"
                                >
                                  Nguồn <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <footer className="flex flex-col gap-2 rounded-xl border border-line bg-surface-2/30 px-3.5 py-3 text-[10px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>
          Nguồn: <strong className="text-text">{source || '—'}</strong>
          {fetchedAt && ' · Cập nhật ' + formatVietnamTime(fetchedAt)}
        </span>
        <div className="flex items-center gap-3">
          <span>Phân tích tác động chỉ mang tính tham khảo, không phải dự báo giá.</span>
          <button type="button" onClick={refresh} disabled={loading} className="shrink-0 rounded-lg border border-line p-1.5 text-muted hover:text-text disabled:opacity-50" aria-label="Làm mới lịch kinh tế">
            <RefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          </button>
        </div>
      </footer>
    </div>
  );
};
