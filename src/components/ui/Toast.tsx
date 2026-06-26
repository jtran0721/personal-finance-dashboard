import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'info' | 'error';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

const ICON: Record<ToastKind, typeof Info> = {
  success: CheckCircle2,
  info: Info,
  error: AlertTriangle,
};

const ACCENT: Record<ToastKind, string> = {
  success: 'text-emerald',
  info: 'text-ocean',
  error: 'text-sunset',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      const id = Date.now() + Math.random();
      setToasts((cur) => [...cur, { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 3800);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-full max-w-sm flex-col gap-2.5">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICON[t.kind];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                className="card-tight pointer-events-auto flex items-center gap-3"
              >
                <Icon className={ACCENT[t.kind]} size={20} />
                <p className="flex-1 text-sm font-medium">{t.message}</p>
                <button
                  onClick={() => dismiss(t.id)}
                  className="muted transition hover:text-ink dark:hover:text-white"
                  aria-label="Dismiss"
                >
                  <X size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
