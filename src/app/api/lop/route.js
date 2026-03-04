import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

/**
 * Tự động xác định loại hệ từ chữ đầu tên lớp:
 *  T → Trung cấp
 *  C → Cao đẳng
 *  L → Liên thông
 */
function detectLoaiHe(tenLop) {
    const prefix = tenLop.trim().charAt(0).toUpperCase();
    if (prefix === 'T') return 'T';
    if (prefix === 'C') return 'C';
    if (prefix === 'L') return 'L';
    return null;
}

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const loai_he = searchParams.get('loai_he');

        if (id) {
            const lop = db.prepare(`
        SELECT l.*,
          CASE l.loai_he
            WHEN 'T' THEN 'Trung cấp'
            WHEN 'C' THEN 'Cao đẳng'
            WHEN 'L' THEN 'Liên thông'
          END as ten_loai_he
        FROM lop l WHERE l.id = ?
      `).get(id);
            if (!lop) return NextResponse.json({ error: 'Không tìm thấy lớp' }, { status: 404 });
            return NextResponse.json(lop);
        }

        let query = `
      SELECT l.*,
        CASE l.loai_he
          WHEN 'T' THEN 'Trung cấp'
          WHEN 'C' THEN 'Cao đẳng'
          WHEN 'L' THEN 'Liên thông'
        END as ten_loai_he
      FROM lop l
    `;
        if (loai_he) query += ` WHERE l.loai_he = '${loai_he}'`;
        query += ' ORDER BY l.loai_he, l.ten_lop';

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

        // Hỗ trợ thêm nhiều lớp cùng lúc (array)
        if (Array.isArray(body)) {
            const stmt = db.prepare('INSERT OR IGNORE INTO lop (ten_lop, loai_he, si_so) VALUES (?, ?, ?)');
            const results = db.transaction((items) => {
                const ids = [];
                for (const item of items) {
                    const loai_he = item.loai_he || detectLoaiHe(item.ten_lop);
                    if (!loai_he) throw new Error(`Không xác định được hệ đào tạo từ tên lớp: ${item.ten_lop}`);
                    const r = stmt.run(item.ten_lop.trim(), loai_he, item.si_so || 0);
                    ids.push({ ten_lop: item.ten_lop, id: r.lastInsertRowid });
                }
                return ids;
            })(body);
            return NextResponse.json({ message: 'Thêm lớp thành công', results });
        }

        const { ten_lop, si_so } = body;
        if (!ten_lop) return NextResponse.json({ error: 'Vui lòng nhập tên lớp' }, { status: 400 });

        const loai_he = body.loai_he || detectLoaiHe(ten_lop);
        if (!loai_he) {
            return NextResponse.json({
                error: 'Không xác định được hệ đào tạo. Tên lớp phải bắt đầu bằng T (Trung cấp), C (Cao đẳng), hoặc L (Liên thông)'
            }, { status: 400 });
        }

        const existing = db.prepare('SELECT id FROM lop WHERE ten_lop = ?').get(ten_lop.trim());
        if (existing) {
            return NextResponse.json({ error: 'Lớp này đã tồn tại', id: existing.id }, { status: 409 });
        }

        const result = db.prepare('INSERT INTO lop (ten_lop, loai_he, si_so) VALUES (?, ?, ?)').run(ten_lop.trim(), loai_he, si_so || 0);
        return NextResponse.json({ id: result.lastInsertRowid, message: 'Thêm lớp thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const db = getDb();
        const { id, ten_lop, si_so } = await request.json();
        if (!id) return NextResponse.json({ error: 'Thiếu id lớp' }, { status: 400 });

        const loai_he = ten_lop ? (detectLoaiHe(ten_lop) || null) : null;

        const sets = [];
        const params = [];
        if (ten_lop) { sets.push('ten_lop = ?'); params.push(ten_lop.trim()); }
        if (loai_he) { sets.push('loai_he = ?'); params.push(loai_he); }
        if (si_so !== undefined) { sets.push('si_so = ?'); params.push(si_so); }
        params.push(id);

        db.prepare(`UPDATE lop SET ${sets.join(', ')} WHERE id = ?`).run(...params);
        return NextResponse.json({ message: 'Cập nhật lớp thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        db.prepare('DELETE FROM lop WHERE id = ?').run(id);
        return NextResponse.json({ message: 'Xóa lớp thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
