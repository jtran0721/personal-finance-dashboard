import { LayoutDashboard, Lock, PieChart, PiggyBank, ReceiptText, Target, Upload } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/spending', label: 'Spending', icon: PieChart },
  { to: '/budget', label: 'Budget', icon: Target },
  { to: '/savings', label: 'Savings', icon: PiggyBank },
];

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <img src="/coin.svg" alt="" className="h-9 w-9" />
      <div className="leading-tight">
        <p className="font-display text-lg font-extrabold tracking-tight">FinTrack</p>
        <p className="text-[11px] font-medium text-slate-400">Personal finance</p>
      </div>
    </div>
  );
}

/** Desktop left navigation. */
export function Sidebar({ onImport }: { onImport: () => void }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-black/5 px-4 py-6 dark:border-white/10 md:flex">
      <Brand />

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all',
                isActive
                  ? 'bg-brand-gradient text-white shadow-glow-sm'
                  : 'text-slate-500 hover:bg-black/5 hover:text-ink dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white',
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <button onClick={onImport} className="btn-primary w-full">
        <Upload size={16} />
        Import statement
      </button>

      <div className="mt-auto flex items-center gap-2 rounded-xl bg-black/5 px-3 py-2.5 text-xs font-medium text-slate-500 dark:bg-white/5 dark:text-slate-400">
        <Lock size={13} className="text-emerald" />
        Private — stays in your browser
      </div>
    </aside>
  );
}

/** Mobile bottom navigation. */
export function BottomNav({ onImport }: { onImport: () => void }) {
  return (
    <nav className="sticky bottom-0 z-30 flex items-center justify-around border-t border-black/5 bg-white/80 px-2 py-1.5 backdrop-blur-lg dark:border-white/10 dark:bg-[#140f24]/80 md:hidden">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            clsx(
              'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-colors',
              isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400',
            )
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
      <button
        onClick={onImport}
        className="flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold text-white"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-gradient shadow-glow-sm">
          <Upload size={15} />
        </span>
      </button>
    </nav>
  );
}
