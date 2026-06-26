import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

interface Props {
  label: string;
  value: number;
  format: (n: number) => string;
  icon: LucideIcon;
  /** Accent hex color for the icon badge & sparkline. */
  color: string;
  sub?: ReactNode;
  /** Optional sparkline series (numbers). */
  spark?: number[];
  index?: number;
}

export function KpiCard({ label, value, format, icon: Icon, color, sub, spark, index = 0 }: Props) {
  const sparkData = spark?.map((v, i) => ({ i, v })) ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 200, damping: 22 }}
      className="card relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="muted text-xs font-semibold uppercase tracking-wide">{label}</p>
          <p className="mt-1.5 font-display text-2xl font-extrabold tracking-tight tabular-nums">
            <AnimatedNumber value={value} format={format} />
          </p>
          {sub && <div className="mt-1 text-xs font-medium">{sub}</div>}
        </div>
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
          style={{ backgroundColor: `${color}22`, color }}
        >
          <Icon size={20} />
        </span>
      </div>

      {sparkData.length > 1 && (
        <div className="-mx-5 -mb-5 mt-3 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#spark-${label})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
