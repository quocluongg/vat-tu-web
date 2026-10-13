#!/usr/bin/env node
/**
 * Tạo kỳ mới "chuẩn hóa" từ kỳ nguồn (mặc định ki 8), lấy Excel kiểm kê làm DANH SÁCH CHÍNH THỨC:
 *  - Vật tư ki nguồn match Excel (tên+quy cách+nganh) → copy sang kỳ mới
 *    (loai_vat_tu theo sheet "Vật tư X" / "Thiết bị X"; cột Ngành trống → đoán theo tên sheet)
 *  - Gộp duplicate cùng tên+quy cách trong CÙNG ngành + bản nganh-NULL "ảo" (giữ 1 bản/ngành)
 *  - Excel có nhưng ki nguồn CHƯA có → THÊM MỚI vào kỳ mới (nganh/loai đúng theo Excel)
 *  - Vật tư ki nguồn không có trong Excel → KHÔNG copy ("rác")
 *  - Copy vật tư tạm + đề xuất (remap sang bản chuẩn; dòng trỏ rác không có thay thế → bỏ) + phân công
 *  - Kỳ nguồn GIỮ NGUYÊN
 *
 * Mặc định DRY-RUN — thêm --apply để ghi DB.
 *
 * Usage:
 *   node scripts/tao-ki-moi-chuan-hoa.mjs                       # dry-run
 *   node scripts/tao-ki-moi-chuan-hoa.mjs --apply               # ghi DB
 *   node scripts/tao-ki-moi-chuan-hoa.mjs --ki 7 --apply
 *   node scripts/tao-ki-moi-chuan-hoa.mjs --ten "KỲ 2" --nam "2026 - 2027"
 */
