import { ArrowDown, ArrowUp, ArrowUpDown, Check, Pencil, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import clsx from 'clsx';
import type { Category, Transaction } from '@/types';
import { useStore } from '@/store/useStore';
import { formatCurrency, formatDate } from '@/lib/format';

type SortKey = 'date' | 'description' | 'amount';

interface Props {
  transactions: Transaction[];
  categories: Category[];
  byId: Record<string, Category>;
}

const PAGE = 60;

export function TransactionTable({ transactions, categories, byId }: Props) {
  const setTransactionCategory = useStore((s) => s.setTransactionCategory);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const recategorize = useStore((s) => s.recategorize);

  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ date: string; description: string; amount: string }>({ date: '', description: '', amount: '' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visible, setVisible] = useState(PAGE);

  const sorted = useMemo(() => {
    const arr = [...transactions];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      else if (sortKey === 'amount') cmp = a.amount - b.amount;
      else cmp = a.description.localeCompare(b.description);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [transactions, sortKey, sortDir]);

  const rows = sorted.slice(0, visible);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'description' ? 'asc' : 'desc');
    }
  };

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    setDraft({ date: t.date, description: t.description, amount: String(t.amount) });
  };
  const saveEdit = (id: string) => {
    const amount = Number(draft.amount);
    updateTransaction(id, {
      date: draft.date,
      description: draft.description.trim() || '(no description)',
      amount: Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0,
    });
    setEditingId(null);
  };

  const toggleSelect = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const allVisibleSelected = rows.length > 0 && rows.every((t) => selected.has(t.id));
  const toggleSelectAll = () =>
    setSelected(allVisibleSelected ? new Set() : new Set(rows.map((t) => t.id)));

  const applyBulk = (categoryId: string) => {
    if (!categoryId) return;
    recategorize([...selected], categoryId);
    setSelected(new Set());
  };

  const SortIcon = ({ active }: { active: SortKey }) =>
    sortKey !== active ? (
      <ArrowUpDown size={13} className="opacity-40" />
    ) : sortDir === 'asc' ? (
      <ArrowUp size={13} />
    ) : (
      <ArrowDown size={13} />
    );

  return (
    <div>
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl bg-brand-500/10 px-4 py-2.5 text-sm">
          <span className="font-semibold text-brand-700 dark:text-brand-300">{selected.size} selected</span>
          <select
            className="input !w-auto py-1.5"
            defaultValue=""
            onChange={(e) => applyBulk(e.target.value)}
          >
            <option value="" disabled>Set category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button onClick={() => setSelected(new Set())} className="btn-ghost !py-1.5 !text-xs">Clear</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-white/10">
              <th className="w-9 py-2.5 pl-1">
                <input type="checkbox" className="accent-brand-600" checked={allVisibleSelected} onChange={toggleSelectAll} aria-label="Select all" />
              </th>
              <th className="cursor-pointer py-2.5 pr-3" onClick={() => toggleSort('date')}>
                <span className="inline-flex items-center gap-1">Date <SortIcon active="date" /></span>
              </th>
              <th className="cursor-pointer py-2.5 pr-3" onClick={() => toggleSort('description')}>
                <span className="inline-flex items-center gap-1">Description <SortIcon active="description" /></span>
              </th>
              <th className="py-2.5 pr-3">Category</th>
              <th className="cursor-pointer py-2.5 pr-3 text-right" onClick={() => toggleSort('amount')}>
                <span className="inline-flex items-center gap-1">Amount <SortIcon active="amount" /></span>
              </th>
              <th className="py-2.5 pr-1 text-right">Edit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const cat = byId[t.categoryId];
              const editing = editingId === t.id;
              return (
                <tr key={t.id} className="group border-b border-black/5 transition-colors hover:bg-black/[0.02] dark:border-white/5 dark:hover:bg-white/[0.03]">
                  <td className="py-2.5 pl-1">
                    <input type="checkbox" className="accent-brand-600" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} aria-label="Select row" />
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums">
                    {editing ? (
                      <input type="date" className="input py-1" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
                    ) : (
                      formatDate(t.date, 'MMM d')
                    )}
                  </td>
                  <td className="max-w-[260px] py-2.5 pr-3">
                    {editing ? (
                      <input className="input py-1" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
                    ) : (
                      <span className="block truncate font-medium" title={t.description}>{t.description}</span>
                    )}
                    {t.account && !editing && <span className="muted block truncate text-xs">{t.account}</span>}
                  </td>
                  <td className="py-2.5 pr-3">
                    <select
                      className="input !w-auto max-w-[170px] py-1.5 text-xs font-semibold"
                      style={cat ? { color: cat.color } : undefined}
                      value={t.categoryId}
                      onChange={(e) => setTransactionCategory(t.id, e.target.value)}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id} className="text-ink dark:text-slate-100">{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-right">
                    {editing ? (
                      <input type="number" step="0.01" className="input w-28 py-1 text-right" value={draft.amount} onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))} />
                    ) : (
                      <span className={clsx('font-bold tabular-nums', t.amount >= 0 ? 'text-emerald' : 'text-ink dark:text-slate-100')}>
                        {formatCurrency(t.amount, { sign: true })}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-1">
                    <div className="flex items-center justify-end gap-1">
                      {editing ? (
                        <>
                          <button onClick={() => saveEdit(t.id)} className="rounded-lg p-1.5 text-emerald hover:bg-emerald/10" aria-label="Save"><Check size={15} /></button>
                          <button onClick={() => setEditingId(null)} className="rounded-lg p-1.5 muted hover:bg-black/5 dark:hover:bg-white/10" aria-label="Cancel"><X size={15} /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(t)} className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-black/5 hover:text-ink group-hover:opacity-100 dark:hover:bg-white/10 dark:hover:text-white" aria-label="Edit"><Pencil size={15} /></button>
                          <button onClick={() => deleteTransaction(t.id)} className="rounded-lg p-1.5 text-slate-400 opacity-0 transition hover:bg-sunset/10 hover:text-sunset group-hover:opacity-100" aria-label="Delete"><Trash2 size={15} /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {visible < sorted.length && (
        <div className="mt-4 text-center">
          <button onClick={() => setVisible((v) => v + PAGE)} className="btn-ghost">
            Show more ({sorted.length - visible} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
