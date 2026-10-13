#!/usr/bin/env node
/**
 * Backup toàn bộ database Turso → data/backups/backup-<timestamp>.json
 *
 * Usage:
 *   node scripts/backup-db.mjs                    # backup mặc định
 *   node scripts/backup-db.mjs --out my.json      # chỉ định file output
 *   node scripts/backup-db.mjs --tables vat_tu,ki_hoc   # backup 1 số bảng
 */
import { createClient } from '@libsql/client/web';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

function arg(name, fallback = null) {
    const i = process.argv.indexOf(name);
    return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
    loadEnv();
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) {
        console.error('❌ Thiếu TURSO_DATABASE_URL / TURSO_AUTH_TOKEN (kiểm tra .env.local)');
        process.exit(1);
    }
    const db = createClient({ url, authToken });

    // Liệt kê bảng thực tế (an toàn với SQLite/ Turso)
    const tablesRes = await db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' ORDER BY name"
    );
    let tables = tablesRes.rows.map(r => r.name);
    const only = arg('--tables');
    if (only) {
        const want = only.split(',').map(s => s.trim());
        tables = tables.filter(t => want.includes(t));
        if (tables.length === 0) {
            console.error('❌ Không khớp bảng nào:', only);
            process.exit(1);
        }
    }

    const dump = {
        _meta: {
            createdAt: new Date().toISOString(),
            source: url.replace(/libsql:\/\/([^:]+):[^@]*@/, 'libsql://$1:***@'),
            tables: {},
        },
    };

    let totalRows = 0;
    for (const t of tables) {
        const res = await db.execute(`SELECT * FROM "${t}"`);
        // libsql trả BigInt ở lastInsertRowid — rows thuần JSON-safe
        const rows = res.rows.map(r => ({ ...r }));
        dump[t] = rows;
        dump._meta.tables[t] = rows.length;
        totalRows += rows.length;
        console.log(`  • ${t}: ${rows.length} rows`);
    }

    const outDir = resolve(ROOT, 'data', 'backups');
    mkdirSync(outDir, { recursive: true });
    const outPath = arg('--out')
        ? resolve(ROOT, arg('--out'))
        : resolve(outDir, `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

    writeFileSync(outPath, JSON.stringify(dump), 'utf8');
    console.log(`\n✅ Backup xong: ${totalRows} rows / ${tables.length} bảng`);
    console.log(`📄 ${outPath}`);
    console.log('💡 Copy file này ra Downloads/máy bạn để phòng trường hợp khôi phục.');
}

main().catch(err => {
    console.error('❌ Lỗi backup:', err.message);
    process.exit(1);
});
