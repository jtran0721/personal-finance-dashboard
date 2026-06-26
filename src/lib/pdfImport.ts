import * as pdfjsLib from 'pdfjs-dist';
// Vite resolves `?url` to the bundled worker file path.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ParsedRow } from '@/types';
import { parseTransactions } from './statementParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/** A single text fragment from pdf.js with its page position. */
interface TextFragment {
  str: string;
  x: number;
  y: number;
}

export interface ExtractResult {
  lines: string[];
  pageCount: number;
  /** False when the PDF has no extractable text (likely a scanned/image PDF). */
  hadText: boolean;
}

/**
 * Pull text out of a PDF and reconstruct visual lines by grouping fragments
 * that share a y-coordinate, then ordering left-to-right.
 */
export async function extractLines(file: File): Promise<ExtractResult> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const lines: string[] = [];
  let charCount = 0;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const fragments: TextFragment[] = [];
    for (const it of content.items) {
      // TextItem has `str`/`transform`; TextMarkedContent does not — `in` narrows the union.
      if ('str' in it) {
        fragments.push({ str: it.str, x: it.transform[4], y: it.transform[5] });
      }
    }

    // Bucket fragments into rows by rounded y (PDF y grows upward).
    const rows = new Map<number, TextFragment[]>();
    for (const f of fragments) {
      charCount += f.str.trim().length;
      const key = Math.round(f.y / 3) * 3; // ~3pt tolerance
      const bucket = rows.get(key) ?? [];
      bucket.push(f);
      rows.set(key, bucket);
    }

    [...rows.entries()]
      .sort((a, b) => b[0] - a[0]) // top of page first
      .forEach(([, frags]) => {
        const line = frags
          .sort((a, b) => a.x - b.x)
          .map((f) => f.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (line) lines.push(line);
      });
  }

  return { lines, pageCount: pdf.numPages, hadText: charCount > 20 };
}

/** High-level: read a PDF File and return candidate rows + metadata. */
export async function importPdf(file: File): Promise<ExtractResult & { rows: ParsedRow[] }> {
  const extracted = await extractLines(file);
  const rows = extracted.hadText ? parseTransactions(extracted.lines) : [];
  return { ...extracted, rows };
}
