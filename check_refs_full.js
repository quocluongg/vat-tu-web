import { createClient } from '@libsql/client/web';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function check() {
    try {
        const latestKi = await db.execute('SELECT id, ten_ki FROM ki_hoc ORDER BY id DESC LIMIT 1');
        const ki_id = latestKi.rows[0].id;

        const vats = await db.execute({
            sql: `
                SELECT vt.id, vt.ten_vat_tu, 
                       (SELECT COUNT(*) FROM de_xuat_chi_tiet WHERE vat_tu_id = vt.id) as dx_count,
                       (SELECT COUNT(*) FROM phieu_xuat_chi_tiet WHERE vat_tu_id = vt.id) as px_count,
                       (SELECT COUNT(*) FROM mua_sam WHERE vat_tu_id = vt.id) as ms_count
                FROM vat_tu vt
                WHERE vt.ki_id = ?
                LIMIT 10
            `,
            args: [ki_id]
        });
        console.table(vats.rows);
    } catch (e) {
        console.error(e);
    }
}

check();
