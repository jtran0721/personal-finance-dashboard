import { CalendarRange } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { DateRangePreset } from '@/types';

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'thisMonth', label: 'This month' },
  { value: 'last3', label: 'Last 3 months' },
  { value: 'last6', label: 'Last 6 months' },
  { value: 'last12', label: 'Last 12 months' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom…' },
];

/** Global date-range selector that drives every chart and KPI. */
export function DateRangePicker() {
  const range = useStore((s) => s.dateRange);
  const setDateRange = useStore((s) => s.setDateRange);
  const setCustomRange = useStore((s) => s.setCustomRange);

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <CalendarRange
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-500"
        />
        <select
          aria-label="Date range"
          className="input !w-auto cursor-pointer appearance-none py-2 pl-9 pr-8 font-semibold"
          value={range.preset}
          onChange={(e) => setDateRange(e.target.value as DateRangePreset)}
        >
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {range.preset === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="Start date"
            className="input !w-auto py-2"
            value={range.start}
            max={range.end}
            onChange={(e) => setCustomRange(e.target.value, range.end)}
          />
          <span className="muted text-sm">→</span>
          <input
            type="date"
            aria-label="End date"
            className="input !w-auto py-2"
            value={range.end}
            min={range.start}
            onChange={(e) => setCustomRange(range.start, e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
