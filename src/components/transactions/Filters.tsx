import { Search, X } from 'lucide-react';
import type { Category } from '@/types';
import { EMPTY_FILTER, type TxFilter } from './filter';

interface Props {
  value: TxFilter;
  onChange: (next: TxFilter) => void;
  categories: Category[];
  accounts: string[];
  resultCount: number;
}

const TYPES: { value: TxFilter['type']; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expenses' },
  { value: 'investment', label: 'Investments' },
  { value: 'transfer', label: 'Transfers' },
];

export function Filters({ value, onChange, categories, accounts, resultCount }: Props) {
  const isActive =
    value.search !== '' || value.type !== 'all' || value.categoryId !== 'all' || value.account !== 'all';
  const set = (patch: Partial<TxFilter>) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[180px] flex-1">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input py-2 pl-9"
          placeholder="Search description…"
          value={value.search}
          onChange={(e) => set({ search: e.target.value })}
        />
      </div>

      <select className="input !w-auto cursor-pointer py-2" value={value.type} onChange={(e) => set({ type: e.target.value as TxFilter['type'] })}>
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <select className="input !w-auto cursor-pointer py-2" value={value.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
        <option value="all">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {accounts.length > 1 && (
        <select className="input !w-auto cursor-pointer py-2" value={value.account} onChange={(e) => set({ account: e.target.value })}>
          <option value="all">All accounts</option>
          {accounts.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      )}

      <span className="muted ml-auto whitespace-nowrap text-sm font-medium tabular-nums">
        {resultCount} {resultCount === 1 ? 'result' : 'results'}
      </span>

      {isActive && (
        <button onClick={() => onChange(EMPTY_FILTER)} className="btn-ghost !py-2 !text-xs">
          <X size={14} /> Clear
        </button>
      )}
    </div>
  );
}
