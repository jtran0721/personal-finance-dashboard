import { format, parseISO } from 'date-fns';

/** Format a number as USD currency. Negative values render with a leading minus. */
export function formatCurrency(value: number, opts?: { compact?: boolean; sign?: boolean }): string {
  const { compact = false, sign = false } = opts ?? {};
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 2,
    signDisplay: sign ? 'exceptZero' : 'auto',
  });
  return formatter.format(value);
}

/** Absolute currency (drops the sign) — handy for "spent" figures. */
export function formatAbs(value: number, opts?: { compact?: boolean }): string {
  return formatCurrency(Math.abs(value), opts);
}

/** Format a 0..1 ratio as a percentage, e.g. 0.234 -> "23%". */
export function formatPercent(ratio: number, fractionDigits = 0): string {
  if (!Number.isFinite(ratio)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(ratio);
}

/** Compact number, e.g. 12345 -> "12.3K". */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

/** Safe ISO date -> display string. Falls back to the raw input on parse failure. */
export function formatDate(iso: string, pattern = 'MMM d, yyyy'): string {
  try {
    return format(parseISO(iso), pattern);
  } catch {
    return iso;
  }
}

/** `yyyy-MM` month key -> "Jan 2026". */
export function formatMonthKey(monthKey: string): string {
  try {
    return format(parseISO(`${monthKey}-01`), 'MMM yyyy');
  } catch {
    return monthKey;
  }
}
