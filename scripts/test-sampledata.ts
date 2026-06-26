/**
 * Regression test for the sample-data generator (run via `npm test`).
 *
 * Guards the bug where a `within(28)` guard was always false (a month's max day
 * is 27), silently dropping ALL variable spending so Housing became ~85% of
 * expenses. These assertions fail if that class of bug returns.
 */
import { generateSampleTransactions } from '../src/lib/sampleData';
import { computeTotals, spendingByCategory } from '../src/lib/analytics';
import { DEFAULT_CATEGORY_BY_ID } from '../src/lib/categories';

let failures = 0;
function assert(cond: boolean, msg: string) {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) failures += 1;
}

const txns = generateSampleTransactions();
const totals = computeTotals(txns);
const spending = spendingByCategory(txns, DEFAULT_CATEGORY_BY_ID);
const topShare = spending[0]?.pct ?? 1;
const present = new Set(txns.filter((t) => t.type === 'expense').map((t) => t.categoryId));

console.log(`Generated ${txns.length} transactions; top expense category share = ${(topShare * 100).toFixed(1)}%`);

assert(txns.length >= 100, `generates a substantial dataset (${txns.length} ≥ 100)`);
assert(totals.income > 0 && totals.expenses > 0 && totals.invested > 0, 'income, expenses and investments are all present');
for (const cat of ['groceries', 'dining', 'transport', 'shopping'] as const) {
  assert(present.has(cat), `variable spending present: ${cat} (the within(28) regression guard)`);
}
assert(topShare < 0.7, `no single category dominates expenses (top = ${(topShare * 100).toFixed(1)}% < 70%)`);

console.log(failures === 0 ? '\n✅ Sample-data assertions passed.' : `\n❌ ${failures} assertion(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
