/**
 * Tests for the server-backed persist storage (run via `npm test`).
 *
 * Most important: the data-loss guard — nothing may be written to the server before a
 * successful load, so an unreachable server can't get overwritten with sample data.
 */
import { createServerStorage, mergeState, splitState } from '../src/lib/storage';

let failures = 0;
function assert(cond: boolean, msg: string) {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) failures += 1;
}

/** In-memory stand-ins for the API and localStorage. */
function fakes(initial: string | null, opts: { down?: boolean; failPut?: boolean } = {}) {
  let stored = initial;
  const puts: string[] = [];
  const localData = new Map<string, string>();
  const fetchFn = (async (_url: string, init?: RequestInit) => {
    if (opts.down) throw new TypeError('fetch failed');
    if (init?.method === 'PUT') {
      if (opts.failPut) return new Response(null, { status: 500 });
      stored = String(init.body);
      puts.push(stored);
      return new Response(null, { status: 204 });
    }
    return stored === null ? new Response(null, { status: 404 }) : new Response(stored, { status: 200 });
  }) as typeof fetch;
  const local = { getItem: (k: string) => localData.get(k) ?? null, setItem: (k: string, v: string) => void localData.set(k, v) };
  return { fetchFn, local, localData, puts, stored: () => stored };
}

const state = { transactions: [{ id: 't1' }], categories: [], seeded: true, theme: 'light', dateRange: { preset: 'ytd' } };

// ── Pure split/merge ──
const { data, prefs } = splitState(state);
assert(!('theme' in data) && !('dateRange' in data) && 'transactions' in data, 'split: prefs removed from server data');
assert(prefs.theme === 'light' && 'dateRange' in prefs && !('transactions' in prefs), 'split: prefs hold only theme + dateRange');
assert(JSON.stringify(mergeState({ state: data, version: 5 }, prefs)) === JSON.stringify({ state: { ...data, ...prefs }, version: 5 }), 'merge: recombines server data + prefs, keeps version');
assert(mergeState(null, {}) === null, 'merge: nothing stored anywhere → null');
assert(JSON.stringify(mergeState(null, { theme: 'light' })) === '{"state":{"theme":"light"}}', 'merge: prefs only → prefs without a version');

// ── Data-loss guard ──
{
  const f = fakes(JSON.stringify({ state: data, version: 5 }), { down: true });
  const storage = createServerStorage({ fetchFn: f.fetchFn, local: f.local });
  let threw = false;
  await storage.getItem('x').catch(() => { threw = true; });
  await storage.setItem('x', { state: { ...state, transactions: [] }, version: 5 });
  assert(threw, 'load throws when the server is unreachable');
  assert(f.puts.length === 0 && f.localData.size === 0, 'no writes at all after a failed load');
}
{
  const f = fakes(null);
  const storage = createServerStorage({ fetchFn: f.fetchFn, local: f.local });
  await storage.setItem('x', { state, version: 5 });
  assert(f.puts.length === 0, 'no writes before the first load');
}

// ── Normal round-trip ──
{
  const f = fakes(null);
  const storage = createServerStorage({ fetchFn: f.fetchFn, local: f.local });
  assert((await storage.getItem('x')) === null, 'empty server + no prefs loads as null');
  await storage.setItem('x', { state, version: 5 });
  assert(f.puts.length === 1 && !f.stored()!.includes('theme'), 'save sends data (without prefs) to the server');
  assert(f.localData.get('fintrack-prefs')!.includes('"light"'), 'save keeps prefs in localStorage');

  await storage.setItem('x', { state: { ...state, theme: 'dark' }, version: 5 });
  assert(f.puts.length === 1, 'prefs-only change skips the server round-trip');

  const reloaded = await createServerStorage({ fetchFn: f.fetchFn, local: f.local }).getItem('x');
  assert(JSON.stringify(reloaded) === JSON.stringify({ state: { ...data, theme: 'dark', dateRange: state.dateRange }, version: 5 }), 'a fresh load returns server data + local prefs');
}

// ── Save failures are reported, then retried on the next change ──
{
  const f = fakes(null, { failPut: true });
  const errors: unknown[] = [];
  const storage = createServerStorage({ fetchFn: f.fetchFn, local: f.local, onSaveError: (e) => errors.push(e) });
  await storage.getItem('x');
  await storage.setItem('x', { state, version: 5 });
  assert(errors.length === 1, 'failed save calls onSaveError');
  await storage.setItem('x', { state, version: 5 });
  assert(errors.length === 2, 'same data is retried after a failed save');
}

if (failures) {
  console.error(`\n❌ ${failures} storage assertion(s) failed.`);
  process.exit(1);
}
console.log('\n✅ Storage assertions passed.');
