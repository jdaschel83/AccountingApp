import { Router } from 'express';
import db from '../database';

const router = Router();

// List all rules
router.get('/', (_req, res) => {
  const rules = db.prepare(
    'SELECT r.*, c.name as category_name, c.color as category_color FROM rules r JOIN categories c ON r.category_id = c.id ORDER BY r.pattern'
  ).all();
  res.json(rules);
});

// Create rule
router.post('/', (req, res) => {
  const { pattern, category_id } = req.body;
  if (!pattern || !category_id) return res.status(400).json({ error: 'Pattern and category_id are required' });

  const result = db.prepare('INSERT INTO rules (pattern, category_id) VALUES (?, ?)').run(pattern.toLowerCase(), category_id);
  const rule = db.prepare(
    'SELECT r.*, c.name as category_name, c.color as category_color FROM rules r JOIN categories c ON r.category_id = c.id WHERE r.id = ?'
  ).get(result.lastInsertRowid);
  res.status(201).json(rule);
});

// Update rule
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM rules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Rule not found' });

  const { pattern, category_id } = req.body;
  db.prepare('UPDATE rules SET pattern = COALESCE(?, pattern), category_id = COALESCE(?, category_id) WHERE id = ?')
    .run(pattern ? pattern.toLowerCase() : null, category_id, req.params.id);

  const rule = db.prepare(
    'SELECT r.*, c.name as category_name, c.color as category_color FROM rules r JOIN categories c ON r.category_id = c.id WHERE r.id = ?'
  ).get(req.params.id);
  res.json(rule);
});

// Delete rule
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM rules WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Rule not found' });

  db.prepare('DELETE FROM rules WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
