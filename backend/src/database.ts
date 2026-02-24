import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'accounting.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      color TEXT DEFAULT '#6B7280',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      description TEXT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      source TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      client_name TEXT NOT NULL,
      client_email TEXT,
      client_address TEXT,
      date DATE NOT NULL,
      due_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'paid', 'overdue')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
      rate DECIMAL(10,2) NOT NULL,
      amount DECIMAL(10,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      units INTEGER NOT NULL DEFAULT 0,
      royalty DECIMAL(10,2) NOT NULL,
      marketplace TEXT,
      date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS import_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('transaction', 'sales')),
      column_mapping TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default categories if empty
  const count = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (count.count === 0) {
    const insert = db.prepare('INSERT INTO categories (name, type, color) VALUES (?, ?, ?)');
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
    const insertMany = db.transaction((items: string[][]) => {
      for (const item of items) {
        insert.run(item[0], item[1], item[2]);
      }
    });
    insertMany(defaults);
  }

  console.log('Database initialized successfully');
}

export default db;
