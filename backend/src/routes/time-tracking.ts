import { Router } from 'express';
import db from '../database';

const router = Router();

// Get all time entries (with optional filters)
router.get('/entries', (req, res) => {
  const { contact_id, billed, start_date, end_date } = req.query;

  let query = `
    SELECT te.*, c.name as contact_name
    FROM time_entries te
    LEFT JOIN contacts c ON te.contact_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (contact_id) { query += ' AND te.contact_id = ?'; params.push(contact_id); }
  if (billed !== undefined) { query += ' AND te.billed = ?'; params.push(billed === 'true' ? 1 : 0); }
  if (start_date) { query += ' AND te.date >= ?'; params.push(start_date); }
  if (end_date) { query += ' AND te.date <= ?'; params.push(end_date); }

  query += ' ORDER BY te.date DESC, te.id DESC';

  const entries = db.prepare(query).all(...params);
  res.json(entries);
});

// Get per-contact summary (hours + unbilled hours this month)
router.get('/summary', (_req, res) => {
  const summary = db.prepare(`
    SELECT
      c.id as contact_id,
      c.name as contact_name,
      SUM(te.hours) as total_hours,
      SUM(CASE WHEN te.billed = 0 AND te.billable = 1 THEN te.hours ELSE 0 END) as unbilled_hours,
      SUM(CASE WHEN te.date >= date('now', 'start of month') THEN te.hours ELSE 0 END) as hours_this_month
    FROM time_entries te
    JOIN contacts c ON te.contact_id = c.id
    GROUP BY c.id, c.name
    ORDER BY unbilled_hours DESC
  `).all();
  res.json(summary);
});

// Create time entry
router.post('/entries', (req, res) => {
  const { contact_id, date, description, hours, rate, billable, started_at, stopped_at } = req.body;
  if (!date || !description || hours === undefined) {
    return res.status(400).json({ error: 'date, description, and hours are required' });
  }

  const result = db.prepare(`
    INSERT INTO time_entries (contact_id, date, description, hours, rate, billable, started_at, stopped_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    contact_id || null,
    date,
    description,
    hours,
    rate || null,
    billable !== undefined ? (billable ? 1 : 0) : 1,
    started_at || null,
    stopped_at || null,
  );

  const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(entry);
});

// Update time entry
router.put('/entries/:id', (req, res) => {
  const { contact_id, date, description, hours, rate, billable, billed, started_at, stopped_at } = req.body;

  db.prepare(`
    UPDATE time_entries
    SET contact_id = ?, date = ?, description = ?, hours = ?, rate = ?,
        billable = ?, billed = ?, started_at = ?, stopped_at = ?
    WHERE id = ?
  `).run(
    contact_id || null,
    date,
    description,
    hours,
    rate || null,
    billable !== undefined ? (billable ? 1 : 0) : 1,
    billed !== undefined ? (billed ? 1 : 0) : 0,
    started_at || null,
    stopped_at || null,
    req.params.id,
  );

  const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(req.params.id);
  res.json(entry);
});

// Delete time entry
router.delete('/entries/:id', (req, res) => {
  db.prepare('DELETE FROM time_entries WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- Active Timer ---

// Get active timer (if any)
router.get('/timer', (_req, res) => {
  const timer = db.prepare('SELECT at.*, c.name as contact_name FROM active_timers at LEFT JOIN contacts c ON at.contact_id = c.id LIMIT 1').get();
  res.json(timer || null);
});

// Start timer
router.post('/timer/start', (req, res) => {
  const { contact_id, description } = req.body;

  // Only one timer at a time
  const existing = db.prepare('SELECT id FROM active_timers LIMIT 1').get();
  if (existing) {
    return res.status(409).json({ error: 'A timer is already running. Stop it first.' });
  }

  const started_at = new Date().toISOString();
  const result = db.prepare(
    'INSERT INTO active_timers (contact_id, description, started_at) VALUES (?, ?, ?)'
  ).run(contact_id || null, description || '', started_at);

  const timer = db.prepare('SELECT * FROM active_timers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(timer);
});

// Stop timer — converts to a time_entry
router.post('/timer/stop', (req, res) => {
  const timer = db.prepare('SELECT * FROM active_timers LIMIT 1').get() as any;
  if (!timer) return res.status(404).json({ error: 'No active timer' });

  const stopped_at = new Date().toISOString();
  const started = new Date(timer.started_at);
  const stopped = new Date(stopped_at);
  const hours = Math.round(((stopped.getTime() - started.getTime()) / 3600000) * 100) / 100;

  const date = stopped.toISOString().split('T')[0];

  const result = db.prepare(`
    INSERT INTO time_entries (contact_id, date, description, hours, billable, started_at, stopped_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `).run(timer.contact_id, date, timer.description || 'Timed session', hours, timer.started_at, stopped_at);

  db.prepare('DELETE FROM active_timers WHERE id = ?').run(timer.id);

  const entry = db.prepare('SELECT * FROM time_entries WHERE id = ?').get(result.lastInsertRowid);
  res.json(entry);
});

// Delete (discard) active timer without saving
router.delete('/timer', (_req, res) => {
  db.prepare('DELETE FROM active_timers').run();
  res.json({ success: true });
});

// Generate invoice from unbilled entries
router.post('/generate-invoice', (req, res) => {
  const { contact_id, entry_ids, rate, invoice_number, due_date } = req.body;
  if (!contact_id || !entry_ids?.length) {
    return res.status(400).json({ error: 'contact_id and entry_ids are required' });
  }

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contact_id) as any;
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  const placeholders = entry_ids.map(() => '?').join(',');
  const entries = db.prepare(
    `SELECT * FROM time_entries WHERE id IN (${placeholders}) AND billed = 0`
  ).all(...entry_ids) as any[];

  if (!entries.length) return res.status(400).json({ error: 'No unbilled entries found' });

  const today = new Date().toISOString().split('T')[0];
  const invNum = invoice_number || `INV-${Date.now()}`;
  const dueDate = due_date || today;

  const invoiceResult = db.prepare(`
    INSERT INTO invoices (invoice_number, contact_id, client_name, client_email, client_address, date, due_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'unpaid')
  `).run(invNum, contact_id, contact.name, contact.email || '', contact.address || '', today, dueDate);

  const invoiceId = invoiceResult.lastInsertRowid;
  const effectiveRate = rate || 0;

  const insertItem = db.prepare(
    'INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)'
  );

  db.transaction(() => {
    for (const entry of entries) {
      const entryRate = entry.rate || effectiveRate;
      insertItem.run(invoiceId, entry.description, entry.hours, entryRate, entry.hours * entryRate);
    }
    db.prepare(
      `UPDATE time_entries SET billed = 1, invoice_id = ? WHERE id IN (${placeholders})`
    ).run(invoiceId, ...entry_ids);
  })();

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  res.status(201).json(invoice);
});

export default router;
