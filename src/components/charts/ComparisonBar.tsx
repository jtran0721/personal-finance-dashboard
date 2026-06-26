import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonthlyPoint } from '@/lib/analytics';
import { formatCompact } from '@/lib/format';
import { ChartTooltip } from './ChartTooltip';

/** Grouped income vs. expenses bars per month. */
export function ComparisonBar({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -12 }} barGap={2}>
        <CartesianGrid strokeDasharray="4 4" stroke="currentColor" className="text-black/5 dark:text-white/5" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} dy={6} />
        <YAxis tickFormatter={(v) => formatCompact(Number(v))} tickLine={false} axisLine={false} width={56} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#7c3aed', fillOpacity: 0.06 }} />
        <Bar dataKey="income" name="Income" fill="#20c997" radius={[6, 6, 0, 0]} maxBarSize={26} />
        <Bar dataKey="expenses" name="Expenses" fill="#ff6b6b" radius={[6, 6, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}
