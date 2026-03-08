import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const ki_id = searchParams.get('ki_id');

        if (!ki_id) {
            return NextResponse.json({ error: 'ki_id is required' }, { status: 400 });
        }

        const listResult = await db.execute({
            sql: `
      SELECT 
        vt.id as vat_tu_id,
        vt.ten_vat_tu,
        vt.yeu_cau_ky_thuat,
        vt.don_vi_tinh,
        vt.so_luong_kho,
        COALESCE(SUM(dxct.so_luong), 0) as tong_de_xuat,
        ms.id as mua_sam_id,
        ms.so_luong_de_xuat,
        ms.so_luong_duyet,
        ms.don_gia,
        ms.thanh_tien,
        ms.trang_thai as trang_thai_mua
      FROM vat_tu vt
      LEFT JOIN de_xuat_chi_tiet dxct ON dxct.vat_tu_id = vt.id
        AND dxct.de_xuat_id IN (SELECT id FROM de_xuat WHERE ki_id = ? AND trang_thai = 'duyet')
      LEFT JOIN mua_sam ms ON ms.vat_tu_id = vt.id AND ms.ki_id = ?
      WHERE vt.ki_id = ?
      GROUP BY vt.id
      ORDER BY vt.ten_vat_tu
    `,
            args: [ki_id, ki_id, ki_id]
        });

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
                sql: `
        INSERT INTO mua_sam (ki_id, vat_tu_id, so_luong_de_xuat, so_luong_duyet, don_gia, thanh_tien, trang_thai)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ki_id, vat_tu_id) DO UPDATE SET
          so_luong_de_xuat = excluded.so_luong_de_xuat,
          so_luong_duyet = excluded.so_luong_duyet,
          don_gia = excluded.don_gia,
          thanh_tien = excluded.thanh_tien,
          trang_thai = excluded.trang_thai
      `,
                args: [
                    item.ki_id, item.vat_tu_id, item.so_luong_de_xuat || 0,
                    item.so_luong_duyet || 0, item.don_gia || 0,
                    (item.so_luong_duyet || 0) * (item.don_gia || 0),
                    item.trang_thai || 'cho_mua'
                ]
            }));

            const purchased = body.filter(item => item.trang_thai === 'da_mua' && item.update_kho);
            for (const item of purchased) {
                stmts.push({
                    sql: 'UPDATE vat_tu SET so_luong_kho = so_luong_kho + ? WHERE id = ?',
                    args: [item.so_luong_duyet, item.vat_tu_id]
                });
            }

            if (stmts.length > 0) {
                await db.batch(stmts, "write");
            }
            return NextResponse.json({ message: 'Cập nhật thành công' });
        }

        return NextResponse.json({ error: 'Expected array' }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
