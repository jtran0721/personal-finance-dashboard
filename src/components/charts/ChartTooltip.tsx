import type { TooltipProps } from 'recharts';
import { formatCurrency } from '@/lib/format';

/** Themed tooltip shared by the cartesian charts (trend, bars). */
export function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-tight min-w-[160px] !p-3 text-sm shadow-glow">
      {label && <p className="mb-1.5 font-display font-bold">{label}</p>}
      <div className="flex flex-col gap-1">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
              <span className="muted capitalize">{entry.name}</span>
            </span>
            <span className="font-semibold tabular-nums">{formatCurrency(Number(entry.value))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
