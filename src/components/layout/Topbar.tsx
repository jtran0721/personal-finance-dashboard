import { Database, MoreVertical, Sparkles, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/ui/Toast';
import { DateRangePicker } from './DateRangePicker';
import { ThemeToggle } from './ThemeToggle';

const TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Overview', subtitle: "Here's your money at a glance" },
  '/transactions': { title: 'Transactions', subtitle: 'Search, filter and categorize' },
  '/spending': { title: 'Spending', subtitle: 'See where your money goes' },
  '/budget': { title: 'Budget', subtitle: 'Plan allocations and track limits' },
  '/savings': { title: 'Savings & Investments', subtitle: 'Track how your net worth grows' },
};

export function Topbar({ onImport }: { onImport: () => void }) {
  const { pathname } = useLocation();
  const meta = TITLES[pathname] ?? TITLES['/'];
  const [menuOpen, setMenuOpen] = useState(false);
  const loadSampleData = useStore((s) => s.loadSampleData);
  const clearAllData = useStore((s) => s.clearAllData);
  const { toast } = useToast();

  const handleLoadSample = () => {
    loadSampleData();
    setMenuOpen(false);
    toast('Loaded 6 months of sample data', 'success');
  };

  const handleClear = () => {
    setMenuOpen(false);
    if (window.confirm('Delete all transactions? This cannot be undone.')) {
      clearAllData();
      toast('All data cleared', 'info');
    }
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-black/5 bg-[#f4f3fb]/70 px-5 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0f0b1d]/70 sm:px-7">
      <div className="min-w-0">
        <h1 className="truncate font-display text-xl font-extrabold tracking-tight sm:text-2xl">
          {meta.title}
        </h1>
        <p className="muted truncate text-sm">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:block">
          <DateRangePicker />
        </div>

        <button onClick={onImport} className="btn-primary hidden lg:inline-flex">
          <Upload size={16} />
          Import
        </button>

        <ThemeToggle />

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="btn-ghost !rounded-full !p-2.5"
            aria-label="Data options"
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <>
              <button
                className="fixed inset-0 z-10 cursor-default"
                aria-hidden
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-black/5 bg-white p-1.5 shadow-glow dark:border-white/10 dark:bg-[#1b1530]">
                <p className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <Database size={13} /> Data
                </p>
                <button onClick={handleLoadSample} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5">
                  <Sparkles size={16} className="text-brand-500" />
                  Load sample data
                </button>
                <button onClick={handleClear} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-sunset hover:bg-sunset/10">
                  <Trash2 size={16} />
                  Clear all data
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
