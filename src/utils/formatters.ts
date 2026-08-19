export function formatMoney(amount: number, prefix: boolean = false): string {
  const num = Number(amount) || 0;
  const formatted = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (prefix) {
    if (num > 0) return `+$${formatted}`;
    if (num < 0) return `-$${formatted}`;
    return `$${formatted}`;
  }
  return num < 0 ? `-$${formatted}` : `$${formatted}`;
}

export function formatNumber(num: number, maxDecimals: number = 2): string {
  return Number(num || 0).toLocaleString('en-US', {
    maximumFractionDigits: maxDecimals,
  });
}

export function formatR(r: number): string {
  const val = Number(r) || 0;
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}R`;
}

export function formatPercent(p: number): string {
  return `${(Number(p) || 0).toFixed(1)}%`;
}

export function formatDateTime(isoOrLocal: string): string {
  if (!isoOrLocal) return '—';
  const d = new Date(isoOrLocal);
  if (isNaN(d.getTime())) return isoOrLocal;
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(isoOrLocal: string): string {
  if (!isoOrLocal) return '—';
  const d = new Date(isoOrLocal);
  if (isNaN(d.getTime())) return isoOrLocal;
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function localDateKey(dateValue: string | Date): string {
  const d = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
