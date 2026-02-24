import express from 'express';
import cors from 'cors';
import path from 'path';
import { initializeDatabase } from './database';
import categoriesRouter from './routes/categories';
import transactionsRouter from './routes/transactions';
import rulesRouter from './routes/rules';
import invoicesRouter from './routes/invoices';
import importRouter from './routes/import';
import salesRouter from './routes/sales';
import reportsRouter from './routes/reports';

const app = express();

app.use(cors());
app.use(express.json());

initializeDatabase();

app.use('/api/categories', categoriesRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/import', importRouter);
app.use('/api/sales', salesRouter);
app.use('/api/reports', reportsRouter);

// Database download endpoint
app.get('/api/backup', (_req, res) => {
  const dbPath = process.env.DB_PATH || './data/accounting.db';
  res.download(dbPath, 'accounting-backup.db');
});

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

export { app };

// Auto-start when run directly (Docker mode)
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  startServer(Number(PORT));
}
