import { Router } from 'express';
import db from '../database';

const router = Router();

// Dashboard summary
router.get('/dashboard', (_req, res) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const monthStart = `${year}-${month}-01`;
  const yearStart = `${year}-01-01`;

  const monthExpenses = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ?"
  ).get(monthStart) as { total: number };

  const monthIncome = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date >= ?"
  ).get(monthStart) as { total: number };

  const yearExpenses = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND date >= ?"
  ).get(yearStart) as { total: number };

  const yearIncome = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'income' AND date >= ?"
  ).get(yearStart) as { total: number };

  const unpaidInvoices = db.prepare(
    "SELECT COUNT(*) as count FROM invoices WHERE status = 'unpaid'"
  ).get() as { count: number };

  const recentTransactions = db.prepare(
    'SELECT t.*, c.name as category_name, c.color as category_color FROM transactions t LEFT JOIN categories c ON t.category_id = c.id ORDER BY t.date DESC LIMIT 10'
  ).all();

  const yearSalesRoyalties = db.prepare(
    'SELECT COALESCE(SUM(royalty), 0) as total FROM sales WHERE date >= ?'
  ).get(yearStart) as { total: number };

  res.json({
    monthExpenses: monthExpenses.total,
    monthIncome: monthIncome.total,
    yearExpenses: yearExpenses.total,
    yearIncome: yearIncome.total,
    yearSalesRoyalties: yearSalesRoyalties.total,
    unpaidInvoices: unpaidInvoices.count,
    recentTransactions,
  });
});

// Expenses by category
router.get('/by-category', (req, res) => {
  const { start_date, end_date, type } = req.query;

  let query = `SELECT c.name, c.color, c.type, COALESCE(SUM(t.amount), 0) as total, COUNT(t.id) as count
    FROM categories c LEFT JOIN transactions t ON c.id = t.category_id`;
  const params: any[] = [];
  const conditions: string[] = [];

  if (start_date) { conditions.push('t.date >= ?'); params.push(start_date); }
  if (end_date) { conditions.push('t.date <= ?'); params.push(end_date); }
  if (type) { conditions.push('c.type = ?'); params.push(type); }

  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' GROUP BY c.id HAVING total > 0 ORDER BY total DESC';

  const results = db.prepare(query).all(...params);
  res.json(results);
});

// Monthly trends
router.get('/monthly', (req, res) => {
  const { year } = req.query;
  const targetYear = year || new Date().getFullYear();

  const results = db.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      type,
      SUM(amount) as total
    FROM transactions
    WHERE strftime('%Y', date) = ?
    GROUP BY month, type
    ORDER BY month
  `).all(String(targetYear));

  res.json(results);
});

export default router;
