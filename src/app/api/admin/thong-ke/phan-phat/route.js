import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

// Identical mathematical engine to ensure 1:1 calculation equivalence with core API
function distributeFairly(supply, demandsArray) {
    let items = demandsArray.map((it, i) => ({ ...it, index: i, got: 0 }));
    let remaining = supply;
    
    // PHASE 1: Guarantee 1 unit minimum for everyone if possible
    let sortedForBaseline = [...items].sort((a, b) => a.demand - b.demand || a.index - b.index);
    for (let i = 0; i < sortedForBaseline.length; i++) {
        if (remaining > 0 && sortedForBaseline[i].demand > 0) {
            sortedForBaseline[i].got += 1;
            remaining -= 1;
        }
    }
    
    if (remaining <= 0) return items;
    
    // PHASE 2: Distribute the rest proportionally (Hamilton Largest Remainder Method)
    let remainingDemands = items.map(it => Math.max(0, it.demand - it.got));
    let totalRemainingDemand = remainingDemands.reduce((a, b) => a + b, 0);
    
    if (totalRemainingDemand > 0) {
        let toDistribute = Math.min(remaining, totalRemainingDemand);
        let shares = items.map((it, i) => {
            let exact = (remainingDemands[i] / totalRemainingDemand) * toDistribute;
            let floor = Math.floor(exact);
            return { index: i, exact, floor, fraction: exact - floor };
        });
        
        shares.forEach(sh => {
            items[sh.index].got += sh.floor;
            toDistribute -= sh.floor;
        });
        
        if (toDistribute > 0) {
            let sortedByFraction = shares
                .filter(sh => items[sh.index].got < items[sh.index].demand)
                .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
            
            for (let j = 0; j < Math.round(toDistribute); j++) {
                if (j < sortedByFraction.length) {
                    items[sortedByFraction[j].index].got += 1;
                }
            }
        }
    }
    return items;
}

