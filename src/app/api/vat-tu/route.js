import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const ki_id = searchParams.get('ki_id');

        let query = 'SELECT * FROM vat_tu';
        if (ki_id) {
            query += ` WHERE ki_id = ${ki_id}`;
        }
        query += ' ORDER BY ten_vat_tu';

        const list = db.prepare(query).all();
        return NextResponse.json(list);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const body = await request.json();

        if (Array.isArray(body)) {
            const stmt = db.prepare(
                'INSERT INTO vat_tu (ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho, ki_id) VALUES (?, ?, ?, ?, ?)'
            );
            const insertMany = db.transaction((items) => {
                for (const item of items) {
                    stmt.run(item.ten_vat_tu, item.yeu_cau_ky_thuat || null, item.don_vi_tinh, item.so_luong_kho || 0, item.ki_id);
                }
            });
            insertMany(body);
            return NextResponse.json({ message: `Thêm ${body.length} vật tư thành công` });
        }

        const { ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho, ki_id } = body;
        const result = db.prepare(
            'INSERT INTO vat_tu (ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho, ki_id) VALUES (?, ?, ?, ?, ?)'
        ).run(ten_vat_tu, yeu_cau_ky_thuat || null, don_vi_tinh, so_luong_kho || 0, ki_id);

        return NextResponse.json({ id: result.lastInsertRowid, message: 'Thêm vật tư thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const db = getDb();
        const { id, ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho } = await request.json();
        db.prepare(
            'UPDATE vat_tu SET ten_vat_tu = ?, yeu_cau_ky_thuat = ?, don_vi_tinh = ?, so_luong_kho = ? WHERE id = ?'
        ).run(ten_vat_tu, yeu_cau_ky_thuat || null, don_vi_tinh, so_luong_kho || 0, id);
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
        db.prepare('DELETE FROM vat_tu WHERE id = ?').run(id);
        return NextResponse.json({ message: 'Xóa thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
