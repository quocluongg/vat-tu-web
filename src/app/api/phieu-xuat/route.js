import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const ki_id = searchParams.get('ki_id');
        const giao_vien_id = searchParams.get('giao_vien_id');
        const id = searchParams.get('id');

        if (id) {
            const px = db.prepare(`
        SELECT px.*, gv.ho_ten as ten_gv, gv.email, gv.so_dien_thoai,
               m.ten_mon, h.ten_he, n.ten_nganh
        FROM phieu_xuat px
        JOIN giao_vien gv ON px.giao_vien_id = gv.id
        JOIN mon_hoc m ON px.mon_hoc_id = m.id
        JOIN he_dao_tao h ON m.he_dao_tao_id = h.id
        JOIN nganh n ON h.nganh_id = n.id
        WHERE px.id = ?
      `).get(id);

            if (!px) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

            const chiTiet = db.prepare(`
        SELECT pxct.*, vt.ten_vat_tu, vt.yeu_cau_ky_thuat, vt.don_vi_tinh, vt.so_luong_kho
        FROM phieu_xuat_chi_tiet pxct
        JOIN vat_tu vt ON pxct.vat_tu_id = vt.id
        WHERE pxct.phieu_xuat_id = ?
      `).all(id);

            return NextResponse.json({ ...px, chi_tiet: chiTiet });
        }

        let query = `
      SELECT px.*, gv.ho_ten as ten_gv, m.ten_mon,
        (SELECT COUNT(*) FROM phieu_xuat_chi_tiet WHERE phieu_xuat_id = px.id) as so_vat_tu,
        (SELECT SUM(so_luong) FROM phieu_xuat_chi_tiet WHERE phieu_xuat_id = px.id) as tong_so_luong
      FROM phieu_xuat px
      JOIN giao_vien gv ON px.giao_vien_id = gv.id
      JOIN mon_hoc m ON px.mon_hoc_id = m.id
    `;

        const conditions = [];
        if (ki_id) conditions.push(`px.ki_id = ${ki_id}`);
        if (giao_vien_id) conditions.push(`px.giao_vien_id = ${giao_vien_id}`);
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY px.ngay_tao DESC';

        const list = db.prepare(query).all();
        return NextResponse.json(list);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const { giao_vien_id, ki_id, mon_hoc_id, chi_tiet } = await request.json();

        // Validate: check teacher's proposal for this subject for quantity limits
        const deXuat = db.prepare(`
      SELECT dxct.vat_tu_id, dxct.so_luong 
      FROM de_xuat_chi_tiet dxct
      JOIN de_xuat dx ON dxct.de_xuat_id = dx.id
      WHERE dx.giao_vien_id = ? AND dx.ki_id = ? AND dxct.mon_hoc_id = ? AND dx.trang_thai = 'duyet'
    `).all(giao_vien_id, ki_id, mon_hoc_id);

        const proposalMap = {};
        for (const d of deXuat) {
            proposalMap[d.vat_tu_id] = d.so_luong;
        }

        // Check existing exports for this teacher + subject in this semester
        const existingExports = db.prepare(`
      SELECT pxct.vat_tu_id, SUM(pxct.so_luong) as da_xuat
      FROM phieu_xuat_chi_tiet pxct
      JOIN phieu_xuat px ON pxct.phieu_xuat_id = px.id
      WHERE px.giao_vien_id = ? AND px.ki_id = ? AND px.mon_hoc_id = ? 
        AND px.trang_thai != 'tu_choi'
      GROUP BY pxct.vat_tu_id
    `).all(giao_vien_id, ki_id, mon_hoc_id);

        const exportedMap = {};
        for (const e of existingExports) {
            exportedMap[e.vat_tu_id] = e.da_xuat;
        }

        // Validate quantities
        for (const ct of chi_tiet) {
            const maxAllowed = (proposalMap[ct.vat_tu_id] || 0) - (exportedMap[ct.vat_tu_id] || 0);
            if (ct.so_luong > maxAllowed) {
                const vt = db.prepare('SELECT ten_vat_tu FROM vat_tu WHERE id = ?').get(ct.vat_tu_id);
                return NextResponse.json({
                    error: `Vật tư "${vt?.ten_vat_tu}" vượt quá số lượng cho phép (còn lại: ${maxAllowed})`
                }, { status: 400 });
            }
        }

        const result = db.prepare(
            "INSERT INTO phieu_xuat (giao_vien_id, ki_id, mon_hoc_id) VALUES (?, ?, ?)"
        ).run(giao_vien_id, ki_id, mon_hoc_id);

        const phieuXuatId = result.lastInsertRowid;

        if (chi_tiet && chi_tiet.length > 0) {
            const stmt = db.prepare('INSERT INTO phieu_xuat_chi_tiet (phieu_xuat_id, vat_tu_id, so_luong) VALUES (?, ?, ?)');
            for (const ct of chi_tiet) {
                stmt.run(phieuXuatId, ct.vat_tu_id, ct.so_luong);
            }
        }

        return NextResponse.json({ id: phieuXuatId, message: 'Tạo phiếu xuất thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const db = getDb();
        const { id, trang_thai, ghi_chu } = await request.json();

        const sets = [];
        const params = [];

        if (trang_thai) {
            sets.push('trang_thai = ?');
            params.push(trang_thai);
            if (trang_thai === 'da_ky') {
                sets.push('ngay_duyet = CURRENT_TIMESTAMP');
            }
            // When exported, reduce inventory
            if (trang_thai === 'da_xuat') {
                const details = db.prepare(
                    'SELECT vat_tu_id, so_luong FROM phieu_xuat_chi_tiet WHERE phieu_xuat_id = ?'
                ).all(id);
                for (const d of details) {
                    db.prepare('UPDATE vat_tu SET so_luong_kho = MAX(0, so_luong_kho - ?) WHERE id = ?').run(d.so_luong, d.vat_tu_id);
                }
            }
        }
        if (ghi_chu !== undefined) {
            sets.push('ghi_chu = ?');
            params.push(ghi_chu);
        }

        params.push(id);
        db.prepare(`UPDATE phieu_xuat SET ${sets.join(', ')} WHERE id = ?`).run(...params);

        return NextResponse.json({ message: 'Cập nhật thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
