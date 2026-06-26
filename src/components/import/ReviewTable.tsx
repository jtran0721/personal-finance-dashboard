import type { Category, ParsedRow, TxType } from '@/types';

const reSign = (type: TxType, amount: number) => (type === 'income' ? Math.abs(amount) : -Math.abs(amount));

function ConfidenceDot({ value }: { value: number }) {
  const color = value >= 0.7 ? '#20c997' : value >= 0.4 ? '#fab005' : '#fa5252';
  const label = value >= 0.7 ? 'High confidence' : value >= 0.4 ? 'Medium confidence' : 'Low — please check';
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} title={label} />;
}

interface Props {
  rows: ParsedRow[];
  onChange: (rows: ParsedRow[]) => void;
  categories: Category[];
}

export function ReviewTable({ rows, onChange, categories }: Props) {
  const patch = (id: string, next: Partial<ParsedRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...next } : r)));

  const setCategory = (id: string, categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    patch(id, { categoryId, type: cat.type, amount: Number(reSign(cat.type, row.amount).toFixed(2)) });
  };

  const allOn = rows.length > 0 && rows.every((r) => r.include);
  const toggleAll = () => onChange(rows.map((r) => ({ ...r, include: !allOn })));
  const selectedCount = rows.filter((r) => r.include).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="muted">{selectedCount} of {rows.length} will be imported</span>
        <button onClick={toggleAll} className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          {allOn ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      <div className="max-h-[46vh] overflow-auto rounded-xl border border-black/5 dark:border-white/10">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="sticky top-0 bg-white/95 backdrop-blur dark:bg-[#1b1530]/95">
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="w-8 py-2 pl-2"><input type="checkbox" className="accent-brand-600" checked={allOn} onChange={toggleAll} aria-label="Toggle all" /></th>
              <th className="py-2 pr-2">Date</th>
              <th className="py-2 pr-2">Description</th>
              <th className="py-2 pr-2">Category</th>
              <th className="py-2 pr-2 text-right">Amount</th>
              <th className="w-8 py-2 pr-2" title="Confidence">✓</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={`border-t border-black/5 dark:border-white/10 ${r.include ? '' : 'opacity-45'} ${r.confidence < 0.4 ? 'bg-sunset/5' : ''}`}>
                <td className="py-1.5 pl-2">
                  <input type="checkbox" className="accent-brand-600" checked={r.include} onChange={(e) => patch(r.id, { include: e.target.checked })} aria-label="Include row" />
                </td>
                <td className="py-1.5 pr-2">
                  <input type="date" className="input py-1" value={r.date} onChange={(e) => patch(r.id, { date: e.target.value })} />
                </td>
                <td className="py-1.5 pr-2">
                  <input className="input min-w-[140px] py-1" value={r.description} onChange={(e) => patch(r.id, { description: e.target.value })} />
                </td>
                <td className="py-1.5 pr-2">
                  <select className="input !w-auto py-1" value={r.categoryId} onChange={(e) => setCategory(r.id, e.target.value)}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </td>
                <td className="py-1.5 pr-2 text-right">
                  <input type="number" step="0.01" className="input w-28 py-1 text-right tabular-nums" value={r.amount} onChange={(e) => patch(r.id, { amount: Number(e.target.value) })} />
                </td>
                <td className="py-1.5 pr-2 text-center"><ConfidenceDot value={r.confidence} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
