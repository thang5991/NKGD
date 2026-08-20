import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, RotateCcw, X } from 'lucide-react';

interface DateTimePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  min?: string;
  error?: string;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

function parseLocalDateTime(value: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!match) return new Date();
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0)
  );
}

function toLocalDateTime(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hour = String(value.getHours()).padStart(2, '0');
  const minute = String(value.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDisplay(value: string): string {
  if (!value) return 'Chọn ngày và giờ';
  const date = parseLocalDateTime(value);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onChange,
  required = false,
  min,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseLocalDateTime(value));
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = parseLocalDateTime(value);
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });

  const openPicker = () => {
    const initial = parseLocalDateTime(value);
    setDraft(initial);
    setVisibleMonth(new Date(initial.getFullYear(), initial.getMonth(), 1));
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEscape, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape, true);
    };
  }, [isOpen]);

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const mondayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
    const start = new Date(year, month, 1 - mondayOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { date, outside: date.getMonth() !== month };
    });
  }, [visibleMonth]);

  const minDate = min ? parseLocalDateTime(min) : null;
  const minCalendarDay = minDate
    ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    : null;
  const isBeforeMinimum = !!minDate && draft.getTime() < minDate.getTime();
  const today = new Date();

  const selectDate = (date: Date) => {
    const next = new Date(draft);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setDraft(next);
    if (date.getMonth() !== visibleMonth.getMonth()) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  const setTimePart = (part: 'hour' | 'minute', nextValue: string) => {
    const next = new Date(draft);
    if (part === 'hour') next.setHours(Number(nextValue));
    else next.setMinutes(Number(nextValue));
    setDraft(next);
  };

  const picker = isOpen ? (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setIsOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-datetime-picker-open
        className="max-h-[96svh] w-full max-w-sm overflow-y-auto rounded-t-2xl border border-line-strong bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between border-b border-line bg-surface-2/50 px-4 py-3.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Chọn ngày giờ</p>
            <h4 className="mt-0.5 text-sm font-semibold text-text">{label}</h4>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-3 hover:text-text"
            aria-label="Đóng bộ chọn ngày giờ"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
              className="rounded-lg border border-line p-2 text-muted transition-colors hover:bg-surface-3 hover:text-text"
              aria-label="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-bold text-text">
              Tháng {visibleMonth.getMonth() + 1} / {visibleMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
              className="rounded-lg border border-line p-2 text-muted transition-colors hover:bg-surface-3 hover:text-text"
              aria-label="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="py-1 text-center text-[10px] font-bold text-muted-2">
                {weekday}
              </div>
            ))}
            {calendarDays.map(({ date, outside }) => {
              const selected = sameDay(date, draft);
              const isToday = sameDay(date, today);
              const disabled = !!minCalendarDay && date.getTime() < minCalendarDay.getTime();
              return (
                <button
                  key={toLocalDateTime(date)}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDate(date)}
                  className={`relative flex aspect-square items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
                    disabled
                      ? 'cursor-not-allowed text-muted-2/20'
                      : selected
                      ? 'bg-accent text-bg shadow-sm'
                      : outside
                        ? 'text-muted-2/40 hover:bg-surface-2 hover:text-muted'
                        : 'text-muted hover:bg-surface-3 hover:text-text'
                  } ${isToday && !selected ? 'ring-1 ring-inset ring-accent/60' : ''}`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border border-line bg-bg-soft p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
              <Clock className="h-3.5 w-3.5 text-accent" />
              Thời gian
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <select
                value={String(draft.getHours()).padStart(2, '0')}
                onChange={(event) => setTimePart('hour', event.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-center font-mono text-sm font-bold text-text outline-none focus:border-accent"
                aria-label="Giờ"
              >
                {HOURS.map((hour) => <option key={hour}>{hour}</option>)}
              </select>
              <span className="font-mono text-base font-bold text-muted">:</span>
              <select
                value={String(draft.getMinutes()).padStart(2, '0')}
                onChange={(event) => setTimePart('minute', event.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-center font-mono text-sm font-bold text-text outline-none focus:border-accent"
                aria-label="Phút"
              >
                {MINUTES.map((minute) => <option key={minute}>{minute}</option>)}
              </select>
            </div>
          </div>

          {isBeforeMinimum && (
            <p className="mt-2 text-[11px] text-loss">Thời gian này phải bằng hoặc sau {formatDisplay(min || '')}.</p>
          )}

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const next = new Date(draft);
                  next.setFullYear(today.getFullYear(), today.getMonth(), today.getDate());
                  setDraft(next);
                  setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                }}
                className="rounded-lg px-2.5 py-2 text-[11px] font-semibold text-muted transition-colors hover:bg-surface-3 hover:text-text"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setDraft(now);
                  setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                }}
                className="flex items-center gap-1 rounded-lg px-2.5 py-2 text-[11px] font-semibold text-muted transition-colors hover:bg-surface-3 hover:text-text"
              >
                <RotateCcw className="h-3 w-3" />
                Bây giờ
              </button>
            </div>
            <button
              type="button"
              disabled={isBeforeMinimum}
              onClick={() => {
                onChange(toLocalDateTime(draft));
                setIsOpen(false);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-bg transition-colors hover:bg-[#c5ff68] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
              Xong
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-muted">
        {label}{required ? ' *' : ''}
      </label>
      <button
        type="button"
        onClick={openPicker}
        className={`group flex w-full items-center justify-between rounded-lg border bg-[#0c0e0c] px-3 py-2 text-left outline-none transition-colors ${
          error ? 'border-loss/70 focus:border-loss' : 'border-line hover:border-line-strong focus:border-accent'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-accent" />
          <span className="truncate font-mono text-xs text-text">{formatDisplay(value)}</span>
        </span>
        <Clock className="h-3.5 w-3.5 shrink-0 text-muted-2 transition-colors group-hover:text-muted" />
      </button>
      {error && <p className="mt-1 text-[10px] font-medium text-loss">{error}</p>}
      {typeof document !== 'undefined' && picker ? createPortal(picker, document.body) : null}
    </div>
  );
};
