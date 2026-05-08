import { Router } from 'express';
import db from '../database';

const router = Router();

router.get('/', (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM contacts';
  const params: any[] = [];

  if (search) {
    query += ' WHERE name LIKE ? OR company LIKE ? OR email LIKE ?';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY name ASC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
});

router.post('/', (req, res) => {
  const { type, name, company, email, phone, address, city, state, zip, country, ein, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = db.prepare(
    `INSERT INTO contacts (type, name, company, email, phone, address, city, state, zip, country, ein, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(type || 'business', name, company || null, email || null, phone || null,
        address || null, city || null, state || null, zip || null, country || null,
        ein || null, notes || null);

  res.status(201).json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });

  const { type, name, company, email, phone, address, city, state, zip, country, ein, notes } = req.body;

  db.prepare(
    `UPDATE contacts SET
      type = COALESCE(?, type), name = COALESCE(?, name), company = ?, email = ?,
      phone = ?, address = ?, city = ?, state = ?, zip = ?, country = ?, ein = ?, notes = ?
     WHERE id = ?`
  ).run(type, name, company ?? null, email ?? null, phone ?? null, address ?? null,
        city ?? null, state ?? null, zip ?? null, country ?? null, ein ?? null,
        notes ?? null, req.params.id);

  res.json(db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
