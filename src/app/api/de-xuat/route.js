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
            const dx = db.prepare(`
        SELECT dx.*, gv.ho_ten as ten_gv, gv.email, gv.so_dien_thoai
        FROM de_xuat dx
        JOIN giao_vien gv ON dx.giao_vien_id = gv.id
        WHERE dx.id = ?
      `).get(id);

            if (!dx) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

            const chiTiet = db.prepare(`
        SELECT dxct.*, vt.ten_vat_tu, vt.yeu_cau_ky_thuat, vt.don_vi_tinh, vt.so_luong_kho,
               m.ten_mon, h.ten_he, n.ten_nganh
        FROM de_xuat_chi_tiet dxct
        JOIN vat_tu vt ON dxct.vat_tu_id = vt.id
        JOIN mon_hoc m ON dxct.mon_hoc_id = m.id
        JOIN he_dao_tao h ON m.he_dao_tao_id = h.id
        JOIN nganh n ON h.nganh_id = n.id
        WHERE dxct.de_xuat_id = ?
        ORDER BY m.ten_mon, vt.ten_vat_tu
      `).all(id);

            return NextResponse.json({ ...dx, chi_tiet: chiTiet });
        }

        let query = `
      SELECT dx.*, gv.ho_ten as ten_gv, gv.email,
        (SELECT COUNT(*) FROM de_xuat_chi_tiet WHERE de_xuat_id = dx.id) as so_vat_tu,
        (SELECT SUM(so_luong) FROM de_xuat_chi_tiet WHERE de_xuat_id = dx.id) as tong_so_luong
      FROM de_xuat dx
      JOIN giao_vien gv ON dx.giao_vien_id = gv.id
    `;

        const conditions = [];
        if (ki_id) conditions.push(`dx.ki_id = ${ki_id}`);
        if (giao_vien_id) conditions.push(`dx.giao_vien_id = ${giao_vien_id}`);
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY dx.created_at DESC';

        const list = db.prepare(query).all();
        return NextResponse.json(list);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const { giao_vien_id, ki_id, chi_tiet } = await request.json();

        // Check if teacher already has a proposal for this semester
        const existing = db.prepare('SELECT id FROM de_xuat WHERE giao_vien_id = ? AND ki_id = ?').get(giao_vien_id, ki_id);

        if (existing) {
            // Update existing: delete old details, add new ones
            db.prepare('DELETE FROM de_xuat_chi_tiet WHERE de_xuat_id = ?').run(existing.id);
            db.prepare("UPDATE de_xuat SET trang_thai = 'da_nop', ngay_nop = CURRENT_TIMESTAMP WHERE id = ?").run(existing.id);

            if (chi_tiet && chi_tiet.length > 0) {
                const stmt = db.prepare('INSERT INTO de_xuat_chi_tiet (de_xuat_id, mon_hoc_id, vat_tu_id, so_luong, ghi_chu) VALUES (?, ?, ?, ?, ?)');
                for (const ct of chi_tiet) {
                    stmt.run(existing.id, ct.mon_hoc_id, ct.vat_tu_id, ct.so_luong, ct.ghi_chu || null);
                }
            }

            return NextResponse.json({ id: existing.id, message: 'Cập nhật đề xuất thành công' });
        }

        const result = db.prepare(
            "INSERT INTO de_xuat (giao_vien_id, ki_id, trang_thai, ngay_nop) VALUES (?, ?, 'da_nop', CURRENT_TIMESTAMP)"
        ).run(giao_vien_id, ki_id);

        const deXuatId = result.lastInsertRowid;

        if (chi_tiet && chi_tiet.length > 0) {
            const stmt = db.prepare('INSERT INTO de_xuat_chi_tiet (de_xuat_id, mon_hoc_id, vat_tu_id, so_luong, ghi_chu) VALUES (?, ?, ?, ?, ?)');
            for (const ct of chi_tiet) {
                stmt.run(deXuatId, ct.mon_hoc_id, ct.vat_tu_id, ct.so_luong, ct.ghi_chu || null);
            }
        }

        return NextResponse.json({ id: deXuatId, message: 'Gửi đề xuất thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const db = getDb();
        const { id, trang_thai, ghi_chu } = await request.json();

        let query = 'UPDATE de_xuat SET';
        const params = [];
        const sets = [];

        if (trang_thai) {
            sets.push(' trang_thai = ?');
            params.push(trang_thai);
        }
        if (ghi_chu !== undefined) {
            sets.push(' ghi_chu = ?');
            params.push(ghi_chu);
        }

        query += sets.join(',') + ' WHERE id = ?';
        params.push(id);

        db.prepare(query).run(...params);
        return NextResponse.json({ message: 'Cập nhật thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        db.prepare('DELETE FROM de_xuat WHERE id = ?').run(id);
        return NextResponse.json({ message: 'Xóa thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
