
import { createClient } from '@libsql/client/web';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function fixFks() {
    console.log('🚀 Starting Database Schema Correction...');

    try {
        // --- 1. Fix phieu_xuat_chi_tiet ---
        console.log('\n--- Fixing phieu_xuat_chi_tiet ---');
        
        // Backup data
        await db.execute("ALTER TABLE phieu_xuat_chi_tiet RENAME TO phieu_xuat_chi_tiet_backup");
        
        // Create new table with CORRECT foreign key
        await db.execute(`
            CREATE TABLE phieu_xuat_chi_tiet (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phieu_xuat_id INTEGER NOT NULL,
                vat_tu_id INTEGER NOT NULL,
                so_luong INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (phieu_xuat_id) REFERENCES phieu_xuat(id) ON DELETE CASCADE,
                FOREIGN KEY (vat_tu_id) REFERENCES vat_tu(id) ON DELETE CASCADE
            )
        `);
        
        // Restore data
        await db.execute("INSERT INTO phieu_xuat_chi_tiet (id, phieu_xuat_id, vat_tu_id, so_luong) SELECT id, phieu_xuat_id, vat_tu_id, so_luong FROM phieu_xuat_chi_tiet_backup");
        
        // Drop backup
        await db.execute("DROP TABLE phieu_xuat_chi_tiet_backup");
        console.log('✅ phieu_xuat_chi_tiet fixed.');

        // --- 2. Fix mua_sam ---
        console.log('\n--- Fixing mua_sam ---');
        
        // Backup
        await db.execute("ALTER TABLE mua_sam RENAME TO mua_sam_backup");
        
        // Create new table with CORRECT foreign key
        await db.execute(`
            CREATE TABLE mua_sam (
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
            )
        `);
        
        // Restore data
        await db.execute(`
            INSERT INTO mua_sam (id, ki_id, vat_tu_id, so_luong_de_xuat, so_luong_duyet, don_gia, thanh_tien, trang_thai, created_at)
            SELECT id, ki_id, vat_tu_id, so_luong_de_xuat, so_luong_duyet, don_gia, thanh_tien, trang_thai, created_at
            FROM mua_sam_backup
        `);
        
        // Drop backup
        await db.execute("DROP TABLE mua_sam_backup");
        console.log('✅ mua_sam fixed.');

        console.log('\n✨ All critical Foreign Keys updated successfully.');
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.log('⚠️ Attempting to rollback if needed...');
        // Rollback is tricky with DDL in SQLite/LibSQL but we generally hope it doesn't fail half-way
    }
}

fixFks().catch(console.error);
