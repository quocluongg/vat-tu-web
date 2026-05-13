import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client/web';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error("❌ Missing database credentials");
    process.exit(1);
}

const db = createClient({ url, authToken });

async function analyze() {
    try {
        // Find all phieu_xuat without lop_id
        const pResult = await db.execute(`
            SELECT px.id, px.giao_vien_id, px.ki_id, px.mon_hoc_id, gv.ho_ten as ten_gv, m.ten_mon
            FROM phieu_xuat px
            JOIN giao_vien gv ON px.giao_vien_id = gv.id
            JOIN mon_hoc m ON px.mon_hoc_id = m.id
            WHERE px.lop_id IS NULL
        `);

        console.log(`Found ${pResult.rows.length} slips with missing lop_id.`);

        for (const px of pResult.rows) {
            // Find phan_cong for this teacher, subject, semester
            const pcResult = await db.execute({
                sql: `
                    SELECT pc.lop_id, l.ten_lop, l.si_so
                    FROM phan_cong pc
                    JOIN lop l ON pc.lop_id = l.id
                    WHERE pc.giao_vien_id = ? AND pc.mon_hoc_id = ? AND pc.ki_id = ?
                `,
                args: [px.giao_vien_id, px.mon_hoc_id, px.ki_id]
            });

            console.log(`\nSlip PX-${String(px.id).padStart(4, '0')}: Teacher=${px.ten_gv}, Subject=${px.ten_mon}`);
            console.log(`Potential classes found in distribution (${pcResult.rows.length}):`);
            pcResult.rows.forEach(r => {
                console.log(`  - Lop ID: ${r.lop_id}, Name: ${r.ten_lop}, Size: ${r.si_so}`);
            });

            if (pcResult.rows.length === 1) {
                console.log(`==> Match UNIQUE class ID ${pcResult.rows[0].lop_id}!`);
            }
        }
    } catch (err) {
        console.error(err);
    }
}

analyze();
