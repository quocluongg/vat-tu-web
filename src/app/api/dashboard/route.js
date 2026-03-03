import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const db = getDb();

        const stats = {
            giao_vien: db.prepare('SELECT COUNT(*) as count FROM giao_vien').get().count,
            mon_hoc: db.prepare('SELECT COUNT(*) as count FROM mon_hoc').get().count,
            vat_tu: db.prepare('SELECT COUNT(*) as count FROM vat_tu').get().count,
            nganh: db.prepare('SELECT COUNT(*) as count FROM nganh').get().count,
        };

        // Current active semester
        const currentKi = db.prepare("SELECT * FROM ki_hoc WHERE trang_thai != 'dong' ORDER BY created_at DESC LIMIT 1").get();

        if (currentKi) {
            stats.ki_hoc = currentKi;
            stats.de_xuat = {
                total: db.prepare('SELECT COUNT(*) as c FROM de_xuat WHERE ki_id = ?').get(currentKi.id).c,
                da_nop: db.prepare("SELECT COUNT(*) as c FROM de_xuat WHERE ki_id = ? AND trang_thai = 'da_nop'").get(currentKi.id).c,
                duyet: db.prepare("SELECT COUNT(*) as c FROM de_xuat WHERE ki_id = ? AND trang_thai = 'duyet'").get(currentKi.id).c,
                tu_choi: db.prepare("SELECT COUNT(*) as c FROM de_xuat WHERE ki_id = ? AND trang_thai = 'tu_choi'").get(currentKi.id).c,
                dang_lam: db.prepare("SELECT COUNT(*) as c FROM de_xuat WHERE ki_id = ? AND trang_thai = 'dang_lam'").get(currentKi.id).c,
            };
            stats.phieu_xuat = {
                total: db.prepare('SELECT COUNT(*) as c FROM phieu_xuat WHERE ki_id = ?').get(currentKi.id).c,
                cho_duyet: db.prepare("SELECT COUNT(*) as c FROM phieu_xuat WHERE ki_id = ? AND trang_thai = 'cho_duyet'").get(currentKi.id).c,
                da_xuat: db.prepare("SELECT COUNT(*) as c FROM phieu_xuat WHERE ki_id = ? AND trang_thai = 'da_xuat'").get(currentKi.id).c,
            };

            // Teachers pending proposals
            const gvDaDeXuat = db.prepare(`
        SELECT DISTINCT giao_vien_id FROM de_xuat WHERE ki_id = ?
      `).all(currentKi.id).map(r => r.giao_vien_id);

            const gvDuocPhanCong = db.prepare(`
        SELECT DISTINCT giao_vien_id FROM phan_cong WHERE ki_id = ?
      `).all(currentKi.id).map(r => r.giao_vien_id);

            stats.gv_chua_de_xuat = gvDuocPhanCong.filter(id => !gvDaDeXuat.includes(id)).length;
            stats.gv_da_de_xuat = gvDaDeXuat.length;
        }

        return NextResponse.json(stats);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
