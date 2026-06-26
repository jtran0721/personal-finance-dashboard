import { format } from 'date-fns';
import { ArrowRight, CreditCard, LineChart, PiggyBank, Sparkles, Upload, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useFiltered } from '@/hooks/useFiltered';
import { useImport } from '@/hooks/useImport';
import {
  budgetVsActual,
  computeTotals,
  monthlyTrend,
  spendingByCategory,
} from '@/lib/analytics';
import { formatAbs, formatCurrency, formatDate, formatPercent } from '@/lib/format';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { CategoryLegend } from '@/components/dashboard/CategoryLegend';
import { BudgetProgress } from '@/components/dashboard/BudgetProgress';
import { TrendArea } from '@/components/charts/TrendArea';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
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

export function Overview() {
  const { filtered, byId, transactions, categories } = useFiltered();
  const loadSampleData = useStore((s) => s.loadSampleData);
  const { open: openImport } = useImport();

  const totals = computeTotals(filtered);
  const monthly = monthlyTrend(filtered);
  const spending = spendingByCategory(filtered, byId);
  const budgetRows = budgetVsActual(transactions, categories, format(new Date(), 'yyyy-MM'));
  const recent = [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 7);

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Welcome to FinTrack"
        description="Import a bank statement to get started, or load sample data to explore the dashboard right away."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={loadSampleData} className="btn-primary"><Sparkles size={16} /> Load sample data</button>
            <button onClick={openImport} className="btn-outline"><Upload size={16} /> Import statement</button>
          </div>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard index={0} label="Income" value={totals.income} format={(n) => formatCurrency(n)} icon={Wallet} color="#20c997" spark={monthly.map((m) => m.income)} />
        <KpiCard index={1} label="Expenses" value={totals.expenses} format={(n) => formatCurrency(n)} icon={CreditCard} color="#ff6b6b" spark={monthly.map((m) => m.expenses)} />
        <KpiCard
          index={2}
          label="Net Savings"
          value={totals.netSavings}
          format={(n) => formatCurrency(n)}
          icon={PiggyBank}
          color="#7c3aed"
          spark={monthly.map((m) => m.net)}
          sub={
            <span className={totals.savingsRate >= 0 ? 'chip bg-emerald/15 text-emerald' : 'chip bg-sunset/15 text-sunset'}>
              {formatPercent(totals.savingsRate)} saved
            </span>
          }
        />
        <KpiCard index={3} label="Invested" value={totals.invested} format={(n) => formatCurrency(n)} icon={LineChart} color="#4dabf7" spark={monthly.map((m) => m.invested)} />
      </div>

      {/* Trend + donut */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="Income vs. Expenses" className="lg:col-span-2">
          <div className="h-72">
            <TrendArea data={monthly} />
          </div>
        </SectionCard>

        <SectionCard title="Spending by Category" action={<Link to="/spending" className="muted inline-flex items-center gap-1 text-xs font-semibold hover:text-brand-500">Details <ArrowRight size={13} /></Link>}>
          <div className="mx-auto h-44 max-w-[240px]">
            <CategoryDonut
              data={spending}
              center={
                <>
                  <span className="muted text-xs font-semibold uppercase">Spent</span>
                  <span className="font-display text-xl font-extrabold">{formatCurrency(totals.expenses, { compact: true })}</span>
                </>
              }
            />
          </div>
          <div className="mt-3">
            <CategoryLegend data={spending} limit={5} />
          </div>
        </SectionCard>
      </div>

      {/* Recent + budget */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard
          title="Recent Transactions"
          className="lg:col-span-2"
          action={<Link to="/transactions" className="muted inline-flex items-center gap-1 text-xs font-semibold hover:text-brand-500">View all <ArrowRight size={13} /></Link>}
        >
          <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
            {recent.map((t) => {
              const cat = byId[t.categoryId];
              return (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${cat?.color ?? '#adb5bd'}22`, color: cat?.color ?? '#adb5bd' }}>
                    <CategoryIcon icon={cat?.icon ?? 'help-circle'} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{t.description}</p>
                    <p className="muted text-xs">{formatDate(t.date)} · {cat?.name ?? 'Uncategorized'}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-bold tabular-nums ${t.amount >= 0 ? 'text-emerald' : ''}`}>
                    {t.amount >= 0 ? '+' : '−'}{formatAbs(t.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        </SectionCard>

        <SectionCard title="This Month's Budget" action={<Link to="/budget" className="muted inline-flex items-center gap-1 text-xs font-semibold hover:text-brand-500">Manage <ArrowRight size={13} /></Link>}>
          <BudgetProgress rows={budgetRows} limit={5} />
        </SectionCard>
      </div>
    </div>
  );
}
