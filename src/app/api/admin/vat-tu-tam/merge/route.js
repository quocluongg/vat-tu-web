import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(request) {
    try {
        const db = getDb();
        const { id, target_vt_id } = await request.json();

        if (!id || !target_vt_id) return NextResponse.json({ error: 'Thiếu ID cần thiết' }, { status: 400 });

        // 1. Update all proposal details to point to the existing official material
        await db.execute({
            sql: 'UPDATE de_xuat_chi_tiet SET vat_tu_id = ?, vat_tu_tam_id = NULL WHERE vat_tu_tam_id = ?',
            args: [target_vt_id, id]
        });

        // 2. Delete from temp table
        await db.execute({
            sql: 'DELETE FROM vat_tu_tam WHERE id = ?',
            args: [id]
        });

        return NextResponse.json({ message: 'Đã gộp vật tư đề xuất vào vật tư sẵn có trong kho' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
