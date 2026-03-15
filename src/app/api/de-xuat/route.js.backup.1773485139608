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
            const dxResult = await db.execute({
                sql: `
        SELECT dx.*, gv.ho_ten as ten_gv, gv.email, gv.so_dien_thoai
        FROM de_xuat dx
        JOIN giao_vien gv ON dx.giao_vien_id = gv.id
        WHERE dx.id = ?
      `,
                args: [id]
            });

            if (dxResult.rows.length === 0) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

            const chiTietResult = await db.execute({
                sql: `
        SELECT dxct.*, vt.ten_vat_tu, vt.yeu_cau_ky_thuat, vt.don_vi_tinh, vt.so_luong_kho,
               m.ten_mon,
               l.ten_lop, l.si_so, l.loai_he,
               CASE l.loai_he
                 WHEN 'T' THEN 'Trung cấp'
                 WHEN 'C' THEN 'Cao đẳng'
                 WHEN 'L' THEN 'Liên thông'
               END as ten_loai_he
        FROM de_xuat_chi_tiet dxct
        JOIN vat_tu vt ON dxct.vat_tu_id = vt.id
        JOIN mon_hoc m ON dxct.mon_hoc_id = m.id
        JOIN lop l ON dxct.lop_id = l.id
        WHERE dxct.de_xuat_id = ?
        ORDER BY l.ten_lop, m.ten_mon, vt.ten_vat_tu
      `,
                args: [id]
            });

            return NextResponse.json({ ...dxResult.rows[0], chi_tiet: chiTietResult.rows });
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

        const listResult = await db.execute(query);
        return NextResponse.json(listResult.rows);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const { giao_vien_id, ki_id, chi_tiet } = await request.json();

        const existingResult = await db.execute({
            sql: 'SELECT id FROM de_xuat WHERE giao_vien_id = ? AND ki_id = ?',
            args: [giao_vien_id, ki_id]
        });

        if (existingResult.rows.length > 0) {
            const existingId = existingResult.rows[0].id;

            const stmts = [
                { sql: 'DELETE FROM de_xuat_chi_tiet WHERE de_xuat_id = ?', args: [existingId] },
                { sql: "UPDATE de_xuat SET trang_thai = 'da_nop', ngay_nop = CURRENT_TIMESTAMP WHERE id = ?", args: [existingId] }
            ];

            if (chi_tiet && chi_tiet.length > 0) {
                for (const ct of chi_tiet) {
                    stmts.push({
                        sql: 'INSERT INTO de_xuat_chi_tiet (de_xuat_id, mon_hoc_id, lop_id, vat_tu_id, so_luong, ghi_chu) VALUES (?, ?, ?, ?, ?, ?)',
                        args: [existingId, ct.mon_hoc_id, ct.lop_id, ct.vat_tu_id, ct.so_luong, ct.ghi_chu || null]
                    });
                }
            }

            await db.batch(stmts, "write");
            return NextResponse.json({ id: existingId, message: 'Cập nhật đề xuất thành công' });
        }

        const result = await db.execute({
            sql: "INSERT INTO de_xuat (giao_vien_id, ki_id, trang_thai, ngay_nop) VALUES (?, ?, 'da_nop', CURRENT_TIMESTAMP)",
            args: [giao_vien_id, ki_id]
        });

        const deXuatId = Number(result.lastInsertRowid);

        if (chi_tiet && chi_tiet.length > 0) {
            const stmts = chi_tiet.map(ct => ({
                sql: 'INSERT INTO de_xuat_chi_tiet (de_xuat_id, mon_hoc_id, lop_id, vat_tu_id, so_luong, ghi_chu) VALUES (?, ?, ?, ?, ?, ?)',
                args: [deXuatId, ct.mon_hoc_id, ct.lop_id, ct.vat_tu_id, ct.so_luong, ct.ghi_chu || null]
            }));
            await db.batch(stmts, "write");
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

        await db.execute({ sql: query, args: params });
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
        await db.execute({
            sql: 'DELETE FROM de_xuat WHERE id = ?',
            args: [id]
        });
        return NextResponse.json({ message: 'Xóa thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
