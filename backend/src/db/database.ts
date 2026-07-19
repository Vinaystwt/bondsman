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
  if (!actionColumns.has('challenge_signing')) {
    database.exec('ALTER TABLE actions ADD COLUMN challenge_signing TEXT');
  }
  if (!actionColumns.has('controller_hash')) {
    database.exec(
      "ALTER TABLE actions ADD COLUMN controller_hash TEXT NOT NULL DEFAULT ''",
    );
  }
  if (!actionColumns.has('duplicate_proven')) {
    database.exec(
      'ALTER TABLE actions ADD COLUMN duplicate_proven INTEGER NOT NULL DEFAULT 0',
    );
  }
  if (!actionColumns.has('fault_class')) {
    database.exec(
      "ALTER TABLE actions ADD COLUMN fault_class TEXT NOT NULL DEFAULT 'duplicate_claim'",
    );
  }
  if (!actionColumns.has('evidence_root')) {
    database.exec('ALTER TABLE actions ADD COLUMN evidence_root TEXT');
  }
  const quoteColumns = new Set(
    (
      database.pragma('table_info(paid_quotes)') as {
        name: string;
      }[]
    ).map((column) => column.name),
  );
  if (!quoteColumns.has('submit_payload_hash')) {
    database.exec('ALTER TABLE paid_quotes ADD COLUMN submit_payload_hash TEXT');
  }
  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS paid_quotes_settlement_tx_unique
      ON paid_quotes(settlement_tx);
    CREATE UNIQUE INDEX IF NOT EXISTS paid_quotes_consumed_action_unique
      ON paid_quotes(consumed_action_id)
      WHERE consumed_action_id IS NOT NULL;
    CREATE TABLE IF NOT EXISTS submit_authorization_nonces (
      nonce_hash TEXT PRIMARY KEY,
      payer TEXT NOT NULL,
      quote_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
  return database;
}
