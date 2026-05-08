import { defineConfig } from 'drizzle-kit';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data', 'accounting.db');

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: dbPath,
  },
});
