# Lessons

Patterns captured after corrections, with rules to prevent repeats (per CLAUDE.md §3).
Review this file at the start of work on this project.

---

## L1 — Run an explicit CLAUDE.md compliance pass before declaring "done"
**Correction (2026-06-25):** User said "Make sure you go through the CLAUDE.md first." I had finished
and verified the build but skipped Task-Management step 6 ("Capture Lessons") — `tasks/lessons.md` was
never created — and never did a final explicit checklist pass over CLAUDE.md.

**Why it happened:** I treated "verified working" as "done" and tracked progress against my own plan,
not against the CLAUDE.md workflow itself.

**Rule:** Before presenting final results, walk every CLAUDE.md section as a literal checklist and
confirm each item out loud:
- Plan mode used? Re-planned if things went sideways?
- `tasks/todo.md` written, tracked, and given a Review section?
- **`tasks/lessons.md` updated after any user correction?** (the step I missed)
- typecheck + lint run after changes? functional components only? no secrets committed?
- Verified with tests/logs, staff-engineer bar met?

Do this pass as the last step of every task, not only when reminded.

---

## L2 — Validate boundary guards and sanity-check generated data (don't trust "it renders")
**Pattern:** In `src/lib/sampleData.ts`, a guard `within(28)` was always false because a month's max
day is 27, so **all** variable spending was silently dropped. The app rendered with no error, but the
Spending donut showed Housing at ~85% of expenses. Only a screenshot exposed it.

**Rule:** When generating/seeding data with boundary-dependent conditions, (a) check the guard against
its real bounds, (b) prefer "compute the value, then test it against the actual bound" over a
magic-number guard, and (c) sanity-check aggregate distributions visually/numerically — "it renders"
is not verification.

---

## L3 — Keep risky/heuristic logic in pure modules so it's testable
**Pattern:** The statement parser started inside the pd.js module, which imports a Vite-only
`?url` worker — impossible to unit-test in Node. Splitting `src/lib/statementParser.ts` (pure) from
`src/lib/pdfImport.ts` (pd.js extraction) enabled a real end-to-end Node test (`npm test`).

**Rule:** Isolate the highest-risk logic (parsers, heuristics, money math) into modules with no
framework/browser/bundler imports, so it can be tested directly. Do this up front, not as a retrofit.

---

## Open tension to resolve with the user
- **CLAUDE.md §2 ("use subagents liberally")** conflicts with my harness instruction
  ("do not spawn agents unless the user asks"). This session used none. Need the user's preference on
  which wins for this project so future sessions are consistent.
