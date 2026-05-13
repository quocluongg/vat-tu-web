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

async function repair() {
    try {
        // Get all slips without lop_id
        const pResult = await db.execute(`
            SELECT px.id, px.giao_vien_id, px.ki_id, px.mon_hoc_id, gv.ho_ten as ten_gv, m.ten_mon
            FROM phieu_xuat px
            JOIN giao_vien gv ON px.giao_vien_id = gv.id
            JOIN mon_hoc m ON px.mon_hoc_id = m.id
            WHERE px.lop_id IS NULL
        `);

        console.log(`🛠 Found ${pResult.rows.length} slips to process.`);
        let successCount = 0;

        for (const px of pResult.rows) {
            console.log(`\nProcessing PX-${String(px.id).padStart(4, '0')} (${px.ten_gv} - ${px.ten_mon})...`);
            let targetLopId = null;
            let matchReason = "";

            // 1. Try to match by materials in proposals (de_xuat_chi_tiet)
            const itemsResult = await db.execute({
                sql: `
                    SELECT pxct.vat_tu_id
                    FROM phieu_xuat_chi_tiet pxct
                    WHERE pxct.phieu_xuat_id = ?
                `,
                args: [px.id]
            });

            if (itemsResult.rows.length > 0) {
                const vatTuIds = itemsResult.rows.map(r => r.vat_tu_id);
                const placeholders = vatTuIds.map(() => '?').join(',');

                const proposalResult = await db.execute({
                    sql: `
                        SELECT dxct.lop_id, l.ten_lop,
                               COUNT(dxct.id) as match_items_count
                        FROM de_xuat_chi_tiet dxct
                        JOIN de_xuat dx ON dxct.de_xuat_id = dx.id
                        JOIN lop l ON dxct.lop_id = l.id
                        WHERE dx.giao_vien_id = ? AND dx.ki_id = ? AND dxct.mon_hoc_id = ?
                          AND dxct.vat_tu_id IN (${placeholders})
                        GROUP BY dxct.lop_id
                        ORDER BY match_items_count DESC
                    `,
                    args: [px.giao_vien_id, px.ki_id, px.mon_hoc_id, ...vatTuIds]
                });

                if (proposalResult.rows.length > 0) {
                    // Take the one with the most material matches
                    const topMatch = proposalResult.rows[0];
                    targetLopId = topMatch.lop_id;
                    matchReason = `Matched materials in proposal (${topMatch.ten_lop}, match count: ${topMatch.match_items_count}/${vatTuIds.length})`;
                }
            }

            // 2. Fallback: If still no class found, pick the first class in phan_cong assignment
            if (!targetLopId) {
                const assignResult = await db.execute({
                    sql: `
                        SELECT pc.lop_id, l.ten_lop
                        FROM phan_cong pc
                        JOIN lop l ON pc.lop_id = l.id
                        WHERE pc.giao_vien_id = ? AND pc.mon_hoc_id = ? AND pc.ki_id = ?
                        LIMIT 1
                    `,
                    args: [px.giao_vien_id, px.mon_hoc_id, px.ki_id]
                });

                if (assignResult.rows.length > 0) {
                    targetLopId = assignResult.rows[0].lop_id;
                    matchReason = `Fallback to first assignment class (${assignResult.rows[0].ten_lop})`;
                }
            }

            // 3. Apply Update
            if (targetLopId) {
                await db.execute({
                    sql: 'UPDATE phieu_xuat SET lop_id = ? WHERE id = ?',
                    args: [targetLopId, px.id]
                });
                console.log(`✅ UPDATED: Fixed PX-${String(px.id).padStart(4, '0')} with Lop ID ${targetLopId} (${matchReason})`);
                successCount++;
            } else {
                console.warn(`⚠️ WARNING: Could not find any matching class for PX-${String(px.id).padStart(4, '0')}. Skipping.`);
            }
        }

        console.log(`\n🎉 Successfully repaired ${successCount}/${pResult.rows.length} slips.`);
    } catch (err) {
        console.error("❌ Error during repair:", err);
    }
}

repair();
