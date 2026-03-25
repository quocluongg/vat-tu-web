/**
 * Migration: Add nganh_id column to vat_tu_tam table
 * Run: node scripts/add_nganh_id_to_vat_tu_tam.js
 */

import { createClient } from '@libsql/client/web';
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

async function migrate() {
    console.log('🔄 Thêm cột nganh_id vào bảng vat_tu_tam...\n');

    try {
        await db.execute("ALTER TABLE vat_tu_tam ADD COLUMN nganh_id INTEGER REFERENCES nganh(id) ON DELETE SET NULL");
        console.log('✅ Đã thêm cột nganh_id vào vat_tu_tam');
    } catch (e) {
        if (e.message.includes('duplicate column')) {
            console.log('⏭️  Cột nganh_id đã tồn tại, bỏ qua.');
        } else {
            throw e;
        }
    }

    console.log('\n✅ Migration hoàn thành!');
}

migrate()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Migration thất bại:', error.message);
        process.exit(1);
    });
