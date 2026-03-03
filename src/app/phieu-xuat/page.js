'use client';
import { useState, useEffect } from 'react';
import { FileOutput, Eye, Plus, Minus, Send, CheckCircle, Download, BookOpen, Package, Clock } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function PhieuXuatPublicPage() {
    const [kiHocs, setKiHocs] = useState([]);
    const [giaoViens, setGiaoViens] = useState([]);
    const [selectedKi, setSelectedKi] = useState('');
    const [selectedGv, setSelectedGv] = useState('');
    const [phanCongs, setPhanCongs] = useState([]);
    const [deXuats, setDeXuats] = useState([]);
    const [phieuXuats, setPhieuXuats] = useState([]);
    const [vatTus, setVatTus] = useState([]);
    const [mode, setMode] = useState('view'); // view, create
    const [selectedMon, setSelectedMon] = useState('');
    const [exportItems, setExportItems] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [viewingPx, setViewingPx] = useState(null);

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
                .then(r => r.json()).then(setDeXuats);
            fetch(`/api/phieu-xuat?ki_id=${selectedKi}&giao_vien_id=${selectedGv}`)
                .then(r => r.json()).then(setPhieuXuats);
            fetch(`/api/vat-tu?ki_id=${selectedKi}`)
                .then(r => r.json()).then(setVatTus);
        }
    }, [selectedKi, selectedGv]);

    const getDeXuatDetail = async () => {
        if (deXuats.length === 0) return null;
        const res = await fetch(`/api/de-xuat?id=${deXuats[0].id}`);
        return await res.json();
    };

    const handleCreatePhieu = () => {
        setMode('create');
        setSelectedMon('');
        setExportItems({});
        setSubmitted(false);
        setError('');
    };

    const updateExportQty = (vtId, delta) => {
        setExportItems(prev => {
            const current = prev[vtId] || 0;
            const newVal = Math.max(0, current + delta);
            if (newVal === 0) {
                const { [vtId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [vtId]: newVal };
        });
    };

    const setExportQty = (vtId, value) => {
        const val = parseInt(value) || 0;
        setExportItems(prev => {
            if (val <= 0) {
                const { [vtId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [vtId]: val };
        });
    };

    const handleSubmitPhieu = async () => {
        const chiTiet = Object.entries(exportItems).map(([vtId, soLuong]) => ({
            vat_tu_id: parseInt(vtId),
            so_luong: soLuong,
        })).filter(ct => ct.so_luong > 0);

        if (chiTiet.length === 0) {
            setError('Vui lòng chọn ít nhất một vật tư');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/phieu-xuat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    giao_vien_id: parseInt(selectedGv),
                    ki_id: parseInt(selectedKi),
                    mon_hoc_id: parseInt(selectedMon),
                    chi_tiet: chiTiet,
                }),
            });

            if (res.ok) {
                setSubmitted(true);
                // Refresh data
                const pxRes = await fetch(`/api/phieu-xuat?ki_id=${selectedKi}&giao_vien_id=${selectedGv}`);
                setPhieuXuats(await pxRes.json());
            } else {
                const data = await res.json();
                setError(data.error || 'Có lỗi xảy ra');
            }
        } catch (err) {
            setError('Không thể kết nối đến server');
        }
        setSubmitting(false);
    };

    const generatePDF = async (px) => {
        const res = await fetch(`/api/phieu-xuat?id=${px.id}`);
        const data = await res.json();

        const rows = data.chi_tiet.map((ct, i) => `
            <tr>
                <td style="text-align:center">${i + 1}</td>
                <td>${ct.ten_vat_tu}</td>
                <td>${ct.yeu_cau_ky_thuat || ''}</td>
                <td style="text-align:center">${ct.don_vi_tinh}</td>
                <td style="text-align:center">${ct.so_luong}</td>
            </tr>
        `).join('');

        const html = `<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Phiếu xuất PX-${String(data.id).padStart(4, '0')}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', serif; font-size: 13px; color: #000; padding: 20mm; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { font-size: 20px; text-transform: uppercase; margin-bottom: 4px; }
        .header p { font-size: 13px; color: #555; }
        .info { margin-bottom: 16px; line-height: 1.8; }
        .info p { font-size: 13px; }
        .info strong { font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th, td { border: 1px solid #333; padding: 6px 10px; font-size: 13px; }
        th { background: #2980b9; color: #fff; font-weight: 600; text-align: center; }
        td { vertical-align: middle; }
        .signatures { display: flex; justify-content: space-between; margin-top: 40px; text-align: center; }
        .sig-block { width: 30%; }
        .sig-block h3 { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
        .sig-block p { font-size: 12px; color: #555; font-style: italic; }
        @media print { body { padding: 10mm; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>Phiếu xuất vật tư</h1>
        <p>Mã phiếu: PX-${String(data.id).padStart(4, '0')}</p>
    </div>
    <div class="info">
        <p><strong>Giáo viên:</strong> ${data.ten_gv}</p>
        <p><strong>Môn học:</strong> ${data.ten_mon}</p>
        <p><strong>Ngành:</strong> ${data.ten_nganh} - ${data.ten_he}</p>
        <p><strong>Ngày tạo:</strong> ${new Date(data.ngay_tao).toLocaleDateString('vi-VN')}</p>
    </div>
    <table>
        <thead>
            <tr>
                <th style="width:40px">STT</th>
                <th>Vật tư</th>
                <th>Yêu cầu kỹ thuật</th>
                <th style="width:60px">ĐVT</th>
                <th style="width:70px">Số lượng</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>
    <div class="signatures">
        <div class="sig-block">
            <h3>Người đề xuất</h3>
            <p>(Ký, ghi rõ họ tên)</p>
        </div>
        <div class="sig-block">
            <h3>Trưởng khoa</h3>
            <p>(Ký, ghi rõ họ tên)</p>
        </div>
        <div class="sig-block">
            <h3>Người phụ trách kho</h3>
            <p>(Ký, ghi rõ họ tên)</p>
        </div>
    </div>
</body>
</html>`;

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

    if (kiHocs.length === 0) {
        return (
            <div className="public-page">
                <div style={{ position: 'absolute', top: 24, right: 24 }}>
                    <ThemeToggle />
                </div>
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
            <div style={{ position: 'absolute', top: 24, right: 24 }}>
                <ThemeToggle />
            </div>
            <div className="public-container">
                <div className="public-header">
                    <h1>📤 Phiếu xuất vật tư</h1>
                    <p>Xem đề xuất, tạo phiếu xuất và tải phiếu in</p>
                </div>

                {/* Select teacher */}
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header"><h2>Chọn giáo viên</h2></div>
                    <div className="card-body">
                        <select className="form-select" value={selectedGv} onChange={e => { setSelectedGv(e.target.value); setMode('view'); }}>
                            <option value="">-- Chọn giáo viên --</option>
                            {giaoViens.map(gv => <option key={gv.id} value={gv.id}>{gv.ho_ten}</option>)}
                        </select>
                    </div>
                </div>

                {selectedGv && (
                    <>
                        {/* Viewing proposals */}
                        {deXuats.length > 0 && (
                            <div className="card" style={{ marginBottom: 24 }}>
                                <div className="card-header">
                                    <h2>📋 Đề xuất đã gửi</h2>
                                    <span className={`badge ${deXuats[0].trang_thai === 'duyet' ? 'badge-success' : deXuats[0].trang_thai === 'da_nop' ? 'badge-info' : 'badge-warning'}`}>
                                        {deXuats[0].trang_thai === 'duyet' ? 'Đã duyệt' : deXuats[0].trang_thai === 'da_nop' ? 'Đã nộp' : deXuats[0].trang_thai === 'tu_choi' ? 'Từ chối' : 'Đang làm'}
                                    </span>
                                </div>
                                <div className="card-body">
                                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                                        Tổng: {deXuats[0].so_vat_tu || 0} mục vật tư • {deXuats[0].tong_so_luong || 0} đơn vị
                                        {deXuats[0].ngay_nop && ` • Nộp: ${new Date(deXuats[0].ngay_nop).toLocaleDateString('vi-VN')}`}
                                    </p>
                                </div>
                            </div>
                        )}

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
                        {mode === 'view' && deXuats.length > 0 && deXuats[0].trang_thai === 'duyet' && (
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <button className="btn btn-primary btn-lg" onClick={handleCreatePhieu}>
                                    <Plus size={20} /> Tạo phiếu xuất mới
                                </button>
                            </div>
                        )}

                        {mode === 'create' && !submitted && (
                            <div className="card" style={{ marginBottom: 24 }}>
                                <div className="card-header">
                                    <h2>Tạo phiếu xuất</h2>
                                </div>
                                <div className="card-body">
                                    <div className="form-group">
                                        <label className="form-label">Chọn môn học *</label>
                                        <select className="form-select" value={selectedMon} onChange={e => { setSelectedMon(e.target.value); setExportItems({}); }}>
                                            <option value="">-- Chọn môn --</option>
                                            {phanCongs.map(pc => <option key={pc.mon_hoc_id} value={pc.mon_hoc_id}>{pc.ten_mon} ({pc.ten_nganh} - {pc.ten_he})</option>)}
                                        </select>
                                    </div>

                                    {selectedMon && (
                                        <div style={{ marginTop: 20 }}>
                                            <h3 style={{ fontSize: 15, marginBottom: 12 }}>Chọn vật tư xuất</h3>
                                            {vatTus.map(vt => {
                                                const qty = exportItems[vt.id] || 0;
                                                return (
                                                    <div className="material-item" key={vt.id} style={{ background: qty > 0 ? 'rgba(14,165,233,0.05)' : 'transparent' }}>
                                                        <div className="material-info">
                                                            <h4>{vt.ten_vat_tu}</h4>
                                                            <p>{vt.yeu_cau_ky_thuat && `${vt.yeu_cau_ky_thuat} • `}{vt.don_vi_tinh}</p>
                                                        </div>
                                                        <div className="material-qty">
                                                            <button className="btn-icon" onClick={() => updateExportQty(vt.id, -1)} disabled={qty === 0}>
                                                                <Minus size={16} />
                                                            </button>
                                                            <input type="number" className="form-input" style={{ width: 70, textAlign: 'center', padding: '6px' }} value={qty} onChange={e => setExportQty(vt.id, e.target.value)} min="0" />
                                                            <button className="btn-icon" onClick={() => updateExportQty(vt.id, 1)}>
                                                                <Plus size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {error && <div className="alert alert-error mt-4">{error}</div>}

                                            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                                                <button className="btn btn-secondary" onClick={() => setMode('view')}>Hủy</button>
                                                <button className="btn btn-primary btn-full" onClick={handleSubmitPhieu} disabled={submitting}>
                                                    {submitting ? <div className="spinner" /> : <><Send size={18} /> Gửi phiếu xuất</>}
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
