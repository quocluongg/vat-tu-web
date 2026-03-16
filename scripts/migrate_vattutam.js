/**
 * Temporary migration to add vat_tu_tam and modify de_xuat_chi_tiet
 */
import { createClient } from '@libsql/client/web';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function migrate() {
    console.log('🔄 Updating database schema...');

    // 1. Create vat_tu_tam
    await db.execute(`
        CREATE TABLE IF NOT EXISTS vat_tu_tam (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ten_vat_tu TEXT NOT NULL,
            yeu_cau_ky_thuat TEXT,
            don_vi_tinh TEXT NOT NULL,
            ki_id INTEGER NOT NULL,
            giao_vien_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ki_id) REFERENCES ki_hoc(id) ON DELETE CASCADE,
            FOREIGN KEY (giao_vien_id) REFERENCES giao_vien(id) ON DELETE CASCADE
        )
    `);

    // 2. Modify de_xuat_chi_tiet is slightly complex in SQLite (no DROP CONSTRAINT/SET NULL easily for existing col)
    // However, we just need to add vat_tu_tam_id and allow vat_tu_id to be NULL.
    // In SQLite, to change a column to nullable, we usually have to recreate the table.
    // BUT 'vat_tu_id INTEGER NOT NULL' can be relaxed by renaming table, creating new, copying.
    
    // Check if vat_tu_tam_id already exists to avoid errors on re-run
    const columns = await db.execute("PRAGMA table_info(de_xuat_chi_tiet)");
    const hasTamId = columns.rows.some(r => r.name === 'vat_tu_tam_id');

    if (!hasTamId) {
        console.log('Adding vat_tu_tam_id to de_xuat_chi_tiet...');
        
        // Strategy: Rename old, create new with relaxed constraints, copy data, drop old
        await db.execute("ALTER TABLE de_xuat_chi_tiet RENAME TO de_xuat_chi_tiet_old");
        
        await db.execute(`
            CREATE TABLE de_xuat_chi_tiet (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                de_xuat_id INTEGER NOT NULL,
                mon_hoc_id INTEGER NOT NULL,
                lop_id INTEGER NOT NULL DEFAULT 0,
                vat_tu_id INTEGER, -- Now Nullable
                vat_tu_tam_id INTEGER, -- Added
                so_luong INTEGER NOT NULL DEFAULT 0,
                ghi_chu TEXT,
                FOREIGN KEY (de_xuat_id) REFERENCES de_xuat(id) ON DELETE CASCADE,
                FOREIGN KEY (mon_hoc_id) REFERENCES mon_hoc(id) ON DELETE CASCADE,
                FOREIGN KEY (lop_id) REFERENCES lop(id) ON DELETE CASCADE,
                FOREIGN KEY (vat_tu_id) REFERENCES vat_tu(id) ON DELETE CASCADE,
                FOREIGN KEY (vat_tu_tam_id) REFERENCES vat_tu_tam(id) ON DELETE SET NULL
            )
        `);

        await db.execute(`
            INSERT INTO de_xuat_chi_tiet (id, de_xuat_id, mon_hoc_id, lop_id, vat_tu_id, so_luong, ghi_chu)
            SELECT id, de_xuat_id, mon_hoc_id, lop_id, vat_tu_id, so_luong, ghi_chu FROM de_xuat_chi_tiet_old
        `);

        await db.execute("DROP TABLE de_xuat_chi_tiet_old");
    }

    console.log('✅ Database updated successfully');
}

migrate().catch(console.error);
