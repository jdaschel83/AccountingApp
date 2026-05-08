import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['expense', 'income'] }).notNull(),
  color: text('color').default('#6B7280'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  type: text('type', { enum: ['expense', 'income'] }).notNull(),
  category_id: integer('category_id').references(() => categories.id),
  source: text('source'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const rules = sqliteTable('rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pattern: text('pattern').notNull(),
  category_id: integer('category_id').notNull().references(() => categories.id),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const contacts = sqliteTable('contacts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type', { enum: ['business', 'individual'] }).notNull().default('business'),
  name: text('name').notNull(),
  company: text('company'),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  country: text('country'),
  ein: text('ein'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const invoices = sqliteTable('invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoice_number: text('invoice_number').notNull().unique(),
  contact_id: integer('contact_id').references(() => contacts.id),
  client_name: text('client_name').notNull(),
  client_email: text('client_email'),
  client_address: text('client_address'),
  date: text('date').notNull(),
  due_date: text('due_date').notNull(),
  status: text('status', { enum: ['unpaid', 'paid', 'overdue'] }).notNull().default('unpaid'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const invoice_items = sqliteTable('invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoice_id: integer('invoice_id').notNull().references(() => invoices.id),
  description: text('description').notNull(),
  quantity: real('quantity').notNull().default(1),
  rate: real('rate').notNull(),
  amount: real('amount').notNull(),
});

export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  source: text('source').notNull(),
  title: text('title').notNull(),
  units: integer('units').notNull().default(0),
  royalty: real('royalty').notNull(),
  marketplace: text('marketplace'),
  date: text('date').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const import_templates = sqliteTable('import_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: ['transaction', 'sales'] }).notNull(),
  column_mapping: text('column_mapping').notNull(),
  created_at: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
