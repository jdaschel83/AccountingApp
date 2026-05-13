import { Router } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import db from '../database';
import { categorizeTransactions } from '../services/categorizer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload and parse CSV - returns preview data
router.post('/parse', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const csv = req.file.buffer.toString('utf-8');
  const result = Papa.parse(csv, { header: false, skipEmptyLines: true });

  if (result.errors.length > 0) {
    return res.status(400).json({ error: 'CSV parse error', details: result.errors });
  }

  res.json({
    headers: result.data[0],
    rows: result.data.slice(1, 51), // preview first 50 rows
    totalRows: result.data.length - 1,
    allRows: result.data.slice(1),
  });
});

// Import transactions from parsed CSV
router.post('/transactions', (req, res) => {
  const { rows, columnMapping, source, type } = req.body;

  if (!rows || !columnMapping) {
    return res.status(400).json({ error: 'rows and columnMapping are required' });
  }

  const { date: dateCol, description: descCol, amount: amountCol, debit: debitCol, credit: creditCol } = columnMapping;
  if (dateCol === undefined || descCol === undefined) {
    return res.status(400).json({ error: 'columnMapping must include date and description' });
  }
  if (amountCol === undefined && debitCol === undefined && creditCol === undefined) {
    return res.status(400).json({ error: 'columnMapping must include amount, or debit/credit columns' });
  }

  let transactions = rows.map((row: string[]) => {
    let amount: number;
    let txType: string;

    if (debitCol !== undefined || creditCol !== undefined) {
      const debit = debitCol !== undefined ? parseFloat(String(row[debitCol]).replace(/[,$]/g, '')) || 0 : 0;
      const credit = creditCol !== undefined ? parseFloat(String(row[creditCol]).replace(/[,$]/g, '')) || 0 : 0;
      if (debit > 0) {
        amount = debit;
        txType = 'expense';
      } else if (credit > 0) {
        amount = credit;
        txType = 'income';
      } else {
        return null;
      }
    } else {
      const rawAmount = parseFloat(String(row[amountCol]).replace(/[,$]/g, ''));
      amount = Math.abs(rawAmount);
      txType = type || (rawAmount < 0 ? 'expense' : 'income');
    }

    return {
      date: row[dateCol],
      description: row[descCol],
      amount,
      type: txType,
      source: source || null,
      category_id: null as number | null,
    };
  }).filter((t: any) => t && t.date && t.description && !isNaN(t.amount));

  // Auto-categorize
  transactions = categorizeTransactions(transactions);

  const insert = db.prepare(
    'INSERT INTO transactions (date, description, amount, type, category_id, source) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction((items: typeof transactions) => {
    let imported = 0;
    for (const t of items) {
      insert.run(t.date, t.description, t.amount, t.type, t.category_id, t.source);
      imported++;
    }
    return imported;
  });

  const imported = insertMany(transactions);
  res.json({ success: true, imported });
});

// Import sales from parsed CSV
router.post('/sales', (req, res) => {
  const { rows, columnMapping, source } = req.body;

  if (!rows || !columnMapping || !source) {
    return res.status(400).json({ error: 'rows, columnMapping, and source are required' });
  }

  const { date: dateCol, title: titleCol, units: unitsCol, royalty: royaltyCol, marketplace: marketplaceCol } = columnMapping;

  const insert = db.prepare(
    'INSERT INTO sales (source, title, units, royalty, marketplace, date) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction((items: string[][]) => {
    let imported = 0;
    for (const row of items) {
      const royalty = parseFloat(String(row[royaltyCol]).replace(/[,$]/g, ''));
      if (isNaN(royalty)) continue;

      insert.run(
        source,
        row[titleCol] || 'Unknown',
        unitsCol !== undefined ? parseInt(String(row[unitsCol])) || 0 : 0,
        royalty,
        marketplaceCol !== undefined ? row[marketplaceCol] || null : null,
        row[dateCol]
      );
      imported++;
    }
    return imported;
  });

  const imported = insertMany(rows);
  res.json({ success: true, imported });
});

// Get saved import templates
router.get('/templates', (_req, res) => {
  const templates = db.prepare('SELECT * FROM import_templates ORDER BY name').all();
  res.json(templates);
});

// Save import template
router.post('/templates', (req, res) => {
  const { name, type, column_mapping } = req.body;
  if (!name || !type || !column_mapping) {
    return res.status(400).json({ error: 'name, type, and column_mapping are required' });
  }

  const result = db.prepare('INSERT INTO import_templates (name, type, column_mapping) VALUES (?, ?, ?)')
    .run(name, type, JSON.stringify(column_mapping));
  const template = db.prepare('SELECT * FROM import_templates WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(template);
});

// Delete import template
router.delete('/templates/:id', (req, res) => {
  db.prepare('DELETE FROM import_templates WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
