import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlyPoint } from '@/lib/analytics';
import { formatCompact } from '@/lib/format';
import { ChartTooltip } from './ChartTooltip';

/** Income vs. expenses area chart with an investments line, over months. */
export function TrendArea({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#20c997" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#20c997" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6b6b" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#ff6b6b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="currentColor" className="text-black/5 dark:text-white/5" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} dy={6} />
        <YAxis tickFormatter={(v) => formatCompact(Number(v))} tickLine={false} axisLine={false} width={56} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#7c3aed', strokeOpacity: 0.2, strokeWidth: 28 }} />
        <Area type="monotone" dataKey="income" name="Income" stroke="#12b886" strokeWidth={2.5} fill="url(#incomeFill)" />
        <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#fa5252" strokeWidth={2.5} fill="url(#expenseFill)" />
        <Line type="monotone" dataKey="invested" name="Invested" stroke="#7c3aed" strokeWidth={2.5} dot={false} strokeDasharray="5 4" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
