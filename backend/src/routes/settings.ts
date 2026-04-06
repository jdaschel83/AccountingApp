import { Router } from 'express';
import db from '../database';

const router = Router();

// Get all settings
router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  res.json(settings);
});

// Update settings (bulk upsert)
router.put('/', (req, res) => {
  const data = req.body as Record<string, string>;
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const updateAll = db.transaction((entries: [string, string][]) => {
    for (const [key, value] of entries) {
      upsert.run(key, value);
    }
  });
  updateAll(Object.entries(data));
  res.json({ success: true });
});

export default router;
