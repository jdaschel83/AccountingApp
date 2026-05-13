import { Router } from 'express';
import db from '../database';

const router = Router();

// List all categories
router.get('/', (_req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY type, name').all();
  res.json(categories);
});

// Get single category
router.get('/:id', (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) return res.status(404).json({ error: 'Category not found' });
  res.json(category);
});

// Create category
router.post('/', (req, res) => {
  const { name, type, color } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type are required' });
  if (!['expense', 'income'].includes(type)) return res.status(400).json({ error: 'Type must be expense or income' });

  const result = db.prepare('INSERT INTO categories (name, type, color) VALUES (?, ?, ?)').run(name, type, color || '#6B7280');
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(category);
});

// Update category
router.put('/:id', (req, res) => {
  const { name, type, color } = req.body;
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  db.prepare('UPDATE categories SET name = COALESCE(?, name), type = COALESCE(?, type), color = COALESCE(?, color) WHERE id = ?')
    .run(name, type, color, req.params.id);
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  res.json(category);
});

// Delete category
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  db.prepare('UPDATE transactions SET category_id = NULL WHERE category_id = ?').run(req.params.id);
  db.prepare('DELETE FROM rules WHERE category_id = ?').run(req.params.id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
