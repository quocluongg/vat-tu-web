
import { createClient } from '@libsql/client/web';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function checkNganhDaoTao() {
    console.log('--- NGANH_DAO_TAO ---');
    const rows = await db.execute("SELECT * FROM nganh_dao_tao");
    console.log(JSON.stringify(rows.rows, null, 2));
}

checkNganhDaoTao().catch(console.error);
