
import { createClient } from '@libsql/client/web';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function checkFKs() {
    console.log('--- Foreign Keys of vat_tu ---');
    const fks = await db.execute("PRAGMA foreign_key_list('vat_tu')");
    console.log(JSON.stringify(fks.rows, null, 2));
}

checkFKs().catch(console.error);
