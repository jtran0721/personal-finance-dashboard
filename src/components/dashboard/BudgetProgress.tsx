import { motion } from 'framer-motion';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import type { BudgetRow } from '@/lib/analytics';
import { formatAbs, formatPercent } from '@/lib/format';

interface Props {
  rows: BudgetRow[];
  limit?: number;
}

/** List of category budget bars; turns red when actual exceeds the budget. */
export function BudgetProgress({ rows, limit }: Props) {
  const shown = limit ? rows.slice(0, limit) : rows;
  if (shown.length === 0) {
    return <p className="muted py-6 text-center text-sm">No budgets set yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {shown.map((row) => {
        const width = Math.min(row.pct, 1) * 100;
        const barColor = row.over ? '#fa5252' : row.color;
        return (
          <div key={row.categoryId}>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <span
                  className="grid h-6 w-6 place-items-center rounded-lg"
                  style={{ backgroundColor: `${row.color}22`, color: row.color }}
                >
                  <CategoryIcon icon={row.icon} size={13} />
                </span>
                {row.name}
              </span>
              <span className="tabular-nums">
                <span className={row.over ? 'font-bold text-sunset' : 'font-semibold'}>
                  {formatAbs(row.actual)}
                </span>
                <span className="muted"> / {formatAbs(row.budget)}</span>
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ background: barColor }}
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[11px] font-medium">
              <span className={row.over ? 'text-sunset' : 'muted'}>
                {row.over ? `Over by ${formatAbs(-row.remaining)}` : `${formatAbs(row.remaining)} left`}
              </span>
              <span className="muted tabular-nums">{formatPercent(row.pct)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
