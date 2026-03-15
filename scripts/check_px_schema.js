
import { createClient } from '@libsql/client/web';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function checkSchema() {
    console.log('--- table_info phieu_xuat_chi_tiet ---');
    const info = await db.execute("PRAGMA table_info('phieu_xuat_chi_tiet')");
    console.log(JSON.stringify(info.rows, null, 2));

    console.log('\n--- foreign_key_list phieu_xuat_chi_tiet ---');
    const fks = await db.execute("PRAGMA foreign_key_list('phieu_xuat_chi_tiet')");
    console.log(JSON.stringify(fks.rows, null, 2));
    
    console.log('\n--- Check current FK state ---');
    const fkState = await db.execute("PRAGMA foreign_keys");
    console.log(JSON.stringify(fkState.rows, null, 2));
}

checkSchema().catch(console.error);
