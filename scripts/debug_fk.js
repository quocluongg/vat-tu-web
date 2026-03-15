
import { createClient } from '@libsql/client/web';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function debugFK() {
    console.log('--- Checking phieu_xuat ID 29 ---');
    const px = await db.execute("SELECT * FROM phieu_xuat WHERE id = 29");
    console.log(JSON.stringify(px.rows, null, 2));

    console.log('\n--- Checking vat_tu ID 1590 ---');
    const vt = await db.execute("SELECT * FROM vat_tu WHERE id = 1590");
    console.log(JSON.stringify(vt.rows, null, 2));
    
    console.log('\n--- Checking de_xuat_chi_tiet for vat_tu 1590 ---');
    const dxct = await db.execute("SELECT * FROM de_xuat_chi_tiet WHERE vat_tu_id = 1590");
    console.log(`Found ${dxct.rows.length} proposal rows`);
}

debugFK().catch(console.error);
