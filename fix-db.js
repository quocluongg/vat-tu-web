const { createClient } = require('@libsql/client');
const client = createClient({
    url: 'libsql://quanlyvattucaodang-quocluongg.aws-ap-northeast-1.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzI5MzAzNTAsImlkIjoiMDE5Y2NhZTAtMDMwMS03OTVlLTkzZTAtNWIzZDQ0NTVjY2Q0IiwicmlkIjoiMTk4NjE3YTYtN2NmMS00YWVlLWIxMjItNDliZjk4NmM0NWZhIn0.tUbDtEZwUdpJxIgcaTAIqe1DEGL-XW1WL0kb0wZHGysWwZrC3ZVlufLPOXrveGyr161uRhUjGgHs-n9_dnHPAg'
});

async function fix() {
    try {
        console.log("Renaming old table...");
        await client.execute('ALTER TABLE vat_tu RENAME TO vat_tu_old;');

        console.log("Creating new table with correct foreign key...");
        await client.execute(`
            CREATE TABLE vat_tu (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ten_vat_tu TEXT NOT NULL,
                yeu_cau_ky_thuat TEXT,
                don_vi_tinh TEXT NOT NULL,
                so_luong_kho INTEGER DEFAULT 0,
                ki_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                nganh_id INTEGER,
                FOREIGN KEY (ki_id) REFERENCES ki_hoc(id),
                FOREIGN KEY (nganh_id) REFERENCES nganh(id)
            );
        `);

        console.log("Copying data...");
        await client.execute(`
            INSERT INTO vat_tu (id, ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho, ki_id, created_at, nganh_id)
            SELECT id, ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho, ki_id, created_at, NULL
            FROM vat_tu_old;
        `);

        console.log("Checking if there are child tables depending on it... (de_xuat_chi_tiet, chi_tiet_phieu_xuat, etc)");
        // Since we cannot just drop vat_tu_old if it has foreign keys pointing to it, we need to check if PRAGMA foreign_keys is on. 
        // Turso/LibSQL by default doesn't enforce foreign keys across table rename and drop unless strict.

        await client.execute('DROP TABLE vat_tu_old;');
        console.log("Fixed!");
    } catch (err) {
        console.error(err);
    }
}
fix();
