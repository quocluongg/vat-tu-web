import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const db = getDb();

        const stats = {
            giao_vien: (await db.execute('SELECT COUNT(*) as count FROM giao_vien')).rows[0].count,
            mon_hoc: (await db.execute('SELECT COUNT(*) as count FROM mon_hoc')).rows[0].count,
            vat_tu: (await db.execute('SELECT COUNT(*) as count FROM vat_tu')).rows[0].count,
            nganh: (await db.execute('SELECT COUNT(*) as count FROM nganh')).rows[0].count,
        };

        // Current active semester
        const currentKiResult = await db.execute("SELECT * FROM ki_hoc WHERE trang_thai != 'dong' ORDER BY created_at DESC LIMIT 1");
        const currentKi = currentKiResult.rows[0];

        if (currentKi) {
            stats.ki_hoc = currentKi;

            // Execute multiple queries concurrently for better performance over network
            const [dxTotal, dxDaNop, dxDuyet, dxTuChoi, dxDangLam, pxTotal, pxChoDuyet, pxDaXuat, gvDaDeXuatResult, gvDuocPhanCongResult] = await Promise.all([
                db.execute({ sql: 'SELECT COUNT(*) as c FROM de_xuat WHERE ki_id = ?', args: [currentKi.id] }),
                db.execute({ sql: "SELECT COUNT(*) as c FROM de_xuat WHERE ki_id = ? AND trang_thai = 'da_nop'", args: [currentKi.id] }),
                db.execute({ sql: "SELECT COUNT(*) as c FROM de_xuat WHERE ki_id = ? AND trang_thai = 'duyet'", args: [currentKi.id] }),
                db.execute({ sql: "SELECT COUNT(*) as c FROM de_xuat WHERE ki_id = ? AND trang_thai = 'tu_choi'", args: [currentKi.id] }),
                db.execute({ sql: "SELECT COUNT(*) as c FROM de_xuat WHERE ki_id = ? AND trang_thai = 'dang_lam'", args: [currentKi.id] }),

                db.execute({ sql: 'SELECT COUNT(*) as c FROM phieu_xuat WHERE ki_id = ?', args: [currentKi.id] }),
                db.execute({ sql: "SELECT COUNT(*) as c FROM phieu_xuat WHERE ki_id = ? AND trang_thai = 'cho_duyet'", args: [currentKi.id] }),
                db.execute({ sql: "SELECT COUNT(*) as c FROM phieu_xuat WHERE ki_id = ? AND trang_thai = 'da_xuat'", args: [currentKi.id] }),

                db.execute({ sql: 'SELECT DISTINCT giao_vien_id FROM de_xuat WHERE ki_id = ?', args: [currentKi.id] }),
                db.execute({ sql: 'SELECT DISTINCT giao_vien_id FROM phan_cong WHERE ki_id = ?', args: [currentKi.id] })
            ]);

            stats.de_xuat = {
                total: dxTotal.rows[0].c,
                da_nop: dxDaNop.rows[0].c,
                duyet: dxDuyet.rows[0].c,
                tu_choi: dxTuChoi.rows[0].c,
                dang_lam: dxDangLam.rows[0].c,
            };
            stats.phieu_xuat = {
                total: pxTotal.rows[0].c,
                cho_duyet: pxChoDuyet.rows[0].c,
                da_xuat: pxDaXuat.rows[0].c,
            };

            const gvDaDeXuatIds = gvDaDeXuatResult.rows.map(r => r.giao_vien_id);
            const gvDuocPhanCongIds = gvDuocPhanCongResult.rows.map(r => r.giao_vien_id);

            stats.gv_chua_de_xuat = gvDuocPhanCongIds.filter(id => !gvDaDeXuatIds.includes(id)).length;
            stats.gv_da_de_xuat = gvDaDeXuatIds.length;
        }

        return NextResponse.json(stats);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
