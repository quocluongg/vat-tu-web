import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

/**
 * POST /api/de-xuat/chuyen
 * Chuyển dự trù (de_xuat_chi_tiet) từ GV này sang GV khác theo từng lớp+môn.
 * 
 * Body:
 * {
 *   source_de_xuat_id: number,       // ID đề xuất nguồn
 *   target_giao_vien_id: number,     // ID giáo viên đích
 *   ki_id: number,                   // Kỳ học
 *   items: [                         // Danh sách lớp+môn cần chuyển
 *     { mon_hoc_id: number, lop_id: number }
 *   ]
 * }
 */
export async function POST(request) {
    try {
        const db = getDb();
        const body = await request.json();
        const { source_de_xuat_id, target_giao_vien_id, ki_id, items } = body;

        // --- Validation ---
        if (!source_de_xuat_id || !target_giao_vien_id || !ki_id) {
            return NextResponse.json({
                error: 'Thiếu tham số: source_de_xuat_id, target_giao_vien_id hoặc ki_id'
            }, { status: 400 });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({
                error: 'Vui lòng chọn ít nhất một lớp/môn để chuyển'
            }, { status: 400 });
        }

        // Validate source de_xuat exists
        const sourceCheck = await db.execute({
            sql: 'SELECT id, giao_vien_id, ki_id FROM de_xuat WHERE id = ?',
            args: [source_de_xuat_id]
        });
        if (sourceCheck.rows.length === 0) {
            return NextResponse.json({
                error: 'Đề xuất nguồn không tồn tại'
            }, { status: 404 });
        }

        const sourceGvId = sourceCheck.rows[0].giao_vien_id;

        // Cannot transfer to same teacher
        if (sourceGvId === target_giao_vien_id || sourceGvId.toString() === target_giao_vien_id.toString()) {
            return NextResponse.json({
                error: 'Không thể chuyển sang chính giáo viên này'
            }, { status: 400 });
        }

        // Validate target teacher exists
        const targetGvCheck = await db.execute({
            sql: 'SELECT id, ho_ten FROM giao_vien WHERE id = ?',
            args: [target_giao_vien_id]
        });
        if (targetGvCheck.rows.length === 0) {
            return NextResponse.json({
                error: 'Giáo viên đích không tồn tại'
            }, { status: 400 });
        }
        const targetGvName = targetGvCheck.rows[0].ho_ten;

        // --- Find matching de_xuat_chi_tiet rows ---
        let totalMoved = 0;
        const stmts = [];

        // Find or create target de_xuat
        const targetDxCheck = await db.execute({
            sql: 'SELECT id FROM de_xuat WHERE giao_vien_id = ? AND ki_id = ?',
            args: [target_giao_vien_id, ki_id]
        });

        let targetDeXuatId;
        if (targetDxCheck.rows.length > 0) {
            targetDeXuatId = targetDxCheck.rows[0].id;
        } else {
            // Create new de_xuat for target teacher
            const insertResult = await db.execute({
                sql: "INSERT INTO de_xuat (giao_vien_id, ki_id, trang_thai, ngay_nop) VALUES (?, ?, 'da_nop', CURRENT_TIMESTAMP)",
                args: [target_giao_vien_id, ki_id]
            });

            // Get the newly created ID
            const newIdResult = await db.execute({
                sql: 'SELECT id FROM de_xuat WHERE giao_vien_id = ? AND ki_id = ? ORDER BY created_at DESC LIMIT 1',
                args: [target_giao_vien_id, ki_id]
            });
            if (newIdResult.rows.length === 0) {
                return NextResponse.json({
                    error: 'Không thể tạo đề xuất cho giáo viên đích'
                }, { status: 500 });
            }
            targetDeXuatId = newIdResult.rows[0].id;
        }

        // For each item (mon_hoc_id + lop_id), find and move matching chi_tiet rows
        for (const item of items) {
            if (!item.mon_hoc_id || !item.lop_id) continue;

            // Find matching rows in source
            const matchingRows = await db.execute({
                sql: 'SELECT id FROM de_xuat_chi_tiet WHERE de_xuat_id = ? AND mon_hoc_id = ? AND lop_id = ?',
                args: [source_de_xuat_id, item.mon_hoc_id, item.lop_id]
            });

            if (matchingRows.rows.length > 0) {
                // Move rows: update de_xuat_id to target
                stmts.push({
                    sql: 'UPDATE de_xuat_chi_tiet SET de_xuat_id = ? WHERE de_xuat_id = ? AND mon_hoc_id = ? AND lop_id = ?',
                    args: [targetDeXuatId, source_de_xuat_id, item.mon_hoc_id, item.lop_id]
                });
                totalMoved += matchingRows.rows.length;
            }
        }

        if (totalMoved === 0) {
            return NextResponse.json({
                error: 'Không tìm thấy dòng dự trù nào khớp để chuyển'
            }, { status: 400 });
        }

        // Execute all updates
        if (stmts.length > 0) {
            await db.batch(stmts, "write");
        }

        // Check if source de_xuat still has any chi_tiet rows
        const remainingCheck = await db.execute({
            sql: 'SELECT COUNT(*) as cnt FROM de_xuat_chi_tiet WHERE de_xuat_id = ?',
            args: [source_de_xuat_id]
        });
        const remaining = remainingCheck.rows[0].cnt;

        // If source de_xuat is empty, delete it
        if (remaining === 0) {
            await db.execute({
                sql: 'DELETE FROM de_xuat WHERE id = ?',
                args: [source_de_xuat_id]
            });
        }

        return NextResponse.json({
            message: `Đã chuyển ${totalMoved} dòng dự trù sang ${targetGvName}`,
            totalMoved,
            targetDeXuatId,
            sourceEmpty: remaining === 0
        });

    } catch (error) {
        console.error('de-xuat/chuyen POST error:', error);
        return NextResponse.json({
            error: `Lỗi server: ${error.message}`
        }, { status: 500 });
    }
}
