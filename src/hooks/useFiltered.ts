import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { filterByRange } from '@/lib/analytics';
import { indexCategories } from '@/lib/categories';

/**
 * Shared selector: transactions filtered by the global date range, plus a
 * category lookup. Memoized so pages don't recompute on unrelated state changes.
 */
export function useFiltered() {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const range = useStore((s) => s.dateRange);

  const filtered = useMemo(
    () => filterByRange(transactions, range.start, range.end),
    [transactions, range.start, range.end],
  );
  const byId = useMemo(() => indexCategories(categories), [categories]);

  return { transactions, filtered, categories, byId, range };
}
