import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Category, TxType } from '@/types';
import { useStore } from '@/store/useStore';
import { FALLBACK_CATEGORY, TYPE_LABEL } from '@/lib/categories';
import { Modal } from '@/components/ui/Modal';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { useToast } from '@/components/ui/Toast';

const PALETTE = [
  '#ff6b6b', '#ff922b', '#fcc419', '#94d82d', '#20c997', '#12b886', '#22b8cf',
  '#4dabf7', '#5f3dc4', '#7c3aed', '#cc5de8', '#f06595', '#868e96',
];
const ICON_CHOICES = [
  'shopping-cart', 'utensils', 'car', 'home', 'building', 'zap', 'shopping-bag',
  'film', 'heart-pulse', 'plane', 'repeat', 'receipt', 'briefcase', 'laptop',
  'piggy-bank', 'gift', 'line-chart', 'landmark', 'bitcoin', 'arrow-left-right',
  'more-horizontal', 'help-circle',
];
const TYPES: { value: TxType; label: string }[] = [
  { value: 'expense', label: TYPE_LABEL.expense },
  { value: 'income', label: TYPE_LABEL.income },
  { value: 'investment', label: TYPE_LABEL.investment },
  { value: 'transfer', label: TYPE_LABEL.transfer },
];
const TYPE_ORDER: TxType[] = ['income', 'expense', 'investment', 'transfer'];
const PROTECTED = new Set(Object.values(FALLBACK_CATEGORY));

export function CategoryManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useStore((s) => s.categories);
  const addCategory = useStore((s) => s.addCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [type, setType] = useState<TxType>('expense');
  const [color, setColor] = useState(PALETTE[0]);
  const [icon, setIcon] = useState('shopping-cart');
  const [budget, setBudget] = useState('');

  const budgetable = type === 'expense' || type === 'investment';

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast('Enter a category name', 'error');
      return;
    }
    const mb = Number(budget);
    addCategory({
      name: trimmed,
      type,
      color,
      icon,
      monthlyBudget: budgetable && mb > 0 ? mb : undefined,
    });
    toast(`Added “${trimmed}”`, 'success');
    setName('');
    setBudget('');
  };

  const handleDelete = (c: Category) => {
    if (window.confirm(`Delete “${c.name}”? Any transactions in it move to the default category.`)) {
      deleteCategory(c.id);
      toast(`Deleted “${c.name}”`, 'info');
    }
  };

  const grouped = TYPE_ORDER.map((t) => ({ type: t, items: categories.filter((c) => c.type === t) }));

  return (
    <Modal open={open} onClose={onClose} title="Manage categories" maxWidth="max-w-2xl">
      {/* ── Add form ── */}
      <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <input
            className="input"
            placeholder="New category name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <select className="input !w-auto cursor-pointer" value={type} onChange={(e) => setType(e.target.value as TxType)}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-6 w-6 rounded-full ring-2 transition ${color === c ? 'ring-black/40 dark:ring-white/70' : 'ring-transparent'}`}
              style={{ background: c }}
              aria-label={`Use color ${c}`}
            />
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1">
          {ICON_CHOICES.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => setIcon(ic)}
              className={`grid h-8 w-8 place-items-center rounded-lg transition ${icon === ic ? 'text-white' : 'text-slate-400 hover:bg-black/5 dark:hover:bg-white/10'}`}
              style={icon === ic ? { background: color } : undefined}
              aria-label={`Use icon ${ic}`}
            >
              <CategoryIcon icon={ic} size={16} />
            </button>
          ))}
        </div>

        {budgetable && (
          <div className="mt-3 flex items-center gap-2">
            <span className="label !mb-0">Monthly budget (optional)</span>
            <div className="relative w-32">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
              <input type="number" min={0} step={10} className="input py-2 pl-7 text-right tabular-nums" placeholder="0" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="chip" style={{ backgroundColor: `${color}22`, color }}>
            <CategoryIcon icon={icon} size={13} /> {name.trim() || 'Preview'}
          </span>
          <button onClick={handleAdd} className="btn-primary">
            <Plus size={16} /> Add category
          </button>
        </div>
      </div>

      {/* ── Existing categories ── */}
      <div className="mt-5 max-h-[38vh] space-y-4 overflow-y-auto pr-1">
        {grouped.map((g) => (
          <div key={g.type}>
            <p className="label">{TYPE_LABEL[g.type]}</p>
            <div className="flex flex-col gap-1">
              {g.items.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `${c.color}22`, color: c.color }}>
                    <CategoryIcon icon={c.icon} size={14} />
                  </span>
                  <span className="flex-1 truncate text-sm font-medium">{c.name}</span>
                  {c.monthlyBudget ? <span className="muted text-xs tabular-nums">${c.monthlyBudget}/mo</span> : null}
                  {PROTECTED.has(c.id) ? (
                    <span className="muted text-[10px] font-semibold uppercase tracking-wide" title="Default category — can't be deleted">system</span>
                  ) : (
                    <button onClick={() => handleDelete(c)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-sunset/10 hover:text-sunset" aria-label={`Delete ${c.name}`}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
