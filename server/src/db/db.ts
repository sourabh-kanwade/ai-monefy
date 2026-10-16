import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ai_monefy';

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function initDb(): Promise<void> {
  const check = await pool.query("SELECT to_regclass('public.users') as exists");
  if (!check.rows[0]?.exists) {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await pool.query(schemaSql);
    }
  } else {
    await pool.query(`
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
      ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;
    `);
  }
}
