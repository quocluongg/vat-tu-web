import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        let ki_id = searchParams.get('ki_id');
        const giao_vien_id = searchParams.get('giao_vien_id');
        const id = searchParams.get('id');

        if (id) {
            const pxResult = await db.execute({
                sql: `
        SELECT px.*, gv.ho_ten as ten_gv, gv.email, gv.so_dien_thoai,
               m.ten_mon,
               l.ten_lop, l.si_so, l.loai_he
        FROM phieu_xuat px
        JOIN giao_vien gv ON px.giao_vien_id = gv.id
        JOIN mon_hoc m ON px.mon_hoc_id = m.id
        LEFT JOIN lop l ON px.lop_id = l.id
        WHERE px.id = ?
      `,
                args: [id]
            });

            if (pxResult.rows.length === 0) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
            const px = pxResult.rows[0];

            const chiTietResult = await db.execute({
                sql: `
        SELECT pxct.*, vt.ten_vat_tu, vt.yeu_cau_ky_thuat, vt.don_vi_tinh, vt.so_luong_kho
        FROM phieu_xuat_chi_tiet pxct
        JOIN vat_tu vt ON pxct.vat_tu_id = vt.id
        WHERE pxct.phieu_xuat_id = ?
      `,
                args: [id]
            });

            return NextResponse.json({ ...px, chi_tiet: chiTietResult.rows });
        }

        // ✅ New summary mode for calculating remaining quantities
        const summary = searchParams.get('summary');
        const mon_hoc_id = searchParams.get('mon_hoc_id');
        if (summary === 'true' && giao_vien_id && ki_id && mon_hoc_id) {
            // 1. Get total exported by THIS teacher for this subject in this semester
            const exportedResult = await db.execute({
                sql: `
                    SELECT pxct.vat_tu_id, SUM(pxct.so_luong) as da_xuat
                    FROM phieu_xuat_chi_tiet pxct
                    JOIN phieu_xuat px ON pxct.phieu_xuat_id = px.id
                    WHERE px.giao_vien_id = ? AND px.ki_id = ? AND px.mon_hoc_id = ? 
                      AND px.trang_thai != 'tu_choi'
                    GROUP BY pxct.vat_tu_id
                `,
                args: [parseInt(giao_vien_id), parseInt(ki_id), parseInt(mon_hoc_id)]
            });

            // 2. Get total stats for ALL materials (inventory, global proposals, and GLOBAL export history)
            const statsResult = await db.execute({
                sql: `
                    SELECT vt.id as vat_tu_id, vt.so_luong_kho,
                           COALESCE(SUM(
                               CASE WHEN dx.trang_thai IN ('da_nop', 'duyet', 'dang_lam') 
                               THEN dxct.so_luong ELSE 0 END
                           ), 0) as total_proposed,
                           COALESCE((
                               SELECT SUM(pxct.so_luong)
                               FROM phieu_xuat_chi_tiet pxct
                               JOIN phieu_xuat px ON pxct.phieu_xuat_id = px.id
                               WHERE pxct.vat_tu_id = vt.id AND px.trang_thai = 'da_xuat'
                           ), 0) as total_da_xuat_all
                    FROM vat_tu vt
                    LEFT JOIN de_xuat_chi_tiet dxct ON vt.id = dxct.vat_tu_id
                    LEFT JOIN de_xuat dx ON dxct.de_xuat_id = dx.id AND dx.ki_id = vt.ki_id
                    WHERE vt.ki_id = ?
                    GROUP BY vt.id
                `,
                args: [parseInt(ki_id)]
            });

            const summaryMap = {};
            statsResult.rows.forEach(r => {
                // total_supply = Current Inventory + What has already been depleted from it
                summaryMap[r.vat_tu_id] = {
                    da_xuat: 0,
                    total_supply: r.so_luong_kho + r.total_da_xuat_all,
                    total_proposed: r.total_proposed
                };
            });

            exportedResult.rows.forEach(r => {
                if (summaryMap[r.vat_tu_id]) {
                    summaryMap[r.vat_tu_id].da_xuat = r.da_xuat;
                }
            });

            return NextResponse.json(summaryMap);
        }

        // ✅ If no ki_id specified, auto-use latest semester
        if (!ki_id) {
            const latestKiResult = await db.execute({
                sql: 'SELECT id FROM ki_hoc ORDER BY id DESC LIMIT 1'
            });
            if (latestKiResult.rows.length > 0) {
                ki_id = latestKiResult.rows[0].id;
            }
        }

        let query = `
      SELECT px.*, gv.ho_ten as ten_gv, m.ten_mon,
        (SELECT COUNT(*) FROM phieu_xuat_chi_tiet WHERE phieu_xuat_id = px.id) as so_vat_tu,
        (SELECT SUM(so_luong) FROM phieu_xuat_chi_tiet WHERE phieu_xuat_id = px.id) as tong_so_luong
      FROM phieu_xuat px
      JOIN giao_vien gv ON px.giao_vien_id = gv.id
      JOIN mon_hoc m ON px.mon_hoc_id = m.id
    `;

        const conditions = [];
        const args = [];
        if (ki_id) {
            conditions.push(`px.ki_id = ?`);
            args.push(parseInt(ki_id));
        }
        if (giao_vien_id) {
            conditions.push(`px.giao_vien_id = ?`);
            args.push(parseInt(giao_vien_id));
        }
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY px.ngay_tao DESC';

        let listResult;
        if (args.length > 0) {
            listResult = await db.execute({ sql: query, args });
        } else {
            listResult = await db.execute(query);
        }
        return NextResponse.json(listResult.rows);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const { giao_vien_id, ki_id, mon_hoc_id, chi_tiet } = await request.json();

        // Input validation
        if (!giao_vien_id || !ki_id || !mon_hoc_id) {
            return NextResponse.json({
                error: 'Thiếu tham số: giao_vien_id, ki_id hoặc mon_hoc_id'
            }, { status: 400 });
        }

        if (!chi_tiet || !Array.isArray(chi_tiet) || chi_tiet.length === 0) {
            return NextResponse.json({
                error: 'Vui lòng chọn ít nhất một vật tư'
            }, { status: 400 });
        }

        // Validate teacher exists
        const gvCheck = await db.execute({
            sql: 'SELECT id FROM giao_vien WHERE id = ?',
            args: [giao_vien_id]
        });
        if (gvCheck.rows.length === 0) {
            return NextResponse.json({
                error: `Giáo viên ID ${giao_vien_id} không tồn tại`
            }, { status: 400 });
        }

        // Validate semester exists
        const kiCheck = await db.execute({
            sql: 'SELECT id FROM ki_hoc WHERE id = ?',
            args: [ki_id]
        });
        if (kiCheck.rows.length === 0) {
            return NextResponse.json({
                error: `Kỳ học ID ${ki_id} không tồn tại`
            }, { status: 400 });
        }

        // ✅ Validate that ki_id is the latest semester
        const latestKiResult = await db.execute({
            sql: 'SELECT id FROM ki_hoc ORDER BY id DESC LIMIT 1'
        });
        const latestKiId = latestKiResult.rows[0]?.id;
        if (!latestKiId) {
            return NextResponse.json({
                error: 'Hệ thống chưa có kỳ học nào'
            }, { status: 400 });
        }
        if (ki_id !== latestKiId) {
            return NextResponse.json({
                error: `⚠️ Phiếu xuất chỉ được phép dùng kỳ học mới nhất (Kỳ ${latestKiId}). Hiện tại bạn chọn Kỳ ${ki_id}`
            }, { status: 400 });
        }

        // Validate subject exists
        const monCheck = await db.execute({
            sql: 'SELECT id FROM mon_hoc WHERE id = ?',
            args: [mon_hoc_id]
        });
        if (monCheck.rows.length === 0) {
            return NextResponse.json({
                error: `Môn học ID ${mon_hoc_id} không tồn tại`
            }, { status: 400 });
        }

        // Validate all materials exist and prepare validation
        const materialValidations = [];
        for (let i = 0; i < chi_tiet.length; i++) {
            const ct = chi_tiet[i];

            if (!ct.vat_tu_id || typeof ct.so_luong !== 'number' || ct.so_luong <= 0) {
                return NextResponse.json({
                    error: `Dòng ${i + 1}: Thiếu vật tư hoặc số lượng không hợp lệ`
                }, { status: 400 });
            }

            // Check material exists AND belongs to this semester (ki_id)
            const vtCheck = await db.execute({
                sql: 'SELECT ten_vat_tu, ki_id FROM vat_tu WHERE id = ?',
                args: [ct.vat_tu_id]
            });
            if (vtCheck.rows.length === 0) {
                return NextResponse.json({
                    error: `Dòng ${i + 1}: Vật tư ID ${ct.vat_tu_id} không tồn tại`
                }, { status: 400 });
            }

            // Validate ki_id match
            if (vtCheck.rows[0].ki_id !== ki_id) {
                return NextResponse.json({
                    error: `Dòng ${i + 1}: Vật tư "${vtCheck.rows[0].ten_vat_tu}" không thuộc kỳ học này`
                }, { status: 400 });
            }

            materialValidations.push({ vat_tu_id: ct.vat_tu_id, ten_vat_tu: vtCheck.rows[0].ten_vat_tu });
        }

        // Validate proposal quantities
        const deXuatResult = await db.execute({
            sql: `
      SELECT dxct.vat_tu_id, SUM(dxct.so_luong) as so_luong
      FROM de_xuat_chi_tiet dxct
      JOIN de_xuat dx ON dxct.de_xuat_id = dx.id
      WHERE dx.giao_vien_id = ? AND dx.ki_id = ? AND dxct.mon_hoc_id = ? AND dx.trang_thai IN ('da_nop', 'duyet', 'dang_lam')
      GROUP BY dxct.vat_tu_id
    `,
            args: [giao_vien_id, ki_id, mon_hoc_id]
        });

        const proposalMap = {};
        for (const d of deXuatResult.rows) {
            proposalMap[d.vat_tu_id] = d.so_luong;
        }

        // 3. Get existing exports for THIS teacher for THIS subject/class
        const existingExportsResult = await db.execute({
            sql: `
                SELECT pxct.vat_tu_id, SUM(pxct.so_luong) as da_xuat
                FROM phieu_xuat_chi_tiet pxct
                JOIN phieu_xuat px ON pxct.phieu_xuat_id = px.id
                WHERE px.giao_vien_id = ? AND px.ki_id = ? AND px.mon_hoc_id = ? 
                  AND px.trang_thai != 'tu_choi'
                GROUP BY pxct.vat_tu_id
            `,
            args: [giao_vien_id, ki_id, mon_hoc_id]
        });

        const exportedMap = {};
        existingExportsResult.rows.forEach(e => {
            exportedMap[e.vat_tu_id] = e.da_xuat;
        });

        // 4. Get global stats for materials in this request (inventory & total proposed across ALL teachers)
        const globalStatsResult = await db.execute({
            sql: `
                SELECT vt.id as vat_tu_id, vt.so_luong_kho,
                       COALESCE(SUM(
                           CASE WHEN dx.trang_thai IN ('da_nop', 'duyet', 'dang_lam') 
                           THEN dxct.so_luong ELSE 0 END
                       ), 0) as total_proposed,
                       COALESCE((
                               SELECT SUM(pxct.so_luong)
                               FROM phieu_xuat_chi_tiet pxct
                               JOIN phieu_xuat px ON pxct.phieu_xuat_id = px.id
                               WHERE pxct.vat_tu_id = vt.id AND px.trang_thai = 'da_xuat'
                       ), 0) as total_da_xuat_all
                FROM vat_tu vt
                LEFT JOIN de_xuat_chi_tiet dxct ON vt.id = dxct.vat_tu_id
                LEFT JOIN de_xuat dx ON dxct.de_xuat_id = dx.id AND dx.ki_id = vt.ki_id
                WHERE vt.id IN (${chi_tiet.map(() => '?').join(',')})
                GROUP BY vt.id
            `,
            args: chi_tiet.map(ct => ct.vat_tu_id)
        });

        const globalStatsMap = {};
        globalStatsResult.rows.forEach(r => {
            globalStatsMap[r.vat_tu_id] = {
                total_supply: r.so_luong_kho + r.total_da_xuat_all,
                total_proposed: r.total_proposed
            };
        });

        // Validate quantities don't exceed proportional limits
        for (let i = 0; i < chi_tiet.length; i++) {
            const ct = chi_tiet[i];
            const proposedQty = proposalMap[ct.vat_tu_id] || 0;
            const alreadyExported = exportedMap[ct.vat_tu_id] || 0;
            const remainingQty = Math.max(0, proposedQty - alreadyExported);
            
            // Calculate practical limit based on total supply ratio (fixed for the semester)
            const gStats = globalStatsMap[ct.vat_tu_id] || { total_supply: proposedQty, total_proposed: proposedQty };
            const totalProposed = gStats.total_proposed || proposedQty;
            const supply = gStats.total_supply || 0;
            const ratio = (totalProposed > 0 && supply < totalProposed) ? supply / totalProposed : 1;
            const practicalTotal = Math.floor(proposedQty * ratio);
            const canXuatThucTe = Math.max(0, practicalTotal - alreadyExported);

            if (ct.so_luong > remainingQty) {
                const vtInfo = materialValidations.find(v => v.vat_tu_id === ct.vat_tu_id);
                return NextResponse.json({
                    error: `Vật tư "${vtInfo?.ten_vat_tu}" vượt quá số lượng cho phép (Đề xuất: ${proposedQty}, Đã xuất: ${alreadyExported}, Còn lại: ${remainingQty})`
                }, { status: 400 });
            }

            if (ct.so_luong > canXuatThucTe) {
                const vtInfo = materialValidations.find(v => v.vat_tu_id === ct.vat_tu_id);
                return NextResponse.json({
                    error: `Vật tư "${vtInfo?.ten_vat_tu}" vượt quá giới hạn thực tế do kho không đủ cho tất cả đề xuất (Tỉ lệ cấp: ${Math.round(ratio * 100)}%, Giới hạn: ${practicalTotal}, Đã xuất: ${alreadyExported}, Có thể xuất: ${canXuatThucTe})`
                }, { status: 400 });
            }
        }

        // Insert phieu_xuat
        await db.execute({
            sql: "INSERT INTO phieu_xuat (giao_vien_id, ki_id, mon_hoc_id) VALUES (?, ?, ?)",
            args: [giao_vien_id, ki_id, mon_hoc_id]
        });

        // Query to get the ID (ensure it's correct)
        const idResult = await db.execute({
            sql: 'SELECT id FROM phieu_xuat WHERE giao_vien_id = ? AND ki_id = ? AND mon_hoc_id = ? ORDER BY ngay_tao DESC LIMIT 1',
            args: [giao_vien_id, ki_id, mon_hoc_id]
        });

        if (idResult.rows.length === 0) {
            return NextResponse.json({
                error: 'Không thể tạo phiếu xuất (INSERT thất bại)'
            }, { status: 500 });
        }

        let phieuXuatId = idResult.rows[0].id;

        // Ensure ID is valid
        if (!phieuXuatId) {
            return NextResponse.json({
                error: 'Không thể tạo phiếu xuất (ID lỗi)'
            }, { status: 500 });
        }

        // Convert to number for consistency
        phieuXuatId = parseInt(phieuXuatId) || phieuXuatId;
        console.log('✅ Created/Found phieu_xuat ID:', phieuXuatId, 'type:', typeof phieuXuatId);

        // Insert chi_tiet records
        if (!chi_tiet || chi_tiet.length === 0) {
            return NextResponse.json({
                id: phieuXuatId,
                message: 'Tạo phiếu xuất thành công (không có chi tiết)'
            });
        }

        console.log('📝 Inserting', chi_tiet.length, 'chi_tiet records with phieu_xuat_id:', phieuXuatId);
        console.log('🔍 Data:', JSON.stringify({ phieu_xuat_id: phieuXuatId, chi_tiet: chi_tiet }, null, 2));

        // Insert one by one to catch exact error
        for (let i = 0; i < chi_tiet.length; i++) {
            const ct = chi_tiet[i];
            try {
                console.log(`  Inserting row ${i + 1}/${chi_tiet.length}: vat_tu_id=${ct.vat_tu_id}, so_luong=${ct.so_luong}`);
                await db.execute({
                    sql: 'INSERT INTO phieu_xuat_chi_tiet (phieu_xuat_id, vat_tu_id, so_luong) VALUES (?, ?, ?)',
                    args: [phieuXuatId, ct.vat_tu_id, ct.so_luong]
                });
            } catch (err) {
                console.error(`  ❌ Failed on row ${i + 1}:`, err.message);
                throw err;
            }
        }
        console.log('✅ Chi_tiet inserted successfully');

        return NextResponse.json({
            id: phieuXuatId,
            message: 'Tạo phiếu xuất thành công'
        });
    } catch (error) {
        console.error('phieu-xuat POST error:', error);
        return NextResponse.json({
            error: `Lỗi server: ${error.message}`
        }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const db = getDb();
        const { id, trang_thai, ghi_chu } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'ID phiếu xuất không được cung cấp' }, { status: 400 });
        }

        let query = 'UPDATE phieu_xuat SET';
        const params = [];
        const sets = [];

        if (trang_thai) {
            sets.push(' trang_thai = ?');
            params.push(trang_thai);
            if (trang_thai === 'da_ky') {
                sets.push(' ngay_duyet = CURRENT_TIMESTAMP');
            }
            // When exported, reduce inventory
            if (trang_thai === 'da_xuat') {
                const detailsResult = await db.execute({
                    sql: `
          SELECT pxct.vat_tu_id, pxct.so_luong
          FROM phieu_xuat_chi_tiet pxct
          WHERE pxct.phieu_xuat_id = ?
        `,
                    args: [id]
                });

                const updateStmts = detailsResult.rows.map(detail => ({
                    sql: 'UPDATE vat_tu SET so_luong_kho = so_luong_kho - ? WHERE id = ?',
                    args: [detail.so_luong, detail.vat_tu_id]
                }));
                if (updateStmts.length > 0) {
                    await db.batch(updateStmts, "write");
                }
            }
        }
        if (ghi_chu !== undefined) {
            sets.push(' ghi_chu = ?');
            params.push(ghi_chu);
        }

        if (sets.length === 0) {
            return NextResponse.json({ error: 'Không có dữ liệu để cập nhật' }, { status: 400 });
        }

        query += sets.join(',') + ' WHERE id = ?';
        params.push(id);

        await db.execute({ sql: query, args: params });
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

        if (!id) {
            return NextResponse.json({ error: 'ID phiếu xuất không được cung cấp' }, { status: 400 });
        }

        // Check if phieu_xuat exists
        const pxCheck = await db.execute({
            sql: 'SELECT id, trang_thai FROM phieu_xuat WHERE id = ?',
            args: [id]
        });
        if (pxCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Phiếu xuất không tồn tại' }, { status: 404 });
        }

        const px = pxCheck.rows[0];

        // If already exported, need to restore inventory
        if (px.trang_thai === 'da_xuat') {
            const detailsResult = await db.execute({
                sql: 'SELECT vat_tu_id, so_luong FROM phieu_xuat_chi_tiet WHERE phieu_xuat_id = ?',
                args: [id]
            });

            const restoreStmts = detailsResult.rows.map(detail => ({
                sql: 'UPDATE vat_tu SET so_luong_kho = so_luong_kho + ? WHERE id = ?',
                args: [detail.so_luong, detail.vat_tu_id]
            }));
            if (restoreStmts.length > 0) {
                await db.batch(restoreStmts, "write");
            }
        }

        // Delete phieu_xuat (cascade deletes chi_tiet)
        await db.execute({
            sql: 'DELETE FROM phieu_xuat WHERE id = ?',
            args: [id]
        });

        return NextResponse.json({ message: 'Xóa phiếu xuất thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
