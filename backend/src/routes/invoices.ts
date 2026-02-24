import { Router } from 'express';
import db from '../database';
import { generateInvoicePDF } from '../services/pdf';

const router = Router();

// List invoices
router.get('/', (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM invoices';
  const params: any[] = [];

  if (status) { query += ' WHERE status = ?'; params.push(status); }
  query += ' ORDER BY date DESC';

  const invoices = db.prepare(query).all(...params);

  // Attach totals
  const enriched = invoices.map((inv: any) => {
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
    const total = items.reduce((sum: number, item: any) => sum + item.amount, 0);
    return { ...inv, total, items };
  });

  res.json(enriched);
});

// Get single invoice with items
router.get('/:id', (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
  res.json({ ...(invoice as any), items });
});

// Create invoice with items
router.post('/', (req, res) => {
  const { invoice_number, client_name, client_email, client_address, date, due_date, status, notes, items } = req.body;

  if (!invoice_number || !client_name || !date || !due_date) {
    return res.status(400).json({ error: 'invoice_number, client_name, date, and due_date are required' });
  }

  const result = db.prepare(
    'INSERT INTO invoices (invoice_number, client_name, client_email, client_address, date, due_date, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(invoice_number, client_name, client_email || null, client_address || null, date, due_date, status || 'unpaid', notes || null);

  const invoiceId = result.lastInsertRowid;

  if (items && Array.isArray(items)) {
    const insertItem = db.prepare(
      'INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)'
    );
    for (const item of items) {
      const amount = (item.quantity || 1) * item.rate;
      insertItem.run(invoiceId, item.description, item.quantity || 1, item.rate, amount);
    }
  }

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  const savedItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);
  res.status(201).json({ ...(invoice as any), items: savedItems });
});

// Update invoice
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Invoice not found' });

  const { invoice_number, client_name, client_email, client_address, date, due_date, status, notes, items } = req.body;

  db.prepare(
    `UPDATE invoices SET
      invoice_number = COALESCE(?, invoice_number), client_name = COALESCE(?, client_name),
      client_email = ?, client_address = ?,
      date = COALESCE(?, date), due_date = COALESCE(?, due_date),
      status = COALESCE(?, status), notes = ?
    WHERE id = ?`
  ).run(invoice_number, client_name, client_email, client_address, date, due_date, status, notes, req.params.id);

  // Replace items if provided
  if (items && Array.isArray(items)) {
    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(req.params.id);
    const insertItem = db.prepare(
      'INSERT INTO invoice_items (invoice_id, description, quantity, rate, amount) VALUES (?, ?, ?, ?, ?)'
    );
    for (const item of items) {
      const amount = (item.quantity || 1) * item.rate;
      insertItem.run(req.params.id, item.description, item.quantity || 1, item.rate, amount);
    }
  }

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  const savedItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
  res.json({ ...(invoice as any), items: savedItems });
});

// Delete invoice
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Invoice not found' });

  db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Download invoice as PDF
router.get('/:id/pdf', (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id) as any;
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id) as any[];

  const pdf = generateInvoicePDF({ ...invoice, items });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_number}.pdf`);
  pdf.pipe(res);
  pdf.end();
});

export default router;
