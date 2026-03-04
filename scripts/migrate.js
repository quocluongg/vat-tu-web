/**
 * Migration script: Cập nhật schema database
 * Chạy: node scripts/migrate.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'vattu.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = OFF');

console.log('🔄 Bắt đầu migration...\n');

const migrate = db.transaction(() => {

    // ─── 1. Bảng lop: thêm loai_he và si_so nếu chưa có ──────────────────────
    const lopExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='lop'").get();
    if (!lopExists) {
        console.log('✅ Tạo bảng lop...');
        db.exec(`
            CREATE TABLE lop (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ten_lop TEXT NOT NULL UNIQUE,
                loai_he TEXT NOT NULL DEFAULT 'T',
                si_so INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } else {
        const lopCols = db.prepare("PRAGMA table_info(lop)").all().map(c => c.name);
        console.log('⏭️  Bảng lop tồn tại, kiểm tra cột...');

        if (!lopCols.includes('loai_he')) {
            console.log('✅ lop: Rebuild để thêm loai_he (tự điền từ chữ đầu tên lớp)...');
            db.exec(`
                CREATE TABLE lop_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ten_lop TEXT NOT NULL UNIQUE,
                    loai_he TEXT NOT NULL DEFAULT 'T',
                    si_so INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                INSERT OR IGNORE INTO lop_new (id, ten_lop, loai_he, si_so, created_at)
                    SELECT id, ten_lop,
                        CASE UPPER(SUBSTR(TRIM(ten_lop), 1, 1))
                            WHEN 'C' THEN 'C'
                            WHEN 'L' THEN 'L'
                            ELSE 'T'
                        END,
                        COALESCE(si_so, 0),
                        COALESCE(created_at, CURRENT_TIMESTAMP)
                    FROM lop;
                DROP TABLE lop;
                ALTER TABLE lop_new RENAME TO lop;
            `);
            console.log('   ✅ loai_he đã tự điền từ chữ đầu tên lớp');
        } else {
            console.log('⏭️  lop.loai_he đã tồn tại');
        }

        if (!lopCols.includes('si_so')) {
            console.log('✅ lop: Thêm cột si_so...');
            db.exec(`ALTER TABLE lop ADD COLUMN si_so INTEGER DEFAULT 0`);
        }
    }

    // ─── 2. mon_hoc: Bỏ he_dao_tao_id ────────────────────────────────────────
    const monHocCols = db.prepare("PRAGMA table_info(mon_hoc)").all().map(c => c.name);
    if (monHocCols.includes('he_dao_tao_id')) {
        console.log('✅ mon_hoc: Rebuild để bỏ he_dao_tao_id...');
        db.exec(`
            CREATE TABLE mon_hoc_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ten_mon TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            INSERT OR IGNORE INTO mon_hoc_new (id, ten_mon, created_at)
                SELECT id, ten_mon, created_at FROM mon_hoc;
            DROP TABLE mon_hoc;
            ALTER TABLE mon_hoc_new RENAME TO mon_hoc;
        `);
    } else {
        console.log('⏭️  mon_hoc không có he_dao_tao_id');
    }

    // ─── 3. phan_cong: Rebuild để đúng UNIQUE(gv, mon, lop, ki) ──────────────
    // Check xem UNIQUE constraint có bao gồm lop_id không
    const pcSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='phan_cong'").get();
    // Phải có cả lop_id trong phần UNIQUE(...)
    const pcHasLopInUnique = pcSchema?.sql?.match(/UNIQUE\s*\([^)]*lop_id[^)]*\)/i);

    if (!pcHasLopInUnique) {
        console.log('✅ phan_cong: Rebuild với UNIQUE(giao_vien_id, mon_hoc_id, lop_id, ki_id)...');
        db.exec(`
            CREATE TABLE phan_cong_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                giao_vien_id INTEGER NOT NULL,
                mon_hoc_id INTEGER NOT NULL,
                lop_id INTEGER NOT NULL DEFAULT 0,
                ki_id INTEGER NOT NULL,
                FOREIGN KEY (giao_vien_id) REFERENCES giao_vien(id) ON DELETE CASCADE,
                FOREIGN KEY (mon_hoc_id) REFERENCES mon_hoc(id) ON DELETE CASCADE,
                FOREIGN KEY (ki_id) REFERENCES ki_hoc(id) ON DELETE CASCADE,
                UNIQUE(giao_vien_id, mon_hoc_id, lop_id, ki_id)
            );
            INSERT OR IGNORE INTO phan_cong_new (id, giao_vien_id, mon_hoc_id, lop_id, ki_id)
                SELECT id, giao_vien_id, mon_hoc_id, COALESCE(lop_id, 0), ki_id FROM phan_cong;
            DROP TABLE phan_cong;
            ALTER TABLE phan_cong_new RENAME TO phan_cong;
        `);
        console.log('   ✅ UNIQUE constraint đã cập nhật');
    } else {
        console.log('⏭️  phan_cong đã có UNIQUE constraint đúng');
    }

    // ─── 4. de_xuat_chi_tiet: Thêm lop_id ────────────────────────────────────
    const dxctCols = db.prepare("PRAGMA table_info(de_xuat_chi_tiet)").all().map(c => c.name);
    if (!dxctCols.includes('lop_id')) {
        console.log('✅ de_xuat_chi_tiet: Rebuild để thêm lop_id...');
        db.exec(`
            CREATE TABLE de_xuat_chi_tiet_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                de_xuat_id INTEGER NOT NULL,
                mon_hoc_id INTEGER NOT NULL,
                lop_id INTEGER NOT NULL DEFAULT 0,
                vat_tu_id INTEGER NOT NULL,
                so_luong INTEGER NOT NULL DEFAULT 0,
                ghi_chu TEXT,
                FOREIGN KEY (de_xuat_id) REFERENCES de_xuat(id) ON DELETE CASCADE,
                FOREIGN KEY (mon_hoc_id) REFERENCES mon_hoc(id) ON DELETE CASCADE,
                FOREIGN KEY (vat_tu_id) REFERENCES vat_tu(id) ON DELETE CASCADE
            );
            INSERT OR IGNORE INTO de_xuat_chi_tiet_new (id, de_xuat_id, mon_hoc_id, lop_id, vat_tu_id, so_luong, ghi_chu)
                SELECT id, de_xuat_id, mon_hoc_id, 0, vat_tu_id, so_luong, ghi_chu FROM de_xuat_chi_tiet;
            DROP TABLE de_xuat_chi_tiet;
            ALTER TABLE de_xuat_chi_tiet_new RENAME TO de_xuat_chi_tiet;
        `);
    } else {
        console.log('⏭️  de_xuat_chi_tiet đã có lop_id');
    }

    // ─── 5. phieu_xuat: Thêm lop_id (nullable) ───────────────────────────────
    const pxCols = db.prepare("PRAGMA table_info(phieu_xuat)").all().map(c => c.name);
    if (!pxCols.includes('lop_id')) {
        console.log('✅ phieu_xuat: Thêm cột lop_id...');
        db.exec(`ALTER TABLE phieu_xuat ADD COLUMN lop_id INTEGER REFERENCES lop(id) ON DELETE SET NULL`);
    } else {
        console.log('⏭️  phieu_xuat đã có lop_id');
    }

});

try {
    migrate();
    console.log('\n✅ Migration hoàn thành!');
} catch (error) {
    console.error('\n❌ Migration thất bại:', error.message);
    process.exit(1);
} finally {
    db.pragma('foreign_keys = ON');
    db.close();
}