import { createRequire } from 'module';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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
const normNoSpace = (s) => norm(s).replace(/[^a-z0-9]+/g, '');
const softQc = (s) => {
    const n = norm(s);
    return (n === '' || n === '—' || n === '-' || n === '–' || n === '?') ? '' : n.replace(/[^a-z0-9]+/g, '');
};

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
    const sourceKi = parseInt(arg('--ki', '8'));
    const tenKi = arg('--ten', 'KỲ 1 (2026 - 2027)');
    const namHoc = arg('--nam', '2026 - 2027');

    // ---- Excel chính thức ----
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

    const XLSX = require('xlsx');
    const wb = XLSX.readFile(excelPath);
    const byKey = new Map();       // key → { ten, qc, dvt, ton, loai, nganh }
    const keyLoais = new Map();    // key → Set(loai)
    for (const sheetName of wb.SheetNames) {
        const loai = loaiFromSheet(sheetName);
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' }).slice(9).filter(r => r[2]);
        for (const r of rows) {
            const ten = String(r[2]).trim();
            const qc = String(r[3] || '').trim();
            const nganhId = nganhFromRow(r[5], sheetName);
            const key = `${norm(ten)}|${norm(qc)}|${nganhId ?? 'null'}`;
            const tonRaw = Number(r[6]);
            const ton = Number.isFinite(tonRaw) ? Math.max(0, Math.floor(tonRaw)) : 0;
            if (!byKey.has(key)) byKey.set(key, { ten, qc, dvt: String(r[4] || '').trim(), ton, loai, nganhId });
            if (!keyLoais.has(key)) keyLoais.set(key, new Set());
            keyLoais.get(key).add(loai);
        }
    }
    for (const [k, ls] of keyLoais) if (ls.size > 1) byKey.get(k).loai = 'tieu_hao'; // conflict 2 sheet → ưu tiên tiêu hao

    // ---- Kỳ nguồn ----
    const kiCheck = await db.execute({ sql: 'SELECT * FROM ki_hoc WHERE id = ?', args: [sourceKi] });
    if (!kiCheck.rows.length) {
        console.error('❌ Kỳ nguồn không tồn tại:', sourceKi);
        process.exit(1);
    }
    const srcKi = kiCheck.rows[0];
    const dupKi = await db.execute({ sql: 'SELECT id FROM ki_hoc WHERE ten_ki = ? AND nam_hoc = ?', args: [tenKi, namHoc] });
    if (dupKi.rows.length) {
        console.error(`❌ Kỳ "${tenKi}" (${namHoc}) đã tồn tại (id ${dupKi.rows[0].id}) — đổi tên bằng --ten hoặc xóa kỳ cũ trước.`);
        process.exit(1);
    }

    console.log(`🎯 Kỳ nguồn:   #${srcKi.id} ${srcKi.ten_ki} (${srcKi.nam_hoc}) — ${srcKi.trang_thai}`);
    console.log(`🆕 Kỳ đích:    ${tenKi} (${namHoc}) — de_xuat`);
    console.log(`📄 Excel:      ${excelPath}`);
    console.log(`🔧 Mode:       ${apply ? 'APPLY (ghi DB)' : 'DRY-RUN (chỉ báo cáo)'}\n`);

    const srcVatTu = (await db.execute({ sql: 'SELECT * FROM vat_tu WHERE ki_id = ?', args: [sourceKi] })).rows;
    const byStrict = new Map(), byName = new Map(), byNameNs = new Map();
    for (const v of srcVatTu) {
        byStrict.set(`${norm(v.ten_vat_tu)}|${norm(v.yeu_cau_ky_thuat)}|${v.nganh_id ?? 'null'}`, v);
        const nk = `${norm(v.ten_vat_tu)}|${v.nganh_id ?? 'null'}`;
        if (!byName.has(nk)) byName.set(nk, []);
        byName.get(nk).push(v);
        const nn = normNoSpace(v.ten_vat_tu);
        if (!byNameNs.has(nn)) byNameNs.set(nn, []);
        byNameNs.get(nn).push(v);
    }

    // ---- De xuat ki nguon: dem su dung ----
    const usage = await db.execute({
        sql: `SELECT dxct.vat_tu_id, COUNT(*) so_dong FROM de_xuat_chi_tiet dxct
              JOIN de_xuat dx ON dx.id = dxct.de_xuat_id
              WHERE dx.ki_id = ? AND dxct.vat_tu_id IS NOT NULL GROUP BY dxct.vat_tu_id`,
        args: [sourceKi]
    });
    const usageMap = new Map(usage.rows.map(r => [r.vat_tu_id, r.so_dong]));

    // ---- Phân loại Excel key: match ki nguồn vs them moi ----
    const officialLoai = new Map(); // id_ki_nguon → loai (theo Excel)
    const officialHow = new Map();  // id → 'strict' | 'name' | 'review'
    const newItems = [];            // Excel key khong co trong ki nguon → them moi
    const qcCompat = (a, b) => {
        const qa = softQc(a), qb = softQc(b);
        return qa === qb || qa === '' || qb === '';
    };
    for (const [key, row] of byKey) {
        let ex = byStrict.get(key) || null;
        if (ex) {
            if (!officialHow.has(ex.id)) { officialLoai.set(ex.id, row.loai); officialHow.set(ex.id, 'strict'); }
            continue;
        }
        const parts = key.split('|');
        const nameKey = `${parts[0]}|${parts[2]}`;
        const cands = (byName.get(nameKey) || []).filter(c => qcCompat(c.yeu_cau_ky_thuat, row.qc));
        if (cands.length === 1) {
            if (!officialHow.has(cands[0].id)) { officialLoai.set(cands[0].id, row.loai); officialHow.set(cands[0].id, 'name'); }
        } else if (cands.length > 1) {
            for (const c of cands) if (!officialLoai.has(c.id)) { officialLoai.set(c.id, c.loai_vat_tu); officialHow.set(c.id, 'review'); }
        } else {
            newItems.push({ key, ...row });
        }
    }

    // ---- Gop duplicate ki nguon: cung ten + quycach ----
    // Giữ 1 bản per ngành KHÁC NHAU (mỗi ngành có kho riêng — không gộp chéo).
    // Bản nganh NULL là "ảo" (dòng Excel cột Ngành trống trước đây) → gộp vào bản ngành nhiều dữ liệu nhất.
    const groups = new Map();
    for (const id of officialLoai.keys()) {
        const v = srcVatTu.find(x => x.id === id);
        const k = `${norm(v.ten_vat_tu)}|${norm(v.yeu_cau_ky_thuat)}`;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(v);
    }
    const mergeRemoved = new Map(); // id_bị_gop → id_giữ
    const mergeList = [];
    const scoreOf = (v) => (usageMap.get(v.id) || 0) * 10 - (v.id % 100000) / 100000;
    for (const [, vs] of groups) {
        if (vs.length < 2) continue;
        const buckets = new Map();
        for (const v of vs) {
            const b = v.nganh_id ?? null;
            if (!buckets.has(b)) buckets.set(b, []);
            buckets.get(b).push(v);
        }
        const keeps = [];
        const bo = [];
        for (const [nganhId, items] of buckets) {
            if (nganhId === null) continue;
            const best = items.slice().sort((a, b) => scoreOf(b) - scoreOf(a))[0];
            keeps.push(best);
            for (const o of items) if (o.id !== best.id) { mergeRemoved.set(o.id, best.id); bo.push(o.id); }
        }
        const nulls = buckets.get(null) || [];
        if (nulls.length) {
            if (keeps.length) {
                const target = keeps.slice().sort((a, b) => (usageMap.get(b.id) || 0) - (usageMap.get(a.id) || 0))[0];
                for (const o of nulls) { mergeRemoved.set(o.id, target.id); bo.push(o.id); }
            } else {
                const best = nulls.slice().sort((a, b) => scoreOf(b) - scoreOf(a))[0];
                for (const o of nulls) if (o.id !== best.id) { mergeRemoved.set(o.id, best.id); bo.push(o.id); }
                keeps.push(best);
            }
        }
        if (bo.length) mergeList.push({ ten: keeps[0].ten_vat_tu, qc: keeps[0].yeu_cau_ky_thuat || '—', giu: keeps.map(x => `#${x.id}(n${x.nganh_id ?? 'chung'})`).join(', '), bo });
    }
    const keepIds = new Set([...officialLoai.keys()].filter(id => !mergeRemoved.has(id)));
    const racIds = new Set(srcVatTu.filter(v => !officialLoai.has(v.id)).map(v => v.id));

    // ---- Ke hoach remap chi tiet ----
    const keepOldByName = new Map(), keepOldByNameNs = new Map();
    for (const id of keepIds) {
        const v = srcVatTu.find(x => x.id === id);
        const nk = norm(v.ten_vat_tu);
        if (!keepOldByName.has(nk)) keepOldByName.set(nk, []);
        keepOldByName.get(nk).push({ kind: 'old', v });
        const nn = normNoSpace(v.ten_vat_tu);
        if (!keepOldByNameNs.has(nn)) keepOldByNameNs.set(nn, []);
        keepOldByNameNs.get(nn).push({ kind: 'old', v });
    }
    const newByName = new Map(), newByNameNs = new Map();
    for (const item of newItems) {
        const nk = norm(item.ten);
        if (!newByName.has(nk)) newByName.set(nk, []);
        newByName.get(nk).push({ kind: 'new', item });
        const nn = normNoSpace(item.ten);
        if (!newByNameNs.has(nn)) newByNameNs.set(nn, []);
        newByNameNs.get(nn).push({ kind: 'new', item });
    }
    function candOf(map, mapNs, nameNorm, nameNs) {
        const a = map.get(nameNorm) || [];
        const b = mapNs.get(nameNs) || [];
        const seen = new Set(a);
        return [...a, ...b.filter(x => !seen.has(x))];
    }
    function pickReplacement(rac) {
        const cands = candOf(keepOldByName, keepOldByNameNs, norm(rac.ten_vat_tu), normNoSpace(rac.ten_vat_tu))
            .concat(candOf(newByName, newByNameNs, norm(rac.ten_vat_tu), normNoSpace(rac.ten_vat_tu)));
        if (!cands.length) return null;
        const qcR = softQc(rac.yeu_cau_ky_thuat);
        const scored = cands.map(c => {
            const qcK = c.kind === 'old' ? softQc(c.v.yeu_cau_ky_thuat) : softQc(c.item.qc);
            const nganhK = c.kind === 'old' ? (c.v.nganh_id ?? null) : c.item.nganhId;
            let s = 0;
            if (nganhK === (rac.nganh_id ?? null)) s += 100; // ƯU TIÊN CÙNG NGÀNH
            if (qcR && qcK === qcR) s += 10;
            else if (!qcR || !qcK) s += 5;
            if (c.kind === 'old') s += 0.5 + Math.min(usageMap.get(c.v.id) || 0, 5) * 0.1;
            return { c, s };
        }).sort((a, b) => b.s - a.s);
        return scored[0].c;
    }

    const srcDx = (await db.execute({ sql: 'SELECT * FROM de_xuat WHERE ki_id = ?', args: [sourceKi] })).rows;
    const srcCt = (await db.execute({
        sql: `SELECT dxct.* FROM de_xuat_chi_tiet dxct JOIN de_xuat dx ON dx.id = dxct.de_xuat_id WHERE dx.ki_id = ? ORDER BY dxct.id`,
        args: [sourceKi]
    })).rows;

    let ctOld = 0, ctNew = 0, ctRemap = 0, ctBo = 0;
    const ctPlan = [];
    const ctBoList = [];
    for (const ct of srcCt) {
        let target = null; // {kind:'old'|'new', id|key}
        if (ct.vat_tu_id != null) {
            if (keepIds.has(ct.vat_tu_id)) { target = { kind: 'old', id: ct.vat_tu_id }; ctOld++; }
            else if (mergeRemoved.has(ct.vat_tu_id)) { target = { kind: 'old', id: mergeRemoved.get(ct.vat_tu_id) }; ctRemap++; }
            else if (racIds.has(ct.vat_tu_id)) {
                const rac = srcVatTu.find(v => v.id === ct.vat_tu_id);
                const rep = pickReplacement(rac);
                if (rep) {
                    target = rep.kind === 'old' ? { kind: 'old', id: rep.v.id } : { kind: 'new', key: rep.item.key };
                    ctRemap++;
                } else { ctBo++; ctBoList.push({ ct, rac }); continue; }
            }
        }
        ctPlan.push({ ...ct, target });
    }

    // ---- Bao cao ----
    const newPerNganh = {};
    for (const n of newItems) { const g = n.nganhId ?? 'null'; newPerNganh[g] = (newPerNganh[g] || 0) + 1; }
    console.log('══════ KẾ HOẠCH ══════');
    console.log(`Excel chính thức: ${byKey.size} mục`);
    console.log(`Vật tư kỳ ${sourceKi}: ${srcVatTu.length}`);
    const howStat = {}; for (const h of officialHow.values()) howStat[h] = (howStat[h] || 0) + 1;
    console.log(`  • Match Excel (copy):  ${officialLoai.size}`);
    console.log(`    - strict: ${howStat.strict || 0} | tên+ngành: ${howStat.name || 0} | review: ${howStat.review || 0}`);
    console.log(`  • Gộp duplicate:       ${mergeRemoved.size} bản bị gộp (${mergeList.length} nhóm)`);
    console.log(`  • Copy vật tư ki nguồn: ${keepIds.size}`);
    console.log(`  • Thêm mới từ Excel:   ${newItems.length} (theo ngành: ${JSON.stringify(newPerNganh)})`);
    console.log(`  • Rác (không Excel):   ${racIds.size} — KHÔNG copy`);
    console.log(`Vật tư tạm:   ${(await db.execute({ sql: 'SELECT COUNT(*) c FROM vat_tu_tam WHERE ki_id = ?', args: [sourceKi] })).rows[0].c} → copy`);
    console.log(`Đề xuất:      ${srcDx.length} → copy`);
    console.log(`  • Chi tiết: ${srcCt.length} dòng → giữ ${ctOld}, remap ${ctRemap}, BỎ ${ctBo}`);
    console.log(`Phân công:    ${(await db.execute({ sql: 'SELECT COUNT(*) c FROM phan_cong WHERE ki_id = ?', args: [sourceKi] })).rows[0].c} → copy`);

    if (mergeList.length) {
        console.log('\n— GỘP DUPLICATE —');
        for (const m of mergeList) console.log(`  ${m.ten} | ${m.qc} → giữ ${m.giu}, bỏ [${m.bo.join(', ')}]`);
    }
    if (newItems.length) {
        console.log('\n— THÊM MỚI TỪ EXCEL (chưa có ở kỳ nguồn) —');
        for (const n of newItems.slice(0, 25)) console.log(`  [${n.loai}] ${n.ten} | ${n.qc || '—'} | ${n.dvt || '—'} | nganh=${n.nganhId ?? 'chung'} | tồn=${n.ton}`);
        if (newItems.length > 25) console.log(`  … và ${newItems.length - 25} mục nữa`);
    }
    if (ctBoList.length) {
        console.log('\n— DÒNG ĐỀ XUẤT BỎ (rác, không có thay thế) —');
        for (const b of ctBoList.slice(0, 30)) console.log(`  dx#${b.ct.de_xuat_id} | ${b.rac.ten_vat_tu} (${b.rac.yeu_cau_ky_thuat || '—'}) | sl ${b.ct.so_luong}`);
        if (ctBoList.length > 30) console.log(`  … và ${ctBoList.length - 30} dòng nữa`);
    }

    if (!apply) {
        console.log('\n🔎 DRY-RUN — chưa ghi gì. Chạy lại với --apply để thực hiện.');
        return;
    }

    // ---- APPLY ----
    let newKiId = null;
    try {
        const rKi = await db.execute({
            sql: 'INSERT INTO ki_hoc (ten_ki, nam_hoc, ngay_bat_dau, ngay_ket_thuc, han_de_xuat, trang_thai) VALUES (?, ?, ?, ?, ?, ?)',
            args: [tenKi, namHoc, srcKi.ngay_bat_dau || null, srcKi.ngay_ket_thuc || null, srcKi.han_de_xuat || null, 'de_xuat']
        });
        newKiId = Number(rKi.lastInsertRowid);
        console.log(`\n🆕 Đã tạo kỳ #${newKiId} ${tenKi} (${namHoc})`);

        // 1. vat_tu copy ki nguon
        const keepArr = [...keepIds];
        const vtNew = new Map(); // old_id → new_id
        if (keepArr.length) {
            const rsVt = await db.batch(keepArr.map(id => {
                const v = srcVatTu.find(x => x.id === id);
                return {
                    sql: 'INSERT INTO vat_tu (ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho, ki_id, nganh_id, loai_vat_tu) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    args: [v.ten_vat_tu, v.yeu_cau_ky_thuat, v.don_vi_tinh, v.so_luong_kho || 0, newKiId, v.nganh_id ?? null, officialLoai.get(id) || v.loai_vat_tu]
                };
            }), 'write');
            keepArr.forEach((oldId, i) => vtNew.set(oldId, Number(rsVt[i].lastInsertRowid)));
        }
        // id gop → id moi cua ban giu
        for (const [oldId, keepId] of mergeRemoved) vtNew.set(oldId, vtNew.get(keepId));
        console.log(`✅ vat_tu (copy ki nguồn): ${keepArr.length} bản ghi`);

        // 2. vat_tu THEM MOI tu Excel
        const newKeyToId = new Map();
        if (newItems.length) {
            const rsNew = await db.batch(newItems.map(n => ({
                sql: 'INSERT INTO vat_tu (ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, so_luong_kho, ki_id, nganh_id, loai_vat_tu) VALUES (?, ?, ?, ?, ?, ?, ?)',
                args: [n.ten, n.qc, n.dvt, n.ton, newKiId, n.nganhId ?? null, n.loai]
            })), 'write');
            newItems.forEach((n, i) => newKeyToId.set(n.key, Number(rsNew[i].lastInsertRowid)));
            console.log(`✅ vat_tu (thêm mới từ Excel): ${newItems.length} bản ghi`);
        }

        // 3. vat_tu_tam
        const srcTam = (await db.execute({ sql: 'SELECT * FROM vat_tu_tam WHERE ki_id = ?', args: [sourceKi] })).rows;
        const tamNew = new Map();
        if (srcTam.length) {
            const rsTam = await db.batch(srcTam.map(t => ({
                sql: 'INSERT INTO vat_tu_tam (ten_vat_tu, yeu_cau_ky_thuat, don_vi_tinh, ki_id, giao_vien_id, trang_thai, nganh_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
                args: [t.ten_vat_tu, t.yeu_cau_ky_thuat, t.don_vi_tinh, newKiId, t.giao_vien_id, t.trang_thai, t.nganh_id ?? null]
            })), 'write');
            srcTam.forEach((t, i) => tamNew.set(t.id, Number(rsTam[i].lastInsertRowid)));
            console.log(`✅ vat_tu_tam: ${tamNew.size} bản ghi`);
        }

        // 4. de_xuat
        const dxNew = new Map();
        if (srcDx.length) {
            const rsDx = await db.batch(srcDx.map(d => ({
                sql: 'INSERT INTO de_xuat (giao_vien_id, ki_id, trang_thai, ghi_chu, ngay_nop, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                args: [d.giao_vien_id, newKiId, d.trang_thai, d.ghi_chu || null, d.ngay_nop || null, d.created_at || null]
            })), 'write');
            srcDx.forEach((d, i) => dxNew.set(d.id, Number(rsDx[i].lastInsertRowid)));
            console.log(`✅ de_xuat: ${dxNew.size} bản ghi`);
        }

        // 5. de_xuat_chi_tiet (remap)
        const ctStmts = [];
        for (const ct of ctPlan) {
            let vatTuId = null;
            if (ct.target) vatTuId = ct.target.kind === 'old' ? (vtNew.get(ct.target.id) ?? null) : (newKeyToId.get(ct.target.key) ?? null);
            const tamId = ct.vat_tu_tam_id != null ? (tamNew.get(ct.vat_tu_tam_id) ?? null) : null;
            ctStmts.push({
                sql: 'INSERT INTO de_xuat_chi_tiet (de_xuat_id, mon_hoc_id, lop_id, vat_tu_id, vat_tu_tam_id, so_luong, ghi_chu) VALUES (?, ?, ?, ?, ?, ?, ?)',
                args: [dxNew.get(ct.de_xuat_id), ct.mon_hoc_id, ct.lop_id, vatTuId, tamId, ct.so_luong, ct.ghi_chu || null]
            });
        }
        if (ctStmts.length) {
            await db.batch(ctStmts, 'write');
            console.log(`✅ de_xuat_chi_tiet: ${ctStmts.length} bản ghi (bỏ ${ctBo})`);
        }

        // 6. phan_cong
        const srcPc = (await db.execute({ sql: 'SELECT * FROM phan_cong WHERE ki_id = ?', args: [sourceKi] })).rows;
        if (srcPc.length) {
            await db.batch(srcPc.map(p => ({
                sql: 'INSERT INTO phan_cong (giao_vien_id, mon_hoc_id, lop_id, ki_id) VALUES (?, ?, ?, ?)',
                args: [p.giao_vien_id, p.mon_hoc_id, p.lop_id, newKiId]
            })), 'write');
            console.log(`✅ phan_cong: ${srcPc.length} bản ghi`);
        }

        // ---- Verify ----
        const vTong = await db.execute({ sql: 'SELECT COUNT(*) c, SUM(CASE WHEN loai_vat_tu = \'sua_che\' THEN 1 ELSE 0 END) sc FROM vat_tu WHERE ki_id = ?', args: [newKiId] });
        const vPerNganh = await db.execute({ sql: 'SELECT nganh_id, COUNT(*) c FROM vat_tu WHERE ki_id = ? GROUP BY nganh_id ORDER BY nganh_id', args: [newKiId] });
        const vCt = await db.execute({
            sql: `SELECT COUNT(*) c FROM de_xuat_chi_tiet dxct JOIN de_xuat dx ON dx.id = dxct.de_xuat_id
                  WHERE dx.ki_id = ? AND dxct.vat_tu_id IS NOT NULL
                    AND dxct.vat_tu_id NOT IN (SELECT id FROM vat_tu WHERE ki_id = ?)`,
            args: [newKiId, newKiId]
        });
        console.log('\n══════ VERIFY ══════');
        console.log(`vat_tu kỳ mới: ${vTong.rows[0].c} (sua_che: ${vTong.rows[0].sc ?? 0})`);
        console.log('Theo ngành:', vPerNganh.rows.map(r => `${r.nganh_id ?? 'chung'}=${r.c}`).join(' | '));
        console.log(`Chi tiết đề xuất trỏ ngoài danh mục: ${vCt.rows[0].c} (phải = 0)`);
        console.log(`\n🎉 XONG — kỳ mới #${newKiId}. Kỳ nguồn #${sourceKi} giữ nguyên.`);
    } catch (err) {
        console.error('\n❌ LỖI — đang rollback kỳ mới (nếu đã tạo)...');
        if (newKiId) {
            try { await db.execute({ sql: 'DELETE FROM ki_hoc WHERE id = ?', args: [newKiId] }); console.error('   Đã xóa kỳ mới (cascade).'); }
            catch (e) { console.error('   Không rollback được, kiểm tra thủ công:', e.message); }
        }
        console.error(err);
        process.exit(1);
    }
}

main().catch(err => { console.error(err); process.exit(1); });
