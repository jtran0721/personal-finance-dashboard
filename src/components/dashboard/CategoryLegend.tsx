import clsx from 'clsx';
import type { CategorySlice } from '@/lib/analytics';
import { formatCurrency, formatPercent } from '@/lib/format';

interface Props {
  data: CategorySlice[];
  limit?: number;
  onSelect?: (categoryId: string) => void;
  activeId?: string;
}

/** Compact legend / ranked list of category slices. */
export function CategoryLegend({ data, limit, onSelect, activeId }: Props) {
  const shown = limit ? data.slice(0, limit) : data;
  if (shown.length === 0) {
    return <p className="muted py-6 text-center text-sm">No spending in this period.</p>;
  }
  return (
    <ul className="flex flex-col gap-1">
      {shown.map((slice) => (
        <li key={slice.categoryId}>
          <button
            type="button"
            onClick={onSelect ? () => onSelect(slice.categoryId) : undefined}
            className={clsx(
              'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-colors',
              onSelect && 'hover:bg-black/5 dark:hover:bg-white/5',
              activeId === slice.categoryId && 'bg-black/5 dark:bg-white/10',
            )}
          >
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: slice.color }} />
            <span className="flex-1 truncate font-medium">{slice.name}</span>
            <span className="muted tabular-nums text-xs">{formatPercent(slice.pct)}</span>
            <span className="w-20 text-right font-semibold tabular-nums">{formatCurrency(slice.amount)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
