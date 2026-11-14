import type { PersistStorage, StorageValue } from 'zustand/middleware';

/**
 * zustand `persist` storage that keeps the app's data on the server (SQLite via `/api/state`)
 * and per-device UI preferences in localStorage.
 *
 * Data-loss guard: nothing is written until the first successful load. If the server can't be
 * reached, the in-memory defaults/sample data never overwrite what's stored.
 */

type State = Record<string, unknown>;

/** Fields kept per-device in localStorage; everything else is saved on the server. */
const PREF_KEYS = ['theme', 'dateRange'];
const PREFS_KEY = 'fintrack-prefs';

export function splitState(state: State): { data: State; prefs: State } {
  const data = { ...state };
  const prefs: State = {};
  for (const key of PREF_KEYS) {
    if (key in data) {
      prefs[key] = data[key];
      delete data[key];
    }
  }
  return { data, prefs };
}

export function mergeState(server: StorageValue<State> | null, prefs: State): StorageValue<State> | null {
  if (!server) return Object.keys(prefs).length ? { state: prefs } : null;
  return { ...server, state: { ...server.state, ...prefs } };
}

type LocalStore = Pick<Storage, 'getItem' | 'setItem'>;

function readPrefs(local: LocalStore): State {
  try {
    const value: unknown = JSON.parse(local.getItem(PREFS_KEY) ?? '{}');
    return value && typeof value === 'object' ? (value as State) : {};
  } catch {
    return {};
  }
}

interface Options {
  url?: string;
  fetchFn?: typeof fetch;
  local?: LocalStore;
  onSaveError?: (err: unknown) => void;
}

export function createServerStorage<S>({
  url = '/api/state',
  fetchFn = fetch,
  local = localStorage,
  onSaveError,
}: Options = {}): PersistStorage<S> {
  let loaded = false;
  let lastSaved: string | undefined;
  let queue = Promise.resolve();

  return {
    async getItem() {
      const res = await fetchFn(url);
      if (!res.ok && res.status !== 404) throw new Error(`Failed to load data (HTTP ${res.status})`);
      const server = res.ok ? ((await res.json()) as StorageValue<State>) : null;
      loaded = true;
      return mergeState(server, readPrefs(local)) as StorageValue<S> | null;
    },

    setItem(_name, value) {
      if (!loaded) return;
      const { data, prefs } = splitState(value.state as State);
      try {
        local.setItem(PREFS_KEY, JSON.stringify(prefs));
      } catch {
        // Prefs are a per-device convenience; losing them is harmless.
      }

      // Skip the round-trip when only prefs changed (e.g. theme toggle).
      const body = JSON.stringify({ state: data, version: value.version });
      if (body === lastSaved) return;
      lastSaved = body;

      // Chain saves so they reach the server in order.
      queue = queue
        .then(async () => {
          const res = await fetchFn(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
          if (!res.ok) throw new Error(`Failed to save data (HTTP ${res.status})`);
        })
        .catch((err: unknown) => {
          lastSaved = undefined;
          onSaveError?.(err);
        });
      return queue;
    },

    // Nothing in the app removes the snapshot; "Clear all data" saves an empty one instead.
    removeItem() {},
  };
}
