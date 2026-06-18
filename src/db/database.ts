import Database from "better-sqlite3";
import { getConfig } from "../config/env.js";

let db: Database.Database | null = null;
let lastDbPath: string | null = null;

export function getDatabase(): Database.Database {
  const currentPath = getConfig().dbPath;

  if (!db || lastDbPath !== currentPath) {
    if (db) {
      db.close();
    }
    db = new Database(currentPath);
    db.pragma("journal_mode = WAL");
    lastDbPath = currentPath;
    initializeSchema();
  }
  return db;
}

function initializeSchema(): void {
  const database = db!;

  database.exec(`
    CREATE TABLE IF NOT EXISTS urls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      long_url TEXT NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      visits INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_urls_code ON urls(code);
    CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id);

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS click_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      url_id     INTEGER NOT NULL REFERENCES urls(id),
      clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_click_events_url_clicked
      ON click_events(url_id, clicked_at);

    CREATE INDEX IF NOT EXISTS idx_urls_user_visits
      ON urls(user_id, visits);

    CREATE INDEX IF NOT EXISTS idx_urls_user_created
      ON urls(user_id, created_at);
  `);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    lastDbPath = null;
  }
}
