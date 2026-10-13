#!/usr/bin/env node

/**
 * 🚀 SCRIPT TEST TOÀN BỘ QUY TRÌNH VẬT TƯ
 * 
 * Quy trình:
 * 1. Tạo dữ liệu test (50 vật tư mỗi ngành)
 * 2. Tạo đề xuất (proposal)
 * 3. Tạo mua sắm (purchase) 
 * 4. Cập nhật kho (warehouse)
 * 5. Tạo phiếu xuất (export)
 */

const API_URL = 'http://localhost:3001';

// ============ UTILS ============
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(msg, type = 'info') {
    const now = new Date().toLocaleTimeString('vi-VN');
    const prefix = {
        success: `${colors.green}✅${colors.reset}`,
        error: `${colors.red}❌${colors.reset}`,
        warn: `${colors.yellow}⚠️ ${colors.reset}`,
        info: `${colors.blue}ℹ️ ${colors.reset}`,
        step: `${colors.cyan}→${colors.reset}`,
    }[type] || `${colors.blue}•${colors.reset}`;
    
    console.log(`[${now}] ${prefix} ${msg}`);
}

async function api(method, endpoint, body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(body);
    }
    
    const res = await fetch(`${API_URL}${endpoint}`, options);
    const data = await res.json();
    
    if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
}

// ============ DỮ LIỆU TEST ============
const testData = {
    nganhs: [
        { ten_nganh: 'Công nghệ thông tin' },
        { ten_nganh: 'Kinh tế' },
        { ten_nganh: 'Kỹ thuật' },
    ],
    moHocs: [
        { ten_mon: 'Toán học' },
        { ten_mon: 'Vật lý' },
        { ten_mon: 'Hóa học' },
        { ten_mon: 'Tiếng Anh' },
        { ten_mon: 'Lập trình' },
    ],
    giaViens: [
        { ho_ten: 'Nguyễn Văn A', email: 'nguyenvana@example.com', so_dien_thoai: '0901234567' },
        { ho_ten: 'Trần Thị B', email: 'tranthib@example.com', so_dien_thoai: '0901234568' },
        { ho_ten: 'Lê Minh C', email: 'leminc@example.com', so_dien_thoai: '0901234569' },
        { ho_ten: 'Phạm Hồng D', email: 'phamhongd@example.com', so_dien_thoai: '0901234570' },
        { ho_ten: 'Đặng Văn E', email: 'dangvane@example.com', so_dien_thoai: '0901234571' },
    ],
    lops: [
        { ten_lop: 'A1', si_so: 30, loai_he: 'C' },
        { ten_lop: 'A2', si_so: 32, loai_he: 'C' },
        { ten_lop: 'B1', si_so: 28, loai_he: 'T' },
        { ten_lop: 'B2', si_so: 31, loai_he: 'T' },
        { ten_lop: 'C1', si_so: 25, loai_he: 'L' },
    ],
};

