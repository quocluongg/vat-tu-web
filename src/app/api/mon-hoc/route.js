import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');

        let query = `SELECT id, ten_mon, created_at FROM mon_hoc`;
        if (search) {
            query += ` WHERE ten_mon LIKE '%${search.replace(/'/g, "''")}%'`;
        }
        query += ' ORDER BY ten_mon';

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
            const stmt = db.prepare('INSERT OR IGNORE INTO mon_hoc (ten_mon) VALUES (?)');
            const insertMany = db.transaction((items) => {
                for (const item of items) {
                    stmt.run(item.ten_mon);
                }
            });
            insertMany(body);
            return NextResponse.json({ message: `Thêm ${body.length} môn học thành công` });
        }

        const { ten_mon } = body;
        if (!ten_mon) return NextResponse.json({ error: 'Vui lòng nhập tên môn học' }, { status: 400 });

        const existing = db.prepare('SELECT id FROM mon_hoc WHERE ten_mon = ?').get(ten_mon.trim());
        if (existing) return NextResponse.json({ error: 'Môn học này đã tồn tại', id: existing.id }, { status: 409 });

        const result = db.prepare('INSERT INTO mon_hoc (ten_mon) VALUES (?)').run(ten_mon.trim());
        return NextResponse.json({ id: result.lastInsertRowid, message: 'Thêm môn học thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const db = getDb();
        const { id, ten_mon } = await request.json();
        if (!id || !ten_mon) return NextResponse.json({ error: 'Thiếu id hoặc tên môn' }, { status: 400 });
        db.prepare('UPDATE mon_hoc SET ten_mon = ? WHERE id = ?').run(ten_mon.trim(), id);
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
