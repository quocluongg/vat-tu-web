import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'data', 'vattu.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeDatabase();
  }
  return db;
}

function initializeDatabase() {
  const database = db;

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      ho_ten TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS nganh (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ten_nganh TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS he_dao_tao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nganh_id INTEGER NOT NULL,
      ten_he TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (nganh_id) REFERENCES nganh(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS giao_vien (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ho_ten TEXT NOT NULL,
      email TEXT,
      so_dien_thoai TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ki_hoc (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ten_ki TEXT NOT NULL,
      nam_hoc TEXT NOT NULL,
      ngay_bat_dau DATE,
      ngay_ket_thuc DATE,
      trang_thai TEXT DEFAULT 'setup' CHECK(trang_thai IN ('setup', 'de_xuat', 'mua_sam', 'hoat_dong', 'dong')),
      han_de_xuat DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mon_hoc (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      he_dao_tao_id INTEGER NOT NULL,
      ten_mon TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (he_dao_tao_id) REFERENCES he_dao_tao(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS phan_cong (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giao_vien_id INTEGER NOT NULL,
      mon_hoc_id INTEGER NOT NULL,
      ki_id INTEGER NOT NULL,
      FOREIGN KEY (giao_vien_id) REFERENCES giao_vien(id) ON DELETE CASCADE,
      FOREIGN KEY (mon_hoc_id) REFERENCES mon_hoc(id) ON DELETE CASCADE,
      FOREIGN KEY (ki_id) REFERENCES ki_hoc(id) ON DELETE CASCADE,
      UNIQUE(giao_vien_id, mon_hoc_id, ki_id)
    );

    CREATE TABLE IF NOT EXISTS vat_tu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ten_vat_tu TEXT NOT NULL,
      yeu_cau_ky_thuat TEXT,
      don_vi_tinh TEXT NOT NULL,
      so_luong_kho INTEGER DEFAULT 0,
      ki_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ki_id) REFERENCES ki_hoc(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS de_xuat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giao_vien_id INTEGER NOT NULL,
      ki_id INTEGER NOT NULL,
      trang_thai TEXT DEFAULT 'dang_lam' CHECK(trang_thai IN ('dang_lam', 'da_nop', 'duyet', 'tu_choi')),
      ghi_chu TEXT,
      ngay_nop DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (giao_vien_id) REFERENCES giao_vien(id) ON DELETE CASCADE,
      FOREIGN KEY (ki_id) REFERENCES ki_hoc(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS de_xuat_chi_tiet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      de_xuat_id INTEGER NOT NULL,
      mon_hoc_id INTEGER NOT NULL,
      vat_tu_id INTEGER NOT NULL,
      so_luong INTEGER NOT NULL DEFAULT 0,
      ghi_chu TEXT,
      FOREIGN KEY (de_xuat_id) REFERENCES de_xuat(id) ON DELETE CASCADE,
      FOREIGN KEY (mon_hoc_id) REFERENCES mon_hoc(id) ON DELETE CASCADE,
      FOREIGN KEY (vat_tu_id) REFERENCES vat_tu(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mua_sam (
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
    );

    CREATE TABLE IF NOT EXISTS phieu_xuat (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giao_vien_id INTEGER NOT NULL,
      ki_id INTEGER NOT NULL,
      mon_hoc_id INTEGER NOT NULL,
      trang_thai TEXT DEFAULT 'cho_duyet' CHECK(trang_thai IN ('cho_duyet', 'da_ky', 'da_xuat', 'tu_choi')),
      ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
      ngay_duyet DATETIME,
      ghi_chu TEXT,
      FOREIGN KEY (giao_vien_id) REFERENCES giao_vien(id) ON DELETE CASCADE,
      FOREIGN KEY (ki_id) REFERENCES ki_hoc(id) ON DELETE CASCADE,
      FOREIGN KEY (mon_hoc_id) REFERENCES mon_hoc(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS phieu_xuat_chi_tiet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phieu_xuat_id INTEGER NOT NULL,
      vat_tu_id INTEGER NOT NULL,
      so_luong INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (phieu_xuat_id) REFERENCES phieu_xuat(id) ON DELETE CASCADE,
      FOREIGN KEY (vat_tu_id) REFERENCES vat_tu(id) ON DELETE CASCADE
    );
  `);

  // Create default admin if not exists
  const adminExists = database.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('admin123', 10);
    database.prepare('INSERT INTO users (username, password_hash, ho_ten) VALUES (?, ?, ?)').run('admin', hash, 'Quản trị viên');
  }
}

export default getDb;
