
import { createClient } from '@libsql/client/web';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function verify() {
    const ids = [5, 6, 7];
    
    console.log('--- Verifying Deletion ---');
    const nganhs = await db.execute("SELECT COUNT(*) as count FROM nganh WHERE id IN (5, 6, 7)");
    console.log(`Remaining majors (IDs 5,6,7): ${nganhs.rows[0].count}`);

    const vts = await db.execute("SELECT COUNT(*) as count FROM vat_tu WHERE nganh_id IN (5, 6, 7)");
    console.log(`Remaining materials linked to these IDs: ${vts.rows[0].count}`);

    const allNganhs = await db.execute("SELECT ten_nganh FROM nganh");
    console.log('Current majors in DB:');
    console.log(allNganhs.rows.map(r => r.ten_nganh));
}

verify().catch(console.error);
