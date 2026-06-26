import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { ReactNode } from 'react';
import type { CategorySlice } from '@/lib/analytics';
import { formatCurrency, formatPercent } from '@/lib/format';

function DonutTooltip({ active, payload }: { active?: boolean; payload?: { payload: CategorySlice }[] }) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload;
  return (
    <div className="card-tight !p-3 text-sm shadow-glow">
      <p className="flex items-center gap-1.5 font-semibold">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: slice.color }} />
        {slice.name}
      </p>
      <p className="mt-1 tabular-nums">
        <span className="font-bold">{formatCurrency(slice.amount)}</span>
        <span className="muted"> · {formatPercent(slice.pct)}</span>
      </p>
    </div>
  );
}

interface Props {
  data: CategorySlice[];
  center?: ReactNode;
  onSelect?: (categoryId: string) => void;
}

/** Donut chart of category slices with an optional centered overlay. */
export function CategoryDonut({ data, center, onSelect }: Props) {
  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<DonutTooltip />} />
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            innerRadius="62%"
            outerRadius="92%"
            paddingAngle={2}
            stroke="none"
            cornerRadius={6}
            onClick={onSelect ? (_, i) => onSelect(data[i].categoryId) : undefined}
          >
            {data.map((slice) => (
              <Cell
                key={slice.categoryId}
                fill={slice.color}
                className={onSelect ? 'cursor-pointer outline-none transition-opacity hover:opacity-80' : 'outline-none'}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {center && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {center}
        </div>
      )}
    </div>
  );
}
