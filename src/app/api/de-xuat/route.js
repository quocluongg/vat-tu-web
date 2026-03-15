import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const ki_id = searchParams.get('ki_id');
        const giao_vien_id = searchParams.get('giao_vien_id');
        const id = searchParams.get('id');

        if (id) {
            const dxResult = await db.execute({
                sql: `
        SELECT dx.*, gv.ho_ten as ten_gv, gv.email, gv.so_dien_thoai
        FROM de_xuat dx
        JOIN giao_vien gv ON dx.giao_vien_id = gv.id
        WHERE dx.id = ?
      `,
                args: [id]
            });

            if (dxResult.rows.length === 0) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

            const chiTietResult = await db.execute({
                sql: `
        SELECT dxct.*, vt.ten_vat_tu, vt.yeu_cau_ky_thuat, vt.don_vi_tinh, vt.so_luong_kho,
               m.ten_mon,
               l.ten_lop, l.si_so, l.loai_he,
               CASE l.loai_he
                 WHEN 'T' THEN 'Trung cấp'
                 WHEN 'C' THEN 'Cao đẳng'
                 WHEN 'L' THEN 'Liên thông'
               END as ten_loai_he
        FROM de_xuat_chi_tiet dxct
        JOIN vat_tu vt ON dxct.vat_tu_id = vt.id
        JOIN mon_hoc m ON dxct.mon_hoc_id = m.id
        JOIN lop l ON dxct.lop_id = l.id
        WHERE dxct.de_xuat_id = ?
        ORDER BY l.ten_lop, m.ten_mon, vt.ten_vat_tu
      `,
                args: [id]
            });

            return NextResponse.json({ ...dxResult.rows[0], chi_tiet: chiTietResult.rows });
        }

        let query = `
      SELECT dx.*, gv.ho_ten as ten_gv, gv.email,
        (SELECT COUNT(*) FROM de_xuat_chi_tiet WHERE de_xuat_id = dx.id) as so_vat_tu,
        (SELECT SUM(so_luong) FROM de_xuat_chi_tiet WHERE de_xuat_id = dx.id) as tong_so_luong
      FROM de_xuat dx
      JOIN giao_vien gv ON dx.giao_vien_id = gv.id
    `;

        const conditions = [];
        if (ki_id) conditions.push(`dx.ki_id = ${ki_id}`);
        if (giao_vien_id) conditions.push(`dx.giao_vien_id = ${giao_vien_id}`);
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY dx.created_at DESC';

        const listResult = await db.execute(query);
        return NextResponse.json(listResult.rows);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const db = getDb();
        const { giao_vien_id, ki_id, chi_tiet } = await request.json();

        // Input validation
        if (!giao_vien_id || !ki_id) {
            return NextResponse.json({ 
                error: 'Thiếu tham số: giao_vien_id hoặc ki_id' 
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

        // Validate all subject, class, and material IDs exist
        for (let i = 0; i < chi_tiet.length; i++) {
            const ct = chi_tiet[i];

            // Validate subject/class/material structure
            if (!ct.mon_hoc_id || !ct.lop_id || !ct.vat_tu_id) {
                return NextResponse.json({ 
                    error: `Dòng ${i + 1}: Thiếu dữ liệu (môn học, lớp hoặc vật tư)` 
                }, { status: 400 });
            }

            // Validate subject exists
            const monCheck = await db.execute({
                sql: 'SELECT ten_mon FROM mon_hoc WHERE id = ?',
                args: [ct.mon_hoc_id]
            });
            if (monCheck.rows.length === 0) {
                return NextResponse.json({ 
                    error: `Dòng ${i + 1}: Môn học ID ${ct.mon_hoc_id} không tồn tại` 
                }, { status: 400 });
            }

            // Validate class exists
            const lopCheck = await db.execute({
                sql: 'SELECT ten_lop FROM lop WHERE id = ?',
                args: [ct.lop_id]
            });
            if (lopCheck.rows.length === 0) {
                return NextResponse.json({ 
                    error: `Dòng ${i + 1}: Lớp ID ${ct.lop_id} không tồn tại` 
                }, { status: 400 });
            }

            // Validate material exists AND belongs to this semester
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
                    error: `Dòng ${i + 1}: Vật tư "${vtCheck.rows[0].ten_vat_tu}" không thuộc kỳ học này (expected ki_id ${ki_id}, got ${vtCheck.rows[0].ki_id})` 
                }, { status: 400 });
            }

            // Validate quantity
            if (typeof ct.so_luong !== 'number' || ct.so_luong <= 0) {
                return NextResponse.json({ 
                    error: `Dòng ${i + 1}: Số lượng phải là số dương` 
                }, { status: 400 });
            }
        }

        // Check if existing proposal for this teacher+semester
        const existingResult = await db.execute({
            sql: 'SELECT id FROM de_xuat WHERE giao_vien_id = ? AND ki_id = ?',
            args: [giao_vien_id, ki_id]
        });

        if (existingResult.rows.length > 0) {
            // Update existing proposal
            const existingId = existingResult.rows[0].id;

            const stmts = [
                { 
                    sql: 'DELETE FROM de_xuat_chi_tiet WHERE de_xuat_id = ?', 
                    args: [existingId] 
                },
                { 
                    sql: "UPDATE de_xuat SET trang_thai = 'da_nop', ngay_nop = CURRENT_TIMESTAMP WHERE id = ?", 
                    args: [existingId] 
                }
            ];

            // Add all chi_tiet records
            for (const ct of chi_tiet) {
                stmts.push({
                    sql: 'INSERT INTO de_xuat_chi_tiet (de_xuat_id, mon_hoc_id, lop_id, vat_tu_id, so_luong, ghi_chu) VALUES (?, ?, ?, ?, ?, ?)',
                    args: [existingId, ct.mon_hoc_id, ct.lop_id, ct.vat_tu_id, ct.so_luong, ct.ghi_chu || null]
                });
            }

            await db.batch(stmts, "write");
            return NextResponse.json({ 
                id: existingId, 
                message: 'Cập nhật đề xuất thành công' 
            });
        }

        // Create new proposal
        await db.execute({
            sql: "INSERT INTO de_xuat (giao_vien_id, ki_id, trang_thai, ngay_nop) VALUES (?, ?, 'da_nop', CURRENT_TIMESTAMP)",
            args: [giao_vien_id, ki_id]
        });

        // Query to get the ID (ensure it's correct)
        const idResult = await db.execute({
            sql: 'SELECT id FROM de_xuat WHERE giao_vien_id = ? AND ki_id = ? ORDER BY created_at DESC LIMIT 1',
            args: [giao_vien_id, ki_id]
        });

        if (idResult.rows.length === 0) {
            return NextResponse.json({ 
                error: 'Không thể tạo đề xuất (INSERT thất bại)' 
            }, { status: 500 });
        }

        let deXuatId = idResult.rows[0].id;
        
        // Ensure ID is valid
        if (!deXuatId) {
            return NextResponse.json({ 
                error: 'Không thể tạo đề xuất (ID lỗi)' 
            }, { status: 500 });
        }

        // Convert to proper type
        deXuatId = parseInt(deXuatId) || deXuatId;
        console.log('✅ Created/Found de_xuat ID:', deXuatId, 'type:', typeof deXuatId);

        // Add chi_tiet records
        if (!chi_tiet || chi_tiet.length === 0) {
            return NextResponse.json({ 
                id: deXuatId, 
                message: 'Gửi đề xuất thành công (không có chi tiết)' 
            });
        }

        console.log('📝 Inserting', chi_tiet.length, 'chi_tiet records with de_xuat_id:', deXuatId);
        console.log('🔍 Data:', JSON.stringify({ de_xuat_id: deXuatId, chi_tiet: chi_tiet }, null, 2));
        
        // Insert one by one to catch exact error
        for (let i = 0; i < chi_tiet.length; i++) {
            const ct = chi_tiet[i];
            try {
                console.log(`  Inserting row ${i + 1}/${chi_tiet.length}: mon_hoc_id=${ct.mon_hoc_id}, lop_id=${ct.lop_id}, vat_tu_id=${ct.vat_tu_id}`);
                await db.execute({
                    sql: 'INSERT INTO de_xuat_chi_tiet (de_xuat_id, mon_hoc_id, lop_id, vat_tu_id, so_luong, ghi_chu) VALUES (?, ?, ?, ?, ?, ?)',
                    args: [deXuatId, ct.mon_hoc_id, ct.lop_id, ct.vat_tu_id, ct.so_luong, ct.ghi_chu || null]
                });
            } catch (err) {
                console.error(`  ❌ Failed on row ${i + 1}:`, err.message);
                throw err;
            }
        }
        console.log('✅ Chi_tiet inserted successfully');

        return NextResponse.json({ 
            id: deXuatId, 
            message: 'Gửi đề xuất thành công' 
        });
    } catch (error) {
        console.error('de-xuat POST error:', error);
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
            return NextResponse.json({ error: 'ID đề xuất không được cung cấp' }, { status: 400 });
        }

        // Check proposal exists
        const dxCheck = await db.execute({
            sql: 'SELECT id FROM de_xuat WHERE id = ?',
            args: [id]
        });
        if (dxCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Đề xuất không tồn tại' }, { status: 404 });
        }

        const sets = [];
        const params = [];

        if (trang_thai) {
            sets.push('trang_thai = ?');
            params.push(trang_thai);
        }
        if (ghi_chu !== undefined) {
            sets.push('ghi_chu = ?');
            params.push(ghi_chu);
        }

        if (sets.length === 0) {
            return NextResponse.json({ error: 'Không có dữ liệu để cập nhật' }, { status: 400 });
        }

        params.push(id);
        const query = 'UPDATE de_xuat SET ' + sets.join(',') + ' WHERE id = ?';

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
            return NextResponse.json({ error: 'ID đề xuất không được cung cấp' }, { status: 400 });
        }

        // Check proposal exists
        const dxCheck = await db.execute({
            sql: 'SELECT id FROM de_xuat WHERE id = ?',
            args: [id]
        });
        if (dxCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Đề xuất không tồn tại' }, { status: 404 });
        }

        // Delete chi_tiet records (cascade will handle it)
        await db.execute({
            sql: 'DELETE FROM de_xuat WHERE id = ?',
            args: [id]
        });

        return NextResponse.json({ message: 'Xóa đề xuất thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
