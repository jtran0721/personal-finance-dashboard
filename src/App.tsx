import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { ImportContext } from '@/hooks/useImport';
import { ToastProvider } from '@/components/ui/Toast';
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

  useEffect(() => {
    ensureSeeded();
  }, [ensureSeeded]);

  return (
    <ToastProvider>
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
