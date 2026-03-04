import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const ki_id = searchParams.get('ki_id');
        const giao_vien_id = searchParams.get('giao_vien_id');
        const lop_id = searchParams.get('lop_id');

        let query = `
      SELECT pc.*, 
             gv.ho_ten as ten_gv, 
             m.ten_mon,
             l.ten_lop,
             l.si_so,
             l.loai_he,
             CASE l.loai_he
               WHEN 'T' THEN 'Trung cấp'
               WHEN 'C' THEN 'Cao đẳng'
               WHEN 'L' THEN 'Liên thông'
             END as ten_loai_he
      FROM phan_cong pc
      JOIN giao_vien gv ON pc.giao_vien_id = gv.id
      JOIN mon_hoc m ON pc.mon_hoc_id = m.id
      JOIN lop l ON pc.lop_id = l.id
    `;

        const conditions = [];
        if (ki_id) conditions.push(`pc.ki_id = ${parseInt(ki_id)}`);
        if (giao_vien_id) conditions.push(`pc.giao_vien_id = ${parseInt(giao_vien_id)}`);
        if (lop_id) conditions.push(`pc.lop_id = ${parseInt(lop_id)}`);

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY gv.ho_ten, l.ten_lop, m.ten_mon';

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
            const stmt = db.prepare('INSERT OR IGNORE INTO phan_cong (giao_vien_id, mon_hoc_id, lop_id, ki_id) VALUES (?, ?, ?, ?)');
            const insertMany = db.transaction((items) => {
                for (const item of items) {
                    stmt.run(item.giao_vien_id, item.mon_hoc_id, item.lop_id, item.ki_id);
                }
            });
            insertMany(body);
            return NextResponse.json({ message: 'Phân công thành công' });
        }

        const { giao_vien_id, mon_hoc_id, lop_id, ki_id } = body;

        if (!giao_vien_id || !mon_hoc_id || !lop_id || !ki_id) {
            return NextResponse.json({ error: 'Vui lòng chọn đầy đủ giáo viên, môn học, lớp và kỳ học' }, { status: 400 });
        }

        const existing = db.prepare(
            'SELECT id FROM phan_cong WHERE giao_vien_id = ? AND mon_hoc_id = ? AND lop_id = ? AND ki_id = ?'
        ).get(giao_vien_id, mon_hoc_id, lop_id, ki_id);

        if (existing) {
            return NextResponse.json({ error: 'Giáo viên đã được phân công môn này cho lớp này trong kỳ này' }, { status: 409 });
        }

        const result = db.prepare(
            'INSERT INTO phan_cong (giao_vien_id, mon_hoc_id, lop_id, ki_id) VALUES (?, ?, ?, ?)'
        ).run(giao_vien_id, mon_hoc_id, lop_id, ki_id);

        return NextResponse.json({ id: result.lastInsertRowid, message: 'Phân công thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        db.prepare('DELETE FROM phan_cong WHERE id = ?').run(id);
        return NextResponse.json({ message: 'Xóa phân công thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
