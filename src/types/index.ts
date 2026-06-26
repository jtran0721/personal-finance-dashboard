/**
 * Core domain model for the finance dashboard.
 *
 * Money convention: `amount` is SIGNED.
 *   + (positive) = money coming in   (income, sells)
 *   - (negative) = money going out   (expenses, investments bought, transfers out)
 *
 * `type` classifies the transaction for analytics regardless of sign:
 *   income     – earnings (salary, freelance, interest)
 *   expense    – consumption spending
 *   investment – money deployed into investments / retirement (a form of saving)
 *   transfer   – movement between your own accounts (neutral; excluded from income/expense)
 */
export type TxType = 'income' | 'expense' | 'investment' | 'transfer';

export type TxSource = 'pdf' | 'manual' | 'sample';

export interface Transaction {
  id: string;
  /** ISO date `yyyy-MM-dd`. */
  date: string;
  description: string;
  /** Signed amount. Positive = in, negative = out. */
  amount: number;
  type: TxType;
  categoryId: string;
  account?: string;
  source: TxSource;
  note?: string;
}

export interface Category {
  id: string;
  name: string;
  type: TxType;
  /** Bold hex color used for chips, charts and accents. */
  color: string;
  /** Key into the icon registry (see components/ui/CategoryIcon). */
  icon: string;
  /** Optional monthly budget allocation (absolute dollars). */
  monthlyBudget?: number;
}

export type ThemeMode = 'light' | 'dark';

export type DateRangePreset =
  | 'thisMonth'
  | 'last3'
  | 'last6'
  | 'last12'
  | 'ytd'
  | 'all'
  | 'custom';

export interface DateRange {
  preset: DateRangePreset;
  /** ISO date inclusive. */
  start: string;
  /** ISO date inclusive. */
  end: string;
}

/** A transaction parsed from a PDF, before the user confirms the import. */
export interface ParsedRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TxType;
  categoryId: string;
  /** Parser confidence 0..1 — drives the review-table highlighting. */
  confidence: number;
  /** Whether the user has chosen to include this row in the import. */
  include: boolean;
  /** Original raw text line for reference. */
  raw: string;
}
