# FinTrack — Personal Finance Tracker Dashboard

A polished, **100% client-side** personal finance dashboard. Import your bank statements as PDFs and
track income, expenses, investments, saving patterns and budgets — all parsed and stored entirely in
your browser. No account, no backend, nothing leaves your device.

Built with **React 18 + TypeScript + Vite**, Tailwind CSS, Recharts, Zustand and pdf.js.

> **Privacy:** statements are parsed in-browser with pdf.js and data persists only in `localStorage`.
> Clearing your browser data clears the app. There is no server.

## Features

- **Overview** — animated KPI cards (income, expenses, net savings, savings rate, invested), an
  income-vs-expenses trend chart, category-spending donut, this month's budget, and recent activity.
- **Transactions** — searchable, sortable, filterable table with **inline category/type editing**,
  bulk recategorize, and full add/edit/delete.
- **Spending** — category breakdown, top merchants, month-over-month bars, and **click-to-drill-down**
  into the transactions behind any category.
- **Budget** — set a monthly limit per category, track progress with over-budget alerts, and see a
  **50 / 30 / 20** needs/wants/savings allocation vs. targets.
- **Savings & Investments** — savings-rate trend, cumulative savings curve, and investment allocation.
- **PDF import** — drag-and-drop a statement; transactions are auto-detected and categorized, then you
  **review and correct every row** before importing (duplicates are skipped on merge).
- Bold, colorful UI with a **light/dark toggle**, smooth animations, and a responsive mobile layout.
- **Seeded sample data** on first run so every chart is alive immediately — clear it anytime from the
  top-right menu.

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production (`dist/`) |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (zero warnings allowed) |
| `npm test` | End-to-end import smoke test: builds a PDF, extracts with pdf.js, runs the parser |

## Importing bank statements (read this)

PDF statements vary enormously between banks, so import is **heuristic + human-in-the-loop**:

1. Text is extracted with pdf.js and reconstructed into lines.
2. Lines that start with a date and contain an amount are treated as transactions; the description is
   auto-categorized by keyword rules.
3. **You review every parsed row** — low-confidence rows are highlighted — and can fix the date,
   description, amount, category, or deselect junk rows before importing.

Limitations:

- **Scanned / image-only PDFs** (no text layer) cannot be read automatically. The app detects this and
  prompts you to **add transactions manually** instead.
- Sign detection prefers explicit cues (parentheses/minus); otherwise it's inferred from the category.
  Always glance at the review table before importing.

## Project structure

```
src/
  types/              Domain model (Transaction, Category, …)
  lib/
    analytics.ts      Pure metrics: totals, trends, by-category, budget, merchants
    categorize.ts     Keyword → category/type rules
    statementParser.ts Pure statement-text → transactions (unit-tested)
    pdfImport.ts      pdf.js text extraction (delegates parsing to statementParser)
    sampleData.ts     ~6 months of realistic demo transactions
    categories.ts     Seed categories (colors, icons, default budgets)
    format.ts         Currency / percent / date formatters
  store/useStore.ts   Zustand store + localStorage persistence + dedupe + seeding
  hooks/              useFiltered (date-range selector), useImport (modal control)
  components/         layout · ui · charts · transactions · dashboard · import
  pages/              Overview · Transactions · Spending · Budget · Savings
scripts/test-import.ts End-to-end import test
```

## Tech stack

React 18 · TypeScript · Vite · Tailwind CSS · Recharts · Zustand · pdf.js (`pdfjs-dist`) ·
framer-motion · date-fns · lucide-react.
