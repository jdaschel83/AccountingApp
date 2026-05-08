import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import fs from 'fs';
import * as schema from './schema';

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'accounting.db');

const sqlite = new BetterSqlite3(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const drizzleDb = drizzle(sqlite, { schema });

export function initializeDatabase() {
  migrate(drizzleDb, {
    migrationsFolder: path.join(__dirname, '..', 'drizzle', 'migrations'),
  });

  // Seed default categories if empty
  const count = sqlite.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (count.count === 0) {
    const insert = sqlite.prepare('INSERT INTO categories (name, type, color) VALUES (?, ?, ?)');
    const defaults = [
      ['Office Supplies', 'expense', '#3B82F6'],
      ['Software & Tools', 'expense', '#8B5CF6'],
      ['Advertising', 'expense', '#F59E0B'],
      ['Travel', 'expense', '#10B981'],
      ['Meals & Entertainment', 'expense', '#EF4444'],
      ['Professional Services', 'expense', '#6366F1'],
      ['Equipment', 'expense', '#EC4899'],
      ['Shipping', 'expense', '#14B8A6'],
      ['Education & Training', 'expense', '#F97316'],
      ['Utilities', 'expense', '#64748B'],
      ['Book Sales', 'income', '#22C55E'],
      ['Freelance Income', 'income', '#06B6D4'],
      ['Other Income', 'income', '#84CC16'],
    ];
    const insertMany = sqlite.transaction((items: string[][]) => {
      for (const item of items) insert.run(item[0], item[1], item[2]);
    });
    insertMany(defaults);
  }

  // One-time migration: copy boards data from boards.db if it exists and boards table is empty
  const boardsDbPath = path.join(path.dirname(dbPath), 'boards.db');
  const boardsCount = sqlite.prepare('SELECT COUNT(*) as count FROM boards').get() as { count: number };
  if (boardsCount.count === 0 && fs.existsSync(boardsDbPath)) {
    sqlite.exec(`ATTACH '${boardsDbPath}' AS boards_source`);
    const sourceTables = (sqlite.prepare(`SELECT name FROM boards_source.sqlite_master WHERE type='table'`).all() as { name: string }[]).map(r => r.name);
    sqlite.transaction(() => {
      if (sourceTables.includes('boards'))          sqlite.exec('INSERT INTO boards SELECT * FROM boards_source.boards');
      if (sourceTables.includes('lists'))           sqlite.exec('INSERT INTO lists SELECT * FROM boards_source.lists');
      if (sourceTables.includes('cards'))           sqlite.exec('INSERT INTO cards SELECT * FROM boards_source.cards');
      if (sourceTables.includes('checklist_items')) sqlite.exec('INSERT INTO checklist_items SELECT * FROM boards_source.checklist_items');
    })();
    sqlite.exec('DETACH boards_source');
    console.log('Boards data migrated from boards.db');
  }

  console.log('Database initialized successfully');
}

// Export the raw sqlite instance as default — all existing routes use db.prepare() unchanged
export default sqlite;
