import type { TxType } from '@/types';

interface Rule {
  match: RegExp;
  categoryId: string;
  type: TxType;
  /** How confident we are when this rule fires (0..1). */
  confidence: number;
}

/**
 * Keyword rules for auto-categorizing a transaction from its description.
 * Order matters — the first match wins, so put the most specific rules first.
 * Merchants are lowercased before matching.
 */
const RULES: Rule[] = [
  // ── Income ────────────────────────────────────────────────
  { match: /payroll|salary|paycheck|direct dep|dir dep|\badp\b|gusto|paychex/, categoryId: 'salary', type: 'income', confidence: 0.95 },
  { match: /upwork|fiverr|freelance|consulting|invoice paid|stripe payout/, categoryId: 'freelance', type: 'income', confidence: 0.85 },
  { match: /dividend|interest paid|interest earned|\bapy\b/, categoryId: 'interest', type: 'income', confidence: 0.9 },
  { match: /refund|rebate|cashback|cash back|reimburs/, categoryId: 'other-income', type: 'income', confidence: 0.75 },

  // ── Investments ───────────────────────────────────────────
  { match: /vanguard|fidelity|schwab|robinhood|e\*?trade|wealthfront|betterment|brokerage|td ameritrade|m1 finance/, categoryId: 'brokerage', type: 'investment', confidence: 0.9 },
  { match: /401\(?k\)?|403\(?b\)?|\bira\b|retirement|pension/, categoryId: 'retirement', type: 'investment', confidence: 0.9 },
  { match: /coinbase|binance|kraken|crypto|bitcoin|ethereum|gemini exchange/, categoryId: 'crypto', type: 'investment', confidence: 0.88 },

  // ── Transfers / Savings ───────────────────────────────────
  { match: /to savings|savings transfer|ally bank|marcus|sofi savings|high yield/, categoryId: 'savings', type: 'transfer', confidence: 0.75 },
  { match: /transfer|xfer|zelle|venmo|cash app|wire/, categoryId: 'transfer', type: 'transfer', confidence: 0.5 },

  // ── Subscriptions ─────────────────────────────────────────
  { match: /netflix|spotify|hulu|disney\+?|hbo|max\b|youtube premium|icloud|google one|dropbox|notion|adobe|patreon|substack|prime video|audible/, categoryId: 'subscriptions', type: 'expense', confidence: 0.85 },

  // ── Groceries ─────────────────────────────────────────────
  { match: /whole foods|trader joe|safeway|kroger|aldi|costco|walmart|grocery|supermarket|wegmans|publix|sprouts|h-?e-?b|ralphs|albertsons/, categoryId: 'groceries', type: 'expense', confidence: 0.9 },

  // ── Dining ────────────────────────────────────────────────
  { match: /starbucks|dunkin|mcdonald|chipotle|restaurant|cafe|coffee|pizza|burger|grill|sushi|taco|doordash|uber eats|ubereats|grubhub|seamless|panera|sweetgreen|shake shack/, categoryId: 'dining', type: 'expense', confidence: 0.85 },

  // ── Transport ─────────────────────────────────────────────
  { match: /uber\b|lyft|shell|chevron|exxon|\bbp\b|gas station|fuel|parking|metro|transit|\bmta\b|bart|toll|caltrain|76 gas|arco/, categoryId: 'transport', type: 'expense', confidence: 0.85 },

  // ── Housing ───────────────────────────────────────────────
  { match: /mortgage/, categoryId: 'mortgage', type: 'expense', confidence: 0.9 },
  { match: /\brent\b|landlord|\bhoa\b|property mgmt|apartment|leasing/, categoryId: 'housing', type: 'expense', confidence: 0.9 },

  // ── Utilities ─────────────────────────────────────────────
  { match: /electric|pg&?e|comcast|xfinity|verizon|at&?t|t-?mobile|water dept|utility|internet|sewer|spectrum|con edison|national grid/, categoryId: 'utilities', type: 'expense', confidence: 0.85 },

  // ── Health ────────────────────────────────────────────────
  { match: /pharmacy|cvs|walgreens|\bgym\b|fitness|peloton|doctor|dental|clinic|hospital|medical|therapy|equinox|planet fitness/, categoryId: 'health', type: 'expense', confidence: 0.8 },

  // ── Travel ────────────────────────────────────────────────
  { match: /airlines?|delta air|united air|american air|southwest|hotel|airbnb|expedia|booking\.com|marriott|hilton|hertz|rental car|\btsa\b|jetblue/, categoryId: 'travel', type: 'expense', confidence: 0.85 },

  // ── Entertainment ─────────────────────────────────────────
  { match: /cinema|\bamc\b|movie|theater|steam|playstation|xbox|nintendo|concert|ticketmaster|stubhub|event/, categoryId: 'entertainment', type: 'expense', confidence: 0.8 },

  // ── Shopping ──────────────────────────────────────────────
  { match: /amazon|amzn|target|best buy|ebay|etsy|ikea|nike|zara|h&m|macy|nordstrom|sephora|ulta|home depot|lowe'?s/, categoryId: 'shopping', type: 'expense', confidence: 0.8 },

  // ── Fees ──────────────────────────────────────────────────
  { match: /\bfee\b|service charge|atm|overdraft|interest charge|late fee|annual fee|finance charge|maintenance fee/, categoryId: 'fees', type: 'expense', confidence: 0.8 },
];

export interface CategorizeResult {
  categoryId: string;
  type: TxType;
  confidence: number;
}

/**
 * Guess the category & type for a transaction from its description and signed
 * amount. Returns a confidence used by the import review table to flag
 * low-certainty rows for the user to check.
 */
export function categorize(description: string, amount: number): CategorizeResult {
  const text = description.toLowerCase();
  for (const rule of RULES) {
    if (rule.match.test(text)) {
      return { categoryId: rule.categoryId, type: rule.type, confidence: rule.confidence };
    }
  }
  // No keyword matched — fall back on the sign of the amount.
  if (amount > 0) {
    return { categoryId: 'other-income', type: 'income', confidence: 0.3 };
  }
  return { categoryId: 'uncategorized', type: 'expense', confidence: 0.25 };
}
