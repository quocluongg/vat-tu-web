
import { createClient } from '@libsql/client/web';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function checkAllFKs() {
    const tables = [
        'de_xuat_chi_tiet',
        'mua_sam',
        'phieu_xuat_chi_tiet',
        'chi_tiet_de_xuat',
        'chi_tiet_phieu_xuat',
        'chi_tiet_mua_sam'
    ];
    
    for (const t of tables) {
        console.log(`\n--- FKs for ${t} ---`);
        try {
            const fks = await db.execute(`PRAGMA foreign_key_list('${t}')`);
            console.log(JSON.stringify(fks.rows, null, 2));
        } catch (e) {
            console.log(`Table ${t} might not exist.`);
        }
    }
}

checkAllFKs().catch(console.error);
