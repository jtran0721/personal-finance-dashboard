import type { ParsedRow, TxType } from '@/types';
import { categorize } from './categorize';

/**
 * Pure statement-text → transactions parser. Kept free of any pdf.js / browser
 * dependency so it can be unit-tested in isolation and reused for other inputs.
 */

// ── Shared shapes (produced by the pdf.js extractor) ─────────
/** A positioned text fragment on a line. `x` is the left edge in PDF units. */
export interface Cell {
  str: string;
  x: number;
  width: number;
}

/** A reconstructed statement line: the joined text plus its positioned cells. */
export interface StatementLine {
  text: string;
  cells: Cell[];
}

// ── Date parsing ─────────────────────────────────────────────
const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (n: number) => String(n).padStart(2, '0');
const fourDigitYear = (y: number) => (y < 100 ? 2000 + y : y);

function iso(y: number, mo: number, d: number, rest: string): { iso: string; rest: string } | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { iso: `${y}-${pad(mo)}-${pad(d)}`, rest };
}

/** Try to read a leading date token from a line. Returns ISO `yyyy-MM-dd` + remainder, or null. */
export function parseLeadingDate(line: string): { iso: string; rest: string } | null {
  // MM/DD/YYYY or MM/DD/YY or MM-DD-YYYY (US order assumed)
  let m = line.match(/^\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) return iso(fourDigitYear(+m[3]), +m[1], +m[2], line.slice(m[0].length));
  // YYYY-MM-DD
  m = line.match(/^\s*(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3], line.slice(m[0].length));
  // DD Mon YYYY  (e.g. "05 Jan 2026")
  m = line.match(/^\s*(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{2,4})/);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()]) {
    return iso(fourDigitYear(+m[3]), MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1], line.slice(m[0].length));
  }
  // Mon DD, YYYY  (e.g. "Jan 5, 2026")
  m = line.match(/^\s*([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{2,4})/);
  if (m && MONTHS[m[1].slice(0, 3).toLowerCase()]) {
    return iso(fourDigitYear(+m[3]), MONTHS[m[1].slice(0, 3).toLowerCase()], +m[2], line.slice(m[0].length));
  }
  // MM/DD with no year — assume current year.
  m = line.match(/^\s*(\d{1,2})\/(\d{1,2})(?!\S)/);
  if (m) return iso(new Date().getFullYear(), +m[1], +m[2], line.slice(m[0].length));
  return null;
}

// ── Amount parsing ───────────────────────────────────────────
const AMOUNT_RE = /[-+(]?\$?\s?(?:\d{1,3}(?:,\d{3})*|\d+)\.\d{2}\)?-?/g;

interface AmountToken {
  value: number; // absolute magnitude
  negative: boolean;
  index: number;
  raw: string;
}

export function findAmounts(text: string): AmountToken[] {
  const tokens: AmountToken[] = [];
  for (const match of text.matchAll(AMOUNT_RE)) {
    const raw = match[0];
    const negative = /^\(|\)$|^-|-$/.test(raw.trim());
    const value = Number(raw.replace(/[+(),$\s-]/g, ''));
    if (Number.isFinite(value) && value > 0) {
      tokens.push({ value, negative, index: match.index ?? 0, raw: raw.trim() });
    }
  }
  return tokens;
}

