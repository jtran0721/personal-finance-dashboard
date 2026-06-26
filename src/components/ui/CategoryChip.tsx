import type { Category } from '@/types';
import { CategoryIcon } from './CategoryIcon';

interface Props {
  category?: Category;
  withIcon?: boolean;
}

/** Colored pill for a category, tinted with the category's own color. */
export function CategoryChip({ category, withIcon = true }: Props) {
  if (!category) {
    return <span className="chip bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300">—</span>;
  }
  return (
    <span
      className="chip"
      style={{ backgroundColor: `${category.color}22`, color: category.color }}
    >
      {withIcon && <CategoryIcon icon={category.icon} size={13} />}
      {category.name}
    </span>
  );
}
