/**
 * FinTrack API — persists the app's data snapshot in SQLite so it survives browser resets.
 *
 *   GET /api/state  → the stored snapshot (JSON), or 404 if nothing has been saved yet
 *   PUT /api/state  → replace the snapshot
 *   GET /api/health → 200 (container healthcheck)
 *
 * Zero dependencies: Node's built-in `node:http` + `node:sqlite` (no native build on ARM).
 * Written as erasable-only TypeScript so `node server/index.ts` runs it directly.
 */
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_BODY_BYTES = 20 * 1024 * 1024;

/** Read a request body, or null if it exceeds MAX_BODY_BYTES. */
function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size <= MAX_BODY_BYTES) chunks.push(chunk);
    });
    req.on('end', () => resolve(size > MAX_BODY_BYTES ? null : Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function isJsonObject(text: string): boolean {
  try {
    const value: unknown = JSON.parse(text);
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}

export function createApp(dbFile: string): Server {
  mkdirSync(path.dirname(dbFile), { recursive: true });
  const db = new DatabaseSync(dbFile);
  // Single-row table: the whole snapshot lives in row id = 1.
  db.exec(`CREATE TABLE IF NOT EXISTS snapshot (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    data       TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  const selectSnapshot = db.prepare('SELECT data FROM snapshot WHERE id = 1');
  const upsertSnapshot = db.prepare(
    `INSERT INTO snapshot (id, data, updated_at) VALUES (1, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  );

  const server = createServer(async (req, res) => {
    const send = (status: number, body?: string) => {
      res.writeHead(status, body === undefined ? {} : { 'Content-Type': 'application/json' });
      res.end(body);
    };

    try {
      if (req.url === '/api/health' && req.method === 'GET') return send(200, '{"ok":true}');
      if (req.url !== '/api/state') return send(404);

      if (req.method === 'GET') {
        const row = selectSnapshot.get() as { data: string } | undefined;
        return row ? send(200, row.data) : send(404);
      }
      if (req.method === 'PUT') {
        const body = await readBody(req);
        if (body === null) return send(413);
        if (!isJsonObject(body)) return send(400);
        upsertSnapshot.run(body);
        return send(204);
      }
      res.setHeader('Allow', 'GET, PUT');
      return send(405);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) send(500);
    }
  });
  server.on('close', () => db.close());
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 3001);
  const dbFile = path.join(process.env.DATA_DIR ?? path.resolve('data'), 'fintrack.db');
  const server = createApp(dbFile).listen(port, () => {
    console.log(`FinTrack API listening on :${port} (db: ${dbFile})`);
  });
  // Writes are synchronous, so it's safe to stop as soon as open connections are closed.
  const shutdown = () => {
    server.close(() => process.exit(0));
    server.closeAllConnections();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
