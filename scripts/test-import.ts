/**
 * End-to-end import smoke test (run: `npx tsx scripts/test-import.ts`).
 *
 * 1. Builds a valid, text-based bank-statement PDF in memory.
 * 2. Extracts text with pdf.js (the same engine the app uses).
 * 3. Runs the extracted lines through the real statement parser.
 * 4. Asserts transactions, categories, signs and dates are detected correctly.
 */
import { Buffer } from 'node:buffer';
import { parseTransactions } from '../src/lib/statementParser';

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

// ── Minimal valid PDF writer ─────────────────────────────────
function buildPdf(lines: string[]): Uint8Array {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  let content = 'BT\n/F1 10 Tf\n50 720 Td\n14 TL\n';
  content += lines.map((l, i) => (i === 0 ? `(${esc(l)}) Tj` : `T*\n(${esc(l)}) Tj`)).join('\n');
  content += '\nET';

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

// ── pdf.js text extraction (mirrors src/lib/pdfImport extractLines) ──
async function extractLines(data: Uint8Array): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const rows = new Map<number, { str: string; x: number }[]>();
    for (const it of content.items as { str?: string; transform?: number[] }[]) {
      if (typeof it.str !== 'string' || !it.transform) continue;
      const key = Math.round(it.transform[5] / 3) * 3;
      (rows.get(key) ?? rows.set(key, []).get(key)!).push({ str: it.str, x: it.transform[4] });
    }
    [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, frags]) => {
        const line = frags.sort((a, b) => a.x - b.x).map((f) => f.str).join(' ').replace(/\s+/g, ' ').trim();
        if (line) lines.push(line);
      });
  }
  return lines;
}

// ── Assertions ───────────────────────────────────────────────
let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    console.error(`  ✗ ${msg}`);
    failures += 1;
  }
}

async function main() {
  console.log('Building sample statement PDF…');
  const pdfBytes = buildPdf(STATEMENT_LINES);
  console.log(`  PDF size: ${pdfBytes.length} bytes`);

  console.log('Extracting text with pdf.js…');
  const lines = await extractLines(pdfBytes);
  console.log(`  extracted ${lines.length} lines`);

  console.log('Parsing transactions…');
  const rows = parseTransactions(lines);
  console.table(rows.map((r) => ({ date: r.date, desc: r.description.slice(0, 26), amount: r.amount, type: r.type, category: r.categoryId })));

  const byDesc = (q: string) => rows.find((r) => r.description.toLowerCase().includes(q));

  assert(rows.length === 8, `detected 8 transactions (got ${rows.length}; the header line is correctly ignored)`);
  assert(byDesc('whole foods')?.categoryId === 'groceries', 'Whole Foods → groceries');
  assert((byDesc('whole foods')?.amount ?? 0) < 0, 'Whole Foods amount is negative (-82.14)');
  assert(byDesc('whole foods')?.amount === -82.14, 'Whole Foods uses the first amount, not the balance');
  assert(byDesc('starbucks')?.categoryId === 'dining', 'Starbucks → dining');
  assert(byDesc('uber')?.categoryId === 'transport', 'Uber → transport');
  const pay = byDesc('payroll');
  assert(pay?.type === 'income' && (pay?.amount ?? 0) > 0, 'Payroll → income, positive (+3250)');
  assert(pay?.date === '2026-01-09', 'Payroll ISO date parsed (2026-01-09)');
  assert(byDesc('vanguard')?.type === 'investment', 'Vanguard → investment');
  assert(byDesc('vanguard')?.date === '2026-01-12', '"Jan 12, 2026" date parsed → 2026-01-12');
  assert(byDesc('netflix')?.categoryId === 'subscriptions', 'Netflix → subscriptions');
  const pge = byDesc('pg&e');
  assert(pge?.categoryId === 'utilities', 'PG&E → utilities');
  assert(pge?.date === '2026-01-15', '"15 Jan 2026" date parsed → 2026-01-15');
  assert(byDesc('savings')?.type === 'transfer', 'Transfer to Savings → transfer');

  console.log(failures === 0 ? '\n✅ All import assertions passed.' : `\n❌ ${failures} assertion(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Test crashed:', err);
  process.exit(1);
});
