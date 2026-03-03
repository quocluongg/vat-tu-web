import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const db = getDb();
        const list = db.prepare(`
      SELECT n.*, 
        (SELECT COUNT(*) FROM he_dao_tao WHERE nganh_id = n.id) as so_he
      FROM nganh n ORDER BY n.ten_nganh
    `).all();
        return NextResponse.json(list);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const { ten_nganh } = await request.json();
        const result = db.prepare('INSERT INTO nganh (ten_nganh) VALUES (?)').run(ten_nganh);
        return NextResponse.json({ id: result.lastInsertRowid, message: 'Thêm ngành thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const db = getDb();
        const { id, ten_nganh } = await request.json();
        db.prepare('UPDATE nganh SET ten_nganh = ? WHERE id = ?').run(ten_nganh, id);
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
        db.prepare('DELETE FROM nganh WHERE id = ?').run(id);
        return NextResponse.json({ message: 'Xóa thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
