import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

// GET /api/bien-ban — list (?ki_id, ?trang_thai, ?giao_vien_id) hoặc chi tiết (?id)
export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const ki_id = searchParams.get('ki_id');
        const trang_thai = searchParams.get('trang_thai');
        const giao_vien_id = searchParams.get('giao_vien_id');

        if (id) {
            const result = await db.execute({
                sql: `
                    SELECT bb.*, gv.ho_ten as ten_gv, k.ten_ki
                    FROM bien_ban bb
                    LEFT JOIN giao_vien gv ON bb.giao_vien_id = gv.id
                    LEFT JOIN ki_hoc k ON bb.ki_id = k.id
                    WHERE bb.id = ?
                `,
                args: [id]
            });
            if (result.rows.length === 0) {
                return NextResponse.json({ error: 'Không tìm thấy biên bản' }, { status: 404 });
            }
            const bb = result.rows[0];
            // Parse JSON danh sách vật tư phát sinh
            let vat_tu_list = [];
            try { vat_tu_list = bb.vat_tu_phat_sinh ? JSON.parse(bb.vat_tu_phat_sinh) : []; } catch { }
            // Các phiếu xuất đang gắn biên bản này
            const pxResult = await db.execute({
                sql: `
                    SELECT px.id, px.trang_thai, gv.ho_ten as ten_gv, m.ten_mon, l.ten_lop
                    FROM phieu_xuat px
                    JOIN giao_vien gv ON px.giao_vien_id = gv.id
                    JOIN mon_hoc m ON px.mon_hoc_id = m.id
                    LEFT JOIN lop l ON px.lop_id = l.id
                    WHERE px.bien_ban_id = ?
                `,
                args: [id]
            });
            return NextResponse.json({ ...bb, vat_tu_list, phieu_xuat: pxResult.rows });
        }

        let query = `
            SELECT bb.*, gv.ho_ten as ten_gv, k.ten_ki,
                   (SELECT COUNT(*) FROM phieu_xuat px WHERE px.bien_ban_id = bb.id) as so_phieu_xuat
            FROM bien_ban bb
            LEFT JOIN giao_vien gv ON bb.giao_vien_id = gv.id
            LEFT JOIN ki_hoc k ON bb.ki_id = k.id
        `;
        const conditions = [];
        const args = [];
        if (ki_id) { conditions.push('bb.ki_id = ?'); args.push(parseInt(ki_id)); }
        if (trang_thai) { conditions.push('bb.trang_thai = ?'); args.push(trang_thai); }
        if (giao_vien_id) { conditions.push('bb.giao_vien_id = ?'); args.push(parseInt(giao_vien_id)); }
        if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY bb.created_at DESC';

        const result = args.length > 0
            ? await db.execute({ sql: query, args })
            : await db.execute(query);
        return NextResponse.json(result.rows);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/bien-ban — tạo biên bản mới (cho_duyet)
