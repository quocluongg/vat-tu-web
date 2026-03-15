import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        let ki_id = searchParams.get('ki_id');

        // ✅ If no ki_id specified, auto-use latest semester
        if (!ki_id) {
            const latestKiResult = await db.execute({
                sql: 'SELECT id FROM ki_hoc ORDER BY id DESC LIMIT 1'
            });
            if (latestKiResult.rows.length > 0) {
                ki_id = latestKiResult.rows[0].id;
            }
        }

        let query = `
            SELECT vt.*, 
                   ndt.ten_nganh,
                   COALESCE(SUM(
                       CASE WHEN dx.trang_thai IN ('da_nop', 'duyet', 'dang_lam') 
                       THEN dxct.so_luong ELSE 0 END
                   ), 0) as dang_de_xuat
            FROM vat_tu vt
            LEFT JOIN de_xuat_chi_tiet dxct ON vt.id = dxct.vat_tu_id
            LEFT JOIN de_xuat dx ON dxct.de_xuat_id = dx.id
            LEFT JOIN nganh ndt ON vt.nganh_id = ndt.id
        `;
        let args = [];
        if (ki_id) {
            query += ` WHERE vt.ki_id = ?`;
            args = [parseInt(ki_id)];
        }
        query += ' GROUP BY vt.id ORDER BY vt.ten_vat_tu';

        let result;
        if (args.length > 0) {
            result = await db.execute({ sql: query, args });
        } else {
            result = await db.execute(query);
        }
        return NextResponse.json(result.rows);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const body = await request.json();

        if (Array.isArray(body)) {
            const stmts = body.map(item => ({
                sql: 'INSERT INTO vat_tu (ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho, ki_id, nganh_id) VALUES (?, ?, ?, ?, ?, ?)',
                args: [item.ten_vat_tu, item.yeu_cau_ky_thuat || null, item.don_vi_tinh, item.so_luong_kho || 0, item.ki_id, item.nganh_id || null]
            }));
            await db.batch(stmts, "write");
            return NextResponse.json({ message: `Thêm ${body.length} vật tư thành công` });
        }

        const { ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho, ki_id, nganh_id } = body;
        const result = await db.execute({
            sql: 'INSERT INTO vat_tu (ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho, ki_id, nganh_id) VALUES (?, ?, ?, ?, ?, ?)',
            args: [ten_vat_tu, yeu_cau_ky_thuat || null, don_vi_tinh, so_luong_kho || 0, ki_id, nganh_id || null]
        });

        return NextResponse.json({ id: Number(result.lastInsertRowid), message: 'Thêm vật tư thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const db = getDb();
        const { id, ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho, nganh_id } = await request.json();
        await db.execute({
            sql: 'UPDATE vat_tu SET ten_vat_tu = ?, yeu_cau_ky_thuat = ?, don_vi_tinh = ?, so_luong_kho = ?, nganh_id = ? WHERE id = ?',
            args: [ten_vat_tu, yeu_cau_ky_thuat || null, don_vi_tinh, so_luong_kho || 0, nganh_id || null, id]
        });
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

        // Check if material is used in proposals
        const dxCheck = await db.execute({
            sql: 'SELECT COUNT(*) as c FROM de_xuat_chi_tiet WHERE vat_tu_id = ?',
            args: [id]
        });
        if (dxCheck.rows[0]?.c > 0) {
            return NextResponse.json({
                error: 'Không thể xóa vật tư vì nó đang được sử dụng trong các đề xuất. Vui lòng xóa các đề xuất trước.'
            }, { status: 400 });
        }

        // Check if material is used in exports
        const pxCheck = await db.execute({
            sql: 'SELECT COUNT(*) as c FROM phieu_xuat_chi_tiet WHERE vat_tu_id = ?',
            args: [id]
        });
        if (pxCheck.rows[0]?.c > 0) {
            return NextResponse.json({
                error: 'Không thể xóa vật tư vì nó đã được xuất. Vui lòng xóa các phiếu xuất trước.'
            }, { status: 400 });
        }

        await db.execute({
            sql: 'DELETE FROM vat_tu WHERE id = ?',
            args: [id]
        });
        return NextResponse.json({ message: 'Xóa thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
