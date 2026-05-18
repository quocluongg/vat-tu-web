import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

/**
 * POST /api/de-xuat-chi-tiet/them
 * Admin thêm vật tư mới vào đề xuất đã có.
 * Body: {
 *   de_xuat_id: number,
 *   items: [{ vat_tu_id, mon_hoc_id, lop_id, so_luong }]
 * }
 */
export async function POST(request) {
    try {
        const db = getDb();
        const { de_xuat_id, items } = await request.json();

        if (!de_xuat_id) {
            return NextResponse.json({ error: 'Thiếu de_xuat_id' }, { status: 400 });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'Vui lòng chọn ít nhất một vật tư' }, { status: 400 });
        }

        // Validate de_xuat exists
        const dxCheck = await db.execute({
            sql: 'SELECT id, ki_id FROM de_xuat WHERE id = ?',
            args: [de_xuat_id]
        });
        if (dxCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Đề xuất không tồn tại' }, { status: 404 });
        }
        const kiId = dxCheck.rows[0].ki_id;

        const stmts = [];
        for (const item of items) {
            if (!item.vat_tu_id || !item.mon_hoc_id || !item.lop_id || !item.so_luong || item.so_luong <= 0) {
                return NextResponse.json({ error: 'Dữ liệu vật tư không hợp lệ (cần vat_tu_id, mon_hoc_id, lop_id, so_luong > 0)' }, { status: 400 });
            }

            // Validate vat_tu exists and belongs to correct ki_id
            const vtCheck = await db.execute({
                sql: 'SELECT id, ten_vat_tu, ki_id FROM vat_tu WHERE id = ?',
                args: [item.vat_tu_id]
            });
            if (vtCheck.rows.length === 0) {
                return NextResponse.json({ error: `Vật tư ID ${item.vat_tu_id} không tồn tại` }, { status: 400 });
            }
            if (vtCheck.rows[0].ki_id !== kiId) {
                return NextResponse.json({ error: `Vật tư "${vtCheck.rows[0].ten_vat_tu}" không thuộc kỳ học này` }, { status: 400 });
            }

            // Check if same vat_tu + mon_hoc + lop already exists in this de_xuat
            const existCheck = await db.execute({
                sql: 'SELECT id FROM de_xuat_chi_tiet WHERE de_xuat_id = ? AND vat_tu_id = ? AND mon_hoc_id = ? AND lop_id = ?',
                args: [de_xuat_id, item.vat_tu_id, item.mon_hoc_id, item.lop_id]
            });

            if (existCheck.rows.length > 0) {
                // Update existing quantity
                stmts.push({
                    sql: 'UPDATE de_xuat_chi_tiet SET so_luong = so_luong + ? WHERE id = ?',
                    args: [item.so_luong, existCheck.rows[0].id]
                });
            } else {
                stmts.push({
                    sql: 'INSERT INTO de_xuat_chi_tiet (de_xuat_id, mon_hoc_id, lop_id, vat_tu_id, so_luong) VALUES (?, ?, ?, ?, ?)',
                    args: [de_xuat_id, item.mon_hoc_id, item.lop_id, item.vat_tu_id, item.so_luong]
                });
            }
        }

        if (stmts.length > 0) {
            await db.batch(stmts, "write");
        }

        return NextResponse.json({
            message: `Đã thêm ${items.length} vật tư vào đề xuất`,
            count: items.length
        });
    } catch (error) {
        console.error('de-xuat-chi-tiet/them POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
