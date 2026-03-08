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
                sql: 'INSERT OR IGNORE INTO phan_cong (giao_vien_id, mon_hoc_id, lop_id, ki_id) VALUES (?, ?, ?, ?)',
                args: [item.giao_vien_id, item.mon_hoc_id, item.lop_id, item.ki_id]
            }));
            await db.batch(stmts, "write");
            return NextResponse.json({ message: 'Phân công thành công' });
        }

        const { giao_vien_id, mon_hoc_id, lop_id, ki_id } = body;

        if (!giao_vien_id || !mon_hoc_id || !lop_id || !ki_id) {
            return NextResponse.json({ error: 'Vui lòng chọn đầy đủ giáo viên, môn học, lớp và kỳ học' }, { status: 400 });
        }

        const existingResult = await db.execute({
            sql: 'SELECT id FROM phan_cong WHERE giao_vien_id = ? AND mon_hoc_id = ? AND lop_id = ? AND ki_id = ?',
            args: [giao_vien_id, mon_hoc_id, lop_id, ki_id]
        });

        if (existingResult.rows.length > 0) {
            return NextResponse.json({ error: 'Giáo viên đã được phân công môn này cho lớp này trong kỳ này' }, { status: 409 });
        }

        const result = await db.execute({
            sql: 'INSERT INTO phan_cong (giao_vien_id, mon_hoc_id, lop_id, ki_id) VALUES (?, ?, ?, ?)',
            args: [giao_vien_id, mon_hoc_id, lop_id, ki_id]
        });

        return NextResponse.json({ id: Number(result.lastInsertRowid), message: 'Phân công thành công' });
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
            sql: 'DELETE FROM phan_cong WHERE id = ?',
            args: [id]
        });
        return NextResponse.json({ message: 'Xóa phân công thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