// ============ MAIN TEST ============
async function main() {
    console.log(`\n${colors.bright}${colors.cyan}════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}  🚀 BẮT ĐẦU TEST TOÀN BỘ QUY TRÌNH VẬT TƯ${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════${colors.reset}\n`);

    let stats = {
        nganhs: 0,
        moHocs: 0,
        giaViens: 0,
        lops: 0,
        vatTus: 0,
        phanCongs: 0,
        deXuats: 0,
        deXuatChiTiets: 0,
        muaSams: 0,
        warehouseUpdates: 0,
        phieuXuats: 0,
        errors: [],
    };

    try {
        // STEP 1: Tạo dữ liệu cơ bản
        log('📋 STEP 1: TẠO DỮ LIỆU CƠ BẢN', 'step');
        
        // Ngành
        log('Tạo ngành học...', 'info');
        const nganhs = [];
        for (const n of testData.nganhs) {
            try {
                const result = await api('POST', '/api/nganh', n);
                nganhs.push(result);
                stats.nganhs++;
            } catch (e) {
                log(`Lỗi tạo ngành ${n.ten_nganh}: ${e.message}`, 'warn');
            }
        }
        log(`✓ Tạo ${stats.nganhs} ngành`, 'success');

        // Môn học
        log('Tạo môn học...', 'info');
        const moHocs = [];
        for (const m of testData.moHocs) {
            try {
                const result = await api('POST', '/api/mon-hoc', m);
                moHocs.push(result);
                stats.moHocs++;
            } catch (e) {
                log(`Lỗi tạo môn ${m.ten_mon}: ${e.message}`, 'warn');
            }
        }
        log(`✓ Tạo ${stats.moHocs} môn học`, 'success');

        // Giáo viên
        log('Tạo giáo viên...', 'info');
        const giaViens = [];
        for (const gv of testData.giaViens) {
            try {
                const result = await api('POST', '/api/giao-vien', gv);
                giaViens.push(result);
                stats.giaViens++;
            } catch (e) {
                log(`Lỗi tạo GV ${gv.ho_ten}: ${e.message}`, 'warn');
            }
        }
        log(`✓ Tạo ${stats.giaViens} giáo viên`, 'success');

        // Lớp học
        log('Tạo lớp học...', 'info');
        const lops = [];
        for (const l of testData.lops) {
            try {
                const result = await api('POST', '/api/lop', l);
                lops.push(result);
                stats.lops++;
            } catch (e) {
                log(`Lỗi tạo lớp ${l.ten_lop}: ${e.message}`, 'warn');
            }
        }
        log(`✓ Tạo ${stats.lops} lớp học`, 'success');

        // Kỳ học (lấy kỳ hiện tại)
        log('Lấy kỳ học hiện tại...', 'info');
        const kisResult = await api('GET', '/api/ki-hoc');
        const currentKi = kisResult[0];
        if (!currentKi) throw new Error('Không có kỳ học nào!');
        log(`✓ Kỳ hiện tại: ${currentKi.ten_ki} (ID: ${currentKi.id})`, 'success');

        // STEP 2: Tạo vật tư (50 mỗi ngành)
        log('\n📦 STEP 2: TẠO VẬT TƯ (50 MỖI NGÀNH)', 'step');
        const vatTus = [];
        const vatTuNameTemplates = [
            'Bút chì HB', 'Bút bi xanh', 'Bút bi đỏ', 'Giấy A4', 'Giấy A3',
            'Binder', 'Kẹp giấy', 'Thướt', 'Compa', 'Đèn LED',
            'Pin AA', 'Pin AAA', 'Dây cáp USB', 'Chuột máy tính', 'Bàn phím',
            'Ổ cứng USB', 'Card SD', 'Adapter', 'Cáp HDMI', 'Màn hình',
            'Loa', 'Tai nghe', 'Webcam', 'Microphone', 'Bộ speaker',
            'Máy in', 'Máy quét', 'Sạc laptop', 'Bộ sạc nhanh', 'Power bank',
            'Quạt điều hòa', 'Bóng đèn LED', 'Ổn áp điện', 'Ắc quy', 'Dây điện',
            'Ổ cắm điện', 'Công tắc', 'Cầu chì', 'Relay', 'Tụ điện',
            'Điện trở', 'IC chip', 'LED RGB', 'Cảm biến', 'Động cơ',
            'Động cơ servo', 'Máy bơm', 'Van', 'Ống PVC', 'Keo dán',
            'Sơn', 'Dung dịch làm sạch', 'Khăn lau', 'Chổi lau', 'Xô',
        ];

        for (const ngành of nganhs) {
            const vatTuCount = Math.min(50, vatTuNameTemplates.length);
            for (let i = 0; i < vatTuCount; i++) {
                try {
                    const vt = {
                        ten_vat_tu: `${vatTuNameTemplates[i]} - ${ngành.ten_nganh}`,
                        don_vi_tinh: ['cái', 'hộp', 'chiếc', 'bộ', 'cuộn'][Math.floor(Math.random() * 5)],
                        yeu_cau_ky_thuat: 'Chất lượng tốt',
                        so_luong_kho: Math.floor(Math.random() * 100) + 50,
                        ki_id: currentKi.id,
                        nganh_id: ngành.id,
                    };
                    const result = await api('POST', '/api/vat-tu', vt);
                    vatTus.push(result);
                    stats.vatTus++;
                } catch (e) {
                    log(`Lỗi tạo VT: ${e.message}`, 'warn');
                    stats.errors.push(e.message);
                }
            }
            log(`✓ Tạo ${Math.min(50, vatTuNameTemplates.length)} vật tư cho ${ngành.ten_nganh}`, 'success');
        }
        log(`✓ Tổng ${stats.vatTus} vật tư`, 'success');

        // STEP 3: Tạo phân công
        log('\n👨‍🏫 STEP 3: TẠO PHÂN CÔNG GV', 'step');
        const phanCongs = [];
        for (const gv of giaViens) {
            for (const mon of moHocs) {
                for (const lop of lops) {
                    try {
                        const pc = {
                            giao_vien_id: gv.id,
                            ki_id: currentKi.id,
                            mon_hoc_id: mon.id,
                            lop_id: lop.id,
                        };
                        const result = await api('POST', '/api/phan-cong', pc);
                        phanCongs.push(result);
                        stats.phanCongs++;
                    } catch (e) {
                        // Có thể lỗi nếu đã tồn tại
                    }
                }
            }
        }
        log(`✓ Tạo ${stats.phanCongs} phân công`, 'success');

        // STEP 4: Tạo đề xuất
        log('\n📝 STEP 4: TẠO ĐỀ XUẤT (PROPOSAL)', 'step');
        const deXuatIds = [];
        for (let i = 0; i < Math.min(3, giaViens.length); i++) {
            const gv = giaViens[i];
            try {
                // Lấy chi tiết phân công của GV này
                const pcDetail = phanCongs.filter(pc => pc.giao_vien_id === gv.id).slice(0, 3);
                
                if (pcDetail.length === 0) {
                    log(`GV ${gv.ho_ten} không có phân công`, 'warn');
                    continue;
                }

                const chiTiet = [];
                for (const pc of pcDetail) {
                    // Chọn 5-8 vật tư random cho mỗi lớp/môn
                    const numVt = Math.floor(Math.random() * 4) + 5;
                    const selectedVt = vatTus.sort(() => Math.random() - 0.5).slice(0, numVt);
                    
                    for (const vt of selectedVt) {
                        chiTiet.push({
                            mon_hoc_id: pc.mon_hoc_id,
                            lop_id: pc.lop_id,
                            vat_tu_id: vt.id,
                            so_luong: Math.floor(Math.random() * 20) + 10,
                            ghi_chu: 'Test',
                        });
                        stats.deXuatChiTiets++;
                    }
                }

                const dxPayload = {
                    giao_vien_id: gv.id,
                    ki_id: currentKi.id,
                    chi_tiet: chiTiet,
                };

                const dxResult = await api('POST', '/api/de-xuat', dxPayload);
                deXuatIds.push(dxResult.id);
                stats.deXuats++;
                log(`✓ Tạo đề xuất cho ${gv.ho_ten} (${chiTiet.length} items)`, 'success');
            } catch (e) {
                log(`Lỗi tạo đề xuất cho ${gv.ho_ten}: ${e.message}`, 'error');
                stats.errors.push(e.message);
            }
        }

        // STEP 5: Tạo mua sắm
        log('\n🛒 STEP 5: TẠO MUA SẮM (PURCHASE)', 'step');
        for (const dxId of deXuatIds) {
            try {
                // Lấy chi tiết đề xuất
                const dxDetail = await api('GET', `/api/de-xuat?id=${dxId}`);
                
                // Chương trình 100% và 50%
                for (const mode of [100, 50]) {
                    const chiTiet = dxDetail.chi_tiet.map(ct => ({
                        vat_tu_id: ct.vat_tu_id,
                        so_luong: Math.floor(ct.so_luong * mode / 100),
                        mo_ta: `${mode}% đề xuất`,
                    })).filter(ct => ct.so_luong > 0);

                    if (chiTiet.length === 0) continue;

                    const msPayload = {
                        giao_vien_id: dxDetail.giao_vien_id,
                        ki_id: dxDetail.ki_id,
                        chi_tiet: chiTiet,
                    };

                    const msResult = await api('POST', '/api/mua-sam', msPayload);
                    stats.muaSams++;
                    log(`✓ Tạo mua sắm ${mode}% (${chiTiet.length} items)`, 'success');
                }
            } catch (e) {
                log(`Lỗi tạo mua sắm: ${e.message}`, 'error');
                stats.errors.push(e.message);
            }
        }

        // STEP 6: Cập nhật kho
        log('\n📦 STEP 6: CẬP NHẬT KHO (WAREHOUSE)', 'step');
        for (const dxId of deXuatIds) {
            try {
                const dxDetail = await api('GET', `/api/de-xuat?id=${dxId}`);
                
                for (const ct of dxDetail.chi_tiet) {
                    const newQty = Math.floor(Math.random() * 50) + 20;
                    await api('PUT', '/api/vat-tu', {
                        id: ct.vat_tu_id,
                        ten_vat_tu: ct.ten_vat_tu,
                        don_vi_tinh: ct.don_vi_tinh,
                        so_luong_kho: newQty,
                        yeu_cau_ky_thuat: ct.yeu_cau_ky_thuat,
                    });
                    stats.warehouseUpdates++;
                }
                log(`✓ Cập nhật kho cho đề xuất ${dxId}`, 'success');
            } catch (e) {
                log(`Lỗi cập nhật kho: ${e.message}`, 'error');
                stats.errors.push(e.message);
            }
        }

        // STEP 7: Tạo phiếu xuất
        log('\n📤 STEP 7: TẠO PHIẾU XUẤT (EXPORT)', 'step');
        for (let i = 0; i < Math.min(2, deXuatIds.length); i++) {
            try {
                const dxId = deXuatIds[i];
                const dxDetail = await api('GET', `/api/de-xuat?id=${dxId}`);
                
                // Group by môn học
                const groupedByMon = {};
                dxDetail.chi_tiet.forEach(ct => {
                    if (!groupedByMon[ct.mon_hoc_id]) {
                        groupedByMon[ct.mon_hoc_id] = [];
                    }
                    groupedByMon[ct.mon_hoc_id].push(ct);
                });

                // Tạo 1 phiếu cho mỗi môn
                let monCount = 0;
                for (const [monId, items] of Object.entries(groupedByMon)) {
                    const chiTiet = items
                        .filter(() => Math.random() > 0.3) // Chỉ chọn 70%
                        .map(ct => ({
                            vat_tu_id: ct.vat_tu_id,
                            so_luong: Math.floor(ct.so_luong * (Math.random() * 0.5 + 0.5)),
                        }))
                        .filter(ct => ct.so_luong > 0);

                    if (chiTiet.length === 0) continue;

                    const pxPayload = {
                        giao_vien_id: dxDetail.giao_vien_id,
                        ki_id: currentKi.id,
                        mon_hoc_id: parseInt(monId),
                        chi_tiet: chiTiet,
                    };

                    await api('POST', '/api/phieu-xuat', pxPayload);
                    stats.phieuXuats++;
                    monCount++;
                }
                log(`✓ Tạo ${monCount} phiếu xuất cho GV (${dxDetail.giao_vien_id})`, 'success');
            } catch (e) {
                log(`Lỗi tạo phiếu xuất: ${e.message}`, 'error');
                stats.errors.push(e.message);
            }
        }

        // SUMMARY
        console.log(`\n${colors.bright}${colors.green}════════════════════════════════════════${colors.reset}`);
        console.log(`${colors.bright}  ✅ TEST HOÀN THÀNH${colors.reset}`);
        console.log(`${colors.bright}${colors.green}════════════════════════════════════════${colors.reset}\n`);

        console.log(`${colors.bright}📊 KẾT QUẢ:${colors.reset}`);
        console.log(`  • Ngành: ${stats.nganhs}`);
        console.log(`  • Môn học: ${stats.moHocs}`);
        console.log(`  • Giáo viên: ${stats.giaViens}`);
        console.log(`  • Lớp học: ${stats.lops}`);
        console.log(`  • Vật tư: ${stats.vatTus}`);
        console.log(`  • Phân công: ${stats.phanCongs}`);
        console.log(`  • Đề xuất: ${stats.deXuats}`);
        console.log(`  • Chi tiết đề xuất: ${stats.deXuatChiTiets}`);
        console.log(`  • Mua sắm: ${stats.muaSams}`);
        console.log(`  • Cập nhật kho: ${stats.warehouseUpdates}`);
        console.log(`  • Phiếu xuất: ${stats.phieuXuats}`);
        
        if (stats.errors.length > 0) {
            console.log(`\n${colors.red}⚠️  LỖI (${stats.errors.length}):${colors.reset}`);
            stats.errors.slice(0, 5).forEach(err => {
                console.log(`  • ${err}`);
            });
            if (stats.errors.length > 5) {
                console.log(`  ... và ${stats.errors.length - 5} lỗi khác`);
            }
        }

        console.log(`\n${colors.bright}🎉 Quy trình test xong! Kiểm tra ở http://localhost:3001${colors.reset}\n`);

    } catch (err) {
        log(`FATAL ERROR: ${err.message}`, 'error');
        process.exit(1);
    }
}

// RUN
main().catch(err => {
    log(`Unexpected error: ${err.message}`, 'error');
    process.exit(1);
});
