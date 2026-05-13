import { runMigrations } from '../database';

console.log('Running database migrations...');

try {
  runMigrations();
  console.log('Done.');
  process.exit(0);
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
}