export async function GET(request) {
    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const ki_id = parseInt(searchParams.get('ki_id'));

        if (!ki_id) {
            return NextResponse.json({ error: 'Thiếu ki_id' }, { status: 400 });
        }

        // 1. Get ALL base materials in the semester with their supply stats
        const materialStatsResult = await db.execute({
            sql: `
                SELECT vt.id as vat_tu_id, vt.ten_vat_tu, vt.don_vi_tinh, vt.yeu_cau_ky_thuat, vt.so_luong_kho,
                       COALESCE((
                           SELECT SUM(pxct.so_luong)
                           FROM phieu_xuat_chi_tiet pxct
                           JOIN phieu_xuat px ON pxct.phieu_xuat_id = px.id
                           WHERE pxct.vat_tu_id = vt.id AND px.trang_thai = 'da_xuat'
                       ), 0) as total_da_xuat,
                       COALESCE((
                           SELECT SUM(pxct.so_luong)
                           FROM phieu_xuat_chi_tiet pxct
                           JOIN phieu_xuat px ON pxct.phieu_xuat_id = px.id
                           WHERE pxct.vat_tu_id = vt.id AND px.trang_thai IN ('cho_duyet', 'da_ky')
                       ), 0) as total_dang_ky
                FROM vat_tu vt
                WHERE vt.ki_id = ?
                ORDER BY vt.ten_vat_tu ASC
            `,
            args: [ki_id]
        });

        // 2. Get aggregated PROPOSALS PER TEACHER for absolute fair bidding entity alignment
        const proposalData = await db.execute({
            sql: `
                SELECT dxct.vat_tu_id, dx.giao_vien_id, gv.ho_ten, SUM(dxct.so_luong) as qty_propose
                FROM de_xuat_chi_tiet dxct
                JOIN de_xuat dx ON dxct.de_xuat_id = dx.id
                JOIN giao_vien gv ON dx.giao_vien_id = gv.id
                WHERE dx.ki_id = ? AND dx.trang_thai IN ('da_nop', 'duyet', 'dang_lam')
                GROUP BY dxct.vat_tu_id, dx.giao_vien_id
            `,
            args: [ki_id]
        });

        // 3. Get aggregated EXPORTS (actual + pending) per teacher, per material
        const exportData = await db.execute({
            sql: `
                SELECT pxct.vat_tu_id, px.giao_vien_id,
                       SUM(CASE WHEN px.trang_thai = 'da_xuat' THEN pxct.so_luong ELSE 0 END) as qty_actual,
                       SUM(CASE WHEN px.trang_thai IN ('cho_duyet', 'da_ky') THEN pxct.so_luong ELSE 0 END) as qty_pending
                FROM phieu_xuat_chi_tiet pxct
                JOIN phieu_xuat px ON pxct.phieu_xuat_id = px.id
                WHERE px.ki_id = ? AND px.trang_thai != 'tu_choi'
                GROUP BY pxct.vat_tu_id, px.giao_vien_id
            `,
            args: [ki_id]
        });

        // Mapping process
        const teacherDetails = {}; // map: { [vat_tu_id]: { [gv_id]: { ho_ten, propose, actual, pending } } }
        
        // a) Feed Proposals (NOW PRE-COLLAPSED BY TEACHER IN SQL)
        const proposalLookup = {};
        proposalData.rows.forEach(p => {
            proposalLookup[`${p.giao_vien_id}`] = p.ho_ten;

            if (!teacherDetails[p.vat_tu_id]) teacherDetails[p.vat_tu_id] = {};
            teacherDetails[p.vat_tu_id][p.giao_vien_id] = {
                gv_id: p.giao_vien_id,
                ho_ten: p.ho_ten,
                propose: p.qty_propose || 0,
                actual: 0,
                pending: 0,
                fair_quota: 0 
            };
        });

        // Pre-map raw demands purely by teacher entity for the distribution engine
        const materialDemandsRaw = {};
        proposalData.rows.forEach(p => {
            if (!materialDemandsRaw[p.vat_tu_id]) materialDemandsRaw[p.vat_tu_id] = [];
            materialDemandsRaw[p.vat_tu_id].push({
                gv_id: p.giao_vien_id,
                demand: p.qty_propose || 0
            });
        });

        // b) Feed Exports
        // Make sure teachers exist in map if they exported without proposals? (unlikely but safe)
        // We fetch names for them just in case too.
        const knownGVs = {};
        proposalData.rows.forEach(p => { knownGVs[p.giao_vien_id] = p.ho_ten; });

        exportData.rows.forEach(e => {
            if (!teacherDetails[e.vat_tu_id]) teacherDetails[e.vat_tu_id] = {};
            if (!teacherDetails[e.vat_tu_id][e.giao_vien_id]) {
                teacherDetails[e.vat_tu_id][e.giao_vien_id] = {
                    gv_id: e.giao_vien_id,
                    ho_ten: knownGVs[e.giao_vien_id] || `GV #${e.giao_vien_id}`,
                    propose: 0,
                    actual: 0,
                    pending: 0,
                    fair_quota: 0
                };
            }
            teacherDetails[e.vat_tu_id][e.giao_vien_id].actual = e.qty_actual || 0;
            teacherDetails[e.vat_tu_id][e.giao_vien_id].pending = e.qty_pending || 0;
        });

        // Need a final cleanup to map Teacher IDs correctly if names are missing from Proposals
        // Let's run a fallback fetch if any teacher is unnamed.
        const missingGvIds = [];
        Object.values(teacherDetails).forEach(vtMap => {
            Object.values(vtMap).forEach(entry => {
                if (entry.ho_ten.startsWith('GV #')) missingGvIds.push(entry.gv_id);
            });
        });

        if (missingGvIds.length > 0) {
            const resolvedGvs = await db.execute(`SELECT id, ho_ten FROM giao_vien WHERE id IN (${Array.from(new Set(missingGvIds)).join(',')})`);
            const nameMap = {};
            resolvedGvs.rows.forEach(g => nameMap[g.id] = g.ho_ten);
            Object.values(teacherDetails).forEach(vtMap => {
                Object.values(vtMap).forEach(entry => {
                    if (nameMap[entry.gv_id]) entry.ho_ten = nameMap[entry.gv_id];
                });
            });
        }

        // Construct final report items and INJECT Computed Quotas
        const finalStats = materialStatsResult.rows.map(vt => {
            const totalSupply = vt.so_luong_kho + vt.total_da_xuat;
            const demandArray = materialDemandsRaw[vt.vat_tu_id] || [];
            
            // Compute absolute exact discrete math allocations
            const distributed = distributeFairly(totalSupply, demandArray);
            
            // Apply pre-computed outputs back into the final teacher objects (directly mapped 1:1)
            const teachersMap = teacherDetails[vt.vat_tu_id] || {};
            distributed.forEach(res => {
                if (teachersMap[res.gv_id]) {
                    teachersMap[res.gv_id].fair_quota = res.got;
                }
            });

            const teacherArray = Object.values(teachersMap);
            const totalProposed = teacherArray.reduce((sum, t) => sum + t.propose, 0);
            
            return {
                ...vt,
                total_supply: totalSupply,
                total_proposed: totalProposed,
                ratio: totalProposed > 0 ? Math.min(1, totalSupply / totalProposed) : 1,
                teachers: teacherArray.sort((a, b) => b.propose - a.propose)
            };
        }).filter(item => item.total_proposed > 0 || item.total_da_xuat > 0 || item.total_dang_ky > 0);

        return NextResponse.json(finalStats);

    } catch (error) {
        console.error('API Phan Phat error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
