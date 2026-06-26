import { eachMonthOfInterval, format, parseISO } from 'date-fns';
import type { Category, Transaction } from '@/types';

/** Inclusive ISO-date range filter. ISO `yyyy-MM-dd` strings compare correctly lexicographically. */
export function filterByRange<T extends { date: string }>(items: T[], start: string, end: string): T[] {
  return items.filter((t) => t.date >= start && t.date <= end);
}

/** `yyyy-MM` month bucket for a transaction date. */
export function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export interface Totals {
  income: number;
  expenses: number;
  invested: number;
  netSavings: number;
  /** netSavings / income, clamped to a finite value (0 when no income). */
  savingsRate: number;
  txnCount: number;
}

/**
 * Headline totals. Income is summed signed (normally positive); expenses and
 * investments are summed as magnitudes. Transfers are intentionally excluded —
 * moving money between your own accounts is neither income nor spending.
 */
export function computeTotals(txns: Transaction[]): Totals {
  let income = 0;
  let expenses = 0;
  let invested = 0;
  for (const t of txns) {
    if (t.type === 'income') income += t.amount;
    else if (t.type === 'expense') expenses += Math.abs(t.amount);
    else if (t.type === 'investment') invested += Math.abs(t.amount);
  }
  const netSavings = income - expenses;
  const savingsRate = income > 0 ? netSavings / income : 0;
  return { income, expenses, invested, netSavings, savingsRate, txnCount: txns.length };
}

export interface CategorySlice {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
  pct: number;
  count: number;
}

/** Aggregate spending (expenses) by category, sorted high → low, with % of total. */
export function spendingByCategory(txns: Transaction[], byId: Record<string, Category>): CategorySlice[] {
  return aggregateByCategory(txns.filter((t) => t.type === 'expense'), byId);
}

/** Aggregate investment contributions by category. */
export function investmentAllocation(txns: Transaction[], byId: Record<string, Category>): CategorySlice[] {
  return aggregateByCategory(txns.filter((t) => t.type === 'investment'), byId);
}

function aggregateByCategory(txns: Transaction[], byId: Record<string, Category>): CategorySlice[] {
  const sums = new Map<string, { amount: number; count: number }>();
  let total = 0;
  for (const t of txns) {
    const mag = Math.abs(t.amount);
    total += mag;
    const cur = sums.get(t.categoryId) ?? { amount: 0, count: 0 };
    cur.amount += mag;
    cur.count += 1;
    sums.set(t.categoryId, cur);
  }
  return [...sums.entries()]
    .map(([categoryId, { amount, count }]) => {
      const cat = byId[categoryId];
      return {
        categoryId,
        name: cat?.name ?? 'Uncategorized',
        color: cat?.color ?? '#adb5bd',
        amount,
        count,
        pct: total > 0 ? amount / total : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export interface MonthlyPoint {
  month: string; // yyyy-MM
  label: string; // "Jan"
  income: number;
  expenses: number;
  invested: number;
  net: number;
}

/**
 * Income / expenses / investments per month, with gap-filling so the trend
 * line is continuous even for months with no activity.
 */
export function monthlyTrend(txns: Transaction[]): MonthlyPoint[] {
  if (txns.length === 0) return [];
  const buckets = new Map<string, MonthlyPoint>();
  let min = txns[0].date;
  let max = txns[0].date;
  for (const t of txns) {
    if (t.date < min) min = t.date;
    if (t.date > max) max = t.date;
    const key = monthKeyOf(t.date);
    const b = buckets.get(key) ?? emptyMonth(key);
    if (t.type === 'income') b.income += t.amount;
    else if (t.type === 'expense') b.expenses += Math.abs(t.amount);
    else if (t.type === 'investment') b.invested += Math.abs(t.amount);
    buckets.set(key, b);
  }
  // Fill gaps between the first and last month.
  const months = eachMonthOfInterval({ start: parseISO(`${monthKeyOf(min)}-01`), end: parseISO(`${monthKeyOf(max)}-01`) });
  return months.map((d) => {
    const key = format(d, 'yyyy-MM');
    const b = buckets.get(key) ?? emptyMonth(key);
    b.net = b.income - b.expenses;
    return b;
  });
}

function emptyMonth(key: string): MonthlyPoint {
  return { month: key, label: format(parseISO(`${key}-01`), 'MMM'), income: 0, expenses: 0, invested: 0, net: 0 };
}

export interface BudgetRow {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  budget: number;
  actual: number;
  remaining: number;
  pct: number;
  over: boolean;
}

/**
 * Budget vs. actual spend for a single month. Only expense categories that have
 * a `monthlyBudget` set are included. `actual` is that month's spend.
 */
export function budgetVsActual(txns: Transaction[], categories: Category[], monthKey: string): BudgetRow[] {
  const monthTxns = txns.filter((t) => t.type === 'expense' && monthKeyOf(t.date) === monthKey);
  const spendByCat = new Map<string, number>();
  for (const t of monthTxns) {
    spendByCat.set(t.categoryId, (spendByCat.get(t.categoryId) ?? 0) + Math.abs(t.amount));
  }
  return categories
    .filter((c) => c.type === 'expense' && c.monthlyBudget && c.monthlyBudget > 0)
    .map((c) => {
      const budget = c.monthlyBudget ?? 0;
      const actual = spendByCat.get(c.id) ?? 0;
      return {
        categoryId: c.id,
        name: c.name,
        color: c.color,
        icon: c.icon,
        budget,
        actual,
        remaining: budget - actual,
        pct: budget > 0 ? actual / budget : 0,
        over: actual > budget,
      };
    })
    .sort((a, b) => b.pct - a.pct);
}

export interface MerchantSpend {
  name: string;
  amount: number;
  count: number;
}

/** Normalize a raw description into a friendlier merchant label. */
export function normalizeMerchant(description: string): string {
  const cleaned = description
    .toLowerCase()
    .replace(/[#*]?\d{2,}/g, ' ') // strip long digit runs (card refs, store #s)
    .replace(/\b(pos|purchase|debit|payment|recurring|online|ach|web id|ref)\b/g, ' ')
    .replace(/[^a-z&\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = cleaned.split(' ').slice(0, 3).join(' ');
  return words.replace(/\b\w/g, (c) => c.toUpperCase()) || description;
}

/** Top expense merchants by total spend. */
export function topMerchants(txns: Transaction[], limit = 6): MerchantSpend[] {
  const sums = new Map<string, MerchantSpend>();
  for (const t of txns) {
    if (t.type !== 'expense') continue;
    const name = normalizeMerchant(t.description);
    const cur = sums.get(name) ?? { name, amount: 0, count: 0 };
    cur.amount += Math.abs(t.amount);
    cur.count += 1;
    sums.set(name, cur);
  }
  return [...sums.values()].sort((a, b) => b.amount - a.amount).slice(0, limit);
}

export interface SavingsPoint extends MonthlyPoint {
  cumulative: number;
  rate: number;
}

/** Per-month savings with a running cumulative total and savings rate. */
export function savingsSeries(monthly: MonthlyPoint[]): SavingsPoint[] {
  let running = 0;
  return monthly.map((m) => {
    running += m.net;
    return { ...m, cumulative: running, rate: m.income > 0 ? m.net / m.income : 0 };
  });
}
