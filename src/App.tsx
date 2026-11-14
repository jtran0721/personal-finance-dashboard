import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { hydration, saveErrorListeners, useStore } from '@/store/useStore';
import { ImportContext } from '@/hooks/useImport';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { BottomNav, Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { DateRangePicker } from '@/components/layout/DateRangePicker';
import { Overview } from '@/pages/Overview';

// Lazy — pulls in pdf.js only when the user actually opens the importer.
const ImportModal = lazy(() =>
  import('@/components/import/ImportModal').then((m) => ({ default: m.ImportModal })),
);
import { Transactions } from '@/pages/Transactions';
import { Spending } from '@/pages/Spending';
import { Budget } from '@/pages/Budget';
import { Savings } from '@/pages/Savings';

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <Routes location={location}>
          <Route path="/" element={<Overview />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/spending" element={<Spending />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/savings" element={<Savings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

/** Shows a toast whenever saving to the server fails. */
function SaveErrorNotifier() {
  const { toast } = useToast();
  useEffect(() => {
    const notify = () => toast("Couldn't save to the server — your latest change isn't stored yet.", 'error');
    saveErrorListeners.add(notify);
    return () => {
      saveErrorListeners.delete(notify);
    };
  }, [toast]);
  return null;
}

type LoadStatus = 'loading' | 'ready' | 'error';

function LoadScreen({ status }: { status: Exclude<LoadStatus, 'ready'> }) {
  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      {status === 'loading' ? (
        <Loader2 className="animate-spin text-brand-500" size={32} aria-label="Loading your data" />
      ) : (
        <div className="max-w-sm">
          <AlertTriangle className="mx-auto mb-4 text-brand-500" size={32} />
          <h1 className="font-display text-lg font-bold">Can't reach the FinTrack server</h1>
          <p className="muted mt-1 text-sm">
            Your data is stored on the server, so the app won't load until it's back. Nothing has been changed.
          </p>
          <button className="btn btn-primary mt-5" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const theme = useStore((s) => s.theme);
  const ensureSeeded = useStore((s) => s.ensureSeeded);
  const [importOpen, setImportOpen] = useState(false);
  const [importMounted, setImportMounted] = useState(false);

  const openImport = () => {
    setImportMounted(true);
    setImportOpen(true);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // Wait for the server data before seeding or rendering, so sample data can't replace it.
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  useEffect(() => {
    hydration.then(
      () => setLoadStatus('ready'),
      () => setLoadStatus('error'),
    );
  }, []);

  useEffect(() => {
    if (loadStatus === 'ready') ensureSeeded();
  }, [loadStatus, ensureSeeded]);

  if (loadStatus !== 'ready') return <LoadScreen status={loadStatus} />;

  return (
    <ToastProvider>
      <SaveErrorNotifier />
      <ImportContext.Provider value={{ open: openImport }}>
        <div className="flex min-h-screen">
          <Sidebar onImport={openImport} />

          <div className="flex min-h-screen min-w-0 flex-1 flex-col">
            <Topbar onImport={openImport} />

            {/* Mobile date range bar */}
            <div className="border-b border-black/5 px-5 py-2 dark:border-white/10 sm:hidden">
              <DateRangePicker />
            </div>

            <main className="flex-1 px-5 py-5 sm:px-7 sm:py-6">
              <AnimatedRoutes />
            </main>

            <BottomNav onImport={openImport} />
          </div>
        </div>

        {importMounted && (
          <Suspense fallback={null}>
            <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
          </Suspense>
        )}
      </ImportContext.Provider>
    </ToastProvider>
  );
}
