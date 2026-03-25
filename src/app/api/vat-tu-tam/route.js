import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const ki_id = searchParams.get('ki_id');
        const giao_vien_id = searchParams.get('giao_vien_id');

        let query = `
            SELECT vt.*, gv.ho_ten as ten_gv,
                   n.ten_nganh as ten_nganh
            FROM vat_tu_tam vt
            JOIN giao_vien gv ON vt.giao_vien_id = gv.id
            LEFT JOIN nganh n ON vt.nganh_id = n.id
        `;
        let conditions = [];
        let args = [];
        if (ki_id) {
            conditions.push('vt.ki_id = ?');
            args.push(parseInt(ki_id));
        }
        if (giao_vien_id) {
            conditions.push('vt.giao_vien_id = ?');
            args.push(parseInt(giao_vien_id));
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
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
        const { ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, ki_id, giao_vien_id, nganh_id } = body;

        if (!ten_vat_tu || !don_vi_tinh || !ki_id || !giao_vien_id) {
            return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
        }

        const result = await db.execute({
            sql: "INSERT INTO vat_tu_tam (ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, ki_id, giao_vien_id, nganh_id, trang_thai) VALUES (?, ?, ?, ?, ?, ?, 'cho_duyet')",
            args: [ten_vat_tu, yeu_cau_ky_thuat || null, don_vi_tinh, ki_id, giao_vien_id, nganh_id || null]
        });

        return NextResponse.json({ 
            id: Number(result.lastInsertRowid), 
            message: 'Đã gửi đề xuất thêm vật tư mới' 
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
