import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const ki_id = parseInt(searchParams.get('ki_id'));

        if (!ki_id) {
            return NextResponse.json({ error: 'Missing ki_id' }, { status: 400 });
        }

        // 1. Thống kê giáo viên: Tổng số GV được phân công so với số GV đã nộp đề xuất
        const gvStatsQuery = `
            WITH AssignedGV AS (
                SELECT DISTINCT giao_vien_id 
                FROM phan_cong 
                WHERE ki_id = ?
            ),
            SubmittedGV AS (
                SELECT DISTINCT giao_vien_id 
                FROM de_xuat 
                WHERE ki_id = ? AND trang_thai IN ('da_nop', 'duyet', 'dang_lam')
            )
            SELECT 
                (SELECT COUNT(*) FROM AssignedGV) as tong_gv,
                (SELECT COUNT(*) FROM SubmittedGV) as da_nop,
                (SELECT GROUP_CONCAT(ho_ten, ', ') FROM giao_vien 
                 WHERE id IN (SELECT giao_vien_id FROM AssignedGV)
                 AND id NOT IN (SELECT giao_vien_id FROM SubmittedGV)) as ds_chua_nop
        `;

        const gvStatsResult = await db.execute({
            sql: gvStatsQuery,
            args: [ki_id, ki_id]
        });

        // 2. Thống kê vật tư theo ngành
        const materialStatsQuery = `
            SELECT 
                ndt.id as nganh_id,
                ndt.ten_nganh,
                COALESCE(vt.id, 'tam_' || vtt.id) as vat_tu_id,
                COALESCE(vt.ten_vat_tu, vtt.ten_vat_tu) as ten_vat_tu,
                COALESCE(vt.yeu_cau_ky_thuat, vtt.yeu_cau_ky_thuat) as yeu_cau_ky_thuat,
                COALESCE(vt.don_vi_tinh, vtt.don_vi_tinh) as don_vi_tinh,
                SUM(dxct.so_luong) as tong_de_xuat,
                vt.so_luong_kho,
                CASE WHEN dxct.vat_tu_tam_id IS NOT NULL THEN 1 ELSE 0 END as is_tam
            FROM de_xuat_chi_tiet dxct
            JOIN de_xuat dx ON dxct.de_xuat_id = dx.id
            LEFT JOIN vat_tu vt ON dxct.vat_tu_id = vt.id
            LEFT JOIN vat_tu_tam vtt ON dxct.vat_tu_tam_id = vtt.id
            LEFT JOIN nganh ndt ON vt.nganh_id = ndt.id
            WHERE dx.ki_id = ? AND dx.trang_thai IN ('da_nop', 'duyet', 'dang_lam')
            GROUP BY ndt.id, COALESCE(vt.id, 'tam_' || vtt.id)
            ORDER BY ndt.ten_nganh, ten_vat_tu
        `;

        const materialStatsResult = await db.execute({
            sql: materialStatsQuery,
            args: [ki_id]
        });

        // Group by nganh
        const nganhStats = {};
        materialStatsResult.rows.forEach(row => {
            const nganhKey = row.nganh_id || 'chung';
            const nganhName = row.ten_nganh || 'Dùng chung';
            
            if (!nganhStats[nganhKey]) {
                nganhStats[nganhKey] = {
                    id: row.nganh_id,
                    ten_nganh: nganhName,
                    materialList: []
                };
            }
            nganhStats[nganhKey].materialList.push(row);
        });

        return NextResponse.json({
            gvStats: gvStatsResult.rows[0],
            nganhStats: Object.values(nganhStats)
        });
    } catch (error) {
        console.error('Stats API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
