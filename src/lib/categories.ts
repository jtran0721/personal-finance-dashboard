import type { Category } from '@/types';

/**
 * Default category set. Colors are bold and high-contrast (used everywhere the
 * category appears — chips, donut slices, bars). Monthly budgets are sensible
 * starting points the user can edit on the Budget page.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  // ── Income ────────────────────────────────────────────────
  { id: 'salary', name: 'Salary', type: 'income', color: '#20c997', icon: 'briefcase' },
  { id: 'freelance', name: 'Freelance', type: 'income', color: '#4dabf7', icon: 'laptop' },
  { id: 'interest', name: 'Interest & Dividends', type: 'income', color: '#fcc419', icon: 'piggy-bank' },
  { id: 'other-income', name: 'Other Income', type: 'income', color: '#94d82d', icon: 'gift' },

  // ── Expenses ──────────────────────────────────────────────
  // Limits reflect the user's bucket budget plan; several plan line items are
  // lumped into one app category (e.g. rent + mortgage → housing).
  { id: 'groceries', name: 'Groceries', type: 'expense', color: '#20c997', icon: 'shopping-cart', monthlyBudget: 400 },
  { id: 'dining', name: 'Dining & Cafés', type: 'expense', color: '#ff922b', icon: 'utensils', monthlyBudget: 400 },
  { id: 'transport', name: 'Transport', type: 'expense', color: '#4dabf7', icon: 'car', monthlyBudget: 200 },
  { id: 'housing', name: 'Rent', type: 'expense', color: '#cc5de8', icon: 'home', monthlyBudget: 3258 },
  { id: 'mortgage', name: 'Mortgage', type: 'expense', color: '#5f3dc4', icon: 'building', monthlyBudget: 2597 },
  { id: 'utilities', name: 'Utilities', type: 'expense', color: '#22b8cf', icon: 'zap', monthlyBudget: 280 },
  { id: 'shopping', name: 'Shopping', type: 'expense', color: '#f06595', icon: 'shopping-bag', monthlyBudget: 150 }, // clothing / personal
  { id: 'entertainment', name: 'Entertainment', type: 'expense', color: '#ff6b6b', icon: 'film', monthlyBudget: 45 }, // entertainment + subscriptions
  { id: 'health', name: 'Health & Fitness', type: 'expense', color: '#94d82d', icon: 'heart-pulse', monthlyBudget: 300 }, // healthcare + gym
  { id: 'travel', name: 'Travel', type: 'expense', color: '#fab005', icon: 'plane', monthlyBudget: 300 },
  { id: 'subscriptions', name: 'Subscriptions', type: 'expense', color: '#a78bfa', icon: 'repeat' }, // merged into Entertainment
  { id: 'fees', name: 'Fees & Charges', type: 'expense', color: '#fa5252', icon: 'receipt', monthlyBudget: 269 }, // car insurance + income protection
  { id: 'other-expense', name: 'Other', type: 'expense', color: '#868e96', icon: 'more-horizontal', monthlyBudget: 560 }, // misc + gifts + big purchases
  { id: 'uncategorized', name: 'Uncategorized', type: 'expense', color: '#adb5bd', icon: 'help-circle' },

  // ── Investments ───────────────────────────────────────────
  { id: 'brokerage', name: 'Brokerage (ETF)', type: 'investment', color: '#7c3aed', icon: 'line-chart', monthlyBudget: 3000 },
  { id: 'crypto', name: 'Crypto', type: 'investment', color: '#ff922b', icon: 'bitcoin' },

  // ── Transfers (neutral) ───────────────────────────────────
  { id: 'savings', name: 'Savings Transfer', type: 'transfer', color: '#12b886', icon: 'piggy-bank' },
  { id: 'transfer', name: 'Transfer', type: 'transfer', color: '#868e96', icon: 'arrow-left-right' },
];

/** Convenience lookup built from a category list. */
export function indexCategories(categories: Category[]): Record<string, Category> {
  return Object.fromEntries(categories.map((c) => [c.id, c]));
}

export const DEFAULT_CATEGORY_BY_ID = indexCategories(DEFAULT_CATEGORIES);

/** Fallback category id per transaction type, used when nothing else matches. */
export const FALLBACK_CATEGORY: Record<string, string> = {
  income: 'other-income',
  expense: 'uncategorized',
  investment: 'brokerage',
  transfer: 'transfer',
};
