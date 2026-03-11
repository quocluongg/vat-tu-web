import { createClient } from '@libsql/client/web';

const dbUrl = "libsql://quanlyvattucaodang-quocluongg.aws-ap-northeast-1.turso.io";
const dbToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzI5MzAzNTAsImlkIjoiMDE5Y2NhZTAtMDMwMS03OTVlLTkzZTAtNWIzZDQ0NTVjY2Q0IiwicmlkIjoiMTk4NjE3YTYtN2NmMS00YWVlLWIxMjItNDliZjk4NmM0NWZhIn0.tUbDtEZwUdpJxIgcaTAIqe1DEGL-XW1WL0kb0wZHGysWwZrC3ZVlufLPOXrveGyr161uRhUjGgHs-n9_dnHPAg";

const client = createClient({
    url: dbUrl,
    authToken: dbToken,
});

async function run() {
    try {
        console.log("Connecting to Turso database...");

        await client.execute(`
            CREATE TABLE IF NOT EXISTS nganh_dao_tao (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ten_nganh TEXT NOT NULL
            );
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS he_dao_tao (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nganh_id INTEGER,
                ten_he TEXT NOT NULL,
                FOREIGN KEY (nganh_id) REFERENCES nganh_dao_tao(id)
            );
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS mon_hoc (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ten_mon TEXT NOT NULL
            );
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS lop (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ten_lop TEXT NOT NULL,
                si_so INTEGER DEFAULT 0,
                loai_he TEXT CHECK(loai_he IN ('C', 'T', 'L'))
            );
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS ki_hoc (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ten_ki TEXT NOT NULL,
                nam_hoc TEXT NOT NULL,
                trang_thai TEXT DEFAULT 'mo' CHECK(trang_thai IN ('mo', 'dong'))
            );
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                ho_ten TEXT NOT NULL,
                role TEXT CHECK(role IN ('admin', 'giao_vien', 'bgh')) NOT NULL
            );
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS phan_cong_giang_day (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                giao_vien_id INTEGER,
                mon_hoc_id INTEGER,
                lop_id INTEGER,
                ki_id INTEGER,
                FOREIGN KEY (giao_vien_id) REFERENCES users(id),
                FOREIGN KEY (mon_hoc_id) REFERENCES mon_hoc(id),
                FOREIGN KEY (lop_id) REFERENCES lop(id),
                FOREIGN KEY (ki_id) REFERENCES ki_hoc(id)
            );
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS vat_tu (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nganh_id INTEGER,
                ten_vat_tu TEXT NOT NULL,
                don_vi_tinh TEXT NOT NULL,
                ton_kho INTEGER DEFAULT 0,
                FOREIGN KEY (nganh_id) REFERENCES nganh_dao_tao(id)
            );
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS de_xuat (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phan_cong_id INTEGER,
                trang_thai TEXT DEFAULT 'cho_duyet' CHECK(trang_thai IN ('cho_duyet', 'da_duyet', 'tu_choi')),
                ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (phan_cong_id) REFERENCES phan_cong_giang_day(id)
            );
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS chi_tiet_de_xuat (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                de_xuat_id INTEGER,
                vat_tu_id INTEGER,
                so_luong INTEGER NOT NULL,
                FOREIGN KEY (de_xuat_id) REFERENCES de_xuat(id),
                FOREIGN KEY (vat_tu_id) REFERENCES vat_tu(id)
            );
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS phieu_xuat_kho (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nguoi_nhan_id INTEGER,
                ngay_xuat DATETIME DEFAULT CURRENT_TIMESTAMP,
                muc_dich TEXT,
                tong_so_luong INTEGER,
                phan_cong_id INTEGER,
                trang_thai TEXT DEFAULT 'hoan_thanh' CHECK(trang_thai IN ('hoan_thanh', 'da_huy')),
                nguoi_duyet_id INTEGER,
                FOREIGN KEY (nguoi_nhan_id) REFERENCES users(id),
                FOREIGN KEY (phan_cong_id) REFERENCES phan_cong_giang_day(id),
                FOREIGN KEY (nguoi_duyet_id) REFERENCES users(id)
            );
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS chi_tiet_phieu_xuat (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phieu_xuat_id INTEGER,
                vat_tu_id INTEGER,
                so_luong INTEGER NOT NULL,
                FOREIGN KEY (phieu_xuat_id) REFERENCES phieu_xuat_kho(id),
                FOREIGN KEY (vat_tu_id) REFERENCES vat_tu(id)
            );
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS phieu_mua_sam (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ngay_tao DATETIME DEFAULT CURRENT_TIMESTAMP,
                trang_thai TEXT DEFAULT 'hoan_thanh' CHECK(trang_thai IN ('hoan_thanh', 'da_huy')),
                nguoi_tao_id INTEGER,
                ghi_chu TEXT,
                giao_vien_id INTEGER,
                FOREIGN KEY (nguoi_tao_id) REFERENCES users(id),
                FOREIGN KEY (giao_vien_id) REFERENCES users(id)
            );
        `);

        await client.execute(`
            CREATE TABLE IF NOT EXISTS chi_tiet_mua_sam (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phieu_mua_sam_id INTEGER,
                vat_tu_id INTEGER,
                so_luong_mua INTEGER NOT NULL,
                de_xuat_id INTEGER,
                FOREIGN KEY (phieu_mua_sam_id) REFERENCES phieu_mua_sam(id),
                FOREIGN KEY (vat_tu_id) REFERENCES vat_tu(id),
                FOREIGN KEY (de_xuat_id) REFERENCES de_xuat(id)
            );
        `);

        // Insert default admin user if not exists
        const adminCheck = await client.execute("SELECT id FROM users WHERE username = 'admin'");
        if (adminCheck.rows.length === 0) {
            console.log("Creating default admin user...");
            const bcrypt = await import('bcryptjs');
            const hash = await bcrypt.default.hash('123456', 10);

            await client.execute({
                sql: "INSERT INTO users (username, password, ho_ten, role) VALUES (?, ?, ?, ?)",
                args: ['admin', hash, 'Quản Trị Viên', 'admin']
            });
        }

        console.log("Turso database schema setup successfully!");

    } catch (e) {
        console.error("Setup failed:", e);
    }
}

run();
