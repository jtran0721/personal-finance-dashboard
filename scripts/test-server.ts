/**
 * API test for the SQLite-backed server (run via `npm test`).
 *
 * Starts the real server on a random port against a temp DB file and checks the
 * snapshot round-trip, input validation, and that data survives a restart.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../server/index';

let failures = 0;
function assert(cond: boolean, msg: string) {
  console.log(`  ${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) failures += 1;
}

async function start(dbFile: string): Promise<{ server: Server; url: string }> {
  const server = createApp(dbFile);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${port}/api/state` };
}

const stop = (server: Server) => new Promise<void>((resolve) => server.close(() => resolve()));

const dir = mkdtempSync(path.join(tmpdir(), 'fintrack-test-'));
const dbFile = path.join(dir, 'nested', 'fintrack.db');
const snapshot = JSON.stringify({ state: { transactions: [{ id: 't1', amount: -12.5 }], seeded: true }, version: 5 });

try {
  let { server, url } = await start(dbFile);

  assert((await fetch(url)).status === 404, 'GET on an empty DB returns 404');
  assert((await fetch(url, { method: 'PUT', body: snapshot })).status === 204, 'PUT stores a snapshot (204)');
  const got = await fetch(url);
  assert(got.status === 200 && (await got.text()) === snapshot, 'GET returns exactly what was stored');

  assert((await fetch(url, { method: 'PUT', body: 'not json' })).status === 400, 'PUT rejects invalid JSON (400)');
  assert((await fetch(url, { method: 'PUT', body: '[1,2]' })).status === 400, 'PUT rejects non-object JSON (400)');
  assert((await (await fetch(url)).text()) === snapshot, 'rejected PUTs leave the stored snapshot untouched');
  assert((await fetch(url, { method: 'DELETE' })).status === 405, 'unsupported method returns 405');
  assert((await fetch(url.replace('/state', '/health'))).status === 200, 'health endpoint returns 200');

  await stop(server);
  ({ server, url } = await start(dbFile));
  assert((await (await fetch(url)).text()) === snapshot, 'snapshot survives a server restart');
  await stop(server);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (failures) {
  console.error(`\n❌ ${failures} server assertion(s) failed.`);
  process.exit(1);
}
console.log('\n✅ Server assertions passed.');