/** Parse a single cell's text as a monetary amount, or null if it isn't one. */
const CELL_AMOUNT_RE = /^[-+(]?\$?\s?(?:\d{1,3}(?:,\d{3})*|\d+)\.\d{2}\)?\s?-?$/;
function cellAmount(str: string): number | null {
  const s = str.trim();
  if (!CELL_AMOUNT_RE.test(s)) return null;
  const value = Number(s.replace(/[+(),$\s-]/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

// ── Debit / credit column detection ──────────────────────────
type ColKind = 'debit' | 'credit' | 'balance';
interface Column {
  kind: ColKind;
  /** Left-edge x of the header word (amounts are right-aligned to the right of it). */
  anchor: number;
}

// Header words → column kind. Matched anywhere in a cell so plural/parenthetical
// labels like "Debits" and "Credits (-)" are recognized.
const DEBIT_RE = /\b(debits?|withdrawals?|dr)\b/i;
const CREDIT_RE = /\b(credits?|deposits?|cr)\b/i;
const BALANCE_RE = /\b(balances?|bal)\b/i;
const HEADER_LABEL: { kind: ColKind; re: RegExp }[] = [
  { kind: 'debit', re: DEBIT_RE },
  { kind: 'credit', re: CREDIT_RE },
  { kind: 'balance', re: BALANCE_RE },
];

/**
 * Detect debit/credit(/balance) columns from a header row. Returns the columns
 * (sorted left→right by header x), or null when there are no debit/credit columns.
 */
function detectColumns(lines: StatementLine[]): Column[] | null {
  for (const line of lines) {
    if (!DEBIT_RE.test(line.text) || !CREDIT_RE.test(line.text)) continue;

    const cols: Column[] = [];
    for (const cell of line.cells) {
      for (const { kind, re } of HEADER_LABEL) {
        if (re.test(cell.str) && !cols.some((c) => c.kind === kind)) {
          cols.push({ kind, anchor: cell.x });
        }
      }
    }
    if (cols.some((c) => c.kind === 'debit') && cols.some((c) => c.kind === 'credit')) {
      return cols.sort((a, b) => a.anchor - b.anchor);
    }
  }
  return null;
}

/**
 * Which column an amount belongs to. Amounts are right-aligned while headers are
 * usually left-aligned, so assign to the last column whose header starts at or
 * before the amount's right edge.
 */
function columnAt(rightEdge: number, cols: Column[]): ColKind {
  let pick = cols[0];
  for (const c of cols) {
    if (c.anchor <= rightEdge + 2) pick = c;
  }
  return pick.kind;
}

// ── Categorization reconciled with money direction ───────────
interface Directional {
  type: TxType;
  categoryId: string;
  confidence: number;
}

/**
 * Categorize using the description, but let the money *direction* (from the
 * debit/credit column) win: credits are income (money in); debits are never
 * income (money out → expense / investment / transfer).
 */
function classifyDirectional(description: string, value: number, isCredit: boolean): Directional {
  const g = categorize(description, isCredit ? value : -value);
  if (isCredit) {
    return {
      type: 'income',
      categoryId: g.type === 'income' ? g.categoryId : 'other-income',
      confidence: g.confidence,
    };
  }
  return {
    type: g.type === 'income' ? 'expense' : g.type,
    categoryId: g.type === 'income' ? 'uncategorized' : g.categoryId,
    confidence: g.confidence,
  };
}

let parseCounter = 0;
function makeRow(
  date: string,
  description: string,
  amount: number,
  type: TxType,
  categoryId: string,
  confidence: number,
  raw: string,
): ParsedRow {
  parseCounter += 1;
  return {
    id: `parsed-${Date.now().toString(36)}-${parseCounter}`,
    date,
    description,
    amount: Number(amount.toFixed(2)),
    type,
    categoryId,
    confidence,
    include: true,
    raw,
  };
}

/** Description = text between the date and the first amount on the line. */
function descriptionOf(rest: string): string {
  const amounts = findAmounts(rest);
  const end = amounts.length ? amounts[0].index : rest.length;
  return rest.slice(0, end).replace(/\s+/g, ' ').trim();
}

/** Column-aware parse: direction comes from the debit/credit column position. */
function parseColumnarLine(line: StatementLine, dateMatch: { iso: string; rest: string }, cols: Column[]): ParsedRow | null {
  const amountCells = line.cells
    .map((c) => {
      const value = cellAmount(c.str);
      return value === null ? null : { value, right: c.x + c.width };
    })
    .filter((a): a is { value: number; right: number } => a !== null);
  if (amountCells.length === 0) return null;

  // The transaction amount sits in the debit or credit column; a balance-column
  // amount is the running balance and is ignored.
  const txn = amountCells.find((a) => columnAt(a.right, cols) !== 'balance');
  if (!txn) return null;
  const isCredit = columnAt(txn.right, cols) === 'credit';

  const description = descriptionOf(dateMatch.rest);
  if (description.length < 2) return null;

  const { type, categoryId, confidence } = classifyDirectional(description, txn.value, isCredit);
  const amount = isCredit ? txn.value : -txn.value;
  // Direction is certain (from the column), so floor the review confidence.
  return makeRow(dateMatch.iso, description, amount, type, categoryId, Math.max(confidence, 0.7), line.text);
}

/** Fallback parse for statements without debit/credit columns: infer sign from markers/category. */
function parseHeuristicLine(line: StatementLine, dateMatch: { iso: string; rest: string }): ParsedRow | null {
  const amounts = findAmounts(dateMatch.rest);
  if (amounts.length === 0) return null;
  const amountTok = amounts[0];
  const description = dateMatch.rest.slice(0, amountTok.index).replace(/\s+/g, ' ').trim();
  if (description.length < 2) return null;

  const markerSign = amountTok.negative ? -1 : 0;
  const signedGuess = markerSign === -1 ? -amountTok.value : amountTok.value;
  const { categoryId, type, confidence } = categorize(description, signedGuess);
  const sign = markerSign === -1 ? -1 : type === 'income' ? 1 : -1;
  return makeRow(dateMatch.iso, description, sign * amountTok.value, type, categoryId, confidence, line.text);
}

/**
 * Parse reconstructed statement lines into candidate transactions. When the
 * statement has Debit/Credit columns, the column an amount sits in determines
 * its direction (debit → money out, credit → money in); otherwise we fall back
 * to marker/category sign inference. Every row is reviewed before import.
 */
export function parseTransactions(lines: StatementLine[]): ParsedRow[] {
  const cols = detectColumns(lines);
  const rows: ParsedRow[] = [];
  for (const line of lines) {
    const dateMatch = parseLeadingDate(line.text);
    if (!dateMatch) continue;
    const row = cols ? parseColumnarLine(line, dateMatch, cols) : parseHeuristicLine(line, dateMatch);
    if (row) rows.push(row);
  }
  return rows;
}
