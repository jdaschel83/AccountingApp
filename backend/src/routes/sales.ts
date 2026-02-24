import { Router } from 'express';
import db from '../database';

const router = Router();

// List sales with filters
router.get('/', (req, res) => {
  const { source, title, start_date, end_date } = req.query;

  let query = 'SELECT * FROM sales WHERE 1=1';
  const params: any[] = [];

  if (source) { query += ' AND source = ?'; params.push(source); }
  if (title) { query += ' AND title LIKE ?'; params.push(`%${title}%`); }
  if (start_date) { query += ' AND date >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND date <= ?'; params.push(end_date); }

  query += ' ORDER BY date DESC';

  const sales = db.prepare(query).all(...params);
  res.json(sales);
});

// Sales summary by title
router.get('/summary', (req, res) => {
  const { start_date, end_date } = req.query;

  let query = `SELECT source, title, SUM(units) as total_units, SUM(royalty) as total_royalty, COUNT(*) as entries
    FROM sales WHERE 1=1`;
  const params: any[] = [];

  if (start_date) { query += ' AND date >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND date <= ?'; params.push(end_date); }

  query += ' GROUP BY source, title ORDER BY total_royalty DESC';

  const summary = db.prepare(query).all(...params);
  res.json(summary);
});

// Delete sale
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
