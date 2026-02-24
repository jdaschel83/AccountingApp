import { Router } from 'express';
import db from '../database';

const router = Router();

// List transactions with filters
router.get('/', (req, res) => {
  const { category_id, type, source, start_date, end_date, search, limit, offset } = req.query;

  let query = 'SELECT t.*, c.name as category_name, c.color as category_color FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE 1=1';
  const params: any[] = [];

  if (category_id) { query += ' AND t.category_id = ?'; params.push(category_id); }
  if (type) { query += ' AND t.type = ?'; params.push(type); }
  if (source) { query += ' AND t.source = ?'; params.push(source); }
  if (start_date) { query += ' AND t.date >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND t.date <= ?'; params.push(end_date); }
  if (search) { query += ' AND t.description LIKE ?'; params.push(`%${search}%`); }

  query += ' ORDER BY t.date DESC, t.id DESC';

  if (limit) { query += ' LIMIT ?'; params.push(Number(limit)); }
  if (offset) { query += ' OFFSET ?'; params.push(Number(offset)); }

  const transactions = db.prepare(query).all(...params);

  // Get total count for pagination
  let countQuery = 'SELECT COUNT(*) as total FROM transactions t WHERE 1=1';
  const countParams: any[] = [];
  if (category_id) { countQuery += ' AND t.category_id = ?'; countParams.push(category_id); }
  if (type) { countQuery += ' AND t.type = ?'; countParams.push(type); }
  if (source) { countQuery += ' AND t.source = ?'; countParams.push(source); }
  if (start_date) { countQuery += ' AND t.date >= ?'; countParams.push(start_date); }
  if (end_date) { countQuery += ' AND t.date <= ?'; countParams.push(end_date); }
  if (search) { countQuery += ' AND t.description LIKE ?'; countParams.push(`%${search}%`); }

  const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

  res.json({ transactions, total });
});

// Get single transaction
router.get('/:id', (req, res) => {
  const transaction = db.prepare(
    'SELECT t.*, c.name as category_name, c.color as category_color FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = ?'
  ).get(req.params.id);
  if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
  res.json(transaction);
});

// Create transaction
router.post('/', (req, res) => {
  const { date, description, amount, type, category_id, source, notes } = req.body;
  if (!date || !description || amount === undefined || !type) {
    return res.status(400).json({ error: 'Date, description, amount, and type are required' });
  }

  const result = db.prepare(
    'INSERT INTO transactions (date, description, amount, type, category_id, source, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(date, description, amount, type, category_id || null, source || null, notes || null);

  const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(transaction);
});

// Update transaction
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Transaction not found' });

  const { date, description, amount, type, category_id, source, notes } = req.body;
  db.prepare(
    `UPDATE transactions SET
      date = COALESCE(?, date), description = COALESCE(?, description),
      amount = COALESCE(?, amount), type = COALESCE(?, type),
      category_id = ?, source = COALESCE(?, source), notes = COALESCE(?, notes)
    WHERE id = ?`
  ).run(date, description, amount, type, category_id !== undefined ? category_id : (existing as any).category_id, source, notes, req.params.id);

  const transaction = db.prepare(
    'SELECT t.*, c.name as category_name, c.color as category_color FROM transactions t LEFT JOIN categories c ON t.category_id = c.id WHERE t.id = ?'
  ).get(req.params.id);
  res.json(transaction);
});

// Delete transaction
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Transaction not found' });

  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Bulk delete
router.post('/bulk-delete', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });

  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM transactions WHERE id IN (${placeholders})`).run(...ids);
  res.json({ success: true, deleted: ids.length });
});

// Bulk categorize
router.post('/bulk-categorize', (req, res) => {
  const { ids, category_id } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });

  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`UPDATE transactions SET category_id = ? WHERE id IN (${placeholders})`).run(category_id, ...ids);
  res.json({ success: true, updated: ids.length });
});

export default router;
