import type { ParsedRow } from '@/types';
import { categorize } from './categorize';

/**
 * Pure statement-text → transactions parser. Kept free of any pdf.js / browser
 * dependency so it can be unit-tested in isolation and reused for other inputs.
 */

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
const AMOUNT_RE = /[-(]?\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})\)?-?/g;

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
    const value = Number(raw.replace(/[(),$\s-]/g, ''));
    if (Number.isFinite(value) && value > 0) {
      tokens.push({ value, negative, index: match.index ?? 0, raw: raw.trim() });
    }
  }
  return tokens;
}

let parseCounter = 0;

/**
 * Parse reconstructed statement lines into candidate transactions. Heuristic and
 * tolerant: a line is a transaction when it starts with a date and contains at
 * least one monetary amount. Text between the date and the first amount is the
 * description. Every row is reviewed by the user before import.
 */
export function parseTransactions(lines: string[]): ParsedRow[] {
  const rows: ParsedRow[] = [];
  for (const line of lines) {
    const dateMatch = parseLeadingDate(line);
    if (!dateMatch) continue;
    const amounts = findAmounts(dateMatch.rest);
    if (amounts.length === 0) continue;

    // First amount after the description is the transaction amount; a trailing
    // amount (if present) is treated as a running balance and ignored.
    const amountTok = amounts[0];
    const description = dateMatch.rest.slice(0, amountTok.index).replace(/\s+/g, ' ').trim();
    if (description.length < 2) continue;

    const markerSign = amountTok.negative ? -1 : 0;
    const signedGuess = markerSign === -1 ? -amountTok.value : amountTok.value;
    const { categoryId, type, confidence } = categorize(description, signedGuess);
    const sign = markerSign === -1 ? -1 : type === 'income' ? 1 : -1;

    parseCounter += 1;
    rows.push({
      id: `parsed-${Date.now().toString(36)}-${parseCounter}`,
      date: dateMatch.iso,
      description,
      amount: Number((sign * amountTok.value).toFixed(2)),
      type,
      categoryId,
      confidence,
      include: true,
      raw: line,
    });
  }
  return rows;
}
