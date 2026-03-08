import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const db = getDb();
        const listResult = await db.execute(`
      SELECT n.*, 
        (SELECT COUNT(*) FROM he_dao_tao WHERE nganh_id = n.id) as so_he
      FROM nganh n ORDER BY n.ten_nganh
    `);
        return NextResponse.json(listResult.rows);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const { ten_nganh } = await request.json();
        const result = await db.execute({
            sql: 'INSERT INTO nganh (ten_nganh) VALUES (?)',
            args: [ten_nganh]
        });
        return NextResponse.json({ id: Number(result.lastInsertRowid), message: 'Thêm ngành thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const db = getDb();
        const { id, ten_nganh } = await request.json();
        await db.execute({
            sql: 'UPDATE nganh SET ten_nganh = ? WHERE id = ?',
            args: [ten_nganh, id]
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
            sql: 'DELETE FROM nganh WHERE id = ?',
            args: [id]
        });
        return NextResponse.json({ message: 'Xóa thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
