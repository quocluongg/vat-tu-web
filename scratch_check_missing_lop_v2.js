import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client/web';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function analyze() {
    try {
        const pResult = await db.execute(`
            SELECT px.id, px.giao_vien_id, px.ki_id, px.mon_hoc_id, gv.ho_ten as ten_gv, m.ten_mon
            FROM phieu_xuat px
            JOIN giao_vien gv ON px.giao_vien_id = gv.id
            JOIN mon_hoc m ON px.mon_hoc_id = m.id
            WHERE px.lop_id IS NULL
        `);

        console.log(`Found ${pResult.rows.length} slips with missing lop_id.`);

        for (const px of pResult.rows) {
            console.log(`\n--------------------------------------------------`);
            console.log(`Slip PX-${String(px.id).padStart(4, '0')}: Teacher=${px.ten_gv}, Subject=${px.ten_mon}`);
            
            // Get slip items
            const itemsResult = await db.execute({
                sql: `
                    SELECT pxct.vat_tu_id, pxct.so_luong, vt.ten_vat_tu
                    FROM phieu_xuat_chi_tiet pxct
                    JOIN vat_tu vt ON pxct.vat_tu_id = vt.id
                    WHERE pxct.phieu_xuat_id = ?
                `,
                args: [px.id]
            });
            
            console.log(`Items in slip (${itemsResult.rows.length}):`);
            itemsResult.rows.forEach(r => console.log(`  - ${r.ten_vat_tu}: qty=${r.so_luong}`));

            // Query proposal items to see which class has these exact items and quantities proposed by this teacher for this subject
            // Grouping by lop_id to see which class's proposal fits best!
            const proposalResult = await db.execute({
                sql: `
                    SELECT dxct.lop_id, l.ten_lop, l.si_so,
                           COUNT(dxct.id) as match_items_count
                    FROM de_xuat_chi_tiet dxct
                    JOIN de_xuat dx ON dxct.de_xuat_id = dx.id
                    JOIN lop l ON dxct.lop_id = l.id
                    WHERE dx.giao_vien_id = ? AND dx.ki_id = ? AND dxct.mon_hoc_id = ?
                      AND dxct.vat_tu_id IN (${itemsResult.rows.length > 0 ? itemsResult.rows.map(() => '?').join(',') : 'NULL'})
                    GROUP BY dxct.lop_id
                `,
                args: [px.giao_vien_id, px.ki_id, px.mon_hoc_id, ...itemsResult.rows.map(r => r.vat_tu_id)]
            });

            console.log(`Matching classes in de_xuat_chi_tiet:`);
            proposalResult.rows.forEach(r => {
                console.log(`  * Lop ID: ${r.lop_id}, Name: ${r.ten_lop} -> Matches ${r.match_items_count}/${itemsResult.rows.length} materials`);
            });
            
            if (proposalResult.rows.length === 1) {
                console.log(`===> PERFECT MATCH found: Lop ID ${proposalResult.rows[0].lop_id} (${proposalResult.rows[0].ten_lop})`);
            } else if (proposalResult.rows.length > 1) {
                // Look deeper! Compare quantities too?
                // We can find if there is exactly one class that match ALL materials.
                const exactMatches = [];
                for (const row of proposalResult.rows) {
                    // check if all items in the slip have matching quantity or close enough
                    let allMatch = true;
                    for (const slipItem of itemsResult.rows) {
                        const propItemResult = await db.execute({
                            sql: `
                                SELECT dxct.so_luong
                                FROM de_xuat_chi_tiet dxct
                                JOIN de_xuat dx ON dxct.de_xuat_id = dx.id
                                WHERE dx.giao_vien_id = ? AND dx.ki_id = ? AND dxct.mon_hoc_id = ? 
                                  AND dxct.lop_id = ? AND dxct.vat_tu_id = ?
                            `,
                            args: [px.giao_vien_id, px.ki_id, px.mon_hoc_id, row.lop_id, slipItem.vat_tu_id]
                        });
                        
                        if (propItemResult.rows.length === 0) {
                            allMatch = false;
                            break;
                        }
                        
                        // The exported quantity should be <= proposed quantity usually, but often it's EXACT
                        const proposedQty = propItemResult.rows[0].so_luong;
                        if (slipItem.so_luong > proposedQty) {
                            // If export exceeds proposal, unlikely to be a clean match, but might still be
                        }
                    }
                    if (allMatch) {
                        exactMatches.push(row);
                    }
                }
                
                console.log(`  Exact material set matches (${exactMatches.length}):`, exactMatches.map(e => e.ten_lop).join(', '));
                if (exactMatches.length === 1) {
                    console.log(`===> EXACT SET MATCH found: Lop ID ${exactMatches[0].lop_id} (${exactMatches[0].ten_lop})`);
                }
            } else {
                // If no match in de_xuat (maybe they proposed vat_tu_tam), let's check the teacher's assignment
                const assignResult = await db.execute({
                    sql: `SELECT pc.lop_id, l.ten_lop FROM phan_cong pc JOIN lop l ON pc.lop_id = l.id WHERE pc.giao_vien_id = ? AND pc.mon_hoc_id = ?`,
                    args: [px.giao_vien_id, px.mon_hoc_id]
                });
                if (assignResult.rows.length === 1) {
                    console.log(`===> ASSIGNMENT UNIQUE MATCH found: Lop ID ${assignResult.rows[0].lop_id} (${assignResult.rows[0].ten_lop})`);
                }
            }
        }
    } catch (err) {
        console.error(err);
    }
}

analyze();
