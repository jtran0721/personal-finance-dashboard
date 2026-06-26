# Personal Finance Tracker Dashboard — Build Checklist

Plan: see `/Users/JT/.claude/plans/generic-yawning-swing.md`.
Decisions: PDF import · bold & colorful theme · seeded sample data · 100% client-side.

## Phase 1 — Scaffold
- [x] Dedicated git repo in project (was nested in home dir)
- [x] Vite + React 18 + TypeScript + path alias `@/`
- [x] Tailwind (bold palette, dark mode) + PostCSS
- [x] ESLint config + npm scripts (dev/build/typecheck/lint/test)
- [x] `.gitignore` (excludes secrets, .env, statement PDFs)

## Phase 2 — Data layer
- [x] Domain types (`src/types`)
- [x] Seed categories with bold colors/icons + budgets
- [x] Keyword auto-categorizer
- [x] Pure analytics helpers (totals, trends, by-category, budget, merchants)
- [x] Sample-data generator (~6 months)
- [x] Zustand store + localStorage persistence + dedupe + seeding

## Phase 3 — Shell & theming
- [x] Toast system, category icons, UI primitives (Modal, Chip, EmptyState, AnimatedNumber)
- [x] Sidebar + mobile bottom nav, Topbar, ThemeToggle, DateRangePicker
- [x] App shell + routing + animated page transitions + theme application + ensureSeeded

## Phase 4 — Overview page
- [x] KPI cards (animated counters + sparklines)
- [x] Trend area chart, category donut, budget progress, recent transactions

## Phase 5 — Transactions
- [x] Filterable/sortable/searchable table + inline category/type edit + bulk recategorize
- [x] Filters wired to global date range, pagination ("show more")

## Phase 6 — PDF import
- [x] pdf.js extraction (`src/lib/pdfImport.ts`) + pure parser (`src/lib/statementParser.ts`)
- [x] Import modal (drag-drop) + review/edit table + dedupe merge (lazy-loaded)
- [x] Manual-add fallback + scanned-PDF ("no text") detection message

## Phase 7 — Budget + Savings/Investments
- [x] Budget page (per-category limits, progress, over-budget alerts, 50/30/20 allocation)
- [x] Savings & Investments page (rate trend, cumulative curve, allocation donut, holdings)

## Phase 8 — Spending/Analytics
- [x] Category breakdown, month-over-month bars, top merchants, click-to-drill-down

## Phase 9 — Polish
- [x] framer-motion animations, responsive (mobile bottom nav), empty/loading states, a11y labels

## Phase 10 — Verify
- [x] typecheck + lint + build clean
- [x] Ran app via preview, screenshot Overview/Budget/Transactions/import modal/light+dark
- [x] End-to-end PDF import smoke test (`npm test`) — real PDF → pdf.js → parser, all assertions pass

## Review

**What was built:** A polished, 100% client-side personal finance dashboard (React + TS + Vite).
Five views (Overview, Transactions, Spending, Budget, Savings & Investments), PDF statement import
with a human-in-the-loop review step, bold & colorful theme with light/dark toggle, and ~6 months of
seeded demo data on first run. All data persists in `localStorage`; statements are parsed in-browser.

**Verification highlights:**
- `npm run typecheck`, `npm run lint`, `npm run build` all clean.
- `npm test` builds a real PDF, extracts it with pd.js, and parses it — 14 assertions pass across
  4 date formats, with correct categories/signs and the amount-vs-balance heuristic.
- Manual UI verification of every page + import modal + theme toggle, no console errors.

**Notable fix during build:** the sample-data generator's `within(28)` guard was always false
(a month's max day is 27), so all variable spending was dropped and Housing showed as ~85% of
expenses. Fixed to pick a day then include it only if it has occurred — spending is now realistic.

**Architecture decision:** split the pure text parser (`statementParser.ts`) from the pd.js
extraction layer (`pdfImport.ts`) so the risky parsing heuristics are unit-testable in Node.

**Known limitations (by design for v1):** scanned/image-only PDFs aren't parsed (detected + messaged,
with manual-add fallback); PDF layouts vary so the review step is essential; no backend/cloud sync.

**Stretch ideas (not built):** CSV import, OCR for scanned PDFs, IndexedDB for very large datasets,
optional encrypted cloud sync, custom category management UI.
