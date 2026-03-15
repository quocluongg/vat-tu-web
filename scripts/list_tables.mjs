import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function run() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
    process.exit(1);
  }

  const db = createClient({
    url,
    authToken,
  });

  try {
    const tables = await db.execute("SELECT name, sql FROM sqlite_master WHERE type='table'");
    console.log(JSON.stringify(tables.rows, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // db.close(); // libsql client doesn't have a close method like better-sqlite3
  }
}

run();
