import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(request) {
    try {
        const db = getDb();
        const { action, id, mergeWithId } = await request.json();

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        // Fetch suggested material info
        const tamResult = await db.execute({
            sql: 'SELECT * FROM vat_tu_tam WHERE id = ?',
            args: [id]
        });
        if (tamResult.rows.length === 0) return NextResponse.json({ error: 'Không tìm thấy vật tư đề xuất' }, { status: 404 });
        
        const item = tamResult.rows[0];

        if (action === 'approve') {
            // 1. Create new real material in vat_tu
            // We'll set nganh_id to NULL by default, admin can edit later if needed
            const newVtResult = await db.execute({
                sql: 'INSERT INTO vat_tu (ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, ki_id, so_luong_kho) VALUES (?, ?, ?, ?, 0)',
                args: [item.ten_vat_tu, item.yeu_cau_ky_thuat, item.don_vi_tinh, item.ki_id]
            });
            const newVtId = Number(newVtResult.lastInsertRowid);

            // 2. Update all proposal details to point to this new material
            await db.execute({
                sql: 'UPDATE de_xuat_chi_tiet SET vat_tu_id = ?, vat_tu_tam_id = NULL WHERE vat_tu_tam_id = ?',
                args: [newVtId, id]
            });

            // 3. Mark suggestion as approved
            await db.execute({
                sql: "UPDATE vat_tu_tam SET trang_thai = 'da_duyet' WHERE id = ?",
                args: [id]
            });

            return NextResponse.json({ message: 'Approved successfully', newVtId });

        } else if (action === 'merge') {
            if (!mergeWithId) return NextResponse.json({ error: 'Missing mergeWithId' }, { status: 400 });

            // 1. Update all proposal details to point to existing material
            await db.execute({
                sql: 'UPDATE de_xuat_chi_tiet SET vat_tu_id = ?, vat_tu_tam_id = NULL WHERE vat_tu_tam_id = ?',
                args: [mergeWithId, id]
            });

            // 2. Mark suggestion as approved (or we could delete it, but let's keep it)
            await db.execute({
                sql: "UPDATE vat_tu_tam SET trang_thai = 'da_duyet' WHERE id = ?",
                args: [id]
            });

            return NextResponse.json({ message: 'Merged successfully' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('VatTuTam Admin action error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
