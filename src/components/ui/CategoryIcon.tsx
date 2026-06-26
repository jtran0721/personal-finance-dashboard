import {
  ArrowLeftRight,
  Bitcoin,
  Briefcase,
  Car,
  Clapperboard,
  Gift,
  HeartPulse,
  HelpCircle,
  Home,
  Landmark,
  Laptop,
  LineChart,
  MoreHorizontal,
  PiggyBank,
  Plane,
  Receipt,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  laptop: Laptop,
  'piggy-bank': PiggyBank,
  gift: Gift,
  'shopping-cart': ShoppingCart,
  utensils: UtensilsCrossed,
  car: Car,
  home: Home,
  zap: Zap,
  'shopping-bag': ShoppingBag,
  film: Clapperboard,
  'heart-pulse': HeartPulse,
  plane: Plane,
  repeat: Repeat,
  receipt: Receipt,
  'more-horizontal': MoreHorizontal,
  'help-circle': HelpCircle,
  'line-chart': LineChart,
  landmark: Landmark,
  bitcoin: Bitcoin,
  'arrow-left-right': ArrowLeftRight,
};

interface Props {
  icon: string;
  size?: number;
  className?: string;
}

/** Render a category's lucide icon by its registry key. */
export function CategoryIcon({ icon, size = 16, className }: Props) {
  const Icon = ICONS[icon] ?? HelpCircle;
  return <Icon size={size} className={className} strokeWidth={2.2} />;
}
