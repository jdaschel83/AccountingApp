import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// Get the database directory from DB_PATH
function getDbDirectory(): string {
  const mainDbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'accounting.db');
  return path.dirname(mainDbPath);
}

// List all databases in the DB directory
router.get('/databases', (_req, res) => {
  const dbDir = getDbDirectory();

  try {
    if (!fs.existsSync(dbDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(dbDir).filter(f => f.endsWith('.db'));

    const databases = files.map(filename => {
      const filePath = path.join(dbDir, filename);
      const stats = fs.statSync(filePath);
      return {
        name: filename.replace('.db', ''),
        filename,
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
      };
    });

    res.json(databases);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list databases', details: error.message });
  }
});

// Download a specific .db file
router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;

  if (!filename.endsWith('.db')) {
    return res.status(404).json({ error: 'File not found' });
  }

  const dbDir = getDbDirectory();
  const filePath = path.join(dbDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath, filename);
});

// Backup all .db files to a destination
router.post('/backup-all', (req, res) => {
  const { destination } = req.body;

  if (!destination) {
    return res.status(400).json({ error: 'Destination path is required' });
  }

  const dbDir = getDbDirectory();

  try {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    if (!fs.existsSync(dbDir)) {
      return res.json({ success: true, files: [] });
    }

    const files = fs.readdirSync(dbDir).filter(f => f.endsWith('.db'));
    const copiedFiles: string[] = [];

    for (const filename of files) {
      const sourcePath = path.join(dbDir, filename);
      const destPath = path.join(destination, filename);
      fs.copyFileSync(sourcePath, destPath);
      copiedFiles.push(filename);
    }

    res.json({ success: true, files: copiedFiles });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to backup databases', details: error.message });
  }
});

export default router;
