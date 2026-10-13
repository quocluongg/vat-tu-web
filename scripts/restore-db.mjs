#!/usr/bin/env node
/**
 * Khôi phục database Turso từ file backup JSON.
 *
 * ⚠️ NGUY HIỂM: xóa dữ liệu hiện có và chèn lại theo backup.
 *
 * Usage:
 *   node scripts/restore-db.mjs data/backups/backup-xxx.json           # hỏi xác nhận
 *   node scripts/restore-db.mjs data/backups/backup-xxx.json --yes     # không hỏi
 *   node scripts/restore-db.mjs file.json --tables vat_tu,ki_hoc      # chỉ 1 số bảng
 */
import { createClient } from '@libsql/client/web';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnv() {
    const envPath = resolve(ROOT, '.env.local');
    if (!existsSync(envPath)) return;
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
        if (!line || line.trim().startsWith('#')) continue;
        const i = line.indexOf('=');
        if (i > 0) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
}

// Thứ tự FK an toàn: bảng cha trước, bảng con sau
const TABLE_ORDER = [
    'users', 'nganh', 'he_dao_tao', 'giao_vien', 'ki_hoc', 'mon_hoc', 'lop',
    'phan_cong', 'vat_tu', 'vat_tu_tam', 'de_xuat', 'de_xuat_chi_tiet',
    'mua_sam', 'bien_ban', 'phieu_xuat', 'phieu_xuat_chi_tiet',
];

function arg(name, fallback = null) {
    const i = process.argv.indexOf(name);
    return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function sqlEscape(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
    if (typeof v === 'boolean') return v ? '1' : '0';
    return `'${String(v).replace(/'/g, "''")}'`;
}

async function main() {
    const file = process.argv[2];
    if (!file || file.startsWith('--')) {
        console.error('Usage: node scripts/restore-db.mjs <backup.json> [--yes] [--tables a,b]');
        process.exit(1);
    }
    const backupPath = resolve(ROOT, file);
    if (!existsSync(backupPath)) {
        console.error('❌ Không tìm thấy file:', backupPath);
        process.exit(1);
    }

    loadEnv();
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) {
        console.error('❌ Thiếu TURSO_DATABASE_URL / TURSO_AUTH_TOKEN');
        process.exit(1);
    }

    const dump = JSON.parse(readFileSync(backupPath, 'utf8'));
    const meta = dump._meta || {};
    let tables = Object.keys(dump).filter(k => k !== '_meta');

    const only = arg('--tables');
    if (only) {
        const want = only.split(',').map(s => s.trim());
        tables = tables.filter(t => want.includes(t));
    }
    // Sắp theo thứ tự FK, bảng lạ đẩy cuối
    tables.sort((a, b) => {
        const ia = TABLE_ORDER.indexOf(a); const ib = TABLE_ORDER.indexOf(b);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });

    console.log('⚠️  RESTORE sẽ XÓA dữ liệu các bảng sau rồi chèn lại từ backup:');
    for (const t of tables) console.log(`   - ${t}: ${(dump[t] || []).length} rows`);
    console.log(`\n📄 Backup: ${backupPath}`);
    console.log(`🕐 Tạo lúc: ${meta.createdAt || 'không rõ'}`);

    if (!process.argv.includes('--yes')) {
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const ans = (await rl.question('\nGõ "RESTORE" để xác nhận (bất kỳ phím khác để hủy): ')).trim();
        rl.close();
        if (ans !== 'RESTORE') {
            console.log('❌ Đã hủy. Không thay đổi gì.');
            process.exit(0);
        }
    }

    const db = createClient({ url, authToken });
    const CHUNK = 400;
    let restored = 0;
    for (const t of tables) {
        const rows = dump[t] || [];
        try {
            const stmts = [];
            for (const row of rows) {
                const cols = Object.keys(row);
                if (cols.length === 0) continue;
                const colSql = cols.map(c => `"${c}"`).join(', ');
                const valSql = cols.map(c => sqlEscape(row[c])).join(', ');
                stmts.push({ sql: `INSERT INTO "${t}" (${colSql}) VALUES (${valSql})` });
            }
            // DELETE + INSERT theo lô (HTTP libSQL không hỗ trợ BEGIN/COMMIT tương tác)
            await db.batch([{ sql: `DELETE FROM "${t}"` }, ...stmts.slice(0, CHUNK)], 'write');
            for (let i = CHUNK; i < stmts.length; i += CHUNK) {
                await db.batch(stmts.slice(i, i + CHUNK), 'write');
            }
            console.log(`  ✅ ${t}: ${rows.length} rows`);
            restored += rows.length;
        } catch (err) {
            console.error(`  ❌ ${t}: ${err.message} — (chạy lại restore để ghi tiếp bảng này)`);
        }
    }
    console.log(`\n✅ Restore xong: ${restored} rows / ${tables.length} bảng`);
}

main().catch(err => {
    console.error('❌ Lỗi restore:', err.message);
    process.exit(1);
});
