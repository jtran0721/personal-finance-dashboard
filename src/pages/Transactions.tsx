import { Plus, Receipt, SearchX, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { useFiltered } from '@/hooks/useFiltered';
import { useImport } from '@/hooks/useImport';
import { Filters } from '@/components/transactions/Filters';
import { EMPTY_FILTER, type TxFilter } from '@/components/transactions/filter';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { EmptyState } from '@/components/ui/EmptyState';

export function Transactions() {
  const { filtered, categories, byId, transactions } = useFiltered();
  const loadSampleData = useStore((s) => s.loadSampleData);
  const { open: openImport } = useImport();
  const [filter, setFilter] = useState<TxFilter>(EMPTY_FILTER);

  const accounts = useMemo(
    () => [...new Set(filtered.map((t) => t.account).filter((a): a is string => Boolean(a)))],
    [filtered],
  );

  const rows = useMemo(() => {
    const q = filter.search.trim().toLowerCase();
    return filtered.filter((t) => {
      if (filter.type !== 'all' && t.type !== filter.type) return false;
      if (filter.categoryId !== 'all' && t.categoryId !== filter.categoryId) return false;
      if (filter.account !== 'all' && t.account !== filter.account) return false;
      if (q && !t.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [filtered, filter]);

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No transactions yet"
        description="Import a bank statement or load sample data to populate your transactions."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={loadSampleData} className="btn-primary"><Sparkles size={16} /> Load sample data</button>
            <button onClick={openImport} className="btn-outline"><Plus size={16} /> Import / add</button>
          </div>
        }
      />
    );
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Filters value={filter} onChange={setFilter} categories={categories} accounts={accounts} resultCount={rows.length} />
        <button onClick={openImport} className="btn-primary shrink-0"><Plus size={16} /> Add</button>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <SearchX className="muted" size={28} />
          <p className="font-semibold">No matching transactions</p>
          <p className="muted text-sm">Try widening the date range or clearing filters.</p>
        </div>
      ) : (
        <TransactionTable transactions={rows} categories={categories} byId={byId} />
      )}
    </div>
  );
}
