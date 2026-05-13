# Database Migrations

This project uses [Drizzle ORM](https://orm.drizzle.team/) to manage the SQLite database schema.
Migrations are **never applied automatically** — you must run them explicitly.

---

## The Golden Rule

**Restarting Docker does NOT run migrations.** You are in full control of when the database changes.

---

## When You Need to Run Migrations

Run migrations whenever a new `.sql` file appears in `backend/drizzle/migrations/` that hasn't been applied to your database yet. This happens when:

- You pull new code that includes a schema change
- You just generated a new migration yourself (after editing `schema.ts`)

---

## How to Run Migrations

### Against the Docker dev database

The backend container must be running first:

```bash
docker-compose up -d
```

Then run:

```bash
docker exec accounting-backend-1 npm run migrate
```

You should see:
```
Running database migrations...
Migrations applied successfully
Done.
```

### Against a local database (outside Docker)

```bash
cd backend
DB_PATH=/path/to/your/accounting.db npm run migrate
```

---

## How to Make a Schema Change (the full workflow)

1. **Edit `backend/src/schema.ts`** — add your new table or column

2. **Generate the migration file** (run from the `backend/` directory):
   ```bash
   cd backend
   npx drizzle-kit generate
   ```
   This creates a new `.sql` file in `backend/drizzle/migrations/`. **Read it** before doing anything else.

3. **Review the generated SQL** — open the new file and confirm it does what you expect.
   - `CREATE TABLE` and `ALTER TABLE ADD COLUMN` are safe
   - `DROP TABLE` or `DROP COLUMN` — pause and make sure this is intentional

4. **Start Docker** (if not already running):
   ```bash
   docker-compose up -d
   ```

5. **Apply the migration explicitly**:
   ```bash
   docker exec accounting-backend-1 npm run migrate
   ```

6. **Commit both files** — `schema.ts` and the new `.sql` migration file belong together in the same commit.

---

## Checking Migration Status

To see which migrations have been applied to a database:

```bash
sqlite3 data/accounting.db "SELECT hash, created_at FROM __drizzle_migrations;"
```

To see all migration files that exist:

```bash
ls backend/drizzle/migrations/*.sql
```

If a hash appears in the DB, that migration has been applied and will never run again.

---

## Important Rules

- **Never edit a migration file after it has been applied.** Drizzle tracks migrations by hash — editing a file changes its hash, and Drizzle will try to re-run it.
- **Never delete a migration file** that has already been applied to any database (dev or prod).
- **Always read the generated SQL** before applying it. Drizzle is accurate but it's worth 30 seconds to verify.
- **Test on dev first** — apply to `data/accounting.db` (dev), verify the app works, then rebuild the Electron app which will apply the same migration to the prod database on first launch.

---

## Electron / Prod Database

The Electron app's database is at:
```
~/Library/Application Support/Business Hub/accounting.db
```

When you build and launch a new version of the Electron app, it does **not** auto-migrate either. To apply migrations to the Electron prod database, run the migrate script pointed at that path:

```bash
cd backend
DB_PATH="/Users/jamesdaschel/Library/Application Support/Business Hub/accounting.db" npm run migrate
```

Do this **before** launching the new Electron build if you want the prod database migrated without relying on the app startup.
