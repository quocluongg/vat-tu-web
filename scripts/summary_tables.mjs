import { createClient } from '@libsql/client/web';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function run() {
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  console.log("=== TABLE SUMMARY ===");
  for (const t of tables.rows) {
    const c = await db.execute(`SELECT COUNT(*) as cnt FROM "${t.name}"`);
    console.log(`${t.name.padEnd(28)} : ${c.rows[0].cnt} rows`);
  }
}
run();