export async function POST(request) {
    try {
        const db = getDb();
        const body = await request.json();
        const {
            so_bien_ban, ngay_lap, gio_lap, ki_id, thanh_phan,
            ten_thiet_bi, ma_so, phong_khoa, dia_diem, nguoi_su_dung,
            thoi_gian_phat_hien, nguoi_phat_hien, hien_tuong_hu_hong,
            tinh_hinh, nguyen_nhan, de_nghi_khac_phuc,
            ket_qua_kiem_tra, phuong_an, vat_tu_list,
            cong_viec_nghiem_thu, ngay_hoan_thanh, giao_vien_id, ghi_chu
        } = body;

        if (!ngay_lap) {
            return NextResponse.json({ error: 'Ngày lập biên bản không được để trống' }, { status: 400 });
        }
        if (!ki_id) {
            return NextResponse.json({ error: 'Thiếu kỳ học (ki_id)' }, { status: 400 });
        }
        if (giao_vien_id) {
            const gvCheck = await db.execute({ sql: 'SELECT id FROM giao_vien WHERE id = ?', args: [giao_vien_id] });
            if (gvCheck.rows.length === 0) {
                return NextResponse.json({ error: `Giáo viên ID ${giao_vien_id} không tồn tại` }, { status: 400 });
            }
        }

        const vatTuJson = Array.isArray(vat_tu_list) && vat_tu_list.length > 0
            ? JSON.stringify(vat_tu_list.map(v => ({
                ten: v.ten || v.ten_vat_tu || '',
                dvt: v.dvt || v.don_vi_tinh || '',
                so_luong: v.so_luong || 0,
                don_gia: v.don_gia || 0,
                thanh_tien: v.thanh_tien ?? ((v.so_luong || 0) * (v.don_gia || 0)),
                ghi_chu: v.ghi_chu || '',
            })))
            : null;

        const result = await db.execute({
            sql: `INSERT INTO bien_ban (
                so_bien_ban, ngay_lap, gio_lap, ki_id, thanh_phan,
                ten_thiet_bi, ma_so, phong_khoa, dia_diem, nguoi_su_dung,
                thoi_gian_phat_hien, nguoi_phat_hien, hien_tuong_hu_hong,
                tinh_hinh, nguyen_nhan, de_nghi_khac_phuc,
                ket_qua_kiem_tra, phuong_an, vat_tu_phat_sinh,
                cong_viec_nghiem_thu, ngay_hoan_thanh, giao_vien_id, ghi_chu
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                so_bien_ban || null, ngay_lap, gio_lap || null, ki_id, thanh_phan || null,
                ten_thiet_bi, ma_so || null, phong_khoa || null, dia_diem || null, nguoi_su_dung || null,
                thoi_gian_phat_hien || null, nguoi_phat_hien || null, hien_tuong_hu_hong || null,
                tinh_hinh || null, nguyen_nhan || null, de_nghi_khac_phuc || null,
                ket_qua_kiem_tra || null, phuong_an || null, vatTuJson,
                cong_viec_nghiem_thu || null, ngay_hoan_thanh || null, giao_vien_id || null, ghi_chu || null,
            ],
        });

        return NextResponse.json({
            id: Number(result.lastInsertRowid),
            message: 'Tạo biên bản thành công (chờ duyệt)'
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT /api/bien-ban — sửa nội dung / đổi trạng thái (duyệt, từ chối)
export async function PUT(request) {
    try {
        const db = getDb();
        const body = await request.json();
        const { id, trang_thai, vat_tu_list, ...fields } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID biên bản không được cung cấp' }, { status: 400 });
        }

        const check = await db.execute({ sql: 'SELECT id, trang_thai FROM bien_ban WHERE id = ?', args: [id] });
        if (check.rows.length === 0) {
            return NextResponse.json({ error: 'Biên bản không tồn tại' }, { status: 404 });
        }
        const currentStatus = check.rows[0].trang_thai;

        const sets = [];
        const params = [];

        // Chỉ sửa nội dung khi chưa duyệt
        const editable = [
            'so_bien_ban', 'ngay_lap', 'gio_lap', 'thanh_phan',
            'ten_thiet_bi', 'ma_so', 'phong_khoa', 'dia_diem', 'nguoi_su_dung',
            'thoi_gian_phat_hien', 'nguoi_phat_hien', 'hien_tuong_hu_hong',
            'tinh_hinh', 'nguyen_nhan', 'de_nghi_khac_phuc',
            'ket_qua_kiem_tra', 'phuong_an',
            'cong_viec_nghiem_thu', 'ngay_hoan_thanh', 'ghi_chu',
        ];
        if (currentStatus === 'da_duyet') {
            const hasContentEdit = editable.some(k => fields[k] !== undefined) || vat_tu_list !== undefined;
            if (hasContentEdit) {
                return NextResponse.json({ error: 'Không thể sửa nội dung biên bản đã duyệt' }, { status: 400 });
            }
        } else {
            for (const key of editable) {
                if (fields[key] !== undefined) {
                    sets.push(`${key} = ?`);
                    params.push(fields[key] || null);
                }
            }
            if (vat_tu_list !== undefined) {
                sets.push(' vat_tu_phat_sinh = ?');
                params.push(Array.isArray(vat_tu_list) && vat_tu_list.length > 0
                    ? JSON.stringify(vat_tu_list.map(v => ({
                        ten: v.ten || v.ten_vat_tu || '',
                        dvt: v.dvt || v.don_vi_tinh || '',
                        so_luong: v.so_luong || 0,
                        don_gia: v.don_gia || 0,
                        thanh_tien: v.thanh_tien ?? ((v.so_luong || 0) * (v.don_gia || 0)),
                        ghi_chu: v.ghi_chu || '',
                    })))
                    : null);
            }
        }

        // Chuyển trạng thái
        if (trang_thai && trang_thai !== currentStatus) {
            const allowed =
                (currentStatus === 'cho_duyet' && ['da_duyet', 'tu_choi'].includes(trang_thai)) ||
                (currentStatus === 'tu_choi' && trang_thai === 'cho_duyet');
            if (!allowed) {
                return NextResponse.json({
                    error: `Không thể chuyển biên bản từ "${currentStatus}" sang "${trang_thai}"`
                }, { status: 400 });
            }
            sets.push(' trang_thai = ?');
            params.push(trang_thai);
            if (trang_thai === 'da_duyet') {
                sets.push(' ngay_duyet = CURRENT_TIMESTAMP');
            }
        }

        if (sets.length === 0) {
            return NextResponse.json({ error: 'Không có dữ liệu để cập nhật' }, { status: 400 });
        }

        params.push(id);
        await db.execute({ sql: `UPDATE bien_ban SET ${sets.join(', ')} WHERE id = ?`, args: params });
        return NextResponse.json({ message: 'Cập nhật biên bản thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/bien-ban?id=
export async function DELETE(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'ID biên bản không được cung cấp' }, { status: 400 });
        }

        const check = await db.execute({ sql: 'SELECT id FROM bien_ban WHERE id = ?', args: [id] });
        if (check.rows.length === 0) {
            return NextResponse.json({ error: 'Biên bản không tồn tại' }, { status: 404 });
        }

        const pxCheck = await db.execute({
            sql: 'SELECT COUNT(*) as c FROM phieu_xuat WHERE bien_ban_id = ?',
            args: [id]
        });
        if (pxCheck.rows[0]?.c > 0) {
            return NextResponse.json({
                error: 'Không thể xóa biên bản vì đã có phiếu xuất sử dụng. Hãy xóa/huỷ phiếu xuất trước.'
            }, { status: 400 });
        }

        await db.execute({ sql: 'DELETE FROM bien_ban WHERE id = ?', args: [id] });
        return NextResponse.json({ message: 'Xóa biên bản thành công' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
