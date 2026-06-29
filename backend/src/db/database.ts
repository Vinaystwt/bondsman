import Database from 'better-sqlite3';
import { schema } from './schema.js';

export function openDatabase(path: string): Database.Database {
  const database = new Database(path);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.exec(schema);
  return database;
}
