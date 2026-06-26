import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function ThemeToggle() {
  const theme = useStore((s) => s.theme);
  const toggle = useStore((s) => s.toggleTheme);
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      className="btn-ghost !rounded-full !p-2.5"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <motion.span
        key={theme}
        initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="block"
      >
        {isDark ? <Sun size={18} className="text-sunflower" /> : <Moon size={18} className="text-brand-600" />}
      </motion.span>
    </button>
  );
}
