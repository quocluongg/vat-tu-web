'use client';
import { useState, useEffect } from 'react';
import { FileOutput, Eye, Check, X, Truck, Clock, CheckCircle, XCircle, FileCheck, Printer, Edit2, Save, RotateCcw, Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/components/Toast';

const statusConfig = {
    cho_duyet: { label: 'Chờ duyệt', badge: 'badge-warning', icon: Clock },
    da_ky: { label: 'Đã ký', badge: 'badge-info', icon: FileCheck },
    da_xuat: { label: 'Đã xuất', badge: 'badge-success', icon: CheckCircle },
    tu_choi: { label: 'Từ chối', badge: 'badge-danger', icon: XCircle },
};

export default function PhieuXuatAdminPage() {
    const [phieuXuats, setPhieuXuats] = useState([]);
    const [kiHocs, setKiHocs] = useState([]);
    const [selectedKi, setSelectedKi] = useState('');
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedDetails, setEditedDetails] = useState({}); // { pxct_id: quantity }
    const [saving, setSaving] = useState(false);
    // Add material modal
    const [addVtModal, setAddVtModal] = useState(false);
    const [allVatTus, setAllVatTus] = useState([]);
    const [addVtSearch, setAddVtSearch] = useState('');
    const [newItems, setNewItems] = useState({}); // { vat_tu_id: so_luong }
    const [addingSaving, setAddingSaving] = useState(false);
    const addToast = useToast();

    useEffect(() => {
        fetch('/api/ki-hoc').then(r => r.json()).then(data => {
            setKiHocs(data);
            if (data.length > 0) setSelectedKi(data[0].id.toString());
            setLoading(false);
        });
    }, []);

    const fetchData = async () => {
        if (!selectedKi) return;
        const res = await fetch(`/api/phieu-xuat?ki_id=${selectedKi}`);
        const data = await res.json();
        setPhieuXuats(data);
    };

    const fetchAllVatTus = async () => {
        if (!selectedKi) return;
        const res = await fetch(`/api/vat-tu?ki_id=${selectedKi}`);
        const data = await res.json();
        setAllVatTus(data);
    };

    useEffect(() => { if (selectedKi) { fetchData(); fetchAllVatTus(); } }, [selectedKi]);

    const viewDetail = async (px) => {
        const res = await fetch(`/api/phieu-xuat?id=${px.id}`);
        const data = await res.json();
        setDetail(data);
        setIsEditing(false);
        setEditedDetails({});
    };

    const handleAddNewItems = async () => {
        if (!detail) return;
        const items = Object.entries(newItems).filter(([_, qty]) => qty > 0).map(([vtId, qty]) => ({ vat_tu_id: parseInt(vtId), so_luong: qty }));
        if (items.length === 0) { addToast('Chưa chọn vật tư nào', 'info'); return; }
        setAddingSaving(true);
        try {
            const res = await fetch('/api/phieu-xuat', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: detail.id, new_items: items })
            });
            const result = await res.json();
            if (!res.ok) { addToast(result.error || 'Lỗi', 'error'); }
            else {
                addToast(`Đã thêm ${items.length} vật tư vào phiếu`, 'success');
                setAddVtModal(false); setNewItems({}); setAddVtSearch('');
                const r2 = await fetch(`/api/phieu-xuat?id=${detail.id}`); setDetail(await r2.json());
                fetchData();
            }
        } catch (e) { addToast('Lỗi kết nối', 'error'); }
        setAddingSaving(false);
    };

    const handleDeleteChiTiet = async (ctId, tenVt) => {
        if (!confirm(`Xóa "${tenVt}" khỏi phiếu xuất?`)) return;
        try {
            const res = await fetch('/api/phieu-xuat', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: detail.id, chi_tiet: [{ id: ctId, so_luong: 0 }] })
            });
            if (res.ok) {
                addToast('Đã xóa vật tư khỏi phiếu', 'success');
                const r2 = await fetch(`/api/phieu-xuat?id=${detail.id}`); setDetail(await r2.json());
                fetchData();
            } else { const d = await res.json(); addToast(d.error || 'Lỗi', 'error'); }
        } catch (e) { addToast('Lỗi kết nối', 'error'); }
    };

    const handleSaveAdjustments = async () => {
        if (!detail) return;
        setSaving(true);
        try {
            const chiTietPayload = Object.entries(editedDetails).map(([id, qty]) => ({
                id: parseInt(id),
                so_luong: qty
            }));

            if (chiTietPayload.length === 0) {
                addToast('Không có thay đổi nào để lưu', 'info');
                setIsEditing(false);
                setSaving(false);
                return;
            }

            const res = await fetch('/api/phieu-xuat', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: detail.id,
                    chi_tiet: chiTietPayload
                })
            });

            const result = await res.json();

            if (!res.ok) {
                addToast(result.error || 'Không thể lưu điều chỉnh', 'error');
            } else {
                addToast('Đã cập nhật số lượng vật tư thành công', 'success');
                setIsEditing(false);
                setEditedDetails({});
                // Reload detail
                const detailRes = await fetch(`/api/phieu-xuat?id=${detail.id}`);
                const detailData = await detailRes.json();
                setDetail(detailData);
                fetchData();
            }
        } catch (err) {
            addToast('Lỗi khi kết nối server', 'error');
        }
        setSaving(false);
    };

    const updateStatus = async (id, trang_thai) => {
        try {
            const res = await fetch('/api/phieu-xuat', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, trang_thai }),
            });
            
            if (!res.ok) {
                const errorData = await res.json();
                addToast(errorData.error || 'Lỗi hệ thống', 'error');
                return;
            }

            addToast(`Cập nhật: ${statusConfig[trang_thai].label}`, 'success');
            fetchData();
            setDetail(null);
        } catch (err) {
            addToast('Lỗi kết nối đến máy chủ', 'error');
        }
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
    <title>Phiếu Xuất Vật Tư - ${data.ten_gv}</title>
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

    const generatePDF = async (pxId) => {
        const res = await fetch(`/api/phieu-xuat?id=${pxId}`);
        const data = await res.json();
        const html = getPrintHTML(data);
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    };

    if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>📤 Quản lý Phiếu xuất</h1>
                    <p>Duyệt và xuất vật tư cho giáo viên</p>
                </div>
                <div className="page-header-actions">
                    <select className="form-select" style={{ width: 220 }} value={selectedKi} onChange={e => setSelectedKi(e.target.value)}>
                        {kiHocs.map(k => <option key={k.id} value={k.id}>{k.ten_ki} - {k.nam_hoc}</option>)}
                    </select>
                </div>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
                {Object.entries(statusConfig).map(([key, config]) => {
                    const count = phieuXuats.filter(px => px.trang_thai === key).length;
                    return (
                        <div className={`stat-card ${key === 'cho_duyet' ? 'warning' : key === 'da_ky' ? 'info' : key === 'da_xuat' ? 'success' : 'danger'}`} key={key}>
                            <div className={`stat-icon ${key === 'cho_duyet' ? 'warning' : key === 'da_ky' ? 'info' : key === 'da_xuat' ? 'success' : 'danger'}`}>
                                <config.icon size={24} />
                            </div>
                            <div className="stat-info">
                                <h3>{count}</h3>
                                <p>{config.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã phiếu</th>
                                <th>Giáo viên</th>
                                <th>Môn học</th>
                                <th>Lớp</th>
                                <th>Số vật tư</th>
                                <th>Ngày tạo</th>
                                <th>Trạng thái</th>
                                <th style={{ width: 100 }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {phieuXuats.length === 0 ? (
                                <tr><td colSpan={8}><div className="empty-state"><FileOutput size={48} /><h3>Chưa có phiếu xuất</h3></div></td></tr>
                            ) : phieuXuats.map(px => (
                                <tr key={px.id}>
                                    <td style={{ fontWeight: 500, color: 'var(--text-accent)' }}>PX-{String(px.id).padStart(4, '0')}</td>
                                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{px.ten_gv}</td>
                                    <td>{px.ten_mon}</td>
                                    <td>{px.ten_lop || '—'}</td>
                                    <td>{px.so_vat_tu} ({px.tong_so_luong} đơn vị)</td>
                                    <td>{new Date(px.ngay_tao).toLocaleDateString('vi-VN')}</td>
                                    <td><span className={`badge ${statusConfig[px.trang_thai].badge}`}>{statusConfig[px.trang_thai].label}</span></td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="btn-icon" onClick={() => viewDetail(px)} title="Chi tiết"><Eye size={16} /></button>
                                            <button className="btn-icon" onClick={() => generatePDF(px.id)} title="In phiếu"><Printer size={16} /></button>
                                            {px.trang_thai === 'cho_duyet' && (
                                                <>
                                                    <button className="btn-icon" onClick={() => updateStatus(px.id, 'da_ky')} title="Ký duyệt" style={{ color: '#60a5fa' }}><Check size={16} /></button>
                                                    <button className="btn-icon" onClick={() => updateStatus(px.id, 'tu_choi')} title="Từ chối" style={{ color: '#f87171' }}><X size={16} /></button>
                                                </>
                                            )}
                                            {px.trang_thai === 'da_ky' && (
                                                <button className="btn-icon" onClick={() => updateStatus(px.id, 'da_xuat')} title="Xuất vật tư" style={{ color: '#34d399' }}><Truck size={16} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {detail && (
                <div className="modal-overlay" onClick={() => setDetail(null)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>Phiếu xuất PX-{String(detail.id).padStart(4, '0')}</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                                    {detail.ten_gv} • {detail.ten_mon}{detail.ten_lop ? ` • Lớp: ${detail.ten_lop}` : ''}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span className={`badge ${statusConfig[detail.trang_thai].badge}`}>{statusConfig[detail.trang_thai].label}</span>
                                <button className="btn-ghost" onClick={() => setDetail(null)}>✕</button>
                            </div>
                        </div>
                        <div className="modal-body">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Vật tư</th>
                                        <th>Yêu cầu KT</th>
                                        <th>Đơn vị</th>
                                        <th>Số lượng xuất</th>
                                        <th>Tồn kho</th>
                                        {detail.trang_thai !== 'da_xuat' && <th style={{ width: 70 }}>Xóa</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {detail.chi_tiet?.map((ct, i) => (
                                        <tr key={ct.id}>
                                            <td>{i + 1}</td>
                                            <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{ct.ten_vat_tu}</td>
                                            <td>{ct.yeu_cau_ky_thuat || '—'}</td>
                                            <td><span className="badge badge-info">{ct.don_vi_tinh}</span></td>
                                            <td style={{ fontWeight: 600, color: 'var(--text-accent)' }}>
                                                {isEditing ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <input
                                                            type="number"
                                                            className="form-input"
                                                            style={{ width: 70, padding: '4px 8px', textAlign: 'center' }}
                                                            value={editedDetails[ct.id] !== undefined ? editedDetails[ct.id] : ct.so_luong}
                                                            min="0"
                                                            onChange={(e) => setEditedDetails({ ...editedDetails, [ct.id]: Math.max(0, parseInt(e.target.value) || 0) })}
                                                        />
                                                        {(editedDetails[ct.id] === 0) && <span style={{ fontSize: 11, color: '#f87171', fontWeight: 400 }}>(Xóa)</span>}
                                                    </div>
                                                ) : (
                                                    ct.so_luong
                                                )}
                                            </td>
                                            <td>{ct.so_luong_kho}</td>
                                            {detail.trang_thai !== 'da_xuat' && (
                                                <td>
                                                    <button className="btn-icon" title="Xóa vật tư này" onClick={() => handleDeleteChiTiet(ct.id, ct.ten_vat_tu)} style={{ color: '#f87171' }}>
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {detail.trang_thai !== 'da_xuat' && (
                                <div style={{ marginTop: 16, textAlign: 'center' }}>
                                    <button className="btn btn-secondary" onClick={() => { setAddVtModal(true); setNewItems({}); setAddVtSearch(''); }} style={{ gap: 6 }}>
                                        <Plus size={16} /> Thêm vật tư mới
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                            <div>
                                {(detail.trang_thai !== 'tu_choi') && (
                                    <button className="btn btn-secondary" onClick={() => generatePDF(detail.id)}>
                                        <Printer size={16} /> In phiếu xuất
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {isEditing ? (
                                    <>
                                        <button className="btn btn-ghost" onClick={() => { setIsEditing(false); setEditedDetails({}); }}>
                                            <RotateCcw size={16} /> Hủy
                                        </button>
                                        <button className="btn btn-primary" onClick={handleSaveAdjustments} disabled={saving}>
                                            <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu điều chỉnh'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {(detail.trang_thai === 'cho_duyet' || detail.trang_thai === 'da_ky') && (
                                            <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
                                                <Edit2 size={16} /> Điều chỉnh
                                            </button>
                                        )}
                                        
                                        {detail.trang_thai === 'cho_duyet' && (
                                            <>
                                                <button className="btn btn-danger" onClick={() => updateStatus(detail.id, 'tu_choi')}>
                                                    <X size={16} /> Từ chối
                                                </button>
                                                <button className="btn btn-primary" onClick={() => updateStatus(detail.id, 'da_ky')}>
                                                    <Check size={16} /> Ký duyệt
                                                </button>
                                            </>
                                        )}
                                        {detail.trang_thai === 'da_ky' && (
                                            <button className="btn btn-success" onClick={() => updateStatus(detail.id, 'da_xuat')}>
                                                <Truck size={16} /> Xuất vật tư
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Material Modal */}
            {addVtModal && (() => {
                const searchQ = addVtSearch.toLowerCase().trim();
                const existingVtIds = new Set((detail?.chi_tiet || []).map(ct => ct.vat_tu_id));
                const filtered = allVatTus
                    .filter(vt => !existingVtIds.has(vt.id) || newItems[vt.id])
                    .filter(vt => !searchQ || vt.ten_vat_tu.toLowerCase().includes(searchQ) || (vt.yeu_cau_ky_thuat || '').toLowerCase().includes(searchQ));
                const selectedCount = Object.values(newItems).filter(q => q > 0).length;
                return (
                    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setAddVtModal(false)}>
                        <div className="modal" style={{ maxWidth: 620, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div>
                                    <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Plus size={18} style={{ color: 'var(--text-accent)' }} /> Thêm vật tư vào phiếu xuất
                                    </h2>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                        PX-{String(detail?.id).padStart(4, '0')} • {detail?.ten_gv}
                                    </p>
                                </div>
                                <button className="btn-ghost" onClick={() => setAddVtModal(false)}>✕</button>
                            </div>
                            <div style={{ padding: '0 24px 12px', position: 'relative' }}>
                                <Search size={15} style={{ position: 'absolute', left: 36, top: 12, color: 'var(--text-muted)', pointerEvents: 'none' }} />
                                <input className="form-input" style={{ paddingLeft: 36, fontSize: 14 }} placeholder="Tìm vật tư..." value={addVtSearch} autoFocus onChange={e => setAddVtSearch(e.target.value)} />
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 16px' }}>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
                                    {filtered.length} vật tư {selectedCount > 0 && `• Đã chọn: ${selectedCount}`}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {filtered.slice(0, 50).map(vt => {
                                        const qty = newItems[vt.id] || 0;
                                        const alreadyInPhieu = existingVtIds.has(vt.id);
                                        return (
                                            <div key={vt.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 10, border: qty > 0 ? '1.5px solid rgba(14,165,233,0.5)' : '1px solid var(--border-color)', background: qty > 0 ? 'rgba(14,165,233,0.05)' : alreadyInPhieu ? 'rgba(99,102,241,0.04)' : 'var(--bg-glass)' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        {vt.ten_vat_tu}
                                                        {alreadyInPhieu && <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>Đã có</span>}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                                                        {vt.yeu_cau_ky_thuat || '—'} • {vt.don_vi_tinh} • Kho: <span style={{ color: vt.so_luong_kho > 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>{vt.so_luong_kho}</span>
                                                    </div>
                                                </div>
                                                <input type="number" className="form-input" style={{ width: 70, padding: '4px 8px', textAlign: 'center', fontSize: 13 }} placeholder="SL" min="0" max={vt.so_luong_kho} value={qty || ''} onChange={e => { const v = Math.max(0, Math.min(parseInt(e.target.value) || 0, vt.so_luong_kho)); setNewItems(prev => { if (v === 0) { const { [vt.id]: _, ...rest } = prev; return rest; } return { ...prev, [vt.id]: v }; }); }} />
                                            </div>
                                        );
                                    })}
                                    {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Không tìm thấy vật tư</div>}
                                </div>
                            </div>
                            <div className="modal-footer" style={{ padding: '12px 24px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button className="btn btn-secondary" onClick={() => setAddVtModal(false)}>Hủy</button>
                                <button className="btn btn-primary" disabled={selectedCount === 0 || addingSaving} onClick={handleAddNewItems} style={{ minWidth: 140 }}>
                                    {addingSaving ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <><Plus size={15} /> Thêm {selectedCount} vật tư</>}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
