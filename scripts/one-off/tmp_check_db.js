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
        const stats = await db.execute({
            sql: `
                SELECT 
                    COUNT(DISTINCT vt.id) as total_vt,
                    SUM(vt.so_luong_kho) as tong_ton_kho,
                    SUM(COALESCE(dx_sum.qty, 0)) as tong_de_xuat,
                    SUM(COALESCE(px_sum.qty, 0)) as tong_da_xuat
                FROM vat_tu vt
                LEFT JOIN (
                    SELECT dxct.vat_tu_id, SUM(dxct.so_luong) as qty
                    FROM de_xuat_chi_tiet dxct
                    JOIN de_xuat dx ON dxct.de_xuat_id = dx.id
                    WHERE dx.ki_id = 7 AND dx.trang_thai IN ('da_nop', 'duyet', 'dang_lam')
                    GROUP BY dxct.vat_tu_id
                ) dx_sum ON vt.id = dx_sum.vat_tu_id
                LEFT JOIN (
                    SELECT pxct.vat_tu_id, SUM(pxct.so_luong) as qty
                    FROM phieu_xuat_chi_tiet pxct
                    JOIN phieu_xuat px ON pxct.phieu_xuat_id = px.id
                    WHERE px.ki_id = 7 AND px.trang_thai = 'da_xuat'
                    GROUP BY pxct.vat_tu_id
                ) px_sum ON vt.id = px_sum.vat_tu_id
                WHERE vt.ki_id = 7
            `
        });
        console.log("STATS KI 7:", stats.rows);

        const sample = await db.execute({
            sql: `
                SELECT vt.id, vt.ten_vat_tu, vt.yeu_cau_ky_thuat, vt.don_vi_tinh, vt.so_luong_kho, vt.ki_id, vt.nganh_id,
                       ndt.ten_nganh,
                       COALESCE(SUM(CASE WHEN dx.trang_thai IN ('da_nop', 'duyet', 'dang_lam') THEN dxct.so_luong ELSE 0 END), 0) as dang_de_xuat
                FROM vat_tu vt
                LEFT JOIN de_xuat_chi_tiet dxct ON vt.id = dxct.vat_tu_id
                LEFT JOIN de_xuat dx ON dxct.de_xuat_id = dx.id
                LEFT JOIN nganh ndt ON vt.nganh_id = ndt.id
                WHERE vt.ki_id = 7
                GROUP BY vt.id
                LIMIT 5
            `
        });
        console.log("SAMPLE VT KI 7:", JSON.stringify(sample.rows, null, 2));

        const pxctCols = await db.execute("PRAGMA table_info(phieu_xuat_chi_tiet)");
        console.log("PHIEU_XUAT_CHI_TIET COLS:", pxctCols.rows);
        const dxctCols = await db.execute("PRAGMA table_info(de_xuat_chi_tiet)");
        console.log("DE_XUAT_CHI_TIET COLS:", dxctCols.rows);
        const pxCols = await db.execute("PRAGMA table_info(phieu_xuat)");
        console.log("PHIEU_XUAT COLS:", pxCols.rows);
        const dxCols = await db.execute("PRAGMA table_info(de_xuat)");
        console.log("DE_XUAT COLS:", dxCols.rows);
    } catch (e) {
        console.error(e);
    }
}

check();
