'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, User, BookOpen, FileOutput, Plus, Minus, Send, CheckCircle,
    Download, Package, AlertCircle, ChevronDown, Clock, Inbox,
    Wrench, ClipboardList, Search, Users, Printer, FileText,
} from 'lucide-react';
import { buildBienBanHTML, buildPhieuXuatSuaChuaHTML } from '@/lib/printBienBan';

export default function PhieuXuatPublicPage() {
    const [kiHocs, setKiHocs] = useState([]);
    const [giaoViens, setGiaoViens] = useState([]);
    const [selectedKi, setSelectedKi] = useState('');
    const [selectedGv, setSelectedGv] = useState('');
    const [deXuats, setDeXuats] = useState([]);
    const [phieuXuats, setPhieuXuats] = useState([]);
    const [deXuatDetail, setDeXuatDetail] = useState(null);
    const [mode, setMode] = useState('view'); // view, create
    const [exportItems, setExportItems] = useState({}); // { "lop_id-vat_tu_id": soLuong }
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [createdCount, setCreatedCount] = useState(0);
    const [error, setError] = useState('');
    const [expandedClass, setExpandedClass] = useState({});
    const [selectedMon, setSelectedMon] = useState('');
    const [exportedMap, setExportedMap] = useState({});
    const [initLoading, setInitLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);
    const [showAllSlips, setShowAllSlips] = useState(false);
    const [toast, setToast] = useState(null); // { type, message }
    // Repair (sửa chữa) tab
    const [activeTab, setActiveTab] = useState('tieu_hao'); // tieu_hao | sua_che
    const [repairItems, setRepairItems] = useState({}); // { chi_tiet_id: soLuong }
    const [repairConditions, setRepairConditions] = useState({}); // { chi_tiet_id: tinh_trang }
    const [repairTinhHinh, setRepairTinhHinh] = useState(''); // C/1 Tình hình (tùy chọn, trống = tự ghép từ tình trạng từng vật tư)
    const [bienBans, setBienBans] = useState([]);
    const [creatingBB, setCreatingBB] = useState(false);
    const [printingBB, setPrintingBB] = useState(false);
    const [printingPX, setPrintingPX] = useState(false);
    const [repairFilter, setRepairFilter] = useState('');

    // Auto-dismiss toast
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3200);
        return () => clearTimeout(t);
    }, [toast]);

    useEffect(() => {
        Promise.all([
            fetch('/api/ki-hoc').then(r => r.json()),
            fetch('/api/giao-vien').then(r => r.json()),
        ]).then(([kiData, gvData]) => {
            const activeKis = kiData.filter(k => k.trang_thai === 'hoat_dong');
            setKiHocs(activeKis);
            if (activeKis.length > 0) setSelectedKi(activeKis[0].id.toString());
            setGiaoViens(gvData);
            setInitLoading(false);
        }).catch(() => setInitLoading(false));
    }, []);

    useEffect(() => {
        if (selectedKi && selectedGv) {
            fetch(`/api/bien-ban?ki_id=${selectedKi}&giao_vien_id=${selectedGv}`)
                .then(r => r.json())
                .then(d => setBienBans(Array.isArray(d) ? d : []))
                .catch(() => setBienBans([]));
        }
    }, [selectedKi, selectedGv, activeTab]);

    useEffect(() => {
        if (selectedKi && selectedGv) {
            setDataLoading(true);
            Promise.all([
                fetch(`/api/de-xuat?ki_id=${selectedKi}&giao_vien_id=${selectedGv}`).then(r => r.json()),
                fetch(`/api/phieu-xuat?ki_id=${selectedKi}&giao_vien_id=${selectedGv}`).then(r => r.json()),
            ]).then(([dxData, pxData]) => {
                setDeXuats(dxData);
                setPhieuXuats(pxData);
                if (dxData.length > 0) {
                    return fetch(`/api/de-xuat?id=${dxData[0].id}`)
                        .then(r => r.json())
                        .then(detail => {
                            setDeXuatDetail(detail);
                            if (detail?.chi_tiet?.length > 0) {
                                const firstMon = detail.chi_tiet[0].mon_hoc_id;
                                setSelectedMon(prev => (
                                    prev && detail.chi_tiet.some(ct => ct.mon_hoc_id === parseInt(prev))
                                ) ? prev : firstMon.toString());
                            } else {
                                setSelectedMon('');
                            }
                        });
                } else {
                    setDeXuatDetail(null);
                    setSelectedMon('');
                }
            }).catch(() => {
                setDeXuatDetail(null);
                setDeXuats([]);
                setPhieuXuats([]);
            }).finally(() => setDataLoading(false));
            setMode('view');
            setExportItems({});
            setSubmitted(false);
            setExportedMap({});
            setShowAllSlips(false);
        }
    }, [selectedKi, selectedGv]);

    useEffect(() => {
        if (selectedKi && selectedGv && selectedMon) {
            fetch(`/api/phieu-xuat?ki_id=${selectedKi}&giao_vien_id=${selectedGv}&mon_hoc_id=${selectedMon}&summary=true`)
                .then(r => r.json())
                .then(setExportedMap)
                .catch(() => setExportedMap({}));
        }
    }, [selectedKi, selectedGv, selectedMon]);

    const handleCreatePhieu = () => {
        setMode('create');
        setExportItems({});
        setRepairItems({});
        setRepairConditions({});
        setRepairTinhHinh('');
        setActiveTab('tieu_hao');
        setSubmitted(false);
        setError('');
        setExpandedClass({});
    };

    const toggleClass = (lopId) => {
        setExpandedClass(prev => ({ ...prev, [lopId]: !prev[lopId] }));
    };

    const updateExportQty = (lopId, vtId, delta, maxQty) => {
        const key = `${lopId}-${vtId}`;
        setExportItems(prev => {
            const current = prev[key] || 0;
            const newVal = Math.max(0, Math.min(current + delta, maxQty));
            if (newVal === 0) {
                const { [key]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [key]: newVal };
        });
    };

    const setExportQty = (lopId, vtId, value, maxQty) => {
        const key = `${lopId}-${vtId}`;
        const val = value === '' ? '' : Math.min(parseInt(value) || 0, maxQty);
        setExportItems(prev => {
            return { ...prev, [key]: val };
        });
    };

    const handleQtyBlur = (lopId, vtId) => {
        const key = `${lopId}-${vtId}`;
        setExportItems(prev => {
            const val = prev[key];
            if (val === '' || val === 0) {
                const { [key]: _, ...rest } = prev;
                return rest;
            }
            return prev;
        });
    };

    // ---- Repair (sửa chữa) helpers (vật tư từ đề xuất đã nộp, key = chi_tiet id) ----
    const updateRepairQty = (ctId, value, maxQty) => {
        const val = value === '' ? '' : Math.max(0, Math.min(parseInt(value) || 0, maxQty));
        setRepairItems(prev => {
            if (val === '' || val === 0) {
                const { [ctId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [ctId]: val };
        });
    };

    const handleCreateRepairBB = async () => {
        const selected = repairEntries
            .map(([ctId, qty]) => ({ ct: repairRowById[ctId], qty: parseInt(qty) || 0 }))
            .filter(s => s.ct && s.qty > 0);
        if (selected.length === 0) {
            setToast({ type: 'error', message: 'Chọn ít nhất một vật tư sửa chữa' });
            return;
        }
        const missing = selected.find(s => !(repairConditions[s.ct.id] || '').trim());
        if (missing) {
            setToast({ type: 'error', message: `Nhập tình trạng cho vật tư "${missing.ct.ten_vat_tu || 'đã chọn'}"` });
            return;
        }
        const tenThietBi = [...new Set(selected.map(s => (s.ct.ten_vat_tu || '').trim()).filter(Boolean))].join(', ')
            || 'Vật tư sửa chữa';
        setCreatingBB(true);
        try {
            const lopNames = [...new Set(selected.map(s => s.ct.ten_lop).filter(Boolean))].join(', ');
            // C/1 Tình hình: ưu tiên nội dung giáo viên nhập, trống thì tự ghép từ tình trạng từng vật tư
            const tomTatTinhTrang = selected.map(s =>
                `- ${s.ct.ten_vat_tu || 'Vật tư'} (${s.qty} ${s.ct.don_vi_tinh || ''}): ${(repairConditions[s.ct.id] || '').trim()}`
            ).join('\n');
            const tinhHinh = (repairTinhHinh || '').trim() || tomTatTinhTrang;
            const tenGV = giaoViens.find(g => g.id === parseInt(selectedGv))?.ho_ten
                || deXuatDetail?.ten_gv || '';
            const thanhPhanAuto = [
                tenGV ? `- Ông (bà) ${tenGV} — Người lập biên bản` : null,
                `- Ông (bà) .............................................. Chức vụ: Đại diện Khoa Điện – Điện tử`,
                tenGV ? `- Ông (bà) ${tenGV} — Người sử dụng` : `- Ông (bà) .............................................. Chức vụ: Người sử dụng`,
            ].filter(Boolean).join('\n');
            const res = await fetch('/api/bien-ban', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ngay_lap: new Date().toISOString().slice(0, 10),
                    gio_lap: new Date().toTimeString().slice(0, 5),
                    ki_id: parseInt(selectedKi),
                    giao_vien_id: parseInt(selectedGv),
                    thanh_phan: thanhPhanAuto,
                    ten_thiet_bi: tenThietBi,
                    phong_khoa: 'Khoa Điện – Điện tử',
                    dia_diem: null,
                    nguoi_su_dung: tenGV || null,
                    nguoi_phat_hien: tenGV || null,
                    hien_tuong_hu_hong: tomTatTinhTrang,
                    tinh_hinh: tinhHinh,
                    ghi_chu: lopNames ? `Lớp: ${lopNames}` : null,
                    vat_tu_list: selected.map(s => ({
                        ten: s.ct.ten_vat_tu || '',
                        dvt: s.ct.don_vi_tinh || '',
                        so_luong: s.qty,
                        don_gia: 0,
                        ghi_chu: (repairConditions[s.ct.id] || '').trim(),
                    })),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setToast({ type: 'error', message: data.error || 'Lỗi lập biên bản' });
                return;
            }
            const bbRes = await fetch(`/api/bien-ban?ki_id=${selectedKi}&giao_vien_id=${selectedGv}`);
            const bbList = await bbRes.json();
            setBienBans(Array.isArray(bbList) ? bbList : []);
            setRepairItems({});
            setRepairConditions({});
            setRepairTinhHinh('');
            setToast({ type: 'success', message: `Đã lập biên bản #${data.id} — chờ quản lý duyệt` });
        } catch {
            setToast({ type: 'error', message: 'Không thể kết nối đến server' });
        }
        setCreatingBB(false);
    };

    const handlePrintBienBan = async (bbId) => {
        if (!bbId) return;
        setPrintingBB(true);
        try {
            const res = await fetch(`/api/bien-ban?id=${bbId}`);
            const bb = await res.json();
            if (bb.error) {
                setToast({ type: 'error', message: bb.error });
                setPrintingBB(false);
                return;
            }
            const html = buildBienBanHTML(bb);
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                setToast({ type: 'error', message: 'Vui lòng cho phép popup để in biên bản' });
                setPrintingBB(false);
                return;
            }
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                try {
                    printWindow.print();
                } catch {
                    // Ignore print error
                }
            }, 300);
        } catch {
            setToast({ type: 'error', message: 'Không thể tải biên bản để in' });
        }
        setPrintingBB(false);
    };

    const handlePrintPhieuXuatSuaChua = async (bbId) => {
        if (!bbId) return;
        setPrintingPX(true);
        try {
            const bb = await fetch(`/api/bien-ban?id=${bbId}`).then(r => r.json());
            if (bb.error) {
                setToast({ type: 'error', message: bb.error });
                setPrintingPX(false);
                return;
            }
            const html = buildPhieuXuatSuaChuaHTML(bb);
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                setToast({ type: 'error', message: 'Vui lòng cho phép popup để in phiếu xuất' });
                setPrintingPX(false);
                return;
            }
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                try {
                    printWindow.print();
                } catch {
                    // Ignore print error
                }
            }, 300);
        } catch {
            setToast({ type: 'error', message: 'Không thể tải phiếu xuất sửa chữa để in' });
        }
        setPrintingPX(false);
    };

    const handleSubmitPhieu = async () => {
        const hasTieuHao = Object.keys(exportItems).length > 0;

        if (!hasTieuHao) {
            setToast({ type: 'error', message: 'Vui lòng chọn ít nhất một vật tư' });
            return;
        }

        // Group by lop_id and mon_hoc_id for submission
        const groupedByLopAndMon = {};
        if (deXuatDetail && deXuatDetail.chi_tiet) {
            Object.entries(exportItems).forEach(([key, qty]) => {
                const [lopId, vtId] = key.split('-');
                const ct = deXuatDetail.chi_tiet.find(c => c.lop_id === parseInt(lopId) && c.vat_tu_id === parseInt(vtId));
                if (ct) {
                    const groupKey = `${ct.lop_id}-${ct.mon_hoc_id}`;
                    if (!groupedByLopAndMon[groupKey]) {
                        groupedByLopAndMon[groupKey] = {
                            lop_id: ct.lop_id,
                            mon_hoc_id: ct.mon_hoc_id,
                            items: {}
                        };
                    }
                    const vtIdKey = ct.vat_tu_id;
                    groupedByLopAndMon[groupKey].items[vtIdKey] = (groupedByLopAndMon[groupKey].items[vtIdKey] || 0) + parseInt(qty);
                }
            });
        }

        setSubmitting(true);
        setError('');

        try {
            let totalCreated = 0;
            // Create one phieu for each class and subject combination (tiêu hao)
            for (const group of Object.values(groupedByLopAndMon)) {
                const chiTiet = Object.entries(group.items).map(([vtId, soLuong]) => ({
                    vat_tu_id: parseInt(vtId),
                    so_luong: soLuong
                }));

                const res = await fetch('/api/phieu-xuat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        giao_vien_id: parseInt(selectedGv),
                        ki_id: parseInt(selectedKi),
                        mon_hoc_id: parseInt(group.mon_hoc_id),
                        lop_id: parseInt(group.lop_id),
                        chi_tiet: chiTiet,
                    }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    setError(data.error || 'Có lỗi xảy ra');
                    setToast({ type: 'error', message: data.error || 'Có lỗi xảy ra' });
                    setSubmitting(false);
                    return;
                }
                const created = await res.json();
                totalCreated += created.phieus?.length || 1;
            }

            setCreatedCount(totalCreated);
            setSubmitted(true);
            setToast({ type: 'success', message: 'Đã gửi phiếu xuất thành công' });
            // Refresh data
            const pxRes = await fetch(`/api/phieu-xuat?ki_id=${selectedKi}&giao_vien_id=${selectedGv}`);
            setPhieuXuats(await pxRes.json());
        } catch (err) {
            setError('Không thể kết nối đến server');
            setToast({ type: 'error', message: 'Không thể kết nối đến server' });
        }
        setSubmitting(false);
    };

    const getPrintHTML = (data) => {
        const rows = data.chi_tiet.map((ct, i) => `
            <tr>
                <td style="text-align:center">${i + 1}</td>
                <td>${ct.ten_vat_tu}</td>
                <td>${ct.yeu_cau_ky_thuat || ''}</td>
                <td style="text-align:center">${ct.don_vi_tinh}</td>
                <td style="text-align:center">${ct.so_luong}</td>
                <td></td>
            </tr>
        `).join('');

        // Fill up to 8 rows if needed
        const emptyRows = Array.from({ length: Math.max(0, 8 - data.chi_tiet.length) }).map(() => `
            <tr>
                <td style="color:transparent">-</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
            </tr>
        `).join('');

        const copyHTML = `
            <div style="padding: 10px; margin-bottom: 20px; page-break-inside: avoid;">
                <div style="text-align: center; margin-bottom: 15px;">
                    <p style="font-size: 11pt; text-transform: uppercase;">UBND THÀNH PHỐ HỒ CHÍ MINH</p>
                    <p style="font-size: 11pt; font-weight: bold; text-transform: uppercase;">TRƯỜNG CAO ĐẲNG NGHỀ VIỆT NAM – SINGAPORE</p>
                    <p>***************************************</p>
                    <h2 style="font-size: 16pt; font-weight: bold; margin: 15px 0; text-transform: uppercase;">${data.loai_vat_tu === 'sua_che' || data.bien_ban_id ? 'Phiếu xuất vật tư cho sửa chữa' : 'Phiếu xuất vật tư cho đào tạo'}</h2>
                </div>

                <table style="width: 100%; margin-bottom: 10px; border-collapse: collapse;">
                    <tr>
                        <td style="width: 60%; vertical-align: top; padding: 5px; border: none;">
                            <p>Tên người đề nghị: <span style="border-bottom: 1px dotted #000; flex: 1; display: inline-block; min-width: 250px;">${data.ten_gv}</span></p>
                            <p style="margin-top: 5px;">Chức vụ: <span style="border-bottom: 1px dotted #000; flex: 1; display: inline-block; min-width: 320px;">Giảng viên</span></p>
                            <p style="margin-top: 5px;">Phòng (Khoa): <span style="border-bottom: 1px dotted #000; flex: 1; display: inline-block; min-width: 285px;">Điện - Điện tử</span></p>
                        </td>
                        <td style="width: 40%; vertical-align: top; padding: 5px; border: none;">
                            <p>Lớp: <span style="border-bottom: 1px dotted #000; flex: 1; display: inline-block; min-width: 200px;">${data.ten_lop || '....................'}</span></p>
                            <p style="margin-top: 5px;">Sĩ số: <span style="border-bottom: 1px dotted #000; flex: 1; display: inline-block; min-width: 195px;">${data.si_so || '......'}</span></p>
                            <p style="margin-top: 5px;">Môn: <span style="border-bottom: 1px dotted #000; flex: 1; display: inline-block; min-width: 198px;">${data.ten_mon || '....................'}${data.so_bien_ban ? ` (BB: ${data.so_bien_ban})` : (data.bien_ban_id ? ` (BB #${data.bien_ban_id})` : '')}</span></p>
                        </td>
                    </tr>
                </table>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <thead>
                        <tr style="background: #f8f9fa;">
                            <th style="border: 1px solid #000; padding: 5px; width: 40px; text-align: center;">TT</th>
                            <th style="border: 1px solid #000; padding: 5px; text-align: center;">Tên vật tư</th>
                            <th style="border: 1px solid #000; padding: 5px; text-align: center; width: 120px;">Mã(hiệu)</th>
                            <th style="border: 1px solid #000; padding: 5px; width: 60px; text-align: center;">ĐVT</th>
                            <th style="border: 1px solid #000; padding: 5px; text-align: center; width: 80px;">Số lượng</th>
                            <th style="border: 1px solid #000; padding: 5px; text-align: center; width: 150px;">Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                        ${emptyRows}
                    </tbody>
                </table>

                <div style="text-align: right; font-style: italic; margin-bottom: 40px;">
                    Bình Dương, Ngày ........ tháng ........ năm ............
                </div>

                <table style="width: 100%; border-collapse: collapse; text-align: center;">
                    <tr>
                        <td style="width: 33.33%; padding: 10px; height: 120px; vertical-align: top; border: none;">
                            <p style="font-weight: bold;">Hiệu trưởng</p>
                        </td>
                        <td style="width: 33.33%; padding: 10px; height: 120px; vertical-align: top; border: none;">
                            <p style="font-weight: bold;">Trưởng khoa</p>
                        </td>
                        <td style="width: 33.33%; padding: 10px; height: 120px; vertical-align: top; position: relative; border: none;">
                            <p style="font-weight: bold;">Người đề nghị</p>
                            <p style="position: absolute; bottom: 10px; left: 0; right: 0; font-weight: bold;">${data.ten_gv}</p>
                        </td>
                    </tr>
                </table>
                <div style="text-align: center; font-size: 10pt; font-style: italic; margin-top: 20px; opacity: 0.6;">
                    Phần mềm quản lý vật tư Khoa Điện - Điện tử
                </div>
            </div>
        `;

        return `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Phiếu Xuất Vật Tư</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; font-size: 11pt; color: #000; padding: 15mm; }
        table { border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 4px 8px; }
        h2 { margin-top: 0; }
        p { margin: 0; }
        @media print {
            body { padding: 5mm; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    ${copyHTML}
</body>
</html>`;
    };

    const generatePDF = async (px) => {
        const res = await fetch(`/api/phieu-xuat?id=${px.id}`);
        const data = await res.json();

        const html = getPrintHTML(data);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            setToast({ type: 'error', message: 'Vui lòng cho phép popup để in phiếu' });
            return;
        }
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            try {
                printWindow.print();
            } catch {
                // Ignore print error
            }
        }, 300);
    };

    const statusLabels = {
        cho_duyet: { label: 'Chờ duyệt', badge: 'badge-warning' },
        da_ky: { label: 'Đã ký', badge: 'badge-info' },
        da_xuat: { label: 'Đã xuất', badge: 'badge-success' },
        tu_choi: { label: 'Từ chối', badge: 'badge-danger' },
    };

    // Compute max exportable quantity + human-readable quota info for one proposal item
    const computeQtyLimits = (ct) => {
        const stats = exportedMap[ct.vat_tu_id] || { da_xuat: 0, total_supply: 0, total_proposed: 0, so_luong_free: 999 };
        const alreadyExported = stats.da_xuat || 0;
        const proposedQty = ct.so_luong || 0;
        const remainingQty = Math.max(0, proposedQty - alreadyExported);

        // Calculate ratio for scaling
        const totalProposed = stats.total_proposed || proposedQty;
        const supply = stats.total_supply || 0;
        const ratio = (totalProposed > 0 && supply < totalProposed) ? supply / totalProposed : 1;

        // Resolve absolute Global Cap vs Usage for the Entire Teacher (across all subjects)
        const globalQuotaRemaining = stats.fair_practical_total !== undefined
            ? Math.max(0, stats.fair_practical_total - (stats.teacher_global_used || 0))
            : Math.max(0, Math.floor(proposedQty * ratio) - alreadyExported);

        const quotaRemaining = globalQuotaRemaining;
        const physicalFree = stats.so_luong_free !== undefined ? stats.so_luong_free : quotaRemaining;

        const canXuatThucTe = Math.min(quotaRemaining, physicalFree);
        const maxQty = Math.min(remainingQty, canXuatThucTe);

        return {
            proposedQty, alreadyExported, remainingQty, ratio,
            physicalFree, canXuatThucTe, maxQty,
            isCapped: ratio < 1,
            isPhysicallyLimited: physicalFree < quotaRemaining,
        };
    };

    // Fill every item of a class up to its allowed maximum
    const fillClassMax = (cls) => {
        setExportItems(prev => {
            const next = { ...prev };
            cls.items
                .filter(it => it.mon_hoc_id === parseInt(selectedMon))
                .forEach(ct => {
                    const { maxQty } = computeQtyLimits(ct);
                    if (maxQty > 0) next[`${cls.lop_id}-${ct.vat_tu_id}`] = maxQty;
                });
            return next;
        });
    };

    // Derived data -------------------------------------------------------
    const currentKi = kiHocs.find(k => k.id === parseInt(selectedKi));
    const currentGv = giaoViens.find(g => g.id === parseInt(selectedGv));

    const subjectList = (() => {
        if (!deXuatDetail?.chi_tiet) return [];
        const map = new Map();
        deXuatDetail.chi_tiet.forEach(ct => {
            if (!map.has(ct.mon_hoc_id)) {
                map.set(ct.mon_hoc_id, { id: ct.mon_hoc_id, name: ct.ten_mon, count: 0 });
            }
            map.get(ct.mon_hoc_id).count += 1;
        });
        return Array.from(map.values());
    })();

    const visibleSlips = (() => {
        if (showAllSlips || !selectedMon) return phieuXuats;
        return phieuXuats?.filter(px => px.mon_hoc_id === parseInt(selectedMon));
    })();

    const slipStats = {
        cho_duyet: phieuXuats?.filter(px => px.trang_thai === 'cho_duyet').length,
        da_ky: phieuXuats?.filter(px => px.trang_thai === 'da_ky').length,
        da_xuat: phieuXuats?.filter(px => px.trang_thai === 'da_xuat').length,
    };

    const selectedEntries = Object.entries(exportItems).filter(([, q]) => q !== '' && q > 0);
    const totalSelectedItems = selectedEntries.length;
    const repairEntries = Object.entries(repairItems).filter(([, q]) => q !== '' && q > 0);

    const classGroups = (() => {
        if (!deXuatDetail?.chi_tiet) return [];
        const groupedByClass = {};
        deXuatDetail.chi_tiet.forEach(ct => {
            if (!groupedByClass[ct.lop_id]) {
                groupedByClass[ct.lop_id] = { ten_lop: ct.ten_lop, si_so: ct.si_so, items: [] };
            }
            groupedByClass[ct.lop_id].items.push(ct);
        });
        return Object.entries(groupedByClass)
            .map(([lopId, data]) => {
                const itemsInSelectedMon = data.items.filter(it => it.mon_hoc_id === parseInt(selectedMon));
                return {
                    lop_id: parseInt(lopId),
                    ...data,
                    ten_mon: itemsInSelectedMon.length > 0 ? itemsInSelectedMon[0].ten_mon : '',
                    hasItems: itemsInSelectedMon.length > 0
                };
            })
            .filter(cls => cls.hasItems);
    })();

    // Nhóm vật tư sửa chữa theo lớp từ đề xuất đã nộp (mirror tab tiêu hao)
    const repairGroups = (() => {
        const q = repairFilter.trim().toLowerCase();
        return classGroups
            .map(cls => ({
                ...cls,
                items: cls.items.filter(ct =>
                    (ct.loai_vat_tu || 'tieu_hao') === 'sua_che' &&
                    (!q
                        || (ct.ten_vat_tu || '').toLowerCase().includes(q)
                        || (ct.yeu_cau_ky_thuat || '').toLowerCase().includes(q)))
            }))
            .filter(cls => cls.items.length > 0);
    })();

    const repairRowById = {};
    repairGroups.forEach(cls => cls.items.forEach(ct => { repairRowById[ct.id] = ct; }));

    const hasAnySuaChe = (deXuatDetail?.chi_tiet || []).some(ct => (ct.loai_vat_tu || 'tieu_hao') === 'sua_che');

    // Render ---------------------------------------------------------------
    const appbar = (
        <div className="tx-appbar">
            <Link href="/giao-vien" className="tx-appbar-btn" aria-label="Quay lại"><ArrowLeft size={20} /></Link>
            <div className="tx-appbar-heading">
                <span className="tx-appbar-title">Phiếu xuất vật tư</span>
                {currentKi && (
                    <span className="tx-appbar-sub">{currentKi.ten_ki} · {currentKi.nam_hoc}</span>
                )}
            </div>
        </div>
    );

    if (initLoading) {
        return (
            <div className="public-page tx-shell">
                {appbar}
                <div className="tx-skel" style={{ height: 200, marginBottom: 16 }} />
                <div className="tx-skel" style={{ height: 120, marginBottom: 12 }} />
                <div className="tx-skel" style={{ height: 120 }} />
            </div>
        );
    }

    if (kiHocs.length === 0) {
        return (
            <div className="public-page tx-shell">
                {appbar}
                <div className="tx-empty" style={{ marginTop: 24 }}>
                    <FileOutput size={40} />
                    <h3>Chưa có kỳ hoạt động</h3>
                    <p>Kỳ học chưa mở để tạo phiếu xuất.</p>
                    <Link href="/giao-vien" className="btn btn-secondary" style={{ marginTop: 14 }}>
                        <ArrowLeft size={16} /> Về cổng giáo viên
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="public-page tx-shell">
            {appbar}

            {/* Step 1: teacher picker */}
            {!selectedGv ? (
                <div className="tx-pick">
                    <div className="tx-pick-icon"><Users size={24} /></div>
                    <div className="tx-pick-title">Bạn là giáo viên nào?</div>
                    <div className="tx-pick-sub">Chọn tên để xem đề xuất và tạo phiếu xuất.</div>
                    <select
                        className="tx-pick-select"
                        value={selectedGv}
                        onChange={e => setSelectedGv(e.target.value)}
                    >
                        <option value="">-- Chọn giáo viên --</option>
                        {giaoViens.map(gv => <option key={gv.id} value={gv.id}>{gv.ho_ten}</option>)}
                    </select>
                </div>
            ) : (
                <>
                    {/* Selected teacher pill */}
                    <div className="tx-gv-pill">
                        <div className="tx-gv-avatar"><User size={18} /></div>
                        <div className="tx-gv-info">
                            <span className="tx-gv-name">{currentGv?.ho_ten || 'Giáo viên'}</span>
                            <span className="tx-gv-label">Đang xem phiếu xuất</span>
                        </div>
                        <button className="tx-gv-change" onClick={() => { setSelectedGv(''); setSelectedMon(''); setMode('view'); }}>
                            Đổi
                        </button>
                    </div>

                    {/* Subject select */}
                    {dataLoading && subjectList.length === 0 && (
                        <div className="tx-skel" style={{ height: 44, marginBottom: 16 }} />
                    )}
                    {!dataLoading && subjectList.length > 0 && (
                        <div className="tx-block">
                            <div className="tx-label"><BookOpen size={13} /> Môn học</div>
                            <div className="tx-select-row">
                                <select
                                    className="form-select"
                                    value={selectedMon}
                                    onChange={e => { setSelectedMon(e.target.value); setMode('view'); setShowAllSlips(false); }}
                                >
                                    {subjectList.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.count} vật tư)</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* No proposal yet */}
                    {!dataLoading && deXuats.length === 0 && (
                        <div className="tx-empty">
                            <Inbox size={40} />
                            <h3>Chưa có đề xuất vật tư</h3>
                            <p>Bạn cần nộp đề xuất dự trù trước khi tạo phiếu xuất.</p>
                            <Link href="/de-xuat" className="btn btn-primary" style={{ marginTop: 14 }}>
                                <Plus size={16} /> Tạo đề xuất
                            </Link>
                        </div>
                    )}

                    {/* Loading data */}
                    {dataLoading && subjectList.length > 0 && (
                        <>
                            <div className="tx-skel" style={{ height: 80, marginBottom: 12 }} />
                            <div className="tx-skel" style={{ height: 80, marginBottom: 12 }} />
                            <div className="tx-skel" style={{ height: 80 }} />
                        </>
                    )}

                    {!dataLoading && subjectList.length > 0 && (
                        <>
                            {/* Quick stats */}
                            {phieuXuats.length > 0 && (
                                <div className="tx-stats">
                                    <div className="tx-stat">
                                        <div className="tx-stat-num">{slipStats.cho_duyet}</div>
                                        <div className="tx-stat-label">Chờ duyệt</div>
                                    </div>
                                    <div className="tx-stat">
                                        <div className="tx-stat-num">{slipStats.da_ky}</div>
                                        <div className="tx-stat-label">Đã ký</div>
                                    </div>
                                    <div className="tx-stat">
                                        <div className="tx-stat-num">{slipStats.da_xuat}</div>
                                        <div className="tx-stat-label">Đã xuất</div>
                                    </div>
                                </div>
                            )}

                            {mode === 'view' && (
                                <>
                                    {/* Slip list */}
                                    <div className="tx-section">
                                        <h2><FileOutput size={17} /> Phiếu xuất của bạn</h2>
                                        {selectedMon && phieuXuats.length > 0 && (
                                            <button className="tx-link-btn" onClick={() => setShowAllSlips(v => !v)}>
                                                {showAllSlips ? 'Chỉ môn này' : `Tất cả (${phieuXuats.length})`}
                                            </button>
                                        )}
                                    </div>

                                    {visibleSlips.length === 0 ? (
                                        <div className="tx-empty" style={{ padding: '28px 16px' }}>
                                            <Inbox size={34} />
                                            <h3>Chưa có phiếu xuất nào</h3>
                                            <p>Phiếu đã tạo sẽ hiển thị tại đây.</p>
                                        </div>
                                    ) : (
                                        <div>
                                            {visibleSlips.map(px => {
                                                const canPrint = px.trang_thai === 'da_ky' || px.trang_thai === 'da_xuat';
                                                const st = statusLabels[px.trang_thai] || {};
                                                const isSuaChe = px.loai_vat_tu === 'sua_che';
                                                return (
                                                    <div key={px.id} className={`tx-slip ${isSuaChe ? 'tx-slip-repair' : ''}`}>
                                                        <div className="tx-slip-top">
                                                            <span className="tx-slip-code">PX-{String(px.id).padStart(4, '0')}</span>
                                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                {isSuaChe && (
                                                                    <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                                        <Wrench size={12} /> Sửa chữa
                                                                    </span>
                                                                )}
                                                                <span className={`badge ${st.badge}`}>{st.label}</span>
                                                            </div>
                                                        </div>
                                                        <div className="tx-slip-title">{px.ten_mon}{px.ten_lop ? ` · ${px.ten_lop}` : ''}</div>
                                                        <div className="tx-slip-meta">
                                                            <span><Package size={13} /> {px.so_vat_tu} vật tư · {px.tong_so_luong} đơn vị</span>
                                                            <span><Clock size={13} /> {new Date(px.ngay_tao).toLocaleDateString('vi-VN')}</span>
                                                            {isSuaChe && (
                                                                <span><ClipboardList size={13} /> BB {px.so_bien_ban || `#${px.bien_ban_id}`}</span>
                                                            )}
                                                        </div>
                                                        <div className="tx-slip-actions">
                                                            <button
                                                                className={`btn ${canPrint ? 'btn-primary' : 'btn-secondary'}`}
                                                                onClick={() => generatePDF(px)}
                                                                disabled={!canPrint}
                                                            >
                                                                <Download size={16} />
                                                                {canPrint ? 'Tải phiếu in' : (px.trang_thai === 'tu_choi' ? 'Bị từ chối' : 'Chờ kho duyệt')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Create CTA */}
                                    {deXuats.length > 0 && (
                                        <button className="tx-cta" onClick={handleCreatePhieu}>
                                            <span className="tx-cta-icon"><Plus size={20} /></span>
                                            <span className="tx-cta-text">
                                                <strong>Tạo phiếu / biên bản mới</strong>
                                                <small>Tiêu hao duyệt bằng phiếu xuất · Sửa chữa duyệt bằng biên bản</small>
                                            </span>
                                            <ChevronDown size={20} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }} />
                                        </button>
                                    )}
                                    {/* Biên bản sửa chữa của bạn (duyệt thay phiếu xuất) */}
                                    {bienBans.length > 0 && (
                                        <div className="tx-section" style={{ marginTop: 18 }}>
                                            <h2><ClipboardList size={17} /> Biên bản sửa chữa ({bienBans.length})</h2>
                                        </div>
                                    )}
                                    {bienBans.map(bb => (
                                        <div className="tx-bb-row" key={`view-bb-${bb.id}`}>
                                            <div className="tx-bb-row-info">
                                                <strong>#{bb.id} {bb.ten_thiet_bi || 'Biên bản sửa chữa'}</strong>
                                                <span className={`tx-bb-status ${bb.trang_thai}`}>
                                                    {{ cho_duyet: 'Chờ duyệt', da_duyet: 'Đã duyệt', tu_choi: 'Từ chối' }[bb.trang_thai] || bb.trang_thai}{bb.ngay_lap ? ` • ${bb.ngay_lap}` : ''}
                                                </span>
                                            </div>
                                            {bb.trang_thai === 'da_duyet' && (
                                                <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                                                    <button className="btn btn-secondary btn-sm" onClick={() => handlePrintBienBan(bb.id)} disabled={printingBB} title="In biên bản hư hỏng (BM01)">
                                                        <FileText size={15} /> In BB
                                                    </button>
                                                    <button className="btn btn-primary btn-sm" onClick={() => handlePrintPhieuXuatSuaChua(bb.id)} disabled={printingPX} title="In phiếu xuất vật tư sửa chữa">
                                                        <Printer size={15} /> In phiếu xuất
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* Create mode */}
                            {mode === 'create' && !submitted && (
                                <div>
                                    <div className="tx-section">
                                        <h2><Package size={17} /> Tạo phiếu xuất</h2>
                                        <button className="tx-link-btn" onClick={() => setMode('view')}>Hủy</button>
                                    </div>

                                    {/* Tab: tiêu hao vs sửa chữa */}
                                    <div className="tx-tabs">
                                        <button
                                            className={`tx-tab ${activeTab === 'tieu_hao' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('tieu_hao')}
                                        >
                                            <Package size={16} /> Tiêu hao
                                            {totalSelectedItems > 0 && <span className="tx-tab-count">{totalSelectedItems}</span>}
                                        </button>
                                        <button
                                            className={`tx-tab ${activeTab === 'sua_che' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('sua_che')}
                                        >
                                            <Wrench size={16} /> Sửa chữa
                                            {repairEntries.length > 0 && <span className="tx-tab-count">{repairEntries.length}</span>}
                                        </button>
                                    </div>

                                    {error && (
                                        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                            <AlertCircle size={17} /> {error}
                                        </div>
                                    )}

                                    {activeTab === 'tieu_hao' && (
                                        <>
                                            <p className="tx-hint">
                                                Môn <strong>{subjectList.find(m => m.id.toString() === selectedMon)?.name}</strong> —
                                                bấm &ldquo;Chọn đủ&rdquo; để lấy hết định mức.
                                            </p>

                                            {classGroups.length === 0 ? (
                                                <div className="tx-empty">
                                                    <BookOpen size={36} />
                                                    <h3>Chưa có đề xuất</h3>
                                                </div>
                                            ) : (
                                                <div>
                                                    {classGroups.map(cls => {
                                                        const isExpanded = expandedClass[cls.lop_id] !== false; // default open
                                                        const classItems = cls.items.filter(it => it.mon_hoc_id === parseInt(selectedMon));
                                                        const classTotal = classItems.reduce((sum, ct) => {
                                                            const key = `${cls.lop_id}-${ct.vat_tu_id}`;
                                                            const q = exportItems[key];
                                                            return sum + (q !== '' && q > 0 ? q : 0);
                                                        }, 0);
                                                        const classSelectedCount = classItems.filter(ct => {
                                                            const q = exportItems[`${cls.lop_id}-${ct.vat_tu_id}`];
                                                            return q !== '' && q > 0;
                                                        }).length;

                                                        return (
                                                            <div key={cls.lop_id} className="tx-class">
                                                                <button className="tx-class-head" onClick={() => toggleClass(cls.lop_id)}>
                                                                    <ChevronDown
                                                                        size={18}
                                                                        className="tx-class-chevron"
                                                                        style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                                                                    />
                                                                    <div className="tx-class-info">
                                                                        <span className="tx-class-name">{cls.ten_lop}</span>
                                                                        <span className="tx-class-meta">Sĩ số {cls.si_so} · {classItems.length} vật tư</span>
                                                                    </div>
                                                                    {classTotal > 0 && (
                                                                        <span className="badge badge-success">{classTotal} đơn vị</span>
                                                                    )}
                                                                </button>

                                                                {isExpanded && (
                                                                    <div className="tx-class-body">
                                                                        <div className="tx-class-tools">
                                                                            <span>{classSelectedCount}/{classItems.length} đã chọn</span>
                                                                            <button className="tx-link-btn" onClick={() => fillClassMax(cls)}>
                                                                                Chọn đủ định mức
                                                                            </button>
                                                                        </div>
                                                                    <div>
                                                                        {classItems.map(ct => {
                                                                            const key = `${cls.lop_id}-${ct.vat_tu_id}`;
                                                                            const rawQty = exportItems[key];
                                                                            const qty = rawQty === '' || rawQty === undefined ? 0 : rawQty;
                                                                            const lim = computeQtyLimits(ct);
                                                                            const disabled = lim.maxQty <= 0;

                                                                            return (
                                                                                <div key={key} className={`tx-mat ${qty > 0 ? 'selected' : ''}`}>
                                                                                    <div className="tx-mat-info">
                                                                                        <div className="tx-mat-name">{ct.ten_vat_tu}</div>
                                                                                        {ct.yeu_cau_ky_thuat && (
                                                                                            <div className="tx-mat-spec">{ct.yeu_cau_ky_thuat}</div>
                                                                                        )}
                                                                                        <div className="tx-mat-quota">
                                                                                            <span>Đã {lim.alreadyExported}/{lim.proposedQty} {ct.don_vi_tinh}</span>
                                                                                            <strong className={lim.maxQty > 0 ? 'tx-quota-ok' : 'tx-quota-none'}>
                                                                                                Còn {lim.maxQty}
                                                                                            </strong>
                                                                                        </div>
                                                                                        {lim.isCapped && (
                                                                                            <span className="tx-mat-warn warn">Kho thiếu — tỉ lệ {Math.round(lim.ratio * 100)}%</span>
                                                                                        )}
                                                                                        {lim.isPhysicallyLimited && (
                                                                                            <span className="tx-mat-warn danger">Kho chỉ còn {lim.physicalFree}</span>
                                                                                        )}
                                                                                        {disabled && !lim.isCapped && !lim.isPhysicallyLimited && (
                                                                                            <span className="tx-mat-warn muted">Đã đủ định mức</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="tx-stepper">
                                                                                        <button
                                                                                            className="tx-step-btn"
                                                                                            onClick={() => updateExportQty(cls.lop_id, ct.vat_tu_id, -1, lim.maxQty)}
                                                                                            disabled={qty <= 0}
                                                                                            aria-label="Giảm"
                                                                                        >
                                                                                            <Minus size={17} />
                                                                                        </button>
                                                                                        <input
                                                                                            type="number"
                                                                                            inputMode="numeric"
                                                                                            className="tx-step-input"
                                                                                            value={rawQty === undefined ? 0 : rawQty}
                                                                                            onChange={e => setExportQty(cls.lop_id, ct.vat_tu_id, e.target.value, lim.maxQty)}
                                                                                            onBlur={() => handleQtyBlur(cls.lop_id, ct.vat_tu_id)}
                                                                                            min="0"
                                                                                            max={lim.maxQty}
                                                                                            disabled={disabled}
                                                                                        />
                                                                                        <button
                                                                                            className="tx-step-btn"
                                                                                            onClick={() => updateExportQty(cls.lop_id, ct.vat_tu_id, 1, lim.maxQty)}
                                                                                            disabled={qty >= lim.maxQty}
                                                                                            aria-label="Tăng"
                                                                                        >
                                                                                            <Plus size={17} />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Tab sửa chữa — giống tiêu hao (Lớp + vật tư đã dự trù) + thêm tình trạng, duyệt ra biên bản */}
                                    {activeTab === 'sua_che' && (
                                        <div>
                                            <p className="tx-hint">
                                                Giống tab tiêu hao: chọn <strong>lớp</strong> + <strong>vật tư sửa chữa đã dự trù</strong> — thêm <strong>tình trạng</strong> từng vật tư rồi trình, duyệt ra <strong>biên bản BM01</strong> (không ra phiếu xuất).
                                            </p>

                                            {/* C/1 Tình hình — ghi đúng ô trên biên bản BM01 (trống thì tự ghép từ tình trạng từng vật tư) */}
                                            <div className="tx-block" style={{ marginBottom: 12 }}>
                                                <div className="tx-label">Tình hình <span style={{ fontWeight: 400, opacity: 0.7 }}>(in ở C/1 — trống thì tự ghép từ tình trạng từng vật tư)</span></div>
                                                <textarea
                                                    className="form-input"
                                                    rows={2}
                                                    placeholder="VD: Máy rung mạnh, cầu chì cháy do quá tải…"
                                                    value={repairTinhHinh}
                                                    onChange={e => setRepairTinhHinh(e.target.value)}
                                                />
                                            </div>

                                            {!deXuatDetail ? (
                                                <div className="tx-empty">
                                                    <Inbox size={40} />
                                                    <h3>Chưa có lớp để lập biên bản</h3>
                                                    <p>Bạn cần có đề xuất dự trù trong kỳ để lấy danh sách lớp.</p>
                                                    <Link href="/de-xuat" className="btn btn-primary" style={{ marginTop: 14 }}>
                                                        <Plus size={16} /> Tạo đề xuất
                                                    </Link>
                                                </div>
                                            ) : (
                                            <>
                                            {/* Vật tư sửa chữa từ đề xuất đã nộp */}
                                            {repairGroups.length === 0 ? (
                                                <div className="tx-empty">
                                                    <Wrench size={34} />
                                                    <h3>Chưa có vật tư sửa chữa</h3>
                                                    <p>{repairFilter.trim()
                                                        ? `Không tìm thấy vật tư sửa chữa khớp "${repairFilter.trim()}".`
                                                        : hasAnySuaChe
                                                            ? 'Môn đang chọn không có vật tư sửa chữa — thử chọn môn khác.'
                                                            : 'Đề xuất kỳ này chưa có vật tư loại sửa chữa.'}</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="tx-search-wrap">
                                                        <Search size={16} className="tx-search-icon" />
                                                        <input
                                                            className="form-input"
                                                            placeholder="Tìm vật tư sửa chữa…"
                                                            value={repairFilter}
                                                            onChange={e => setRepairFilter(e.target.value)}
                                                        />
                                                    </div>
                                                    {repairGroups.map(cls => {
                                                        const isExpanded = expandedClass[cls.lop_id] !== false;
                                                        const selCount = cls.items.filter(ct => {
                                                            const qv = repairItems[ct.id];
                                                            return qv !== '' && qv > 0;
                                                        }).length;
                                                        return (
                                                            <div key={cls.lop_id} className="tx-class">
                                                                <button className="tx-class-head" onClick={() => toggleClass(cls.lop_id)}>
                                                                    <ChevronDown
                                                                        size={18}
                                                                        className="tx-class-chevron"
                                                                        style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                                                                    />
                                                                    <div className="tx-class-info">
                                                                        <span className="tx-class-name">{cls.ten_lop}</span>
                                                                        <span className="tx-class-meta">Sĩ số {cls.si_so} · {cls.items.length} vật tư sửa chữa</span>
                                                                    </div>
                                                                    {selCount > 0 && (
                                                                        <span className="badge badge-success">{selCount} đã chọn</span>
                                                                    )}
                                                                </button>
                                                                {isExpanded && (
                                                                    <div className="tx-class-body">
                                                                        {cls.items.map(ct => {
                                                                            const qty = repairItems[ct.id] || 0;
                                                                            const max = ct.so_luong || 0;
                                                                            return (
                                                                                <div key={ct.id} className="tx-repair-wrap">
                                                                                <div className={`tx-mat${qty > 0 ? ' selected open' : ''}`}>
                                                                                    <div className="tx-mat-info">
                                                                                        <div className="tx-mat-name">{ct.ten_vat_tu}</div>
                                                                                        {ct.yeu_cau_ky_thuat && <div className="tx-mat-spec">{ct.yeu_cau_ky_thuat}</div>}
                                                                                        <div className="tx-mat-quota">
                                                                                            <span>Đề xuất {ct.so_luong} {ct.don_vi_tinh}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="tx-stepper">
                                                                                        <button
                                                                                            className="tx-step-btn"
                                                                                            onClick={() => updateRepairQty(ct.id, (repairItems[ct.id] || 0) - 1, max)}
                                                                                            disabled={qty <= 0}
                                                                                            aria-label="Giảm"
                                                                                        >
                                                                                            <Minus size={17} />
                                                                                        </button>
                                                                                        <input
                                                                                            type="number"
                                                                                            inputMode="numeric"
                                                                                            className="tx-step-input"
                                                                                            value={qty}
                                                                                            onChange={e => updateRepairQty(ct.id, e.target.value, max)}
                                                                                            min="0"
                                                                                            max={max}
                                                                                        />
                                                                                        <button
                                                                                            className="tx-step-btn"
                                                                                            onClick={() => updateRepairQty(ct.id, (repairItems[ct.id] || 0) + 1, max)}
                                                                                            disabled={qty >= max}
                                                                                            aria-label="Tăng"
                                                                                        >
                                                                                            <Plus size={17} />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                                {qty > 0 && (
                                                                                    <input
                                                                                        className="form-input tx-repair-cond"
                                                                                        placeholder={`Tình trạng "${ct.ten_vat_tu}" * — bắt buộc`}
                                                                                        value={repairConditions[ct.id] || ''}
                                                                                        onChange={e => setRepairConditions(prev => ({ ...prev, [ct.id]: e.target.value }))}
                                                                                    />
                                                                                )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ width: '100%', height: 46, marginTop: 4, fontWeight: 600 }}
                                                        onClick={handleCreateRepairBB}
                                                        disabled={creatingBB}
                                                    >
                                                        {creatingBB ? 'Đang lập...' : <><ClipboardList size={16} /> Lập biên bản sửa chữa</>}
                                                    </button>
                                                </>
                                            )}
                                            {bienBans.length > 0 && (
                                                <div style={{ marginTop: 20 }}>
                                                    <div className="tx-label" style={{ marginBottom: 8 }}>Biên bản của tôi ({bienBans.length})</div>
                                                    {bienBans.map(bb => (
                                                        <div className="tx-bb-row" key={bb.id}>
                                                            <div className="tx-bb-row-info">
                                                                <strong>#{bb.id} {bb.ten_thiet_bi}</strong>
                                                                <span className={`tx-bb-status ${bb.trang_thai}`}>
                                                                    {{ cho_duyet: 'Chờ duyệt', da_duyet: 'Đã duyệt', tu_choi: 'Từ chối' }[bb.trang_thai] || bb.trang_thai}{bb.ngay_lap ? ` • ${bb.ngay_lap}` : ''}
                                                                </span>
                                                            </div>
                                                            {bb.trang_thai === 'da_duyet' && (
                                                                <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                                                                    <button className="btn btn-secondary btn-sm" onClick={() => handlePrintBienBan(bb.id)} disabled={printingBB} title="In biên bản hư hỏng (BM01)">
                                                                        <FileText size={15} /> In BB
                                                                    </button>
                                                                    <button className="btn btn-primary btn-sm" onClick={() => handlePrintPhieuXuatSuaChua(bb.id)} disabled={printingPX} title="In phiếu xuất vật tư sửa chữa">
                                                                        <Printer size={15} /> In phiếu xuất
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Success */}
                            {submitted && (
                                <div className="card tx-success">
                                    <div className="tx-success-icon"><CheckCircle size={40} /></div>
                                    <h2>Đã gửi phiếu xuất!</h2>
                                    <p>{createdCount > 1 ? `${createdCount} phiếu` : 'Phiếu'} đã gửi đến kho để duyệt. Bạn tải phiếu in sau khi được duyệt.</p>
                                    <div className="tx-success-actions">
                                        <button className="btn btn-secondary" onClick={() => { setSubmitted(false); setMode('view'); }}>
                                            Xem phiếu đã gửi
                                        </button>
                                        <button className="btn btn-primary" onClick={handleCreatePhieu}>
                                            <Plus size={16} /> Tạo phiếu mới
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* Sticky bottom action bar (create mode, chỉ tab tiêu hao — tab sửa chữa dùng nút Lập biên bản riêng) */}
            {selectedGv && mode === 'create' && !submitted && activeTab === 'tieu_hao' && (
                <div className="tx-actionbar">
                    <div className="tx-actionbar-info">
                        <strong>{totalSelectedItems} vật tư</strong>
                        <span>
                            Tiêu hao
                        </span>
                    </div>
                    <button
                        className="btn btn-primary tx-actionbar-btn"
                        onClick={handleSubmitPhieu}
                        disabled={submitting || totalSelectedItems === 0}
                    >
                        {submitting ? <div className="spinner" /> : <><Send size={17} /> Trình phiếu</>}
                    </button>
                </div>
            )}

            {/* Local toast */}
            {toast && (
                <div className={`tx-toast ${toast.type}`}>
                    {toast.type === 'success' ? <CheckCircle size={17} /> : <AlertCircle size={17} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}
