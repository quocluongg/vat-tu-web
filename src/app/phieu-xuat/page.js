'use client';
import { useState, useEffect } from 'react';
import { FileOutput, Eye, Plus, Minus, Send, CheckCircle, Download, BookOpen, Package, Clock, Printer, ChevronDown, AlertCircle } from 'lucide-react';

export default function PhieuXuatPublicPage() {
    const [kiHocs, setKiHocs] = useState([]);
    const [giaoViens, setGiaoViens] = useState([]);
    const [selectedKi, setSelectedKi] = useState('');
    const [selectedGv, setSelectedGv] = useState('');
    const [phanCongs, setPhanCongs] = useState([]);
    const [deXuats, setDeXuats] = useState([]);
    const [phieuXuats, setPhieuXuats] = useState([]);
    const [deXuatDetail, setDeXuatDetail] = useState(null);
    const [mode, setMode] = useState('view'); // view, create
    const [exportItems, setExportItems] = useState({}); // { "lop_id-vat_tu_id": soLuong }
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [expandedClass, setExpandedClass] = useState({});
    const [selectedMon, setSelectedMon] = useState(''); // New state for subject selection
    const [exportedMap, setExportedMap] = useState({}); // { vat_tu_id: total_exported }

    useEffect(() => {
        fetch('/api/ki-hoc').then(r => r.json()).then(data => {
            const activeKis = data.filter(k => k.trang_thai === 'hoat_dong');
            setKiHocs(activeKis);
            if (activeKis.length > 0) setSelectedKi(activeKis[0].id.toString());
        });
        fetch('/api/giao-vien').then(r => r.json()).then(setGiaoViens);
    }, []);

    useEffect(() => {
        if (selectedKi && selectedGv) {
            fetch(`/api/phan-cong?ki_id=${selectedKi}&giao_vien_id=${selectedGv}`)
                .then(r => r.json()).then(setPhanCongs);
            fetch(`/api/de-xuat?ki_id=${selectedKi}&giao_vien_id=${selectedGv}`)
                .then(r => r.json()).then(data => {
                    setDeXuats(data);
                    if (data.length > 0) {
                        fetch(`/api/de-xuat?id=${data[0].id}`)
                            .then(r => r.json())
                            .then(setDeXuatDetail);
                    } else {
                        setDeXuatDetail(null);
                    }
                });
            fetch(`/api/phieu-xuat?ki_id=${selectedKi}&giao_vien_id=${selectedGv}`)
                .then(r => r.json()).then(setPhieuXuats);
            setMode('view');
            setExportItems({});
            setSubmitted(false);
            setSelectedMon(''); // Reset subject when teacher changes
            setExportedMap({});
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

    const getDeXuatDetail = async () => {
        if (deXuats.length === 0) return null;
        const res = await fetch(`/api/de-xuat?id=${deXuats[0].id}`);
        return await res.json();
    };

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

    const handleQtyBlur = (lopId, vtId, maxQty) => {
        const key = `${lopId}-${vtId}`;
        setExportItems(prev => {
            const val = prev[key];
            // Nếu trống hoặc 0, xóa item
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
            return;
        }

        // Group by mon_hoc for submission, then MERGE same vat_tu
        const groupedByMon = {};
        if (deXuatDetail && deXuatDetail.chi_tiet) {
            Object.entries(exportItems).forEach(([key, qty]) => {
                const [lopId, vtId] = key.split('-');
                const ct = deXuatDetail.chi_tiet.find(c => c.lop_id === parseInt(lopId) && c.vat_tu_id === parseInt(vtId));
                if (ct) {
                    if (!groupedByMon[ct.mon_hoc_id]) {
                        groupedByMon[ct.mon_hoc_id] = {};
                    }
                    // Merge: cộng dồn nếu vật tư đã có
                    const vtIdKey = ct.vat_tu_id;
                    groupedByMon[ct.mon_hoc_id][vtIdKey] = (groupedByMon[ct.mon_hoc_id][vtIdKey] || 0) + parseInt(qty);
                }
            });
        }

        setSubmitting(true);
        setError('');

        try {
            // Create one phieu for each subject
            for (const [monId, vtMap] of Object.entries(groupedByMon)) {
                const chiTiet = Object.entries(vtMap).map(([vtId, soLuong]) => ({
                    vat_tu_id: parseInt(vtId),
                    so_luong: soLuong
                }));

                const res = await fetch('/api/phieu-xuat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        giao_vien_id: parseInt(selectedGv),
                        ki_id: parseInt(selectedKi),
                        mon_hoc_id: parseInt(monId),
                        chi_tiet: chiTiet,
                    }),
                });

                if (!res.ok) {
                    const data = await res.json();
                    setError(data.error || 'Có lỗi xảy ra');
                    setSubmitting(false);
                    return;
                }
            }

            setSubmitted(true);
            // Refresh data
            const pxRes = await fetch(`/api/phieu-xuat?ki_id=${selectedKi}&giao_vien_id=${selectedGv}`);
            setPhieuXuats(await pxRes.json());
        } catch (err) {
            setError('Không thể kết nối đến server');
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
                            <p style="margin-top: 5px;">Phòng (Khoa): <span style="border-bottom: 1px dotted #000; flex: 1; display: inline-block; min-width: 285px;">............................................</span></p>
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

    const printDeXuatPhieu = () => {
        if (!deXuatDetail || !deXuatDetail.chi_tiet) return;

        const gv = giaoViens.find(g => g.id === parseInt(selectedGv));
        if (!gv) return;

        // Filter details by selected subject
        const filteredDetails = deXuatDetail.chi_tiet.filter(ct => ct.mon_hoc_id === parseInt(selectedMon));
        if (filteredDetails.length === 0) return;

        const firstCt = filteredDetails[0];
        const data = {
            ten_gv: gv.ho_ten,
            ten_mon: firstCt.ten_mon,
            ten_lop: firstCt.ten_lop,
            si_so: firstCt.si_so,
            chi_tiet: filteredDetails,
            id: null, // No ID for proposal print
            ngay_tao: deXuatDetail.ngay_nop
        };

        const html = getPrintHTML(data);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    };

    const printClassProposal = (cls) => {
        const gv = giaoViens.find(g => g.id === parseInt(selectedGv));
        if (!gv) return;

        // Use ONLY items from this class and subject, and apply practical limits
        const classDetails = cls.items
            .filter(it => it.mon_hoc_id === parseInt(selectedMon))
            .map(ct => {
                const stats = exportedMap[ct.vat_tu_id] || { da_xuat: 0, total_supply: 0, total_proposed: 0 };
                const alreadyExported = stats.da_xuat || 0;
                const proposedQty = ct.so_luong || 0;

                const totalProposed = stats.total_proposed || proposedQty;
                const supply = stats.total_supply || 0;
                const ratio = (totalProposed > 0 && supply < totalProposed) ? supply / totalProposed : 1;
                const practicalTotal = Math.floor(proposedQty * ratio);
                const canXuatThucTe = Math.max(0, practicalTotal - alreadyExported);

                return {
                    ...ct,
                    so_luong: canXuatThucTe // Show the practical amount instead of original proposal
                };
            })
            .filter(ct => ct.so_luong > 0); // Only print items that can actually be exported

        if (classDetails.length === 0) {
            setError('Không có vật tư nào khả thi để xuất cho lớp này');
            return;
        }

        const data = {
            ten_gv: gv.ho_ten,
            ten_mon: cls.ten_mon,
            ten_lop: cls.ten_lop,
            si_so: cls.si_so,
            chi_tiet: classDetails,
            id: null,
            ngay_tao: deXuatDetail?.ngay_nop
        };

        const html = getPrintHTML(data);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    };

    if (kiHocs.length === 0) {
        return (
            <div className="public-page">
                <div className="public-container" style={{ textAlign: 'center', paddingTop: 100 }}>
                    <FileOutput size={60} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                    <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Chưa có kỳ hoạt động</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Kỳ học chưa ở trạng thái hoạt động để tạo phiếu xuất.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="public-page">
            <div className="public-container">
                <div className="public-header">
                    <h1>📤 Phiếu xuất vật tư</h1>
                    <p>Xem đề xuất, tạo phiếu xuất và tải phiếu in</p>
                </div>

                {/* Select teacher */}
                <div style={{ display: 'grid', gridTemplateColumns: selectedGv ? '1fr 1fr' : '1fr', gap: 24, marginBottom: 24 }}>
                    <div className="card">
                        <div className="card-header"><h2>1. Chọn giáo viên</h2></div>
                        <div className="card-body">
                            <select className="form-select" value={selectedGv} onChange={e => { setSelectedGv(e.target.value); setMode('view'); }}>
                                <option value="">-- Chọn giáo viên --</option>
                                {giaoViens.map(gv => <option key={gv.id} value={gv.id}>{gv.ho_ten}</option>)}
                            </select>
                        </div>
                    </div>

                    {selectedGv && deXuatDetail && deXuatDetail.chi_tiet && (
                        <div className="card">
                            <div className="card-header"><h2>2. Chọn môn học</h2></div>
                            <div className="card-body">
                                <select className="form-select" value={selectedMon} onChange={e => { setSelectedMon(e.target.value); setMode('view'); }}>
                                    <option value="">-- Chọn môn học --</option>
                                    {Array.from(new Set(deXuatDetail.chi_tiet.map(ct => JSON.stringify({ id: ct.mon_hoc_id, name: ct.ten_mon }))))
                                        .map(mStr => JSON.parse(mStr))
                                        .map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))
                                    }
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {selectedGv && selectedMon && (
                    <>

                        {/* Existing export slips */}
                        {phieuXuats.length > 0 && (
                            <div className="card" style={{ marginBottom: 24 }}>
                                <div className="card-header">
                                    <h2>📄 Phiếu xuất đã tạo</h2>
                                    <span className="badge badge-primary">{phieuXuats.length} phiếu</span>
                                </div>
                                <div className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Mã phiếu</th>
                                                <th>Môn học</th>
                                                <th>Số vật tư</th>
                                                <th>Ngày tạo</th>
                                                <th>Trạng thái</th>
                                                <th>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {phieuXuats.map(px => (
                                                <tr key={px.id}>
                                                    <td style={{ fontWeight: 500, color: 'var(--text-accent)' }}>PX-{String(px.id).padStart(4, '0')}</td>
                                                    <td>{px.ten_mon}</td>
                                                    <td>{px.so_vat_tu} ({px.tong_so_luong})</td>
                                                    <td>{new Date(px.ngay_tao).toLocaleDateString('vi-VN')}</td>
                                                    <td><span className={`badge ${statusLabels[px.trang_thai]?.badge}`}>{statusLabels[px.trang_thai]?.label}</span></td>
                                                    <td>
                                                        <div className="table-actions">
                                                            <button className="btn btn-sm btn-secondary" onClick={() => generatePDF(px)}>
                                                                <Download size={14} /> Tải PDF
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Create new export slip */}
                        {mode === 'view' && deXuats.length > 0 && (
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <button className="btn btn-primary btn-lg" onClick={handleCreatePhieu}>
                                    <Plus size={20} /> Tạo phiếu xuất mới
                                </button>
                            </div>
                        )}

                        {mode === 'create' && !submitted && deXuatDetail && (
                            <div className="card" style={{ marginBottom: 24 }}>
                                <div className="card-header">
                                    <div>
                                        <h2>📝 Xuất vật tư theo lớp</h2>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Chọn vật tư từ đề xuất để xuất kho</p>
                                    </div>
                                </div>
                                <div className="card-body">
                                    {error && <div className="alert alert-error" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <AlertCircle size={18} /> {error}
                                    </div>}

                                    {(() => {
                                        // Group chi tiết đề xuất theo lớp
                                        const groupedByClass = {};
                                        if (deXuatDetail.chi_tiet) {
                                            deXuatDetail.chi_tiet.forEach(ct => {
                                                if (!groupedByClass[ct.lop_id]) {
                                                    groupedByClass[ct.lop_id] = {
                                                        ten_lop: ct.ten_lop,
                                                        si_so: ct.si_so,
                                                        // items: [] // Removed here, will handle below
                                                    };
                                                }
                                                // Group all items, but we'll prioritize ten_mon later
                                                if (!groupedByClass[ct.lop_id].items) groupedByClass[ct.lop_id].items = [];
                                                groupedByClass[ct.lop_id].items.push(ct);
                                            });
                                        }

                                        const classes = Object.entries(groupedByClass)
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

                                        if (classes.length === 0) {
                                            return <div className="empty-state"><BookOpen size={48} /><h3>Chưa có đề xuất</h3></div>;
                                        }

                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                {classes.map((cls) => {
                                                    const isExpanded = expandedClass[cls.lop_id];
                                                    const classTotal = cls.items.reduce((sum, ct) => {
                                                        const key = `${cls.lop_id}-${ct.vat_tu_id}`;
                                                        return sum + (exportItems[key] || 0);
                                                    }, 0);

                                                    return (
                                                        <div key={cls.lop_id} style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                                            {/* Class Header */}
                                                            <div
                                                                onClick={() => toggleClass(cls.lop_id)}
                                                                style={{
                                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                    padding: '12px 16px', background: 'var(--bg-glass)',
                                                                    cursor: 'pointer', userSelect: 'none'
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                                                    <ChevronDown size={18} style={{ transform: isExpanded ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s', color: 'var(--text-accent)' }} />
                                                                    <div>
                                                                        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>{cls.ten_lop}</h3>
                                                                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sĩ số: {cls.si_so} • {cls.ten_mon}</p>
                                                                    </div>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                                    <button
                                                                        className="btn-icon"
                                                                        title="In phiếu đề xuất lớp này"
                                                                        onClick={(e) => { e.stopPropagation(); printClassProposal(cls); }}
                                                                        style={{ width: 28, height: 28 }}
                                                                    >
                                                                        <Printer size={14} />
                                                                    </button>
                                                                    {classTotal > 0 && (
                                                                        <span className="badge badge-success">{classTotal} {cls.items[0]?.don_vi_tinh}</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Class Content */}
                                                            {isExpanded && (
                                                                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                        {cls.items.filter(it => it.mon_hoc_id === parseInt(selectedMon)).map(ct => {
                                                                            const key = `${cls.lop_id}-${ct.vat_tu_id}`;
                                                                            const qty = exportItems[key] || 0;
                                                                            const proposedQty = ct.so_luong || 0;
                                                                            const stats = exportedMap[ct.vat_tu_id] || { da_xuat: 0, total_supply: 0, total_proposed: 0 };
                                                                            const alreadyExported = stats.da_xuat || 0;
                                                                            const remainingQty = Math.max(0, proposedQty - alreadyExported);

                                                                            // Calculate practical limit based on total supply ratio (fixed for the semester)
                                                                            const totalProposed = stats.total_proposed || proposedQty;
                                                                            const supply = stats.total_supply || 0;
                                                                            const ratio = (totalProposed > 0 && supply < totalProposed) ? supply / totalProposed : 1;
                                                                            const practicalTotal = Math.floor(proposedQty * ratio);
                                                                            const canXuatThucTe = Math.max(0, practicalTotal - alreadyExported);
                                                                            const isCapped = ratio < 1;

                                                                            const maxQty = Math.min(remainingQty, canXuatThucTe);

                                                                            return (
                                                                                <div key={key} style={{
                                                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                                    padding: '10px 12px', background: qty > 0 ? 'rgba(56,189,248,0.08)' : 'white',
                                                                                    border: qty > 0 ? '1px solid rgba(56,189,248,0.3)' : '1px solid var(--border-color)',
                                                                                    borderRadius: 'var(--radius-md)',
                                                                                    opacity: maxQty <= 0 ? 0.6 : 1
                                                                                }}>
                                                                                    <div style={{ flex: 1 }}>
                                                                                        <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{ct.ten_vat_tu}</h4>
                                                                                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                                                            {ct.yeu_cau_ky_thuat && `${ct.yeu_cau_ky_thuat} • `}
                                                                                            <span style={{ fontWeight: 600, color: '#f87171' }}>Đề xuất: {proposedQty} • Còn lại: <span style={{ color: remainingQty > 0 ? '#34d399' : '#ef4444' }}>{remainingQty}</span> {ct.don_vi_tinh}</span>
                                                                                            {isCapped && <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 600 }}>(Tỉ lệ cấp: {Math.round(ratio * 100)}%)</span>}
                                                                                            <span style={{ marginLeft: 8, color: 'var(--text-accent)', fontWeight: 700 }}>• Có thể xuất thực tế: <span style={{ color: canXuatThucTe > 0 ? 'var(--text-accent)' : '#ef4444' }}>{canXuatThucTe}</span> {ct.don_vi_tinh}</span>
                                                                                        </p>
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                        <button
                                                                                            className="btn-icon"
                                                                                            onClick={() => updateExportQty(cls.lop_id, ct.vat_tu_id, -1, maxQty)}
                                                                                            disabled={qty === 0}
                                                                                            style={{ opacity: qty === 0 ? 0.5 : 1 }}
                                                                                        >
                                                                                            <Minus size={14} />
                                                                                        </button>
                                                                                        <input
                                                                                            type="number"
                                                                                            className="form-input"
                                                                                            style={{ width: 60, textAlign: 'center', padding: '6px', fontSize: 13 }}
                                                                                            value={qty === '' ? '' : qty}
                                                                                            onChange={e => setExportQty(cls.lop_id, ct.vat_tu_id, e.target.value, maxQty)}
                                                                                            onBlur={() => handleQtyBlur(cls.lop_id, ct.vat_tu_id, maxQty)}
                                                                                            min="0"
                                                                                            max={maxQty}
                                                                                        />
                                                                                        <button
                                                                                            className="btn-icon"
                                                                                            onClick={() => updateExportQty(cls.lop_id, ct.vat_tu_id, 1, maxQty)}
                                                                                            disabled={qty >= maxQty}
                                                                                            style={{ opacity: qty >= maxQty ? 0.5 : 1 }}
                                                                                        >
                                                                                            <Plus size={14} />
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
                                        );
                                    })()}

                                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                                        <button className="btn btn-secondary" onClick={() => setMode('view')}>Hủy</button>
                                        <button className="btn btn-primary btn-full" onClick={handleSubmitPhieu} disabled={submitting}>
                                            {submitting ? <div className="spinner" /> : <><Send size={18} /> Tạo phiếu xuất</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {submitted && (
                            <div className="card" style={{ textAlign: 'center', marginBottom: 24 }}>
                                <div className="card-body" style={{ padding: 40 }}>
                                    <CheckCircle size={48} color="#34d399" style={{ marginBottom: 16 }} />
                                    <h2 style={{ marginBottom: 8 }}>Tạo phiếu xuất thành công!</h2>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Phiếu xuất đã được gửi đến quản lý kho để ký duyệt.</p>
                                    <button className="btn btn-primary" onClick={handleCreatePhieu}>Tạo phiếu mới</button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
