import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './database';
import categoriesRouter from './routes/categories';
import transactionsRouter from './routes/transactions';
import rulesRouter from './routes/rules';
import invoicesRouter from './routes/invoices';
import importRouter from './routes/import';
import salesRouter from './routes/sales';
import reportsRouter from './routes/reports';

const app = express();
const PORT = process.env.PORT || 3001;

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

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
