#!/usr/bin/env node
/**
 * Cơ cấu lại vật tư kỳ mới theo Excel kiểm kê:
 *  - Gán vat_tu.loai_vat_tu ('tieu_hao' | 'sua_che') theo sheet "Vật tư X" / "Thiết bị X"
 *  - Thêm các mục mới (không khớp vật tư hiện có) vào kỳ đích
 *
 * Matching theo (tên + quy cách + ngành), KHÔNG theo Mã VT (Excel có ID sai lệch).
 * Mặc định DRY-RUN — thêm --apply để ghi vào DB.
 *
 * Usage:
 *   node scripts/import-ki-moi.mjs                        # dry-run kỳ 8
 *   node scripts/import-ki-moi.mjs --ki 8 --apply         # ghi DB
 *   node scripts/import-ki-moi.mjs --excel "path.xlsx"    # file khác
 */
import { createRequire } from 'module';
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client/web';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnv() {
    const p = resolve(ROOT, '.env.local');
    if (!existsSync(p)) return;
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
        if (!line || line.trim().startsWith('#')) continue;
        const i = line.indexOf('=');
        if (i > 0) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
}

function arg(name, fallback = null) {
    const i = process.argv.indexOf(name);
    return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const stripDiacritics = (s) => String(s == null ? '' : s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
const norm = (s) => stripDiacritics(s).trim().replace(/\s+/g, ' ').toLowerCase();

// Sheet name → ngành (dùng giá trị cột Ngành/Bộ môn nếu có, fallback theo tên sheet)
function nganhFromRow(rowNganh, sheetName) {
    const v = norm(rowNganh);
    if (v && v !== 'dung chung') {
        if (v.includes('dien cong nghiep')) return 1;
        if (v.includes('co dien tu')) return 3; // TRƯỚC 'dien tu' — "cơ điện tử" chứa "điện tử"
        if (v.includes('dien tu')) return 2;
        if (v.includes('may lanh') || v.includes('dieu hoa')) return 4;
    }
    // Fallback theo tên sheet khi cột Ngành trống — dòng nằm trong sheet "Vật tư/Thiết bị X" là của ngành X
    const s = norm(sheetName);
    if (s.includes('dien cong nghiep')) return 1;
    if (s.includes('co dien tu')) return 3;
    if (s.includes('dien tu')) return 2;
    if (s.includes('nhiet') || s.includes('lanh')) return 4;
    return null; // sheet "Dùng chung"
}

function loaiFromSheet(sheetName) {
    return norm(sheetName).startsWith('thiet bi') ? 'sua_che' : 'tieu_hao';
}

async function main() {
    loadEnv();
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || !authToken) {
        console.error('❌ Thiếu TURSO_DATABASE_URL / TURSO_AUTH_TOKEN');
        process.exit(1);
    }
    const db = createClient({ url, authToken });

    const apply = process.argv.includes('--apply');
    const targetKi = parseInt(arg('--ki', '8'));
    const excelPath = arg('--excel')
        ? resolve(ROOT, arg('--excel'))
        : (() => {
            const f = readdirSync(resolve(ROOT, 'data')).find(n =>
                n.toLowerCase().endsWith('.xlsx') && !n.startsWith('~') && !n.startsWith('.~')
                && n.toUpperCase().includes('KI') && n.includes('(2)'));
            return f ? resolve(ROOT, 'data', f) : null;
        })();

    if (!excelPath || !existsSync(excelPath)) {
        console.error('❌ Không tìm thấy file Excel kiểm kê trong data/');
        process.exit(1);
    }

    const kiCheck = await db.execute({ sql: 'SELECT id, ten_ki, nam_hoc, trang_thai FROM ki_hoc WHERE id = ?', args: [targetKi] });
    if (kiCheck.rows.length === 0) {
        console.error('❌ Kỳ đích không tồn tại:', targetKi);
        process.exit(1);
    }
    const ki = kiCheck.rows[0];
    console.log(`🎯 Kỳ đích: #${ki.id} ${ki.ten_ki} (${ki.nam_hoc}) — ${ki.trang_thai}`);
    console.log(`📄 Excel: ${excelPath}`);
    console.log(`🔧 Mode: ${apply ? 'APPLY (ghi DB)' : 'DRY-RUN (chỉ báo cáo)'}\n`);

    // ---- Đọc Excel ----
    const XLSX = require('xlsx');
    const wb = XLSX.readFile(excelPath);
    const excelRows = [];
    const conflictsMap = new Map(); // key → Set(loai)

    for (const sheetName of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
        const dataRows = rows.slice(9).filter(r => r[2]); // cột C = tên vật tư
        const loai = loaiFromSheet(sheetName);
        for (const r of dataRows) {
            const ten = String(r[2]).trim();
            const qc = String(r[3] || '').trim();
            const dvt = String(r[4] || '').trim();
            const nganhId = nganhFromRow(r[5], sheetName);
            const tonRaw = r[6];
            const ton = Number(tonRaw) && Number.isFinite(Number(tonRaw)) ? Math.max(0, Math.floor(Number(tonRaw))) : 0;
            const id = r[1] !== '' && !isNaN(Number(r[1])) ? Number(r[1]) : null;
            const key = `${norm(ten)}|${norm(qc)}|${nganhId ?? 'null'}`;
            excelRows.push({ sheetName, loai, ten, qc, dvt, nganhId, ton, excelId: id, key });
            if (!conflictsMap.has(key)) conflictsMap.set(key, new Set());
            conflictsMap.get(key).add(loai);
        }
    }

    // Phát hiện conflict: cùng key xuất hiện ở cả 2 loại
    const conflicts = new Map();
    for (const [key, loais] of conflictsMap) {
        if (loais.size > 1) conflicts.set(key, 'tieu_hao'); // mặc định ưu tiên tiêu hao + đánh dấu
    }

    // Gộp theo key: nếu conflict → tieu_hao
    const byKey = new Map();
    for (const row of excelRows) {
        if (!byKey.has(row.key)) {
            byKey.set(row.key, { ...row, loai: conflicts.has(row.key) ? 'tieu_hao' : row.loai, sheets: [row.sheetName] });
        } else {
            byKey.get(row.key).sheets.push(row.sheetName);
        }
    }

    // ---- Đọc vật tư hiện có của kỳ đích ----
    const current = await db.execute({ sql: 'SELECT id, ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, nganh_id, loai_vat_tu, so_luong_kho FROM vat_tu WHERE ki_id = ?', args: [targetKi] });
    const currentByKey = new Map(); // strict: ten|qc|nganh
    const currentByName = new Map(); // ten|nganh → [items]
    for (const v of current.rows) {
        const strictKey = `${norm(v.ten_vat_tu)}|${norm(v.yeu_cau_ky_thuat)}|${v.nganh_id ?? 'null'}`;
        currentByKey.set(strictKey, v);
        const nameKey = `${norm(v.ten_vat_tu)}|${v.nganh_id ?? 'null'}`;
        if (!currentByName.has(nameKey)) currentByName.set(nameKey, []);
        currentByName.get(nameKey).push(v);
    }

    // ---- So khớp 2 pass ----
    // Pass 1: strict (tên + quy cách + ngành)
    // Pass 2: tên + ngành, chỉ khi ứng viên duy nhất và qc rỗng/hợp lý → tránh tạo trùng
    const toUpdate = []; // { id, ten, loaiCu, loaiMoi }
    const toInsert = []; // excel rows chưa có trong DB
    const review = []; // gần trùng — không tự quyết
    const unchanged = [];
    const conflictRows = [];
    const matchedDbIds = new Set();

    for (const [key, row] of byKey) {
        const isConflict = conflicts.has(key);
        let existing = currentByKey.get(key) || null;
        let matchType = existing ? 'strict' : null;

        if (!existing) {
            const nameKey = `${norm(row.ten)}|${row.nganhId ?? 'null'}`;
            const candidates = (currentByName.get(nameKey) || []).filter(c => !matchedDbIds.has(c.id));
            if (candidates.length === 1) {
                const c = candidates[0];
                const qcDb = norm(c.yeu_cau_ky_thuat);
                const qcXl = norm(row.qc);
                if (qcDb === qcXl || qcDb === '' || qcXl === '') {
                    existing = c;
                    matchType = 'name-only';
                }
            } else if (candidates.length > 1) {
                review.push({ ten: row.ten, qc: row.qc, loai: row.loai, reason: `${candidates.length} ứng viên trùng tên trong DB (qc khác nhau)` });
                continue;
            }
        }

        if (existing) {
            matchedDbIds.add(existing.id);
            if (existing.loai_vat_tu !== row.loai) {
                toUpdate.push({ id: existing.id, ten: existing.ten_vat_tu, loaiCu: existing.loai_vat_tu, loaiMoi: row.loai, isConflict, matchType, sheet: row.sheets.join(' + ') });
            } else {
                unchanged.push(existing.id);
            }
        } else {
            toInsert.push({ ...row, isConflict });
        }
        if (isConflict) {
            conflictRows.push({ ten: row.ten, qc: row.qc, sheets: row.sheets, resolved: 'tieu_hao' });
        }
    }

    // Vật tư DB không match Excel nào → không đụng (vẫn giữ nguyên trong DB)
    const unmatchedDb = current.rows.filter(v => !matchedDbIds.has(v.id));

    // ---- Báo cáo ----
    console.log('══════ KẾT QUẢ SO KHỚP ══════');
    console.log(`Excel: ${excelRows.length} dòng → ${byKey.size} mục duy nhất (sau gộp key)`);
    console.log(`DB kỳ ${targetKi}: ${current.rows.length} vật tư hiện có`);
    console.log(`  • Gán nhãn (đổi loại): ${toUpdate.length}`);
    console.log(`  • Giữ nguyên:          ${unchanged.length}`);
    console.log(`  • Thêm mới:            ${toInsert.length}`);
    console.log(`  • Review (gần trùng):  ${review.length}`);
    console.log(`  • DB không có trong Excel: ${unmatchedDb.length} (giữ nguyên, chưa gán loại)`);
    console.log(`  • Conflict 2 sheet:    ${conflictRows.length} (mặc định → tiêu hao)`);

    if (toUpdate.length > 0) {
        console.log('\n— CẬP NHẬT LOẠI —');
        for (const u of toUpdate.slice(0, 30)) {
            console.log(`  #${u.id} ${u.ten}: ${u.loaiCu} → ${u.loaiMoi}${u.isConflict ? ' ⚠️ conflict' : ''}`);
        }
        if (toUpdate.length > 30) console.log(`  … và ${toUpdate.length - 30} mục nữa`);
    }
    if (toInsert.length > 0) {
        console.log('\n— THÊM MỚI —');
        for (const n of toInsert.slice(0, 30)) {
            console.log(`  [${n.loai}] ${n.ten} | ${n.qc || '—'} | ${n.dvt || '—'} | nganh=${n.nganhId ?? 'chung'} | tồn=${n.ton}${n.isConflict ? ' ⚠️' : ''}`);
        }
        if (toInsert.length > 30) console.log(`  … và ${toInsert.length - 30} mục nữa`);
    }
    if (conflictRows.length > 0) {
        console.log('\n— ⚠️ CONFLICT (cùng tên+quy cách ở cả sheet Vật tư lẫn Thiết bị) —');
        for (const c of conflictRows) {
            console.log(`  ${c.ten} | ${c.qc || '—'} | sheets: ${c.sheets.join(', ')} → resolves as tieu_hao`);
        }
        console.log('  (Kiểm tra lại và sửa tay bằng form admin / UPDATE nếu cần)');
    }
    if (review.length > 0) {
        console.log('\n— 🔎 REVIEW (trùng tên nhưng nhiều ứng viên — KHÔNG tự xử lý) —');
        for (const rv of review.slice(0, 20)) {
            console.log(`  [${rv.loai}] ${rv.ten} | ${rv.qc || '—'} — ${rv.reason}`);
        }
        if (review.length > 20) console.log(`  … và ${review.length - 20} mục nữa`);
    }

    // ---- Ghi report file ----
    const reportDir = resolve(ROOT, 'docs');
    mkdirSync(reportDir, { recursive: true });
    const reportPath = resolve(reportDir, `import-report-ki${targetKi}-${new Date().toISOString().slice(0, 10)}.md`);
    const md = [
        `# Báo cáo import phân loại vật tư — Kỳ #${targetKi} ${ki.ten_ki}`,
        ``,
        `- Thời gian: ${new Date().toISOString()}`,
        `- Excel: \`${excelPath}\``,
        `- Mode: **${apply ? 'APPLY' : 'DRY-RUN'}**`,
        ``,
        `| | Số lượng |`,
        `|---|---|`,
        `| Dòng Excel / mục duy nhất | ${excelRows.length} / ${byKey.size} |`,
        `| Vật tư hiện có kỳ ${targetKi} | ${current.rows.length} |`,
        `| Đổi loại | ${toUpdate.length} |`,
        `| Giữ nguyên | ${unchanged.length} |`,
        `| Thêm mới | ${toInsert.length} |`,
        `| Review (gần trùng) | ${review.length} |`,
        `| DB không có trong Excel | ${unmatchedDb.length} |`,
        `| Conflict | ${conflictRows.length} |`,
        ``,
        `## Conflict (mặc định → tiêu hao, cần review tay)`,
        ...(conflictRows.length ? conflictRows.map(c => `- **${c.ten}** ${c.qc ? `(${c.qc})` : ''} — sheets: ${c.sheets.join(', ')}`) : ['_(không có)_']),
        ``,
        `## Review — gần trùng, cần xem tay`,
        ...(review.length ? review.map(rv => `- [${rv.loai}] **${rv.ten}** ${rv.qc ? `(${rv.qc})` : ''} — ${rv.reason}`) : ['_(không có)_']),
        ``,
        `## Chi tiết đổi loại`,
        ...(toUpdate.length ? toUpdate.map(u => `- #${u.id} **${u.ten}**: ${u.loaiCu} → ${u.loaiMoi}${u.isConflict ? ' ⚠️' : ''}${u.matchType === 'name-only' ? ' _(khớp theo tên)_ ' : ''}`) : ['_(không có)_']),
        ``,
        `## Chi tiết thêm mới`,
        ...(toInsert.length ? toInsert.map(n => `- [${n.loai}] **${n.ten}** — ${n.qc || '—'} — ${n.dvt || '—'} — nganh=${n.nganhId ?? 'chung'} — tồn=${n.ton}${n.isConflict ? ' ⚠️' : ''}`) : ['_(không có)_']),
        ``,
        `## DB có nhưng không khớp Excel (giữ nguyên, LOẠI MẶC ĐỊNH tieu_hao)`,
        ...(unmatchedDb.length ? unmatchedDb.map(v => `- #${v.id} **${v.ten_vat_tu}** ${v.yeu_cau_ky_thuat ? `(${v.yeu_cau_ky_thuat})` : ''} — nganh=${v.nganh_id ?? 'chung'}`) : ['_(không có)_']),
    ].join('\n');
    writeFileSync(reportPath, md, 'utf8');
    console.log(`\n📄 Report: ${reportPath}`);

    // ---- Ghi DB ----
    if (!apply) {
        console.log('\n🔎 DRY-RUN — chưa ghi gì. Chạy lại với --apply để thực hiện.');
        return;
    }

    let updated = 0, inserted = 0, skippedDup = 0;

    // Re-check duplicate trước khi ghi (read-only, an toàn ngoài batch)
    const insertsFinal = [];
    for (const n of toInsert) {
        const dup = await db.execute({
            sql: `SELECT id FROM vat_tu WHERE ki_id = ? AND LOWER(TRIM(REPLACE(ten_vat_tu, '  ', ' '))) = ? AND IFNULL(LOWER(TRIM(yeu_cau_ky_thuat)), '') = ? AND IFNULL(nganh_id, -1) = IFNULL(?, -1)`,
            args: [targetKi, norm(n.ten), norm(n.qc), n.nganhId],
        });
        if (dup.rows.length > 0) { skippedDup++; continue; }
        insertsFinal.push(n);
    }

    // Ghi atomic một lần — HTTP libSQL không hỗ trợ BEGIN/COMMIT tương tác
    const stmts = [
        ...toUpdate.map(u => ({
            sql: 'UPDATE vat_tu SET loai_vat_tu = ? WHERE id = ?',
            args: [u.loaiMoi, u.id],
        })),
        ...insertsFinal.map(n => ({
            sql: 'INSERT INTO vat_tu (ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho, ki_id, nganh_id, loai_vat_tu) VALUES (?, ?, ?, ?, ?, ?, ?)',
            args: [n.ten, n.qc || null, n.dvt || null, n.ton, targetKi, n.nganhId, n.loai],
        })),
    ];
    updated = toUpdate.length;
    inserted = insertsFinal.length;

    try {
        if (stmts.length > 0) await db.batch(stmts, 'write');
    } catch (err) {
        console.error('❌ Lỗi khi ghi — batch đã tự rollback:', err.message);
        process.exit(1);
    }

    console.log(`\n✅ APPLY xong: ${updated} cập nhật, ${inserted} thêm mới, ${skippedDup} bỏ qua (trùng)`);
    console.log('💡 Backup gần nhất trong data/backups/ — dùng scripts/restore-db.mjs nếu cần rollback.');
}

main().catch(err => {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
});
