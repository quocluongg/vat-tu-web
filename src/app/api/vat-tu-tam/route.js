import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const ki_id = searchParams.get('ki_id');

        let query = `
            SELECT vt.*, gv.ho_ten as ten_gv
            FROM vat_tu_tam vt
            JOIN giao_vien gv ON vt.giao_vien_id = gv.id
        `;
        let args = [];
        if (ki_id) {
            query += ` WHERE vt.ki_id = ?`;
            args = [parseInt(ki_id)];
        }
        query += ' ORDER BY vt.created_at DESC';

        const result = await db.execute({ sql: query, args });
        return NextResponse.json(result.rows);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const body = await request.json();
        const { ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, ki_id, giao_vien_id } = body;

        if (!ten_vat_tu || !don_vi_tinh || !ki_id || !giao_vien_id) {
            return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
        }

        const result = await db.execute({
            sql: "INSERT INTO vat_tu_tam (ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, ki_id, giao_vien_id, trang_thai) VALUES (?, ?, ?, ?, ?, 'cho_duyet')",
            args: [ten_vat_tu, yeu_cau_ky_thuat || null, don_vi_tinh, ki_id, giao_vien_id]
        });

        return NextResponse.json({ 
            id: Number(result.lastInsertRowid), 
            message: 'Đã gửi đề xuất thêm vật tư mới' 
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
