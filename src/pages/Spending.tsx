import { Store, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFiltered } from '@/hooks/useFiltered';
import { monthlyTrend, spendingByCategory, topMerchants } from '@/lib/analytics';
import { formatAbs, formatCurrency } from '@/lib/format';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { ComparisonBar } from '@/components/charts/ComparisonBar';
import { CategoryLegend } from '@/components/dashboard/CategoryLegend';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { EmptyState } from '@/components/ui/EmptyState';

function SectionCard({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card ${className ?? ''}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Spending() {
  const { filtered, byId, categories } = useFiltered();
  const [selected, setSelected] = useState<string | null>(null);

  const spending = useMemo(() => spendingByCategory(filtered, byId), [filtered, byId]);
  const monthly = useMemo(() => monthlyTrend(filtered), [filtered]);
  const merchants = useMemo(() => topMerchants(filtered, 8), [filtered]);
  const totalSpent = spending.reduce((s, c) => s + c.amount, 0);
  const maxMerchant = merchants[0]?.amount ?? 1;

  const drillRows = useMemo(
    () => (selected ? filtered.filter((t) => t.categoryId === selected) : []),
    [filtered, selected],
  );

  if (spending.length === 0) {
    return <EmptyState icon={Store} title="No spending to analyze" description="There are no expenses in the selected period. Try a wider date range." />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="Category Breakdown" className="lg:col-span-2">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-52 w-52 shrink-0">
              <CategoryDonut
                data={spending}
                onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
                center={
                  <>
                    <span className="muted text-xs font-semibold uppercase">Total</span>
                    <span className="font-display text-xl font-extrabold">{formatCurrency(totalSpent, { compact: true })}</span>
                  </>
                }
              />
            </div>
            <div className="max-h-52 w-full overflow-y-auto pr-1">
              <CategoryLegend data={spending} onSelect={(id) => setSelected((cur) => (cur === id ? null : id))} activeId={selected ?? undefined} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Top Merchants">
          <ul className="flex flex-col gap-3">
            {merchants.map((m, i) => (
              <li key={m.name}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="muted w-4 text-xs font-bold tabular-nums">{i + 1}</span>
                    <span className="truncate font-medium">{m.name}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatAbs(m.amount)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                  <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${(m.amount / maxMerchant) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Income vs. Expenses by Month">
        <div className="h-64">
          <ComparisonBar data={monthly} />
        </div>
      </SectionCard>

      {selected && (
        <SectionCard
          title="Category Detail"
          action={<button onClick={() => setSelected(null)} className="btn-ghost !py-1.5 !text-xs"><X size={14} /> Close</button>}
        >
          <div className="mb-3 flex items-center gap-2">
            <CategoryChip category={byId[selected]} />
            <span className="muted text-sm">· {drillRows.length} transactions · {formatAbs(drillRows.reduce((s, t) => s + Math.abs(t.amount), 0))}</span>
          </div>
          <TransactionTable transactions={drillRows} categories={categories} byId={byId} />
        </SectionCard>
      )}
    </div>
  );
}
