import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.TURSO_DATABASE_URL.replace('libsql://', 'https://');
const authToken = process.env.TURSO_AUTH_TOKEN;

async function query(sql, args = []) {
  const response = await fetch(`${url}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql, args } },
        { type: 'close' }
      ]
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data.results[0].response.result;
}

async function run() {
  try {
    console.log("--- Tables ---");
    const tables = await query("SELECT name, sql FROM sqlite_master WHERE type='table'");
    console.log(JSON.stringify(tables.rows, null, 2));

    console.log("\n--- Majors ---");
    const majors = await query("SELECT id, ten_nganh FROM nganh");
    console.log(JSON.stringify(majors.rows, null, 2));

  } catch (error) {
    console.error("Error:", error);
  }
}

run();
