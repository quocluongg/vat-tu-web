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
  try {
    const tablesRes = await db.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    console.log(`FOUND ${tablesRes.rows.length} TABLES\n`);

    for (const row of tablesRes.rows) {
      const name = row.name;
      console.log(`====================================================`);
      console.log(`TABLE: ${name}`);
      console.log(`DDL: ${row.sql}`);
      
      const countRes = await db.execute(`SELECT COUNT(*) as cnt FROM "${name}"`);
      const cnt = countRes.rows[0].cnt;
      console.log(`ROW COUNT: ${cnt}`);

      const colsRes = await db.execute(`PRAGMA table_info("${name}")`);
      console.log(`COLUMNS:`);
      for (const col of colsRes.rows) {
        console.log(`  - ${col.name} (${col.type})${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}${col.pk ? ' [PK]' : ''}`);
      }

      const fkRes = await db.execute(`PRAGMA foreign_key_list("${name}")`);
      if (fkRes.rows.length > 0) {
        console.log(`FOREIGN KEYS:`);
        for (const fk of fkRes.rows) {
          console.log(`  - ${fk.from} -> ${fk.table}(${fk.to}) [ON UPDATE ${fk.on_update}, ON DELETE ${fk.on_delete}]`);
        }
      }

      if (cnt > 0) {
        const sampleRes = await db.execute(`SELECT * FROM "${name}" LIMIT 3`);
        console.log(`SAMPLE DATA (up to 3):`);
        console.log(JSON.stringify(sampleRes.rows, null, 2));
      }
      console.log(`\n`);
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
