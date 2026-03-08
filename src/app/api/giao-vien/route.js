import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const db = getDb();
        const listResult = await db.execute('SELECT * FROM giao_vien ORDER BY ho_ten');
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
                sql: 'INSERT INTO giao_vien (ho_ten, email, so_dien_thoai) VALUES (?, ?, ?)',
                args: [item.ho_ten, item.email || null, item.so_dien_thoai || null]
            }));
            await db.batch(stmts, "write");
            return NextResponse.json({ message: `Thêm ${body.length} giáo viên thành công` });
        }

        const { ho_ten, email, so_dien_thoai } = body;
        const result = await db.execute({
            sql: 'INSERT INTO giao_vien (ho_ten, email, so_dien_thoai) VALUES (?, ?, ?)',
            args: [ho_ten, email || null, so_dien_thoai || null]
        });
        return NextResponse.json({ id: Number(result.lastInsertRowid), message: 'Thêm giáo viên thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const db = getDb();
        const { id, ho_ten, email, so_dien_thoai } = await request.json();
        await db.execute({
            sql: 'UPDATE giao_vien SET ho_ten = ?, email = ?, so_dien_thoai = ? WHERE id = ?',
            args: [ho_ten, email || null, so_dien_thoai || null, id]
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
            sql: 'DELETE FROM giao_vien WHERE id = ?',
            args: [id]
        });
        return NextResponse.json({ message: 'Xóa thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
