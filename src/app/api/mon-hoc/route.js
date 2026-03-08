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

        const listResult = await db.execute(query);
        return NextResponse.json(listResult.rows);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const body = await request.json();

        if (Array.isArray(body)) {
            const stmts = body.map(item => ({
                sql: 'INSERT OR IGNORE INTO mon_hoc (ten_mon) VALUES (?)',
                args: [item.ten_mon]
            }));
            await db.batch(stmts, "write");
            return NextResponse.json({ message: `Thêm ${body.length} môn học thành công` });
        }

        const { ten_mon } = body;
        if (!ten_mon) return NextResponse.json({ error: 'Vui lòng nhập tên môn học' }, { status: 400 });

        const existingResult = await db.execute({
            sql: 'SELECT id FROM mon_hoc WHERE ten_mon = ?',
            args: [ten_mon.trim()]
        });

        if (existingResult.rows.length > 0) {
            return NextResponse.json({ error: 'Môn học này đã tồn tại', id: existingResult.rows[0].id }, { status: 409 });
        }

        const result = await db.execute({
            sql: 'INSERT INTO mon_hoc (ten_mon) VALUES (?)',
            args: [ten_mon.trim()]
        });
        return NextResponse.json({ id: Number(result.lastInsertRowid), message: 'Thêm môn học thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const db = getDb();
        const { id, ten_mon } = await request.json();
        if (!id || !ten_mon) return NextResponse.json({ error: 'Thiếu id hoặc tên môn' }, { status: 400 });
        await db.execute({
            sql: 'UPDATE mon_hoc SET ten_mon = ? WHERE id = ?',
            args: [ten_mon.trim(), id]
        });
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
        await db.execute({
            sql: 'DELETE FROM mon_hoc WHERE id = ?',
            args: [id]
        });
        return NextResponse.json({ message: 'Xóa thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
