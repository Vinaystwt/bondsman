import Database from 'better-sqlite3';
import { join } from 'node:path';
import { schema } from './schema.js';

export function deploymentDatabasePath(
  directory: string,
  controllerHash: string,
): string {
  const hash = controllerHash.replace(/^hash-/, '');
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    throw new Error('invalid controller hash for projection database');
  }
  return join(directory, `bondsman-${hash}.sqlite`);
}

export function openDatabase(path: string): Database.Database {
  const database = new Database(path);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.exec(schema);
  const actionColumns = new Set(
    (
      database.pragma('table_info(actions)') as {
        name: string;
      }[]
    ).map((column) => column.name),
  );
  if (!actionColumns.has('challenger_type')) {
    database.exec('ALTER TABLE actions ADD COLUMN challenger_type TEXT');
  }
  if (!actionColumns.has('reserved_for_manual')) {
    database.exec(
      'ALTER TABLE actions ADD COLUMN reserved_for_manual INTEGER NOT NULL DEFAULT 0',
    );
  }
  return database;
}
