import { AlertTriangle, Target, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useStore } from '@/store/useStore';
import { useFiltered } from '@/hooks/useFiltered';
import { budgetVsActual, monthKeyOf } from '@/lib/analytics';
import { formatAbs, formatCurrency, formatMonthKey, formatPercent } from '@/lib/format';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { EmptyState } from '@/components/ui/EmptyState';

/** Expense categories considered "needs" for the 50/30/20 rule. */
const NEEDS = new Set(['groceries', 'housing', 'utilities', 'transport', 'health', 'fees']);

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

export function Budget() {
  const transactions = useStore((s) => s.transactions);
  const setBudget = useStore((s) => s.setBudget);
  const { categories } = useFiltered();

  const months = useMemo(() => {
    const keys = [...new Set(transactions.map((t) => monthKeyOf(t.date)))].sort((a, b) => (a < b ? 1 : -1));
    return keys;
  }, [transactions]);
  const currentKey = format(new Date(), 'yyyy-MM');
  const [monthKey, setMonthKey] = useState(months.includes(currentKey) ? currentKey : months[0] ?? currentKey);

  const expenseCats = useMemo(() => categories.filter((c) => c.type === 'expense'), [categories]);
  const budgetRows = useMemo(() => budgetVsActual(transactions, categories, monthKey), [transactions, categories, monthKey]);

  // Per-category actuals for the selected month (covers categories without a budget too).
  const actualByCat = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.type === 'expense' && monthKeyOf(t.date) === monthKey) {
        map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + Math.abs(t.amount));
      }
    }
    return map;
  }, [transactions, monthKey]);

  const totals = useMemo(() => {
    const budget = expenseCats.reduce((s, c) => s + (c.monthlyBudget ?? 0), 0);
    const spent = [...actualByCat.values()].reduce((s, v) => s + v, 0);
    return { budget, spent, remaining: budget - spent };
  }, [expenseCats, actualByCat]);

  const allocation = useMemo(() => {
    const monthTxns = transactions.filter((t) => monthKeyOf(t.date) === monthKey);
    const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    let needs = 0;
    let wants = 0;
    for (const t of monthTxns) {
      if (t.type !== 'expense') continue;
      if (NEEDS.has(t.categoryId)) needs += Math.abs(t.amount);
      else wants += Math.abs(t.amount);
    }
    const savings = Math.max(income - needs - wants, 0);
    return { income, needs, wants, savings };
  }, [transactions, monthKey]);

  const overCount = budgetRows.filter((r) => r.over).length;

  if (transactions.length === 0) {
    return <EmptyState icon={Target} title="No data to budget against" description="Load sample data or import a statement, then set monthly limits per category." />;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header summary */}
      <div className="card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="label !mb-0">Month</span>
          <select className="input !w-auto cursor-pointer py-2 font-semibold" value={monthKey} onChange={(e) => setMonthKey(e.target.value)}>
            {months.map((m) => (
              <option key={m} value={m}>{formatMonthKey(m)}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <div><span className="muted">Budgeted </span><span className="font-bold tabular-nums">{formatCurrency(totals.budget)}</span></div>
          <div><span className="muted">Spent </span><span className="font-bold tabular-nums">{formatCurrency(totals.spent)}</span></div>
          <div>
            <span className="muted">Remaining </span>
            <span className={`font-bold tabular-nums ${totals.remaining < 0 ? 'text-sunset' : 'text-emerald'}`}>{formatCurrency(totals.remaining)}</span>
          </div>
        </div>
      </div>

      {overCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-sm font-medium text-sunset">
          <AlertTriangle size={18} />
          {overCount} {overCount === 1 ? 'category is' : 'categories are'} over budget this month.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Editable category budgets */}
        <SectionCard title="Category Budgets" className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            {expenseCats.map((c) => {
              const actual = actualByCat.get(c.id) ?? 0;
              const budget = c.monthlyBudget ?? 0;
              const pct = budget > 0 ? actual / budget : 0;
              const over = budget > 0 && actual > budget;
              return (
                <div key={c.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex w-44 shrink-0 items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ backgroundColor: `${c.color}22`, color: c.color }}>
                      <CategoryIcon icon={c.icon} size={14} />
                    </span>
                    <span className="text-sm font-semibold">{c.name}</span>
                  </div>

                  <div className="flex-1">
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 1) * 100}%`, background: over ? '#fa5252' : c.color }} />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] font-medium">
                      <span className={over ? 'text-sunset' : 'muted'}>{formatAbs(actual)} spent</span>
                      {budget > 0 && <span className="muted tabular-nums">{formatPercent(pct)}</span>}
                    </div>
                  </div>

                  <div className="relative w-32 shrink-0">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                    <input
                      type="number"
                      min={0}
                      step={10}
                      className="input py-2 pl-7 text-right tabular-nums"
                      placeholder="0"
                      value={c.monthlyBudget ?? ''}
                      onChange={(e) => setBudget(c.id, Number(e.target.value))}
                      aria-label={`${c.name} monthly budget`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* 50/30/20 allocation */}
        <SectionCard title="50 / 30 / 20 Allocation">
          {allocation.income <= 0 ? (
            <p className="muted py-6 text-center text-sm">No income recorded this month to allocate.</p>
          ) : (
            <div className="flex flex-col gap-5">
              <p className="muted text-xs">Based on {formatCurrency(allocation.income)} income this month.</p>
              {[
                { label: 'Needs', actual: allocation.needs, target: 0.5, color: '#4dabf7', icon: Wallet },
                { label: 'Wants', actual: allocation.wants, target: 0.3, color: '#ff922b', icon: Target },
                { label: 'Savings', actual: allocation.savings, target: 0.2, color: '#20c997', icon: Target },
              ].map((seg) => {
                const actualPct = allocation.income > 0 ? seg.actual / allocation.income : 0;
                return (
                  <div key={seg.label}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-semibold">{seg.label}</span>
                      <span className="tabular-nums">
                        <span className="font-bold" style={{ color: seg.color }}>{formatPercent(actualPct)}</span>
                        <span className="muted"> / {formatPercent(seg.target)} target</span>
                      </span>
                    </div>
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(actualPct, 1) * 100}%`, background: seg.color }} />
                      <div className="absolute top-0 h-full border-r-2 border-dashed border-ink/40 dark:border-white/50" style={{ left: `${seg.target * 100}%` }} />
                    </div>
                    <p className="muted mt-1 text-[11px] tabular-nums">{formatCurrency(seg.actual)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
