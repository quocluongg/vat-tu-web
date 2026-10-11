'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, User, BookOpen, FileOutput, Plus, Minus, Send, CheckCircle,
    Download, Package, AlertCircle, ChevronDown, Clock, Inbox,
} from 'lucide-react';

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

    const handleSubmitPhieu = async () => {
        if (Object.keys(exportItems).length === 0) {
            setError('Vui lòng chọn ít nhất một vật tư');
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
            // Create one phieu for each class and subject combination
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
            }

            setCreatedCount(Object.keys(groupedByLopAndMon).length);
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
                    <h2 style="font-size: 16pt; font-weight: bold; margin: 15px 0; text-transform: uppercase;">Phiếu xuất vật tư cho đào tạo</h2>
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
                            <p style="margin-top: 5px;">Môn: <span style="border-bottom: 1px dotted #000; flex: 1; display: inline-block; min-width: 198px;">${data.ten_mon || '....................'}</span></p>
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
                            <th style="border: 1px solid #000; padding: 5px; width: 80px; text-align: center;">Số lượng</th>
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
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
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
        return phieuXuats.filter(px => px.mon_hoc_id === parseInt(selectedMon));
    })();

    const slipStats = {
        cho_duyet: phieuXuats.filter(px => px.trang_thai === 'cho_duyet').length,
        da_ky: phieuXuats.filter(px => px.trang_thai === 'da_ky').length,
        da_xuat: phieuXuats.filter(px => px.trang_thai === 'da_xuat').length,
    };

    const selectedEntries = Object.entries(exportItems).filter(([, q]) => q !== '' && q > 0);
    const totalSelectedItems = selectedEntries.length;
    const totalSelectedQty = selectedEntries.reduce((sum, [, q]) => sum + (parseInt(q) || 0), 0);

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

    // Render ---------------------------------------------------------------

    if (initLoading) {
        return (
            <div className="public-page tx-shell">
                <div className="tx-appbar">
                    <Link href="/giao-vien" className="tx-appbar-btn" aria-label="Quay lại"><ArrowLeft size={20} /></Link>
                    <span className="tx-appbar-title">Phiếu xuất vật tư</span>
                </div>
                <div className="tx-skel" style={{ height: 72, marginBottom: 16 }} />
                <div className="tx-skel" style={{ height: 56, marginBottom: 24 }} />
                <div className="tx-skel" style={{ height: 120, marginBottom: 12 }} />
                <div className="tx-skel" style={{ height: 120, marginBottom: 12 }} />
                <div className="tx-skel" style={{ height: 120 }} />
            </div>
        );
    }

    if (kiHocs.length === 0) {
        return (
            <div className="public-page tx-shell">
                <div className="tx-appbar">
                    <Link href="/giao-vien" className="tx-appbar-btn" aria-label="Quay lại"><ArrowLeft size={20} /></Link>
                    <span className="tx-appbar-title">Phiếu xuất vật tư</span>
                </div>
                <div className="card" style={{ marginTop: 24 }}>
                    <div className="empty-state">
                        <FileOutput size={48} />
                        <h3>Chưa có kỳ hoạt động</h3>
                        <p>Kỳ học chưa ở trạng thái hoạt động để tạo phiếu xuất.</p>
                        <Link href="/giao-vien" className="btn btn-secondary" style={{ marginTop: 16 }}>
                            <ArrowLeft size={16} /> Về cổng giáo viên
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="public-page tx-shell">
            {/* Sticky app bar */}
            <div className="tx-appbar">
                <Link href="/giao-vien" className="tx-appbar-btn" aria-label="Quay lại"><ArrowLeft size={20} /></Link>
                <div className="tx-appbar-heading">
                    <span className="tx-appbar-title">Phiếu xuất vật tư</span>
                    {currentKi && (
                        <span className="tx-appbar-sub">{currentKi.ten_ki} • {currentKi.nam_hoc}</span>
                    )}
                </div>
            </div>

            {/* Step 1: teacher */}
            {!selectedGv ? (
                <div className="card tx-intro-card">
                    <div className="card-body">
                        <h2 className="tx-intro-title"><User size={20} /> Bạn là giáo viên nào?</h2>
                        <p className="tx-intro-text">Chọn tên của bạn để xem đề xuất và tạo phiếu xuất vật tư.</p>
                        <div className="tx-field">
                            <User size={18} className="tx-field-icon" />
                            <select
                                className="form-select tx-big-select"
                                value={selectedGv}
                                onChange={e => setSelectedGv(e.target.value)}
                            >
                                <option value="">-- Chọn giáo viên --</option>
                                {giaoViens.map(gv => <option key={gv.id} value={gv.id}>{gv.ho_ten}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Selected teacher pill */}
                    <div className="tx-gv-pill">
                        <div className="tx-gv-avatar"><User size={20} /></div>
                        <div className="tx-gv-info">
                            <span className="tx-gv-name">{currentGv?.ho_ten || 'Giáo viên'}</span>
                            <span className="tx-gv-label">Đang xem phiếu xuất</span>
                        </div>
                        <button className="tx-gv-change" onClick={() => { setSelectedGv(''); setSelectedMon(''); setMode('view'); }}>
                            Đổi
                        </button>
                    </div>

                    {/* Step 2: subject chips */}
                    {dataLoading && subjectList.length === 0 && (
                        <div className="tx-skel" style={{ height: 44, marginBottom: 16 }} />
                    )}
                    {!dataLoading && subjectList.length > 0 && (
                        <div className="tx-block">
                            <div className="tx-block-label"><BookOpen size={14} /> Môn học</div>
                            <div className="tx-chips">
                                {subjectList.map(m => (
                                    <button
                                        key={m.id}
                                        className={`tx-chip ${selectedMon === m.id.toString() ? 'active' : ''}`}
                                        onClick={() => { setSelectedMon(m.id.toString()); setMode('view'); setShowAllSlips(false); }}
                                    >
                                        {m.name}
                                        <span className="tx-chip-count">{m.count}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* No proposal yet */}
                    {!dataLoading && deXuats.length === 0 && (
                        <div className="card">
                            <div className="empty-state">
                                <Inbox size={48} />
                                <h3>Chưa có đề xuất vật tư</h3>
                                <p>Bạn cần nộp đề xuất dự trù trước khi tạo phiếu xuất.</p>
                                <Link href="/de-xuat" className="btn btn-primary" style={{ marginTop: 16 }}>
                                    <Plus size={16} /> Tạo đề xuất ngay
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Loading data */}
                    {dataLoading && subjectList.length > 0 && (
                        <>
                            <div className="tx-skel" style={{ height: 84, marginBottom: 12 }} />
                            <div className="tx-skel" style={{ height: 84, marginBottom: 12 }} />
                            <div className="tx-skel" style={{ height: 84 }} />
                        </>
                    )}

                    {!dataLoading && subjectList.length > 0 && (
                        <>
                            {/* Quick stats */}
                            {phieuXuats.length > 0 && (
                                <div className="tx-stats">
                                    <div className="tx-stat">
                                        <div className="tx-stat-num" style={{ color: '#fbbf24' }}>{slipStats.cho_duyet}</div>
                                        <div className="tx-stat-label">Chờ duyệt</div>
                                    </div>
                                    <div className="tx-stat">
                                        <div className="tx-stat-num" style={{ color: '#60a5fa' }}>{slipStats.da_ky}</div>
                                        <div className="tx-stat-label">Đã ký</div>
                                    </div>
                                    <div className="tx-stat">
                                        <div className="tx-stat-num" style={{ color: '#34d399' }}>{slipStats.da_xuat}</div>
                                        <div className="tx-stat-label">Đã xuất</div>
                                    </div>
                                </div>
                            )}

                            {mode === 'view' && (
                                <>
                                    {/* Slip list */}
                                    <div className="tx-section">
                                        <h2><FileOutput size={18} /> Phiếu xuất của bạn</h2>
                                        {selectedMon && phieuXuats.length > 0 && (
                                            <button className="tx-link-btn" onClick={() => setShowAllSlips(v => !v)}>
                                                {showAllSlips ? 'Chỉ môn này' : `Tất cả (${phieuXuats.length})`}
                                            </button>
                                        )}
                                    </div>

                                    {visibleSlips.length === 0 ? (
                                        <div className="card">
                                            <div className="empty-state" style={{ padding: '36px 20px' }}>
                                                <Inbox size={40} />
                                                <h3>Chưa có phiếu xuất nào</h3>
                                                <p>Phiếu đã tạo sẽ hiển thị tại đây theo trạng thái.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            {visibleSlips.map(px => {
                                                const canPrint = px.trang_thai === 'da_ky' || px.trang_thai === 'da_xuat';
                                                const st = statusLabels[px.trang_thai] || {};
                                                return (
                                                    <div key={px.id} className="tx-slip">
                                                        <div className="tx-slip-top">
                                                            <span className="tx-slip-code">PX-{String(px.id).padStart(4, '0')}</span>
                                                            <span className={`badge ${st.badge}`}>{st.label}</span>
                                                        </div>
                                                        <div className="tx-slip-title">{px.ten_mon}{px.ten_lop ? ` • ${px.ten_lop}` : ''}</div>
                                                        <div className="tx-slip-meta">
                                                            <span><Package size={13} /> {px.so_vat_tu} vật tư • {px.tong_so_luong} đơn vị</span>
                                                            <span><Clock size={13} /> {new Date(px.ngay_tao).toLocaleDateString('vi-VN')}</span>
                                                        </div>
                                                        <div className="tx-slip-actions">
                                                            <button
                                                                className={`btn ${canPrint ? 'btn-primary' : 'btn-secondary'} btn-full`}
                                                                onClick={() => generatePDF(px)}
                                                                disabled={!canPrint}
                                                            >
                                                                <Download size={16} />
                                                                {canPrint ? 'Tải phiếu in' : (px.trang_thai === 'tu_choi' ? 'Bị từ chối' : 'Chờ kho ký duyệt')}
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
                                            <span className="tx-cta-icon"><Plus size={22} /></span>
                                            <span className="tx-cta-text">
                                                <strong>Tạo phiếu xuất mới</strong>
                                                <small>Chọn vật tư theo lớp từ đề xuất đã duyệt</small>
                                            </span>
                                            <ChevronDown size={20} style={{ transform: 'rotate(-90deg)' }} />
                                        </button>
                                    )}
                                </>
                            )}

                            {/* Create mode */}
                            {mode === 'create' && !submitted && (
                                <div>
                                    <div className="tx-section">
                                        <h2><Package size={18} /> Chọn vật tư xuất</h2>
                                        <button className="tx-link-btn" onClick={() => setMode('view')}>Hủy</button>
                                    </div>
                                    <p className="tx-hint">
                                        Môn <strong>{subjectList.find(m => m.id.toString() === selectedMon)?.name}</strong> —
                                        nhấn &ldquo;Chọn đủ&rdquo; để lấy hết định mức của lớp.
                                    </p>

                                    {error && (
                                        <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                            <AlertCircle size={18} /> {error}
                                        </div>
                                    )}

                                    {classGroups.length === 0 ? (
                                        <div className="card">
                                            <div className="empty-state"><BookOpen size={48} /><h3>Chưa có đề xuất</h3></div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                                                                size={20}
                                                                className="tx-class-chevron"
                                                                style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                                                            />
                                                            <div className="tx-class-info">
                                                                <span className="tx-class-name">{cls.ten_lop}</span>
                                                                <span className="tx-class-meta">Sĩ số {cls.si_so} • {classItems.length} vật tư</span>
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
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                                                                                        Đề xuất {lim.proposedQty} • Đã xuất {lim.alreadyExported} •{' '}
                                                                                        <strong className={lim.maxQty > 0 ? 'tx-quota-ok' : 'tx-quota-none'}>
                                                                                            Còn được {lim.maxQty} {ct.don_vi_tinh}
                                                                                        </strong>
                                                                                    </div>
                                                                                    {lim.isCapped && (
                                                                                        <span className="tx-mat-warn warn">Kho thiếu — duyệt theo tỉ lệ {Math.round(lim.ratio * 100)}%</span>
                                                                                    )}
                                                                                    {lim.isPhysicallyLimited && (
                                                                                        <span className="tx-mat-warn danger">Kho thực tế chỉ còn {lim.physicalFree} {ct.don_vi_tinh}</span>
                                                                                    )}
                                                                                    {disabled && !lim.isCapped && !lim.isPhysicallyLimited && (
                                                                                        <span className="tx-mat-warn muted">Đã xuất đủ định mức</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="tx-stepper">
                                                                                    <button
                                                                                        className="tx-step-btn"
                                                                                        onClick={() => updateExportQty(cls.lop_id, ct.vat_tu_id, -1, lim.maxQty)}
                                                                                        disabled={qty <= 0}
                                                                                        aria-label="Giảm"
                                                                                    >
                                                                                        <Minus size={18} />
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
                                                                                        <Plus size={18} />
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
                                </div>
                            )}

                            {/* Success */}
                            {submitted && (
                                <div className="card tx-success">
                                    <div className="tx-success-icon"><CheckCircle size={44} /></div>
                                    <h2>Đã gửi phiếu xuất!</h2>
                                    <p>{createdCount > 1 ? `${createdCount} phiếu` : 'Phiếu'} đã được gửi đến quản lý kho để ký duyệt. Bạn sẽ tải được phiếu in sau khi được duyệt.</p>
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

            {/* Sticky bottom action bar (create mode) */}
            {selectedGv && mode === 'create' && !submitted && (
                <div className="tx-actionbar">
                    <div className="tx-actionbar-info">
                        <strong>{totalSelectedQty}</strong> đơn vị
                        <span>{totalSelectedItems} vật tư được chọn</span>
                    </div>
                    <button
                        className="btn btn-primary tx-actionbar-btn"
                        onClick={handleSubmitPhieu}
                        disabled={submitting || totalSelectedItems === 0}
                    >
                        {submitting ? <div className="spinner" /> : <><Send size={18} /> Trình phiếu</>}
                    </button>
                </div>
            )}

            {/* Local toast */}
            {toast && (
                <div className={`tx-toast ${toast.type}`}>
                    {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}
