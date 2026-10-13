import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

// GET: Preview thống kê số lượng vật tư trước khi đồng bộ
export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const source_ki_id = searchParams.get('source_ki_id');
        const target_ki_id = searchParams.get('target_ki_id');
        const nganh_id = searchParams.get('nganh_id'); // Optional

        if (!source_ki_id || !target_ki_id) {
            return NextResponse.json(
                { error: 'Cần cung cấp source_ki_id và target_ki_id' },
                { status: 400 }
            );
        }

        if (source_ki_id === target_ki_id) {
            return NextResponse.json(
                { error: 'Kỳ nguồn và kỳ đích phải khác nhau' },
                { status: 400 }
            );
        }

        // Lấy danh sách vật tư ở kỳ nguồn
        let sourceQuery = `
            SELECT id, ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho, nganh_id 
            FROM vat_tu 
            WHERE ki_id = ?
        `;
        const sourceArgs = [parseInt(source_ki_id)];
        if (nganh_id && nganh_id !== 'all') {
            if (nganh_id === 'chung') {
                sourceQuery += ` AND nganh_id IS NULL`;
            } else {
                sourceQuery += ` AND nganh_id = ?`;
                sourceArgs.push(parseInt(nganh_id));
            }
        }
        const sourceResult = await db.execute({ sql: sourceQuery, args: sourceArgs });
        const sourceItems = sourceResult.rows;

        // Lấy danh sách vật tư hiện có ở kỳ đích để so khớp trùng lặp
        let targetQuery = `
            SELECT ten_vat_tu, nganh_id 
            FROM vat_tu 
            WHERE ki_id = ?
        `;
        const targetResult = await db.execute({ sql: targetQuery, args: [parseInt(target_ki_id)] });
        
        // Tạo tập khóa (ten_vat_tu chuẩn hóa + nganh_id) đã tồn tại
        const existingKeys = new Set(
            targetResult.rows.map(item => `${item.ten_vat_tu?.trim().toLowerCase()}___${item.nganh_id ?? 'null'}`)
        );

        let newCount = 0;
        let duplicateCount = 0;

        for (const item of sourceItems) {
            const key = `${item.ten_vat_tu?.trim().toLowerCase()}___${item.nganh_id ?? 'null'}`;
            if (existingKeys.has(key)) {
                duplicateCount++;
            } else {
                existingKeys.add(key);
                newCount++;
            }
        }

        return NextResponse.json({
            source_total: sourceItems.length,
            new_count: newCount,
            duplicate_count: duplicateCount
        });
    } catch (error) {
        console.error('Error in preview sync vat-tu:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Thực hiện đồng bộ vật tư từ kỳ nguồn sang kỳ đích
export async function POST(request) {
    try {
        const db = getDb();
        const body = await request.json();
        const { source_ki_id, target_ki_id, nganh_id, keep_stock } = body;

        if (!source_ki_id || !target_ki_id) {
            return NextResponse.json(
                { error: 'Cần cung cấp source_ki_id và target_ki_id' },
                { status: 400 }
            );
        }

        if (source_ki_id.toString() === target_ki_id.toString()) {
            return NextResponse.json(
                { error: 'Kỳ nguồn và kỳ đích không được trùng nhau' },
                { status: 400 }
            );
        }

        // Lấy danh sách vật tư ở kỳ nguồn
        let sourceQuery = `
            SELECT id, ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho, nganh_id 
            FROM vat_tu 
            WHERE ki_id = ?
        `;
        const sourceArgs = [parseInt(source_ki_id)];
        if (nganh_id && nganh_id !== 'all') {
            if (nganh_id === 'chung') {
                sourceQuery += ` AND nganh_id IS NULL`;
            } else {
                sourceQuery += ` AND nganh_id = ?`;
                sourceArgs.push(parseInt(nganh_id));
            }
        }
        const sourceResult = await db.execute({ sql: sourceQuery, args: sourceArgs });
        const sourceItems = sourceResult.rows;

        if (sourceItems.length === 0) {
            return NextResponse.json({
                message: 'Không có vật tư nào ở kỳ nguồn thỏa mãn điều kiện lọc',
                synced_count: 0,
                skipped_count: 0
            });
        }

        // Lấy danh sách vật tư hiện có ở kỳ đích để kiểm tra trùng lặp
        const targetResult = await db.execute({
            sql: `SELECT ten_vat_tu, nganh_id FROM vat_tu WHERE ki_id = ?`,
            args: [parseInt(target_ki_id)]
        });

        const existingKeys = new Set(
            targetResult.rows.map(item => `${item.ten_vat_tu?.trim().toLowerCase()}___${item.nganh_id ?? 'null'}`)
        );

        // Lọc các vật tư cần thêm mới
        const itemsToInsert = [];
        let skippedCount = 0;

        for (const item of sourceItems) {
            const key = `${item.ten_vat_tu?.trim().toLowerCase()}___${item.nganh_id ?? 'null'}`;
            if (existingKeys.has(key)) {
                skippedCount++;
            } else {
                // Đánh dấu khóa này đã được thêm để tránh trường hợp chính kỳ nguồn có bản ghi trùng lặp
                existingKeys.add(key);
                itemsToInsert.push({
                    ten_vat_tu: item.ten_vat_tu,
                    yeu_cau_ky_thuat: item.yeu_cau_ky_thuat || null,
                    don_vi_tinh: item.don_vi_tinh,
                    so_luong_kho: keep_stock ? (item.so_luong_kho || 0) : 0,
                    ki_id: parseInt(target_ki_id),
                    nganh_id: item.nganh_id || null
                });
            }
        }

        if (itemsToInsert.length === 0) {
            return NextResponse.json({
                message: `Tất cả ${skippedCount} vật tư đều đã tồn tại ở kỳ đích, không có vật tư mới nào cần thêm.`,
                synced_count: 0,
                skipped_count: skippedCount
            });
        }

        // Thực hiện chèn theo từng mẻ (batch chunks) 150 items để tối ưu và ổn định cho libSQL / Turso
        const CHUNK_SIZE = 150;
        for (let i = 0; i < itemsToInsert.length; i += CHUNK_SIZE) {
            const chunk = itemsToInsert.slice(i, i + CHUNK_SIZE);
            const stmts = chunk.map(item => ({
                sql: `INSERT INTO vat_tu (ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho, ki_id, nganh_id) 
                      VALUES (?, ?, ?, ?, ?, ?)`,
                args: [
                    item.ten_vat_tu,
                    item.yeu_cau_ky_thuat,
                    item.don_vi_tinh,
                    item.so_luong_kho,
                    item.ki_id,
                    item.nganh_id
                ]
            }));
            await db.batch(stmts, "write");
        }

        return NextResponse.json({
            message: `Đồng bộ thành công ${itemsToInsert.length} vật tư sang kỳ mới${skippedCount > 0 ? ` (đã bỏ qua ${skippedCount} vật tư trùng lặp)` : ''}`,
            synced_count: itemsToInsert.length,
            skipped_count: skippedCount
        });
    } catch (error) {
        console.error('Error in sync vat-tu:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
