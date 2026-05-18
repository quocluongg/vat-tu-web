import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

/**
 * PATCH /api/de-xuat-chi-tiet
 * Admin thay đổi vật tư hoặc số lượng trong một dòng chi tiết đề xuất.
 * Body: { id, vat_tu_id } — đổi sang vật tư trong kho
 *    or { id, vat_tu_tam_id } — đổi sang vật tư tạm (ít dùng)
 *    or { id, so_luong } — chỉnh số lượng
 *    or { id, vat_tu_id, so_luong } — đổi cả vật tư và số lượng
 */
export async function PATCH(request) {
    try {
        const db = getDb();
        const body = await request.json();
        const { id, vat_tu_id, vat_tu_tam_id, so_luong } = body;

        if (!id) {
            return NextResponse.json({ error: 'Thiếu id của dòng chi tiết' }, { status: 400 });
        }

        // Kiểm tra dòng chi tiết tồn tại
        const rowCheck = await db.execute({
            sql: 'SELECT id FROM de_xuat_chi_tiet WHERE id = ?',
            args: [id]
        });
        if (rowCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Dòng chi tiết không tồn tại' }, { status: 404 });
        }

        // Chỉ cập nhật số lượng (không đổi vật tư)
        if (so_luong !== undefined && !vat_tu_id && !vat_tu_tam_id) {
            const qty = parseInt(so_luong);
            if (isNaN(qty) || qty <= 0) {
                return NextResponse.json({ error: 'Số lượng phải là số dương' }, { status: 400 });
            }
            await db.execute({
                sql: 'UPDATE de_xuat_chi_tiet SET so_luong = ? WHERE id = ?',
                args: [qty, id]
            });
            return NextResponse.json({ message: `Đã cập nhật số lượng thành ${qty}` });
        }

        if (!vat_tu_id && !vat_tu_tam_id) {
            return NextResponse.json({ error: 'Phải cung cấp vat_tu_id, vat_tu_tam_id hoặc so_luong' }, { status: 400 });
        }

        if (vat_tu_id) {
            // Kiểm tra vật tư kho tồn tại
            const vtCheck = await db.execute({
                sql: 'SELECT id, ten_vat_tu FROM vat_tu WHERE id = ?',
                args: [vat_tu_id]
            });
            if (vtCheck.rows.length === 0) {
                return NextResponse.json({ error: 'Vật tư không tồn tại trong kho' }, { status: 400 });
            }

            // Cập nhật: trỏ về vật tư kho, xóa vật tư tạm, và số lượng nếu có
            if (so_luong !== undefined) {
                const qty = parseInt(so_luong);
                if (isNaN(qty) || qty <= 0) {
                    return NextResponse.json({ error: 'Số lượng phải là số dương' }, { status: 400 });
                }
                await db.execute({
                    sql: 'UPDATE de_xuat_chi_tiet SET vat_tu_id = ?, vat_tu_tam_id = NULL, so_luong = ? WHERE id = ?',
                    args: [vat_tu_id, qty, id]
                });
            } else {
                await db.execute({
                    sql: 'UPDATE de_xuat_chi_tiet SET vat_tu_id = ?, vat_tu_tam_id = NULL WHERE id = ?',
                    args: [vat_tu_id, id]
                });
            }

            return NextResponse.json({
                message: `Đã đổi sang vật tư: ${vtCheck.rows[0].ten_vat_tu}`
            });
        } else {
            // Kiểm tra vật tư tạm tồn tại
            const vttCheck = await db.execute({
                sql: 'SELECT id, ten_vat_tu FROM vat_tu_tam WHERE id = ?',
                args: [vat_tu_tam_id]
            });
            if (vttCheck.rows.length === 0) {
                return NextResponse.json({ error: 'Vật tư tạm không tồn tại' }, { status: 400 });
            }

            // Cập nhật: trỏ về vật tư tạm, xóa vật tư kho
            if (so_luong !== undefined) {
                const qty = parseInt(so_luong);
                if (isNaN(qty) || qty <= 0) {
                    return NextResponse.json({ error: 'Số lượng phải là số dương' }, { status: 400 });
                }
                await db.execute({
                    sql: 'UPDATE de_xuat_chi_tiet SET vat_tu_id = NULL, vat_tu_tam_id = ?, so_luong = ? WHERE id = ?',
                    args: [vat_tu_tam_id, qty, id]
                });
            } else {
                await db.execute({
                    sql: 'UPDATE de_xuat_chi_tiet SET vat_tu_id = NULL, vat_tu_tam_id = ? WHERE id = ?',
                    args: [vat_tu_tam_id, id]
                });
            }

            return NextResponse.json({
                message: `Đã đổi sang vật tư tạm: ${vttCheck.rows[0].ten_vat_tu}`
            });
        }
    } catch (error) {
        console.error('de-xuat-chi-tiet PATCH error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/de-xuat-chi-tiet?id=123
 * Xóa một dòng chi tiết đề xuất (admin xóa vật tư khỏi đơn đề xuất)
 * Query: ?id=123 — xóa 1 dòng
 * Body (optional): { ids: [1, 2, 3] } — xóa nhiều dòng
 */
export async function DELETE(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const singleId = searchParams.get('id');

        if (singleId) {
            // Xóa 1 dòng
            const check = await db.execute({
                sql: 'SELECT id, de_xuat_id FROM de_xuat_chi_tiet WHERE id = ?',
                args: [singleId]
            });
            if (check.rows.length === 0) {
                return NextResponse.json({ error: 'Dòng chi tiết không tồn tại' }, { status: 404 });
            }

            await db.execute({
                sql: 'DELETE FROM de_xuat_chi_tiet WHERE id = ?',
                args: [singleId]
            });

            return NextResponse.json({ message: 'Đã xóa dòng vật tư khỏi đề xuất' });
        }

        // Xóa nhiều dòng (batch)
        const body = await request.json().catch(() => null);
        if (body && body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
            const placeholders = body.ids.map(() => '?').join(',');
            await db.execute({
                sql: `DELETE FROM de_xuat_chi_tiet WHERE id IN (${placeholders})`,
                args: body.ids
            });
            return NextResponse.json({ message: `Đã xóa ${body.ids.length} dòng vật tư` });
        }

        return NextResponse.json({ error: 'Thiếu id hoặc ids để xóa' }, { status: 400 });
    } catch (error) {
        console.error('de-xuat-chi-tiet DELETE error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
