import { Percent, PiggyBank, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFiltered } from '@/hooks/useFiltered';
import { computeTotals, investmentAllocation, monthlyTrend, savingsSeries } from '@/lib/analytics';
import { formatCompact, formatCurrency, formatPercent } from '@/lib/format';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { CategoryDonut } from '@/components/charts/CategoryDonut';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { EmptyState } from '@/components/ui/EmptyState';

function SectionCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card ${className ?? ''}`}>
      <h2 className="mb-4 font-display text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function RateTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-tight !p-3 text-sm shadow-glow">
      <p className="font-display font-bold">{label}</p>
      <p className="tabular-nums">{formatPercent(payload[0].value)} saved</p>
    </div>
  );
}

export function Savings() {
  const { filtered, byId } = useFiltered();

  const monthly = useMemo(() => monthlyTrend(filtered), [filtered]);
  const series = useMemo(() => savingsSeries(monthly), [monthly]);
  const invest = useMemo(() => investmentAllocation(filtered, byId), [filtered, byId]);
  const totals = computeTotals(filtered);
  const avgRate = series.length ? series.reduce((s, m) => s + m.rate, 0) / series.length : 0;
  const totalInvested = invest.reduce((s, c) => s + c.amount, 0);

  if (filtered.length === 0) {
    return <EmptyState icon={PiggyBank} title="Nothing to show yet" description="Once you have transactions in this period, your savings and investment trends appear here." />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard index={0} label="Net Saved" value={totals.netSavings} format={(n) => formatCurrency(n)} icon={PiggyBank} color="#7c3aed" spark={series.map((m) => m.cumulative)} />
        <KpiCard index={1} label="Avg Savings Rate" value={avgRate} format={(n) => formatPercent(n)} icon={Percent} color="#20c997" spark={series.map((m) => m.rate)} />
        <KpiCard index={2} label="Total Invested" value={totals.invested} format={(n) => formatCurrency(n)} icon={TrendingUp} color="#4dabf7" spark={monthly.map((m) => m.invested)} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="Cumulative Savings" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 8, bottom: 0, left: -12 }}>
                <defs>
                  <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="currentColor" className="text-black/5 dark:text-white/5" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} dy={6} />
                <YAxis tickFormatter={(v) => formatCompact(Number(v))} tickLine={false} axisLine={false} width={56} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#7c3aed', strokeOpacity: 0.2, strokeWidth: 28 }} />
                <Area type="monotone" dataKey="cumulative" name="Cumulative saved" stroke="#7c3aed" strokeWidth={2.5} fill="url(#savingsFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Monthly Savings Rate">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 10, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="currentColor" className="text-black/5 dark:text-white/5" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} dy={6} />
                <YAxis tickFormatter={(v) => formatPercent(Number(v))} tickLine={false} axisLine={false} width={44} />
                <Tooltip content={<RateTooltip />} cursor={{ fill: '#7c3aed', fillOpacity: 0.06 }} />
                <Bar dataKey="rate" name="Savings rate" fill="#20c997" radius={[6, 6, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SectionCard title="Investment Allocation">
          {invest.length === 0 ? (
            <p className="muted py-6 text-center text-sm">No investment transactions in this period.</p>
          ) : (
            <div className="mx-auto h-48 max-w-[220px]">
              <CategoryDonut
                data={invest}
                center={
                  <>
                    <span className="muted text-xs font-semibold uppercase">Invested</span>
                    <span className="font-display text-xl font-extrabold">{formatCurrency(totalInvested, { compact: true })}</span>
                  </>
                }
              />
            </div>
          )}
        </SectionCard>

        <SectionCard title="Holdings" className="lg:col-span-2">
          {invest.length === 0 ? (
            <p className="muted py-6 text-center text-sm">Record contributions to brokerage, retirement or crypto to see them here.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {invest.map((h) => (
                <li key={h.categoryId} className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${h.color}22`, color: h.color }}>
                    <CategoryIcon icon={byId[h.categoryId]?.icon ?? 'line-chart'} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="font-semibold">{h.name}</span>
                      <span className="font-bold tabular-nums">{formatCurrency(h.amount)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${h.pct * 100}%`, background: h.color }} />
                    </div>
                  </div>
                  <span className="muted w-12 shrink-0 text-right text-xs font-semibold tabular-nums">{formatPercent(h.pct)}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
