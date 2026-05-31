import { open, type DB } from '@op-engineering/op-sqlite';
import { DB_NAME } from '../constants/app';
import { MIGRATIONS } from './migrations';

let _db: DB | null = null;
let _initPromise: Promise<DB> | null = null;

/**
 * Returns a singleton DB connection, running pending migrations exactly once.
 * Always `await getDb()` from app code; never call `open()` directly elsewhere.
 */
export async function getDb(): Promise<DB> {
  if (_db) {
    return _db;
  }
  if (_initPromise) {
    return _initPromise;
  }

  _initPromise = (async () => {
    const db = open({ name: DB_NAME });
    await db.execute('PRAGMA foreign_keys = ON;');
    await runMigrations(db);
    _db = db;
    return db;
  })();

  return _initPromise;
}

async function runMigrations(db: DB): Promise<void> {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS schema_version (
       version INTEGER PRIMARY KEY NOT NULL,
       applied_at TEXT NOT NULL
     );`,
  );

  const result = await db.execute('SELECT MAX(version) AS v FROM schema_version;');
  const currentVersion = (result.rows[0]?.v as number | null) ?? 0;

  const pending = MIGRATIONS.filter(m => m.version > currentVersion).sort(
    (a, b) => a.version - b.version,
  );

  for (const migration of pending) {
    await db.transaction(async tx => {
      for (const stmt of migration.statements) {
        await tx.execute(stmt);
      }
      await tx.execute(
        'INSERT INTO schema_version (version, applied_at) VALUES (?, ?);',
        [migration.version, new Date().toISOString()],
      );
    });
  }
}

/**
 * Test helper / hard reset. Drops the cached connection without deleting data.
 */
export function resetDbHandleForTests(): void {
  _db = null;
  _initPromise = null;
}
