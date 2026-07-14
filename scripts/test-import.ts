/**
 * End-to-end import smoke test (run: `npx tsx scripts/test-import.ts`).
 *
 * Builds real, text-based bank-statement PDFs in memory, extracts them with
 * pdf.js (the same engine the app uses), runs them through the real parser, and
 * asserts transactions, categories, dates and — crucially — signs.
 *
 * Two layouts are covered:
 *   A. Single-amount statement (sign inferred from markers/category) — fallback path.
 *   B. Debit/Credit/Balance columnar statement — the column an amount sits in
 *      determines its direction. This is the regression test for the bug where
 *      debit/credit rows were mis-signed from the description category.
 */
import { Buffer } from 'node:buffer';
import { parseTransactions, type StatementLine } from '../src/lib/statementParser';

// ── Minimal valid PDF writer ─────────────────────────────────
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

function assemblePdf(content: string): Uint8Array {
  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  objects[3] =
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[5] = `<< /Length ${Buffer.byteLength(content, 'latin1')} >>\nstream\n${content}\nendstream`;

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, 'latin1');
  const count = objects.length; // includes slot 0
  pdf += `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let i = 1; i < count; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf, 'latin1'));
}

/** One text line per row, left-aligned. */
function buildPdf(lines: string[]): Uint8Array {
  let content = 'BT\n/F1 10 Tf\n50 720 Td\n14 TL\n';
  content += lines.map((l, i) => (i === 0 ? `(${esc(l)}) Tj` : `T*\n(${esc(l)}) Tj`)).join('\n');
  content += '\nET';
  return assemblePdf(content);
}

/** Cells placed at absolute (x, y) — used to build real multi-column layouts. */
function buildColumnarPdf(rows: { y: number; cells: { text: string; x: number }[] }[]): Uint8Array {
  let content = 'BT\n/F1 10 Tf\n';
  for (const row of rows) {
    for (const c of row.cells) content += `1 0 0 1 ${c.x} ${row.y} Tm (${esc(c.text)}) Tj\n`;
  }
  content += 'ET';
  return assemblePdf(content);
}

// ── pdf.js text extraction (mirrors src/lib/pdfImport extractLines) ──
async function extractLines(data: Uint8Array): Promise<StatementLine[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const lines: StatementLine[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const rows = new Map<number, { str: string; x: number; width: number }[]>();
    for (const it of content.items as { str?: string; transform?: number[]; width?: number }[]) {
      if (typeof it.str !== 'string' || !it.transform) continue;
      const key = Math.round(it.transform[5] / 3) * 3;
      (rows.get(key) ?? rows.set(key, []).get(key)!).push({ str: it.str, x: it.transform[4], width: it.width ?? 0 });
    }
    [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, frags]) => {
        const sorted = frags.sort((a, b) => a.x - b.x);
        const text = sorted.map((f) => f.str).join(' ').replace(/\s+/g, ' ').trim();
        if (!text) return;
        lines.push({ text, cells: sorted.map((f) => ({ str: f.str, x: f.x, width: f.width })) });
      });
  }
  return lines;
}

// ── Assertions ───────────────────────────────────────────────
let failures = 0;
function assert(cond: boolean, msg: string) {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) failures += 1;
}

// ── A. Single-amount statement (fallback sign inference) ─────
const STATEMENT_LINES = [
  'EVERYDAY CHECKING — Statement Period 01/01/2026 to 01/31/2026',
  '01/05/2026  WHOLE FOODS MARKET #123      -82.14    3,210.55',
  '01/06/2026  STARBUCKS STORE 555          -6.75',
  '01/07/2026  UBER TRIP HELP.UBER.COM      -23.40',
  '2026-01-09  Acme Corp Payroll Direct Dep  3,250.00',
  'Jan 12, 2026  VANGUARD BROKERAGE TRANSFER -500.00',
  '01/15/2026  NETFLIX.COM                   -15.49',
  '15 Jan 2026  PG&E ELECTRIC                -120.30',
  '01/20/2026  Transfer to Savings Acct      -600.00',
];

async function testSingleColumn() {
  console.log('\n── A. Single-amount statement (fallback) ──');
  const rows = parseTransactions(await extractLines(buildPdf(STATEMENT_LINES)));
  const byDesc = (q: string) => rows.find((r) => r.description.toLowerCase().includes(q));

  assert(rows.length === 8, `detected 8 transactions (got ${rows.length}; header ignored)`);
  assert(byDesc('whole foods')?.categoryId === 'groceries', 'Whole Foods → groceries');
  assert(byDesc('whole foods')?.amount === -82.14, 'Whole Foods uses the first amount, not the balance');
  assert(byDesc('uber')?.categoryId === 'transport', 'Uber → transport');
  const pay = byDesc('payroll');
  assert(pay?.type === 'income' && (pay?.amount ?? 0) > 0, 'Payroll → income, positive (+3250)');
  assert(pay?.date === '2026-01-09', 'Payroll ISO date parsed (2026-01-09)');
  assert(byDesc('vanguard')?.type === 'investment', 'Vanguard → investment');
  assert(byDesc('vanguard')?.date === '2026-01-12', '"Jan 12, 2026" date parsed → 2026-01-12');
  assert(byDesc('netflix')?.categoryId === 'subscriptions', 'Netflix → subscriptions');
  assert(byDesc('pg&e')?.date === '2026-01-15', '"15 Jan 2026" date parsed → 2026-01-15');
  assert(byDesc('savings')?.type === 'transfer', 'Transfer to Savings → transfer');
}

// ── B. AU-style Debits/Credits statement (the reported bug) ──
// Mirrors a real statement: plural "Debits" / "Credits (-)" headers, DD-Mon-YY
// dates, right-aligned amounts, no balance column, and a credit with trailing "-".
const X = { date: 60, desc: 130, debit: 450, credit: 545 };
const COLUMNAR_ROWS = [
  { y: 730, cells: [{ text: 'Date of Transaction', x: X.date }, { text: 'Description', x: X.desc }, { text: 'Debits', x: 430 }, { text: 'Credits (-)', x: 540 }] },
  { y: 712, cells: [{ text: '23 Jun 26', x: X.date }, { text: '7-ELEVEN 1012 NORTHCOTE AUS', x: X.desc }, { text: '83.82', x: X.debit }] },
  { y: 694, cells: [{ text: '25 Jun 26', x: X.date }, { text: 'TRADERSCIRCLE PTY LTD MELBOURNE AUS', x: X.desc }, { text: '995.00', x: X.debit }] },
  { y: 676, cells: [{ text: '03 Jul 26', x: X.date }, { text: 'ANTHROPIC* CLAUDE SUB SAN FRANCISCO USA', x: X.desc }, { text: '35.02', x: X.debit }] },
  { y: 658, cells: [{ text: '01 Jul 26', x: X.date }, { text: 'PAYPAL *IKEA AU 7037.1 AUS', x: X.desc }, { text: '134.00', x: X.debit }] },
  { y: 640, cells: [{ text: '02 Jul 26', x: X.date }, { text: 'PAYMENT-BPAY-THANK YOU', x: X.desc }, { text: '8,800.00 -', x: X.credit }] },
];

async function testColumnar() {
  console.log('\n── B. AU Debits/Credits statement (the reported bug) ──');
  const rows = parseTransactions(await extractLines(buildColumnarPdf(COLUMNAR_ROWS)));
  console.table(rows.map((r) => ({ date: r.date, desc: r.description.slice(0, 28), amount: r.amount, type: r.type, category: r.categoryId })));
  const byDesc = (q: string) => rows.find((r) => r.description.toLowerCase().includes(q));

  assert(rows.length === 5, `detected 5 transactions (got ${rows.length}; header ignored)`);
  // Debits → money out, even for unknown merchants (the "everything shows as income" bug).
  assert(byDesc('7-eleven')?.type === 'expense', 'Debit → expense (unknown merchant 7-Eleven), NOT income');
  assert(byDesc('7-eleven')?.amount === -83.82, 'Debit amount is negative (-83.82)');
  assert(byDesc('7-eleven')?.date === '2026-06-23', 'DD-Mon-YY date parsed ("23 Jun 26" → 2026-06-23)');
  assert(byDesc('traderscircle')?.amount === -995, 'Debit → expense (-995)');
  assert(byDesc('anthropic')?.type === 'expense' && byDesc('anthropic')?.amount === -35.02, 'Anthropic sub debit → expense (-35.02), not +income');
  assert(byDesc('ikea')?.amount === -134, 'Debit → expense (-134)');
  // Credit → money in, and it IS picked up from the Credits column (trailing "-" tolerated).
  const bpay = byDesc('bpay');
  assert(!!bpay, 'Credit row (BPAY) IS picked up from the Credits column');
  assert(bpay?.type === 'income' && bpay?.amount === 8800, 'Credit → income (+8800)');
}

// ── C. Explicit +$ / -$ signs in Debit/Credit columns ────────
// Some banks print signs: credits as "+$13.00", debits as "-$6,000.00".
const S = { date: 60, desc: 130, debit: 450, credit: 565 };
const SIGNED_ROWS = [
  { y: 730, cells: [{ text: 'Date', x: S.date }, { text: 'Description', x: S.desc }, { text: 'Debit', x: 445 }, { text: 'Credit', x: 560 }] },
  { y: 712, cells: [{ text: '12 Jul 2026', x: S.date }, { text: 'Tea White', x: S.desc }, { text: '+$13.00', x: S.credit }] },
  { y: 694, cells: [{ text: '09 Jul 2026', x: S.date }, { text: 'Direct Credit Reward Gateway P', x: S.desc }, { text: '+$116.33', x: S.credit }] },
  { y: 676, cells: [{ text: '01 Jul 2026', x: S.date }, { text: 'Direct Credit Stakeshop Pty Lt', x: S.desc }, { text: '+$1,406.01', x: S.credit }] },
  { y: 658, cells: [{ text: '01 Jul 2026', x: S.date }, { text: 'Offset mortgage', x: S.desc }, { text: '-$6,000.00', x: S.debit }] },
  { y: 640, cells: [{ text: '01 Jul 2026', x: S.date }, { text: 'Credit card payment', x: S.desc }, { text: '-$8,800.00', x: S.debit }] },
  { y: 622, cells: [{ text: '01 Jul 2026', x: S.date }, { text: 'Transfer Withdrawal', x: S.desc }, { text: '-$500.00', x: S.debit }] },
];

async function testSigned() {
  console.log('\n── C. Signed +$/-$ Debit/Credit amounts ──');
  const rows = parseTransactions(await extractLines(buildColumnarPdf(SIGNED_ROWS)));
  console.table(rows.map((r) => ({ date: r.date, desc: r.description.slice(0, 28), amount: r.amount, type: r.type, category: r.categoryId })));
  const byDesc = (q: string) => rows.find((r) => r.description.toLowerCase().includes(q));

  assert(rows.length === 6, `detected 6 transactions (got ${rows.length}; header ignored)`);
  // Credits printed as "+$…" must be picked up (the reported bug: all credits missing).
  assert(byDesc('tea white')?.type === 'income' && byDesc('tea white')?.amount === 13, 'Credit "+$13.00" → income +13 (was dropped)');
  assert(byDesc('reward gateway')?.amount === 116.33, 'Credit "+$116.33" → +116.33');
  assert(byDesc('stakeshop')?.amount === 1406.01, 'Credit "+$1,406.01" (comma) → +1406.01');
  // Debits stay negative; a debit whose description says "Credit card" is still an expense.
  assert(byDesc('offset mortgage')?.type === 'expense' && byDesc('offset mortgage')?.amount === -6000, 'Debit "-$6,000.00" → expense -6000');
  assert(byDesc('credit card payment')?.type === 'expense' && byDesc('credit card payment')?.amount === -8800, '"Credit card payment" in Debit column → expense -8800');
  assert(byDesc('transfer withdrawal')?.amount === -500, 'Debit "-$500.00" → -500');
}

async function main() {
  await testSingleColumn();
  await testColumnar();
  await testSigned();
  console.log(failures === 0 ? '\n✅ All import assertions passed.' : `\n❌ ${failures} assertion(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Test crashed:', err);
  process.exit(1);
});
