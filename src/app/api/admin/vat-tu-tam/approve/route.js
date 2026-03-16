import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(request) {
    try {
        const db = getDb();
        const { id, nganh_id } = await request.json();

        if (!id) return NextResponse.json({ error: 'Thiếu ID vật tư tạm' }, { status: 400 });

        // 1. Get temporary material info
        const tamResult = await db.execute({
            sql: 'SELECT * FROM vat_tu_tam WHERE id = ?',
            args: [id]
        });
        if (tamResult.rows.length === 0) return NextResponse.json({ error: 'Không tìm thấy vật tư tạm' }, { status: 404 });
        const vtTam = tamResult.rows[0];

        // 2. Insert into main vat_tu table
        const vtResult = await db.execute({
            sql: 'INSERT INTO vat_tu (ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho, ki_id, nganh_id) VALUES (?, ?, ?, ?, ?, ?)',
            args: [vtTam.ten_vat_tu, vtTam.yeu_cau_ky_thuat, vtTam.don_vi_tinh, 0, vtTam.ki_id, nganh_id || null]
        });
        const newVatTuId = Number(vtResult.lastInsertRowid);

        // 3. Update all proposal details to point to new official material
        await db.execute({
            sql: 'UPDATE de_xuat_chi_tiet SET vat_tu_id = ?, vat_tu_tam_id = NULL WHERE vat_tu_tam_id = ?',
            args: [newVatTuId, id]
        });

        // 4. Delete from temp table
        await db.execute({
            sql: 'DELETE FROM vat_tu_tam WHERE id = ?',
            args: [id]
        });

        return NextResponse.json({ message: 'Đã duyệt và thêm vật tư vào kho chính thức', id: newVatTuId });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
