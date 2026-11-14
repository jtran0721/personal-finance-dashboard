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

---

# Server-side storage — SQLite on the Pi (2026-11-14)

Goal: data survives browser resets. Decisions (user): **snapshot in SQLite**, **start fresh** (no
import of current browser data), **theme + date range stay per-device** in localStorage.

Branch: `feat/sqlite-storage` off latest remote `main`.

## Design
- `server/index.ts` — zero-dependency Node API using built-in `node:sqlite` (no native build on ARM).
  `GET /api/state` → stored snapshot (or 404 if empty); `PUT /api/state` → upsert. One table, one row.
  DB file at `$DATA_DIR/fintrack.db`, kept in a Docker volume.
- Store keeps `zustand/persist`, but with a custom storage adapter (new `src/lib/storage.ts`):
  - `transactions`, `categories`, `seeded` (+ persist version) → server
  - `theme`, `dateRange` → localStorage under a new key `fintrack-prefs`
  - Old `fintrack-store` key is left untouched (not read, not deleted) as a manual safety net.
  - Split/merge logic is pure → unit-tested (lesson L3).
- **Data-loss guard:** storage is now async. The app waits for hydration before `ensureSeeded()` /
  rendering; if the server can't be reached it shows an error screen instead of seeding sample
  data and overwriting the DB.
- Deploy: `docker-compose.yml` gains an `api` service (node:22-alpine) + named volume
  `fintrack-data`; nginx proxies `/api/` → `api:3001` and raises `client_max_body_size`.
- Dev: Vite proxies `/api` → `localhost:3001`; new `npm run server` script.

## Steps
- [x] 1. Server + tests (empty GET, PUT/GET round-trip, bad JSON rejected) → verify: `npm test`
- [x] 2. Storage adapter + split/merge tests → verify: `npm test`
- [x] 3. Wire adapter into store; hydration gate + server-down screen in `App.tsx` → verify: typecheck + lint
- [x] 4. Vite dev proxy + `npm run server` → verify: run app in browser, edit data, clear site data, reload — data still there
- [x] 5. Dockerfile/compose/nginx → verify: `docker compose up --build`, same browser-reset test, `docker compose down && up` keeps data
- [x] 6. README: Pi deploy + backup/restore of the DB
- [ ] 7. Commit (`feat:`), push, PR

## Known tradeoffs
- Whole snapshot rewritten on each change — fine at personal scale (thousands of txns ≈ <1 MB).
- Two devices editing at the same time: last write wins.
- No auth on the API — same as today's app, fine on a home LAN; don't port-forward it to the internet.
- First load against an empty DB seeds sample data (existing behaviour); "Clear all data" removes it.

## Review

- **Built:** `server/index.ts` (zero-dep Node + `node:sqlite`, one-row snapshot table), `src/lib/storage.ts`
  (persist adapter: data → API, theme/dateRange → `fintrack-prefs`), hydration gate + "can't reach server"
  screen + save-failure toast in `App.tsx`, `api` Docker stage/service + `fintrack-data` volume, nginx `/api/`
  proxy (runtime DNS so nginx starts without the API, 20 MB body limit), Vite dev proxy, README.
- **Verified:** typecheck (app + server) + lint clean; `npm test` incl. 9 server + 15 storage assertions
  (data-loss guard: no writes before a successful load). Ran the real store against the dev servers and
  the Docker stack: seed + edit saved → reload with wiped localStorage keeps all 226 txns → API
  unreachable leaves the DB untouched. Data survived `docker compose down`/`up`; nginx returns 502
  while the API is stopped and recovers on restart; 2.6 MB save through nginx OK.
- **Found while testing:** restoring a backup with `docker compose cp` leaves the DB owned by the host
  uid → saves fail (500). README restore steps include the `chown`; verified saves work after it.
- **Not verified:** clicking through the UI in a real browser (Chrome extension wasn't connected) —
  the loading/error screens and toast are type-checked but not seen rendered.
- **Unrelated, left alone:** `package.json` description still says "all in your browser".
