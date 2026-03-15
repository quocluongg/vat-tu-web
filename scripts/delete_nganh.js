
import { createClient } from '@libsql/client/web';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function performDeletion() {
    const ids = [5, 6, 7]; // CNTT, Kinh tế, Kỹ thuật
    
    console.log(`🚀 Starting deletion for major IDs: ${ids.join(', ')}`);

    try {
        // 1. Delete materials (vat_tu) linked to these majors
        // Note: de_xuat_chi_tiet has ON DELETE CASCADE for vat_tu_id, so it will clean up automatically.
        const delMaterials = await db.execute({
            sql: "DELETE FROM vat_tu WHERE nganh_id IN (?, ?, ?)",
            args: ids
        });
        console.log(`✅ Deleted ${delMaterials.rowsAffected} related materials.`);

        // 2. Delete training systems (he_dao_tao)
        // Schema has ON DELETE CASCADE from nganh to he_dao_tao, 
        // but deleting them explicitly first is safer if we want to be sure.
        const delHes = await db.execute({
            sql: "DELETE FROM he_dao_tao WHERE nganh_id IN (?, ?, ?)",
            args: ids
        });
        console.log(`✅ Deleted ${delHes.rowsAffected} linked training systems.`);

        // 3. Delete the majors themselves
        const delMajors = await db.execute({
            sql: "DELETE FROM nganh WHERE id IN (?, ?, ?)",
            args: ids
        });
        console.log(`✅ Deleted ${delMajors.rowsAffected} majors.`);

        console.log('\n✨ Database cleanup complete.');
    } catch (error) {
        console.error('❌ Deletion failed:', error);
    }
}

performDeletion().catch(console.error);
