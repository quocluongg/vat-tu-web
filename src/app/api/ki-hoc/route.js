import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const db = getDb();
        const kiHocListResult = await db.execute('SELECT * FROM ki_hoc ORDER BY created_at DESC');
        return NextResponse.json(kiHocListResult.rows);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const body = await request.json();
        const { ten_ki, nam_hoc, ngay_bat_dau, ngay_ket_thuc, han_de_xuat } = body;

        const result = await db.execute({
            sql: 'INSERT INTO ki_hoc (ten_ki, nam_hoc, ngay_bat_dau, ngay_ket_thuc, han_de_xuat) VALUES (?, ?, ?, ?, ?)',
            args: [ten_ki, nam_hoc, ngay_bat_dau || null, ngay_ket_thuc || null, han_de_xuat || null]
        });

        return NextResponse.json({ id: Number(result.lastInsertRowid), message: 'Thêm kỳ học thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const db = getDb();
        const body = await request.json();
        const { id, ten_ki, nam_hoc, ngay_bat_dau, ngay_ket_thuc, trang_thai, han_de_xuat } = body;

        await db.execute({
            sql: `UPDATE ki_hoc SET ten_ki = ?, nam_hoc = ?, ngay_bat_dau = ?, ngay_ket_thuc = ?, 
       trang_thai = ?, han_de_xuat = ? WHERE id = ?`,
            args: [ten_ki, nam_hoc, ngay_bat_dau || null, ngay_ket_thuc || null, trang_thai, han_de_xuat || null, id]
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
            sql: 'DELETE FROM ki_hoc WHERE id = ?',
            args: [id]
        });
        return NextResponse.json({ message: 'Xóa thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
