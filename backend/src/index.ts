import express from 'express';
import cors from 'cors';
import path from 'path';
import { initializeDatabase, runMigrations, getPendingMigrationsCount } from './database';
import categoriesRouter from './routes/categories';
import transactionsRouter from './routes/transactions';
import rulesRouter from './routes/rules';
import invoicesRouter from './routes/invoices';
import importRouter from './routes/import';
import salesRouter from './routes/sales';
import reportsRouter from './routes/reports';
import boardsRouter from './routes/boards';
import backupRouter from './routes/backup';
import settingsRouter from './routes/settings';
import contactsRouter from './routes/contacts';
import timeTrackingRouter from './routes/time-tracking';

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

initializeDatabase();

// Accounting routes
app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/import', importRouter);
app.use('/api/sales', salesRouter);
app.use('/api/reports', reportsRouter);

// Boards routes
app.use('/api/boards', boardsRouter);

// Backup routes
app.use('/api/backup', backupRouter);

// Settings routes
app.use('/api/settings', settingsRouter);

// Contacts routes
app.use('/api/contacts', contactsRouter);

// Time tracking routes
app.use('/api/time-tracking', timeTrackingRouter);

// Serve built frontend static files (Electron / production mode)
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Start server - returns the port it's running on
export function startServer(port: number): Promise<number> {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      const addr = server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : port;
      console.log(`Backend running on http://localhost:${actualPort}`);
      resolve(actualPort);
    });
  });
}

export { app, runMigrations, getPendingMigrationsCount };

// Auto-start when run directly (Docker mode)
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  startServer(Number(PORT));
}
