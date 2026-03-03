import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const he_dao_tao_id = searchParams.get('he_dao_tao_id');

        let query = `
      SELECT m.*, h.ten_he, n.ten_nganh
      FROM mon_hoc m
      JOIN he_dao_tao h ON m.he_dao_tao_id = h.id
      JOIN nganh n ON h.nganh_id = n.id
    `;

        if (he_dao_tao_id) {
            query += ` WHERE m.he_dao_tao_id = ${he_dao_tao_id}`;
        }
        query += ' ORDER BY n.ten_nganh, h.ten_he, m.ten_mon';

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
            const stmt = db.prepare('INSERT INTO mon_hoc (he_dao_tao_id, ten_mon) VALUES (?, ?)');
            const insertMany = db.transaction((items) => {
                for (const item of items) {
                    stmt.run(item.he_dao_tao_id, item.ten_mon);
                }
            });
            insertMany(body);
            return NextResponse.json({ message: `Thêm ${body.length} môn học thành công` });
        }

        const { he_dao_tao_id, ten_mon } = body;
        const result = db.prepare('INSERT INTO mon_hoc (he_dao_tao_id, ten_mon) VALUES (?, ?)').run(he_dao_tao_id, ten_mon);
        return NextResponse.json({ id: result.lastInsertRowid, message: 'Thêm môn học thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const db = getDb();
        const { id, he_dao_tao_id, ten_mon } = await request.json();
        db.prepare('UPDATE mon_hoc SET he_dao_tao_id = ?, ten_mon = ? WHERE id = ?').run(he_dao_tao_id, ten_mon, id);
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
        db.prepare('DELETE FROM mon_hoc WHERE id = ?').run(id);
        return NextResponse.json({ message: 'Xóa thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
