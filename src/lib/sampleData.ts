import { addDays, format, startOfMonth, subMonths } from 'date-fns';
import type { Transaction, TxType } from '@/types';

/** Small deterministic PRNG so the demo data is stable within a given month. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MERCHANTS: Record<string, string[]> = {
  groceries: ['Whole Foods Market', 'Trader Joe\'s', 'Safeway', 'Costco Wholesale', 'Sprouts Farmers Mkt'],
  dining: ['Starbucks', 'Chipotle', 'Sweetgreen', 'Blue Bottle Coffee', 'Shake Shack', 'DoorDash', 'Local Thai Kitchen'],
  transport: ['Uber Trip', 'Lyft Ride', 'Shell Oil', 'Chevron', 'City Metro Transit', 'ParkWhiz'],
  shopping: ['Amazon.com', 'Target', 'Best Buy', 'Nike Store', 'IKEA', 'Etsy'],
  entertainment: ['AMC Theatres', 'Steam Games', 'Ticketmaster', 'Live Nation'],
  health: ['CVS Pharmacy', 'Equinox Gym', 'Walgreens', 'One Medical'],
  utilities: ['PG&E Electric', 'Comcast Xfinity', 'Verizon Wireless', 'City Water Dept'],
  subscriptions: ['Netflix', 'Spotify Premium', 'iCloud Storage', 'Adobe Creative', 'Notion'],
  travel: ['Delta Air Lines', 'Airbnb', 'Marriott Hotels', 'Expedia'],
};

let counter = 0;
function makeTxn(
  rng: () => number,
  date: Date,
  description: string,
  amount: number,
  type: TxType,
  categoryId: string,
  account: string,
): Transaction {
  counter += 1;
  return {
    id: `sample-${counter}-${Math.floor(rng() * 1e6).toString(36)}`,
    date: format(date, 'yyyy-MM-dd'),
    description,
    amount: Number(amount.toFixed(2)),
    type,
    categoryId,
    account,
    source: 'sample',
  };
}

const pick = <T,>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const between = (rng: () => number, min: number, max: number): number => min + rng() * (max - min);
const times = (rng: () => number, min: number, max: number): number => Math.round(between(rng, min, max));

/**
 * Generate ~6 months of realistic personal-finance transactions ending today.
 * Returns a varied but plausible mix: salary, recurring bills, variable spend,
 * monthly investing and a savings transfer.
 */
export function generateSampleTransactions(): Transaction[] {
  counter = 0;
  const rng = mulberry32(20260601);
  const txns: Transaction[] = [];
  const today = new Date();
  const CHECKING = 'Everyday Checking';

  for (let m = 5; m >= 0; m--) {
    const monthStart = startOfMonth(subMonths(today, m));
    const isCurrentMonth = m === 0;
    const maxDay = isCurrentMonth ? today.getDate() - 1 : 27;
    const dayIn = (d: number) => addDays(monthStart, Math.min(d, maxDay < 1 ? 0 : maxDay) - 1);
    const within = (d: number) => d <= Math.max(maxDay, 1);

    // ── Income: two paychecks ──
    if (within(1)) txns.push(makeTxn(rng, dayIn(1), 'Acme Corp Payroll Direct Dep', between(rng, 3150, 3300), 'income', 'salary', CHECKING));
    if (within(15)) txns.push(makeTxn(rng, dayIn(15), 'Acme Corp Payroll Direct Dep', between(rng, 3150, 3300), 'income', 'salary', CHECKING));
    // Occasional freelance + monthly interest
    if (rng() < 0.45 && within(20)) txns.push(makeTxn(rng, dayIn(times(rng, 8, 24)), 'Upwork Freelance Payout', between(rng, 380, 1250), 'income', 'freelance', CHECKING));
    if (within(2)) txns.push(makeTxn(rng, dayIn(2), 'Interest Paid - Savings', between(rng, 6, 28), 'income', 'interest', CHECKING));

    // ── Recurring bills ──
    if (within(1)) txns.push(makeTxn(rng, dayIn(1), 'Skyline Apartments Rent', -1800, 'expense', 'housing', CHECKING));
    if (within(5)) txns.push(makeTxn(rng, dayIn(5), pick(rng, MERCHANTS.utilities), -between(rng, 90, 180), 'expense', 'utilities', CHECKING));
    if (within(7)) txns.push(makeTxn(rng, dayIn(7), 'Verizon Wireless', -between(rng, 70, 95), 'expense', 'utilities', CHECKING));
    // Subscriptions
    for (const [day, sub, amt] of [[3, 'Netflix', 15.49], [6, 'Spotify Premium', 11.99], [9, 'iCloud Storage', 2.99], [12, 'Adobe Creative', 22.99]] as const) {
      if (within(day)) txns.push(makeTxn(rng, dayIn(day), sub, -amt, 'expense', 'subscriptions', CHECKING));
    }

    // ── Variable spending ── (pick a day in the month, include only days that have occurred)
    const spend = (count: number, merchants: string[], min: number, max: number, categoryId: string) => {
      for (let i = 0; i < count; i++) {
        const d = times(rng, 1, 27);
        if (d <= maxDay) txns.push(makeTxn(rng, dayIn(d), pick(rng, merchants), -between(rng, min, max), 'expense', categoryId, CHECKING));
      }
    };
    spend(times(rng, 4, 6), MERCHANTS.groceries, 35, 165, 'groceries');
    spend(times(rng, 6, 12), MERCHANTS.dining, 7, 64, 'dining');
    spend(times(rng, 4, 8), MERCHANTS.transport, 11, 72, 'transport');
    spend(times(rng, 2, 4), MERCHANTS.shopping, 18, 210, 'shopping');
    spend(times(rng, 1, 3), MERCHANTS.entertainment, 12, 78, 'entertainment');
    if (within(10)) txns.push(makeTxn(rng, dayIn(10), 'Equinox Gym Membership', -52, 'expense', 'health', CHECKING));
    if (rng() < 0.7) spend(1, MERCHANTS.health, 12, 90, 'health');
    if (rng() < 0.35) spend(1, MERCHANTS.travel, 160, 620, 'travel');

    // ── Investing & saving ──
    if (within(16)) txns.push(makeTxn(rng, dayIn(16), 'Vanguard Brokerage Transfer', -between(rng, 450, 600), 'investment', 'brokerage', CHECKING));
    if (within(16)) txns.push(makeTxn(rng, dayIn(16), 'Fidelity Brokerage Contribution', -400, 'investment', 'brokerage', CHECKING));
    if (rng() < 0.4 && within(20)) txns.push(makeTxn(rng, dayIn(times(rng, 10, 24)), 'Coinbase Purchase', -between(rng, 50, 250), 'investment', 'crypto', CHECKING));
    if (within(2)) txns.push(makeTxn(rng, dayIn(2), 'Transfer to Ally Savings', -between(rng, 500, 700), 'transfer', 'savings', CHECKING));
  }

  return txns.sort((a, b) => (a.date < b.date ? 1 : -1));
}
