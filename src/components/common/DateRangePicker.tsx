import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { CalendarDays, Check, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';

interface DateRangePickerProps {
  from?: string;
  to?: string;
  onApply: (from: string, to: string) => void;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function toDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function fromDateKey(value?: string): Date {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDate(value?: string): string {
  if (!value) return 'Chưa chọn';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(fromDateKey(value));
}

function formatMonth(date: Date): string {
  const label = new Intl.DateTimeFormat('vi-VN', {
    month: 'long',
    year: 'numeric',
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getCalendarDays(month: Date): Date[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const mondayOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const start = new Date(year, monthIndex, 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

interface MonthCalendarProps {
  month: Date;
  draftFrom: string;
  draftTo: string;
  onSelect: (key: string) => void;
  className?: string;
}

const MonthCalendar: React.FC<MonthCalendarProps> = ({
  month,
  draftFrom,
  draftTo,
  onSelect,
  className,
}) => {
  const days = useMemo(() => getCalendarDays(month), [month]);
  const todayKey = toDateKey(new Date());

  return (
    <div className={className}>
      <h4 className="mb-3 text-center text-xs font-bold capitalize text-text">{formatMonth(month)}</h4>
      <div className="mb-1 grid grid-cols-7">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="py-1 text-center text-[9px] font-bold uppercase text-muted-2">
            {weekday}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {days.map((date) => {
          const key = toDateKey(date);
          const inCurrentMonth = sameMonth(date, month);
          const isStart = key === draftFrom;
          const isEnd = key === draftTo;
          const inRange = Boolean(draftFrom && draftTo && key > draftFrom && key < draftTo);
          const isToday = key === todayKey;

          return (
            <div
              key={key}
              className={clsx(
                'relative flex h-9 items-center justify-center',
                inRange && 'bg-accent-soft/70',
                isStart && 'rounded-l-lg bg-accent-soft/70',
                isEnd && 'rounded-r-lg bg-accent-soft/70'
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(key)}
                aria-label={formatDate(key)}
                aria-pressed={isStart || isEnd}
                className={clsx(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-semibold transition-all',
                  isStart || isEnd
                    ? 'bg-accent font-black text-bg shadow-[0_0_0_1px_rgba(184,243,90,0.35)]'
                    : inCurrentMonth
                      ? 'text-muted hover:bg-surface-3 hover:text-text'
                      : 'text-muted-2/35 hover:bg-surface-2 hover:text-muted',
                  isToday && !isStart && !isEnd && 'ring-1 ring-inset ring-accent/70 text-accent'
                )}
              >
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ from, to, onApply }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from || '');
  const [draftTo, setDraftTo] = useState(to || '');
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = fromDateKey(from);
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  const openPicker = () => {
    const initial = fromDateKey(from);
    setDraftFrom(from || '');
    setDraftTo(to || '');
    setVisibleMonth(new Date(initial.getFullYear(), initial.getMonth(), 1));
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectDate = (key: string) => {
    if (!draftFrom || draftTo) {
      setDraftFrom(key);
      setDraftTo('');
      return;
    }
    if (key < draftFrom) {
      setDraftTo(draftFrom);
      setDraftFrom(key);
      return;
    }
    setDraftTo(key);
  };

  const moveMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const secondMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
  const rangeReady = Boolean(draftFrom && draftTo);

  const picker = isOpen ? (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setIsOpen(false);
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Chọn khoảng ngày"
        className="w-full overflow-hidden rounded-t-2xl border border-line-strong bg-surface shadow-2xl sm:max-w-2xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between border-b border-line bg-surface-2/50 px-4 py-3.5 sm:px-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <CalendarDays className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-text">Chọn khoảng thời gian</h3>
              <p className="mt-0.5 text-[10px] text-muted">Chọn ngày bắt đầu, sau đó chọn ngày kết thúc</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-3 hover:text-text"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid grid-cols-2 border-b border-line bg-bg-soft">
          <div className="border-r border-line px-4 py-3">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-2">Từ ngày</span>
            <strong className={clsx('mt-1 block font-mono text-xs', draftFrom ? 'text-text' : 'text-muted')}>
              {formatDate(draftFrom)}
            </strong>
          </div>
          <div className="px-4 py-3">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-2">Đến ngày</span>
            <strong className={clsx('mt-1 block font-mono text-xs', draftTo ? 'text-text' : 'text-muted')}>
              {formatDate(draftTo)}
            </strong>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="rounded-lg border border-line p-2 text-muted transition-colors hover:border-line-strong hover:bg-surface-3 hover:text-text"
              aria-label="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-[10px] text-muted">
              {draftFrom && !draftTo ? 'Tiếp tục chọn ngày kết thúc' : 'Chọn ngày để bắt đầu'}
            </p>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="rounded-lg border border-line p-2 text-muted transition-colors hover:border-line-strong hover:bg-surface-3 hover:text-text"
              aria-label="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:divide-x md:divide-line">
            <MonthCalendar
              month={visibleMonth}
              draftFrom={draftFrom}
              draftTo={draftTo}
              onSelect={selectDate}
            />
            <MonthCalendar
              month={secondMonth}
              draftFrom={draftFrom}
              draftTo={draftTo}
              onSelect={selectDate}
              className="hidden pl-6 md:block"
            />
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-line bg-surface-2/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <button
            type="button"
            onClick={() => {
              setDraftFrom('');
              setDraftTo('');
            }}
            className="flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold text-muted transition-colors hover:bg-surface-3 hover:text-text"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Chọn lại
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 rounded-lg px-4 py-2 text-xs font-semibold text-muted transition-colors hover:bg-surface-3 hover:text-text sm:flex-none"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!rangeReady}
              onClick={() => {
                if (!rangeReady) return;
                onApply(draftFrom, draftTo);
                setIsOpen(false);
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-5 py-2 text-xs font-black text-bg transition-colors hover:bg-[#c5ff68] disabled:cursor-not-allowed disabled:opacity-35 sm:flex-none"
            >
              <Check className="h-3.5 w-3.5" />
              Áp dụng
            </button>
          </div>
        </footer>
      </section>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className={clsx(
          'group flex w-full items-center gap-2 rounded-xl border bg-[#0c0e0c] px-3 py-3 text-left outline-none transition-all hover:border-line-strong focus:border-accent sm:gap-3 sm:px-3.5',
          from && to ? 'border-accent-border' : 'border-line'
        )}
      >
        <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted transition-colors group-hover:text-accent sm:flex">
          <CalendarDays className="h-4 w-4" />
        </span>
        <span className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
          <span className="min-w-0">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-2">Từ ngày</span>
            <strong className={clsx('mt-0.5 block truncate font-mono text-xs', from ? 'text-text' : 'text-muted')}>
              {formatDate(from)}
            </strong>
          </span>
          <span className="h-px w-4 bg-line sm:w-8" />
          <span className="min-w-0">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-2">Đến ngày</span>
            <strong className={clsx('mt-0.5 block truncate font-mono text-xs', to ? 'text-text' : 'text-muted')}>
              {formatDate(to)}
            </strong>
          </span>
        </span>
        <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-2 transition-transform group-hover:translate-x-0.5 group-hover:text-accent sm:block" />
      </button>
      {picker && createPortal(picker, document.body)}
    </>
  );
};
