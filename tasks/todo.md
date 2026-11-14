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

---

# Dependency refresh — safe in-range updates (2026-11-14)

Branch: `chore/update-deps` (new, off `main` @ 507dbd9). Scope agreed with user: patch/minor only.
Majors (Tailwind 4, ESLint 10, React 19, Recharts 3, Vite 8, Zustand 5, pdfjs 6, TS 7…) deferred —
each is a migration, not a bump.

- [x] `npm update` (lockfile only; package.json ranges unchanged)
- [x] `npm outdated` shows Current = Wanted for every package
- [x] typecheck + lint + `npm test` + `npm run build` clean
- [x] App runs in the browser: pages route, styles render, no console errors
- [x] Commit (`chore:`), push `-u` to the new branch

## Review

- **Bumped (in-range):** autoprefixer 10.5.2→10.6.2, postcss 8.5.15→8.5.33, react-router-dom
  6.30.4→6.30.6, tsx 4.22.4→4.23.15, plus transitive deps. Only `package-lock.json` changed.
- **Verified:** typecheck + lint clean; `npm test` (import + sample-data) passes; production build OK;
  all 5 routes navigate in the browser with no console errors.
- **Security:** `npm audit` 18 (7 high) → 10 (1 high). All 10 remaining need majors and reduce to 3
  issues: minimatch ReDoS via @typescript-eslint (lint-only); Vite/esbuild dev-server issues
  (dev-only — Docker serves static files via nginx); React Router open redirect via `\` in
  `<Link>`/`useNavigate` (ships, but every link targets a fixed internal route). These make Vite,
  React Router 7 and typescript-eslint 8 the most worthwhile of the deferred majors.
- **Note:** npm skipped install scripts for esbuild/fsevents (not in `allowScripts`); tooling works
  regardless (tests + build pass). Approving them is the user's call.
