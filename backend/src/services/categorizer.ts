import db from '../database';

interface Rule {
  id: number;
  pattern: string;
  category_id: number;
}

export function categorizeTransaction(description: string): number | null {
  const rules = db.prepare('SELECT * FROM rules').all() as Rule[];
  const lower = description.toLowerCase();

  for (const rule of rules) {
    if (lower.includes(rule.pattern)) {
      return rule.category_id;
    }
  }
  return null;
}

export function categorizeTransactions(transactions: Array<{ description: string; category_id?: number | null }>) {
  const rules = db.prepare('SELECT * FROM rules').all() as Rule[];

  return transactions.map(t => {
    if (t.category_id) return t; // already categorized
    const lower = t.description.toLowerCase();
    for (const rule of rules) {
      if (lower.includes(rule.pattern)) {
        return { ...t, category_id: rule.category_id };
      }
    }
    return t;
  });
}
