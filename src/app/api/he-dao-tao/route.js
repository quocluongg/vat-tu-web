import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const nganh_id = searchParams.get('nganh_id');

        let query = `
      SELECT h.*, n.ten_nganh
      FROM he_dao_tao h
      JOIN nganh n ON h.nganh_id = n.id
    `;

        if (nganh_id) {
            query += ` WHERE h.nganh_id = ${nganh_id}`;
        }
        query += ' ORDER BY n.ten_nganh, h.ten_he';

        const list = db.prepare(query).all();
        return NextResponse.json(list);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const { nganh_id, ten_he } = await request.json();
        const result = db.prepare('INSERT INTO he_dao_tao (nganh_id, ten_he) VALUES (?, ?)').run(nganh_id, ten_he);
        return NextResponse.json({ id: result.lastInsertRowid, message: 'Thêm hệ đào tạo thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const db = getDb();
        const { id, nganh_id, ten_he } = await request.json();
        db.prepare('UPDATE he_dao_tao SET nganh_id = ?, ten_he = ? WHERE id = ?').run(nganh_id, ten_he, id);
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
        db.prepare('DELETE FROM he_dao_tao WHERE id = ?').run(id);
        return NextResponse.json({ message: 'Xóa thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
