import { createClient } from '@libsql/client/web';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function fix() {
    try {
        console.log("Adding trang_thai to vat_tu_tam...");
        await db.execute("ALTER TABLE vat_tu_tam ADD COLUMN trang_thai TEXT DEFAULT 'cho_duyet' CHECK(trang_thai IN ('cho_duyet', 'da_duyet', 'tu_choi'))");
        console.log("Done!");
    } catch (e) {
        console.error("Column might already exist or error:", e.message);
    }
}

fix();
