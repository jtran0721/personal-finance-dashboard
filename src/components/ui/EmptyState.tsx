import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/10 px-6 py-14 text-center dark:border-white/10">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow-sm">
        <Icon size={28} />
      </div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {description && <p className="muted mt-1 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
