import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

/**
 * API Import Phân Công Nhanh
 * 
 * Nhận vào mảng các dòng dữ liệu CSV:
 * [
 *   { giao_vien: "Lê Minh Tấn", mon_hoc: "TH Điều khiển khí nén, điện khí nén", ten_lop: "T24CD3DA-N2", si_so: 16 },
 *   ...
 * ]
 * 
 * Logic:
 * 1. Tìm/tạo giáo viên nếu chưa có
 * 2. Tìm/tạo môn học nếu chưa có
 * 3. Tìm/tạo lớp nếu chưa có (tự tính loại hệ từ chữ đầu tên lớp)
 * 4. Cập nhật sĩ số lớp nếu có thay đổi
 * 5. Tạo phân công (giáo viên + môn + lớp + kỳ học) nếu chưa có
 * 
 * POST body: { ki_id: number, rows: Array<{giao_vien, mon_hoc, ten_lop, si_so}> }
 */

function detectLoaiHe(tenLop) {
    const prefix = tenLop.trim().charAt(0).toUpperCase();
    if (prefix === 'T') return 'T';
    if (prefix === 'C') return 'C';
    if (prefix === 'L') return 'L';
    return null;
}

export async function POST(request) {
    try {
        const db = getDb();
        const body = await request.json();
        const { ki_id, rows } = body;

        if (!ki_id) {
            return NextResponse.json({ error: 'Vui lòng chọn kỳ học' }, { status: 400 });
        }
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: 'Không có dữ liệu để import' }, { status: 400 });
        }

        // Kiểm tra kỳ học tồn tại
        const kiResult = await db.execute({ sql: 'SELECT id, ten_ki FROM ki_hoc WHERE id = ?', args: [ki_id] });
        if (kiResult.rows.length === 0) {
            return NextResponse.json({ error: 'Kỳ học không tồn tại' }, { status: 404 });
        }
        const ki = kiResult.rows[0];

        const summary = {
            giao_vien_them_moi: [],
            mon_hoc_them_moi: [],
            lop_them_moi: [],
            phan_cong_them_moi: 0,
            phan_cong_da_co: 0,
            loi: []
        };

        for (const row of rows) {
            const { giao_vien: tenGV, mon_hoc: tenMon, ten_lop: tenLop, si_so: siSo } = row;

            if (!tenGV || !tenMon || !tenLop) {
                summary.loi.push(`Thiếu dữ liệu: ${JSON.stringify(row)}`);
                continue;
            }

            // 1. Tìm/tạo giáo viên
            const gvResult = await db.execute({ sql: 'SELECT id, ho_ten FROM giao_vien WHERE ho_ten = ?', args: [tenGV.trim()] });
            let gvId;
            if (gvResult.rows.length === 0) {
                const r = await db.execute({ sql: 'INSERT INTO giao_vien (ho_ten) VALUES (?)', args: [tenGV.trim()] });
                gvId = Number(r.lastInsertRowid);
                summary.giao_vien_them_moi.push(tenGV.trim());
            } else {
                gvId = gvResult.rows[0].id;
            }

            // 2. Tìm/tạo môn học
            const monResult = await db.execute({ sql: 'SELECT id, ten_mon FROM mon_hoc WHERE ten_mon = ?', args: [tenMon.trim()] });
            let monId;
            if (monResult.rows.length === 0) {
                const r = await db.execute({ sql: 'INSERT INTO mon_hoc (ten_mon) VALUES (?)', args: [tenMon.trim()] });
                monId = Number(r.lastInsertRowid);
                summary.mon_hoc_them_moi.push(tenMon.trim());
            } else {
                monId = monResult.rows[0].id;
            }

            // 3. Tìm/tạo lớp
            const lopResult = await db.execute({ sql: 'SELECT id, ten_lop, si_so FROM lop WHERE ten_lop = ?', args: [tenLop.trim()] });
            let lopId;
            if (lopResult.rows.length === 0) {
                const loaiHe = detectLoaiHe(tenLop);
                if (!loaiHe) {
                    summary.loi.push(`Không xác định được hệ đào tạo từ lớp "${tenLop}". Chữ đầu phải là T, C, hoặc L.`);
                    continue;
                }
                const r = await db.execute({ sql: 'INSERT INTO lop (ten_lop, loai_he, si_so) VALUES (?, ?, ?)', args: [tenLop.trim(), loaiHe, siSo || 0] });
                lopId = Number(r.lastInsertRowid);
                summary.lop_them_moi.push({ ten_lop: tenLop.trim(), si_so: siSo || 0 });
            } else {
                lopId = lopResult.rows[0].id;
                if (siSo && lopResult.rows[0].si_so !== siSo) {
                    await db.execute({ sql: 'UPDATE lop SET si_so = ? WHERE id = ?', args: [siSo, lopId] });
                }
            }

            // 4. Tìm/tạo phân công
            const existingPCResult = await db.execute({
                sql: 'SELECT id FROM phan_cong WHERE giao_vien_id = ? AND mon_hoc_id = ? AND lop_id = ? AND ki_id = ?',
                args: [gvId, monId, lopId, ki_id]
            });

            if (existingPCResult.rows.length === 0) {
                await db.execute({
                    sql: 'INSERT INTO phan_cong (giao_vien_id, mon_hoc_id, lop_id, ki_id) VALUES (?, ?, ?, ?)',
                    args: [gvId, monId, lopId, ki_id]
                });
                summary.phan_cong_them_moi++;
            } else {
                summary.phan_cong_da_co++;
            }
        }

        return NextResponse.json({
            message: 'Import phân công thành công',
            ki_hoc: ki.ten_ki,
            tong_dong: rows.length,
            ...summary
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Parse CSV text thành mảng rows
 * Hỗ trợ format:
 * Lê Minh Tấn,"TH Điều khiển khí nén, điện khí nén",T24CD3DA-N2,16
 */
export async function PUT(request) {
    try {
        const { csv_text, ki_id } = await request.json();
        if (!csv_text) return NextResponse.json({ error: 'Thiếu dữ liệu CSV' }, { status: 400 });

        const rows = parseCSV(csv_text);
        if (rows.length === 0) return NextResponse.json({ error: 'Không đọc được dữ liệu từ CSV' }, { status: 400 });

        // Trả về rows đã parse để frontend preview, hoặc nếu có ki_id thì import luôn
        if (ki_id) {
            // Gọi lại POST logic bằng fake payload do POST nhận request json chuẩn NEXT js
            const fakeRequest = new Request(request.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ki_id, rows })
            });
            return POST(fakeRequest);
        }

        return NextResponse.json({ rows, tong_dong: rows.length });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Parse CSV với hỗ trợ field được bọc trong dấu ngoặc kép
 * Format: giao_vien,mon_hoc,ten_lop,si_so
 */
function parseCSV(text) {
    const rows = [];
    const lines = text.trim().split('\n');

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const fields = parseCSVLine(trimmed);
        if (fields.length < 3) continue;

        const [giao_vien, mon_hoc, ten_lop, si_so_str] = fields;
        const si_so = parseInt(si_so_str) || 0;

        if (giao_vien && mon_hoc && ten_lop) {
            const cleanedMonHoc = mon_hoc.trim();
            const upperMonHoc = cleanedMonHoc.toUpperCase();

            // Bỏ qua môn bắt đầu bằng LT
            if (upperMonHoc.startsWith('LT')) {
                continue;
            }

            // Chỉ thêm các môn bắt đầu bằng TH
            if (upperMonHoc.startsWith('TH')) {
                rows.push({
                    giao_vien: giao_vien.trim(),
                    mon_hoc: cleanedMonHoc,
                    ten_lop: ten_lop.trim(),
                    si_so
                });
            }
        }
    }

    return rows;
}

function parseCSVLine(line) {
    if (line.includes('\t')) {
        return line.split('\t').map(item => {
            if (item.startsWith('"') && item.endsWith('"')) {
                return item.slice(1, -1).trim();
            }
            return item.trim();
        });
    }

    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}
