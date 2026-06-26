import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, startOfMonth, startOfYear, subMonths } from 'date-fns';
import type { Category, DateRange, DateRangePreset, ThemeMode, Transaction, TxType } from '@/types';
import { DEFAULT_CATEGORIES } from '@/lib/categories';
import { generateSampleTransactions } from '@/lib/sampleData';

const isoOf = (d: Date) => format(d, 'yyyy-MM-dd');

/** Compute a concrete start/end window for a preset relative to today. */
export function makeRange(preset: DateRangePreset): DateRange {
  const today = new Date();
  const end = isoOf(today);
  switch (preset) {
    case 'thisMonth':
      return { preset, start: isoOf(startOfMonth(today)), end };
    case 'last3':
      return { preset, start: isoOf(startOfMonth(subMonths(today, 2))), end };
    case 'last6':
      return { preset, start: isoOf(startOfMonth(subMonths(today, 5))), end };
    case 'last12':
      return { preset, start: isoOf(startOfMonth(subMonths(today, 11))), end };
    case 'ytd':
      return { preset, start: isoOf(startOfYear(today)), end };
    case 'all':
      return { preset, start: '1970-01-01', end: '2999-12-31' };
    default:
      return { preset: 'custom', start: isoOf(startOfMonth(subMonths(today, 5))), end };
  }
}

/** Force an amount's sign to match its transaction type. */
function signForType(type: TxType, amount: number): number {
  const mag = Math.abs(amount);
  return type === 'income' ? mag : -mag;
}

const dedupeKey = (t: Pick<Transaction, 'date' | 'amount' | 'description'>) =>
  `${t.date}|${t.amount.toFixed(2)}|${t.description.toLowerCase().replace(/\s+/g, ' ').trim()}`;

interface StoreState {
  transactions: Transaction[];
  categories: Category[];
  theme: ThemeMode;
  dateRange: DateRange;
  /** True once data has been seeded or the user has taken over — prevents auto re-seeding. */
  seeded: boolean;

  // ── Transactions ──
  /** Merge new transactions, skipping duplicates. Returns counts. */
  addTransactions: (txns: Transaction[]) => { added: number; skipped: number };
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  setTransactionCategory: (id: string, categoryId: string) => void;
  recategorize: (ids: string[], categoryId: string) => void;
  deleteTransaction: (id: string) => void;

  // ── Categories / budget ──
  setBudget: (categoryId: string, monthlyBudget: number) => void;

  // ── UI ──
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setDateRange: (preset: DateRangePreset) => void;
  setCustomRange: (start: string, end: string) => void;

  // ── Data lifecycle ──
  loadSampleData: () => void;
  clearAllData: () => void;
  ensureSeeded: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      transactions: [],
      categories: DEFAULT_CATEGORIES,
      theme: 'dark',
      dateRange: makeRange('last6'),
      seeded: false,

      addTransactions: (txns) => {
        const existing = new Set(get().transactions.map(dedupeKey));
        const fresh: Transaction[] = [];
        for (const t of txns) {
          const key = dedupeKey(t);
          if (existing.has(key)) continue;
          existing.add(key);
          fresh.push(t);
        }
        if (fresh.length > 0) {
          set((s) => ({
            transactions: [...fresh, ...s.transactions].sort((a, b) => (a.date < b.date ? 1 : -1)),
            seeded: true,
          }));
        }
        return { added: fresh.length, skipped: txns.length - fresh.length };
      },

      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),

      setTransactionCategory: (id, categoryId) => {
        const cat = get().categories.find((c) => c.id === categoryId);
        if (!cat) return;
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id
              ? { ...t, categoryId, type: cat.type, amount: signForType(cat.type, t.amount) }
              : t,
          ),
        }));
      },

      recategorize: (ids, categoryId) => {
        const cat = get().categories.find((c) => c.id === categoryId);
        if (!cat) return;
        const idSet = new Set(ids);
        set((s) => ({
          transactions: s.transactions.map((t) =>
            idSet.has(t.id)
              ? { ...t, categoryId, type: cat.type, amount: signForType(cat.type, t.amount) }
              : t,
          ),
        }));
      },

      deleteTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      setBudget: (categoryId, monthlyBudget) =>
        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === categoryId ? { ...c, monthlyBudget: monthlyBudget > 0 ? monthlyBudget : undefined } : c,
          ),
        })),

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      setDateRange: (preset) => set({ dateRange: makeRange(preset) }),
      setCustomRange: (start, end) => set({ dateRange: { preset: 'custom', start, end } }),

      loadSampleData: () =>
        set({ transactions: generateSampleTransactions(), seeded: true, dateRange: makeRange('last6') }),

      clearAllData: () => set({ transactions: [], seeded: true }),

      ensureSeeded: () => {
        const s = get();
        if (!s.seeded && s.transactions.length === 0) {
          set({ transactions: generateSampleTransactions(), seeded: true, dateRange: makeRange('last6') });
        } else if (s.dateRange.preset !== 'custom') {
          // Refresh relative windows in case the app was last opened a while ago.
          set({ dateRange: makeRange(s.dateRange.preset) });
        }
      },
    }),
    {
      name: 'fintrack-store',
      version: 3,
      // Bumping the version re-applies the seed categories (latest budget plan)
      // onto existing saved data, so budgets refresh while transactions are kept.
      migrate: (persisted) => {
        const prev = (persisted ?? {}) as Record<string, unknown>;
        return { ...prev, categories: DEFAULT_CATEGORIES } as unknown as StoreState;
      },
      partialize: (s) => ({
        transactions: s.transactions,
        categories: s.categories,
        theme: s.theme,
        dateRange: s.dateRange,
        seeded: s.seeded,
      }),
    },
  ),
);
