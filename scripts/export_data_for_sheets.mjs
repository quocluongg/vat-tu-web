import { createClient } from '@libsql/client/web';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  process.exit(1);
}

const db = createClient({ url, authToken });
const outDir = path.join(__dirname, '..', 'data_sheets');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function writeCSV(filename, headers, rows) {
  const filePath = path.join(outDir, filename);
  const headerLine = headers.join(',');
  const dataLines = rows.map(r => r.map(escapeCSV).join(','));
  const content = '\uFEFF' + [headerLine, ...dataLines].join('\r\n'); // Add BOM for Excel/Google Sheets UTF-8
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Exported ${rows.length} rows to ${filename}`);
}

function slugify(text) {
  if (!text) return '';
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9]/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
}

async function exportAll() {
  console.log('🔄 Bắt đầu trích xuất dữ liệu từ Turso DB sang CSV cho Google Sheets...\n');

  // 1. Config_KyHoc
  const kiHocs = await db.execute("SELECT * FROM ki_hoc ORDER BY id ASC");
  const maxKiId = Math.max(...kiHocs.rows.map(k => k.id));
  const statusMap = {
    setup: 'Thiết lập',
    de_xuat: 'Đề xuất',
    mua_sam: 'Mua sắm',
    hoat_dong: 'Hoạt động',
    dong: 'Đã đóng'
  };

  const kyHocRows = kiHocs.rows.map(k => {
    const maKy = `HK${k.id}_${(k.nam_hoc || '').replace(/[^0-9]/g, '').slice(2, 6) || '2526'}`;
    const isCurrent = (k.id === maxKiId) ? 'TRUE' : 'FALSE';
    return [
      maKy,
      k.ten_ki,
      k.nam_hoc,
      k.ngay_bat_dau || '',
      k.ngay_ket_thuc || '',
      k.han_de_xuat || '',
      statusMap[k.trang_thai] || 'Đã đóng',
      isCurrent
    ];
  });
  writeCSV('Config_KyHoc.csv', ['Ma_Ky', 'Ten_Ky', 'Nam_Hoc', 'Ngay_Bat_Dau', 'Ngay_Ket_Thuc', 'Han_De_Xuat', 'Trang_Thai', 'Dang_Kich_Hoat'], kyHocRows);

  // Map ki_hoc id to maKy
  const kiIdToMaKy = {};
  kiHocs.rows.forEach(k => {
    kiIdToMaKy[k.id] = `HK${k.id}_${(k.nam_hoc || '').replace(/[^0-9]/g, '').slice(2, 6) || '2526'}`;
  });

  // 2. DM_GiaoVien
  const gvs = await db.execute("SELECT * FROM giao_vien ORDER BY id ASC");
  const gvEmailMap = {};
  const gvRows = gvs.rows.map(gv => {
    const maGv = `GV-${String(gv.id).padStart(3, '0')}`;
    let email = gv.email;
    if (!email || !email.includes('@')) {
      email = `${slugify(gv.ho_ten)}@vsvc.edu.vn`;
    }
    gvEmailMap[gv.id] = email;
    return [
      maGv,
      gv.ho_ten,
      email,
      gv.so_dien_thoai || '',
      'Khoa Điện - Điện tử',
      'GiaoVien'
    ];
  });
  // Add Admin account
  gvRows.unshift(['GV-000', 'Quản Trị Viên Khoa', 'admin@vsvc.edu.vn', '0900000000', 'Khoa Điện - Điện tử', 'Admin']);
  writeCSV('DM_GiaoVien.csv', ['Ma_GV', 'Ho_Ten', 'Email', 'So_Dien_Thoai', 'Bo_Mon', 'Vai_Tro'], gvRows);

  // 3. DM_Mon_Lop
  const mons = await db.execute("SELECT * FROM mon_hoc ORDER BY id ASC");
  const lops = await db.execute("SELECT * FROM lop ORDER BY id ASC");
  const monIdToCode = {};
  mons.rows.forEach(m => {
    monIdToCode[m.id] = `TH-M${String(m.id).padStart(2, '0')}`;
  });

  const monLopRows = [];
  const maxLen = Math.max(mons.rows.length, lops.rows.length);
  for (let i = 0; i < maxLen; i++) {
    const m = mons.rows[i];
    const l = lops.rows[i];
    monLopRows.push([
      m ? monIdToCode[m.id] : '',
      m ? m.ten_mon : '',
      m ? 45 : '',
      l ? l.ten_lop : '',
      l ? (l.loai_he === 'T' ? 'Trung cấp' : l.loai_he === 'C' ? 'Cao đẳng' : 'Liên thông') : '',
      l ? (l.si_so || 0) : '',
      'Điện công nghiệp'
    ]);
  }
  writeCSV('DM_Mon_Lop.csv', ['Ma_Mon', 'Ten_Mon', 'So_Gio_TH', 'Ma_Lop', 'He_Dao_Tao', 'Si_So', 'Nganh_Phu_Trach'], monLopRows);

  // 4. PhanCong_GiangDay
  const pcs = await db.execute(`
    SELECT pc.*, gv.ho_ten, m.ten_mon, l.ten_lop, l.si_so
    FROM phan_cong pc
    JOIN giao_vien gv ON pc.giao_vien_id = gv.id
    JOIN mon_hoc m ON pc.mon_hoc_id = m.id
    JOIN lop l ON pc.lop_id = l.id
    ORDER BY pc.id ASC
  `);
  const pcRows = pcs.rows.map(pc => [
    `PC-${String(pc.id).padStart(4, '0')}`,
    kiIdToMaKy[pc.ki_id] || `HK${pc.ki_id}`,
    gvEmailMap[pc.giao_vien_id] || '',
    pc.ho_ten,
    monIdToCode[pc.mon_hoc_id] || `TH-M${pc.mon_hoc_id}`,
    pc.ten_mon,
    pc.ten_lop,
    pc.si_so || 0
  ]);
  writeCSV('PhanCong_GiangDay.csv', ['Ma_PC', 'Ma_Ky', 'Email_GV', 'Ten_GV', 'Ma_Mon', 'Ten_Mon', 'Ma_Lop', 'Si_So'], pcRows);

  // 5. DM_VatTu
  const vts = await db.execute(`
    SELECT vt.*, ndt.ten_nganh
    FROM vat_tu vt
    LEFT JOIN nganh ndt ON vt.nganh_id = ndt.id
    ORDER BY vt.id ASC
  `);
  const vtRows = vts.rows.map(vt => [
    `VT-${String(vt.id).padStart(5, '0')}`,
    vt.ten_vat_tu,
    vt.yeu_cau_ky_thuat || '',
    vt.don_vi_tinh,
    vt.ten_nganh || 'Dùng chung',
    vt.so_luong_kho || 0,
    0, // Tong_Nhap
    0, // Tong_Xuat
    vt.so_luong_kho || 0, // Ton_Hien_Tai
    'Chính thức',
    ''
  ]);
  writeCSV('DM_VatTu.csv', ['Ma_VT', 'Ten_Vat_Tu', 'Yeu_Cau_Ky_Thuat', 'DVT', 'Bo_Mon', 'Ton_Dau_Ky', 'Tong_Nhap', 'Tong_Xuat', 'Ton_Hien_Tai', 'Trang_Thai', 'Nguoi_De_Xuat'], vtRows);

  // 6. GiaoDich_DeXuat
  const dxs = await db.execute(`
    SELECT dxct.*, dx.ngay_nop, dx.ki_id, dx.giao_vien_id, dx.trang_thai as dx_trang_thai,
           gv.ho_ten, m.ten_mon, l.ten_lop, vt.ten_vat_tu, vt.don_vi_tinh
    FROM de_xuat_chi_tiet dxct
    JOIN de_xuat dx ON dxct.de_xuat_id = dx.id
    JOIN giao_vien gv ON dx.giao_vien_id = gv.id
    JOIN mon_hoc m ON dxct.mon_hoc_id = m.id
    JOIN lop l ON dxct.lop_id = l.id
    LEFT JOIN vat_tu vt ON dxct.vat_tu_id = vt.id
    ORDER BY dxct.id ASC
  `);
  const deXuatRows = dxs.rows.map(d => [
    `DX-${String(d.de_xuat_id).padStart(4, '0')}`,
    d.ngay_nop || '',
    kiIdToMaKy[d.ki_id] || `HK${d.ki_id}`,
    gvEmailMap[d.giao_vien_id] || '',
    d.ho_ten,
    monIdToCode[d.mon_hoc_id] || '',
    d.ten_mon,
    d.ten_lop,
    d.vat_tu_id ? `VT-${String(d.vat_tu_id).padStart(5, '0')}` : '',
    d.ten_vat_tu || '',
    d.don_vi_tinh || '',
    d.so_luong || 0,
    d.dx_trang_thai === 'duyet' ? 'Đã duyệt' : d.dx_trang_thai === 'tu_choi' ? 'Từ chối' : 'Đã nộp',
    d.ghi_chu || ''
  ]);
  writeCSV('GiaoDich_DeXuat.csv', ['Ma_De_Xuat', 'Ngay_Nop', 'Ma_Ky', 'Email_GV', 'Ten_GV', 'Ma_Mon', 'Ten_Mon', 'Ma_Lop', 'Ma_VT', 'Ten_Vat_Tu', 'DVT', 'SL_De_Xuat', 'Trang_Thai', 'Ghi_Chu'], deXuatRows);

  // 7. GiaoDich_XuatKho
  const pxs = await db.execute(`
    SELECT pxct.*, px.ngay_tao, px.ki_id, px.giao_vien_id, px.mon_hoc_id, px.trang_thai as px_trang_thai, px.ngay_duyet, px.ghi_chu,
           gv.ho_ten, m.ten_mon, vt.ten_vat_tu, vt.don_vi_tinh
    FROM phieu_xuat_chi_tiet pxct
    JOIN phieu_xuat px ON pxct.phieu_xuat_id = px.id
    JOIN giao_vien gv ON px.giao_vien_id = gv.id
    JOIN mon_hoc m ON px.mon_hoc_id = m.id
    LEFT JOIN vat_tu vt ON pxct.vat_tu_id = vt.id
    ORDER BY pxct.id ASC
  `);
  const statusPxMap = {
    cho_duyet: 'Chờ duyệt',
    da_ky: 'Đã ký',
    da_xuat: 'Đã xuất',
    tu_choi: 'Hủy'
  };
  const xuatKhoRows = pxs.rows.map(p => [
    `PX-${String(p.phieu_xuat_id).padStart(4, '0')}`,
    p.ngay_tao || '',
    kiIdToMaKy[p.ki_id] || `HK${p.ki_id}`,
    gvEmailMap[p.giao_vien_id] || '',
    p.ho_ten,
    monIdToCode[p.mon_hoc_id] || '',
    p.vat_tu_id ? `VT-${String(p.vat_tu_id).padStart(5, '0')}` : '',
    p.ten_vat_tu || '',
    p.don_vi_tinh || '',
    p.so_luong || 0,
    statusPxMap[p.px_trang_thai] || 'Chờ duyệt',
    p.ngay_duyet || '',
    'admin@vsvc.edu.vn',
    p.ghi_chu || ''
  ]);
  writeCSV('GiaoDich_XuatKho.csv', ['Ma_Phieu_Xuat', 'Ngay_Tao', 'Ma_Ky', 'Email_GV', 'Ten_GV', 'Ma_Mon', 'Ma_VT', 'Ten_Vat_Tu', 'DVT', 'SL_Xuat', 'Trang_Thai', 'Ngay_Xuat', 'Nguoi_Duyet', 'Ghi_Chu'], xuatKhoRows);

  console.log('\n🎉 Hoàn thành trích xuất dữ liệu! Tất cả file CSV đã lưu trong data_sheets/');
}

exportAll().catch(console.error);
