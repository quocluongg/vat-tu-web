import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const db = getDb();
        const list = db.prepare('SELECT * FROM giao_vien ORDER BY ho_ten').all();
        return NextResponse.json(list);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const body = await request.json();

        // Support bulk import
        if (Array.isArray(body)) {
            const stmt = db.prepare('INSERT INTO giao_vien (ho_ten, email, so_dien_thoai) VALUES (?, ?, ?)');
            const insertMany = db.transaction((items) => {
                for (const item of items) {
                    stmt.run(item.ho_ten, item.email || null, item.so_dien_thoai || null);
                }
            });
            insertMany(body);
            return NextResponse.json({ message: `Thêm ${body.length} giáo viên thành công` });
        }

        const { ho_ten, email, so_dien_thoai } = body;
        const result = db.prepare('INSERT INTO giao_vien (ho_ten, email, so_dien_thoai) VALUES (?, ?, ?)').run(ho_ten, email || null, so_dien_thoai || null);
        return NextResponse.json({ id: result.lastInsertRowid, message: 'Thêm giáo viên thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const db = getDb();
        const { id, ho_ten, email, so_dien_thoai } = await request.json();
        db.prepare('UPDATE giao_vien SET ho_ten = ?, email = ?, so_dien_thoai = ? WHERE id = ?').run(ho_ten, email || null, so_dien_thoai || null, id);
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
        db.prepare('DELETE FROM giao_vien WHERE id = ?').run(id);
        return NextResponse.json({ message: 'Xóa thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
