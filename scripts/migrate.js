/**
 * Migration script: Cập nhật schema database trên Turso
 * Chạy: node scripts/migrate.js
 */

import { createClient } from '@libsql/client/web';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error("❌ Thiếu TURSO_DATABASE_URL hoặc TURSO_AUTH_TOKEN trong .env.local");
    process.exit(1);
}

const db = createClient({ url, authToken });

console.log('🔄 Bắt đầu migration...\n');

async function migrate() {
    const tableQueries = [
        `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      ho_ten TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
        `CREATE TABLE IF NOT EXISTS nganh (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ten_nganh TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
        `CREATE TABLE IF NOT EXISTS he_dao_tao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nganh_id INTEGER NOT NULL,
      ten_he TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (nganh_id) REFERENCES nganh(id) ON DELETE CASCADE
    )`,
        `CREATE TABLE IF NOT EXISTS giao_vien (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ho_ten TEXT NOT NULL,
      email TEXT,
      so_dien_thoai TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
        `CREATE TABLE IF NOT EXISTS ki_hoc (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ten_ki TEXT NOT NULL,
      nam_hoc TEXT NOT NULL,
      ngay_bat_dau DATE,
      ngay_ket_thuc DATE,
      trang_thai TEXT DEFAULT 'setup' CHECK(trang_thai IN ('setup', 'de_xuat', 'mua_sam', 'hoat_dong', 'dong')),
      han_de_xuat DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
        `CREATE TABLE IF NOT EXISTS mon_hoc (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ten_mon TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
        `CREATE TABLE IF NOT EXISTS lop (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ten_lop TEXT NOT NULL UNIQUE,
      loai_he TEXT NOT NULL CHECK(loai_he IN ('T', 'C', 'L')),
      si_so INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
        `CREATE TABLE IF NOT EXISTS phan_cong (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giao_vien_id INTEGER NOT NULL,
      mon_hoc_id INTEGER NOT NULL,
      lop_id INTEGER NOT NULL,
      ki_id INTEGER NOT NULL,
      FOREIGN KEY (giao_vien_id) REFERENCES giao_vien(id) ON DELETE CASCADE,
      FOREIGN KEY (mon_hoc_id) REFERENCES mon_hoc(id) ON DELETE CASCADE,
      FOREIGN KEY (lop_id) REFERENCES lop(id) ON DELETE CASCADE,
      FOREIGN KEY (ki_id) REFERENCES ki_hoc(id) ON DELETE CASCADE,
      UNIQUE(giao_vien_id, mon_hoc_id, lop_id, ki_id)
    )`,
        `CREATE TABLE IF NOT EXISTS vat_tu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ten_vat_tu TEXT NOT NULL,
      yeu_cau_ky_thuat TEXT,
      don_vi_tinh TEXT NOT NULL,
      so_luong_kho INTEGER DEFAULT 0,
      ki_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ki_id) REFERENCES ki_hoc(id) ON DELETE CASCADE
    )`,
        `CREATE TABLE IF NOT EXISTS de_xuat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giao_vien_id INTEGER NOT NULL,
      ki_id INTEGER NOT NULL,
      trang_thai TEXT DEFAULT 'dang_lam' CHECK(trang_thai IN ('dang_lam', 'da_nop', 'duyet', 'tu_choi')),
      ghi_chu TEXT,
      ngay_nop DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (giao_vien_id) REFERENCES giao_vien(id) ON DELETE CASCADE,
      FOREIGN KEY (ki_id) REFERENCES ki_hoc(id) ON DELETE CASCADE
    )`,
        `CREATE TABLE IF NOT EXISTS vat_tu_tam (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ten_vat_tu TEXT NOT NULL,
      yeu_cau_ky_thuat TEXT,
      don_vi_tinh TEXT NOT NULL,
      ki_id INTEGER NOT NULL,
      giao_vien_id INTEGER NOT NULL,
      trang_thai TEXT DEFAULT 'cho_duyet' CHECK(trang_thai IN ('cho_duyet', 'da_duyet', 'tu_choi')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ki_id) REFERENCES ki_hoc(id) ON DELETE CASCADE,
      FOREIGN KEY (giao_vien_id) REFERENCES giao_vien(id) ON DELETE CASCADE
    )`,
        `CREATE TABLE IF NOT EXISTS de_xuat_chi_tiet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      de_xuat_id INTEGER NOT NULL,
      mon_hoc_id INTEGER NOT NULL,
      lop_id INTEGER NOT NULL DEFAULT 0,
      vat_tu_id INTEGER,
      vat_tu_tam_id INTEGER,
      so_luong INTEGER NOT NULL DEFAULT 0,
      ghi_chu TEXT,
      FOREIGN KEY (de_xuat_id) REFERENCES de_xuat(id) ON DELETE CASCADE,
      FOREIGN KEY (mon_hoc_id) REFERENCES mon_hoc(id) ON DELETE CASCADE,
      FOREIGN KEY (lop_id) REFERENCES lop(id) ON DELETE CASCADE,
      FOREIGN KEY (vat_tu_id) REFERENCES vat_tu(id) ON DELETE SET NULL,
      FOREIGN KEY (vat_tu_tam_id) REFERENCES vat_tu_tam(id) ON DELETE SET NULL
    )`,
        `CREATE TABLE IF NOT EXISTS mua_sam (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ki_id INTEGER NOT NULL,
      vat_tu_id INTEGER NOT NULL,
      so_luong_de_xuat INTEGER DEFAULT 0,
      so_luong_duyet INTEGER DEFAULT 0,
      don_gia REAL DEFAULT 0,
      thanh_tien REAL DEFAULT 0,
      trang_thai TEXT DEFAULT 'cho_mua' CHECK(trang_thai IN ('cho_mua', 'da_mua')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ki_id) REFERENCES ki_hoc(id) ON DELETE CASCADE,
      FOREIGN KEY (vat_tu_id) REFERENCES vat_tu(id) ON DELETE CASCADE,
      UNIQUE(ki_id, vat_tu_id)
    )`,
        `CREATE TABLE IF NOT EXISTS phieu_xuat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giao_vien_id INTEGER NOT NULL,
      ki_id INTEGER NOT NULL,
      mon_hoc_id INTEGER NOT NULL,
      lop_id INTEGER,
      trang_thai TEXT DEFAULT 'cho_duyet' CHECK(trang_thai IN ('cho_duyet', 'da_ky', 'da_xuat', 'tu_choi')),
      ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
      ngay_duyet DATETIME,
      ghi_chu TEXT,
      FOREIGN KEY (giao_vien_id) REFERENCES giao_vien(id) ON DELETE CASCADE,
      FOREIGN KEY (ki_id) REFERENCES ki_hoc(id) ON DELETE CASCADE,
      FOREIGN KEY (mon_hoc_id) REFERENCES mon_hoc(id) ON DELETE CASCADE,
      FOREIGN KEY (lop_id) REFERENCES lop(id) ON DELETE SET NULL
    )`,
        `CREATE TABLE IF NOT EXISTS phieu_xuat_chi_tiet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phieu_xuat_id INTEGER NOT NULL,
      vat_tu_id INTEGER NOT NULL,
      so_luong INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (phieu_xuat_id) REFERENCES phieu_xuat(id) ON DELETE CASCADE,
      FOREIGN KEY (vat_tu_id) REFERENCES vat_tu(id) ON DELETE CASCADE
    )`
    ];

    console.log('✅ Đang tạo bảng nếu chưa có...');
    for (const sql of tableQueries) {
        await db.execute(sql);
    }

    console.log('✅ Đang cập nhật schema bổ sung...');
    try {
        await db.execute("ALTER TABLE de_xuat_chi_tiet ADD COLUMN vat_tu_tam_id INTEGER REFERENCES vat_tu_tam(id) ON DELETE SET NULL");
        console.log('   ✅ Đã thêm cột vat_tu_tam_id');
    } catch (e) {}

    try {
        await db.execute("ALTER TABLE vat_tu_tam ADD COLUMN trang_thai TEXT DEFAULT 'cho_duyet' CHECK(trang_thai IN ('cho_duyet', 'da_duyet', 'tu_choi'))");
        console.log('   ✅ Đã thêm cột trang_thai cho vat_tu_tam');
    } catch (e) {}

    // Làm cho vat_tu_id có thể NULL trong de_xuat_chi_tiet (SQLite workaround)
    // Lưu ý: SQLite không cho phép ALTER COLUMN để bỏ NOT NULL.
    // Tuy nhiên, nếu bảng đã có dữ liệu, ta chỉ có thể chèn NULL nếu ta recreate bảng.
    // Vì đây là dev env, ta sẽ thử rename và recreate nếu cần, hoặc chấp nhận rủi ro.
    // Cách an toàn nhất là:
    try {
        const columns = await db.execute("PRAGMA table_info(de_xuat_chi_tiet)");
        const isVatTuIdNotNull = columns.rows.find(c => c.name === 'vat_tu_id')?.notnull === 1;
        if (isVatTuIdNotNull) {
            console.log('   🔄 Chuyển vat_tu_id thành nullable...');
            // Thực hiện recreate bảng chi tiết
            await db.batch([
                "ALTER TABLE de_xuat_chi_tiet RENAME TO de_xuat_chi_tiet_old",
                `CREATE TABLE de_xuat_chi_tiet (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  de_xuat_id INTEGER NOT NULL,
                  mon_hoc_id INTEGER NOT NULL,
                  lop_id INTEGER NOT NULL DEFAULT 0,
                  vat_tu_id INTEGER,
                  vat_tu_tam_id INTEGER,
                  so_luong INTEGER NOT NULL DEFAULT 0,
                  ghi_chu TEXT,
                  FOREIGN KEY (de_xuat_id) REFERENCES de_xuat(id) ON DELETE CASCADE,
                  FOREIGN KEY (mon_hoc_id) REFERENCES mon_hoc(id) ON DELETE CASCADE,
                  FOREIGN KEY (lop_id) REFERENCES lop(id) ON DELETE CASCADE,
                  FOREIGN KEY (vat_tu_id) REFERENCES vat_tu(id) ON DELETE SET NULL,
                  FOREIGN KEY (vat_tu_tam_id) REFERENCES vat_tu_tam(id) ON DELETE SET NULL
                )`,
                "INSERT INTO de_xuat_chi_tiet (id, de_xuat_id, mon_hoc_id, lop_id, vat_tu_id, vat_tu_tam_id, so_luong, ghi_chu) SELECT id, de_xuat_id, mon_hoc_id, lop_id, vat_tu_id, vat_tu_tam_id, so_luong, ghi_chu FROM de_xuat_chi_tiet_old",
                "DROP TABLE de_xuat_chi_tiet_old"
            ], "write");
            console.log('   ✅ Đã chuyển vat_tu_id thành nullable');
        }
    } catch (e) {
        console.error('   ❌ Lỗi cập nhật nullable:', e.message);
    }

    try {
        await db.execute("UPDATE vat_tu_tam SET trang_thai = 'cho_duyet' WHERE trang_thai IS NULL");
        console.log('   ✅ Đã cập nhật trang_thai mặc định cho vat_tu_tam');
    } catch (e) {}

    console.log('✅ Đang kiểm tra admin...');
    const adminExists = await db.execute("SELECT id FROM users WHERE username = 'admin'");
    if (adminExists.rows.length === 0) {
        const hash = bcrypt.hashSync('admin123', 10);
        await db.execute({
            sql: 'INSERT INTO users (username, password_hash, ho_ten) VALUES (?, ?, ?)',
            args: ['admin', hash, 'Quản trị viên']
        });
        console.log('   ✅ Đã tạo tài khoản admin mặc định (admin/admin123)');
    } else {
        console.log('   ⏭️  Admin đã tồn tại');
    }
}

migrate()
    .then(() => {
        console.log('\n✅ Migration hoàn thành!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Migration thất bại:', error.message);
        process.exit(1);
    });
