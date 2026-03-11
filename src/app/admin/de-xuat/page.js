'use client';
import { useState, useEffect } from 'react';
import { FileText, Eye, Check, X, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Download } from 'lucide-react';
import { useToast } from '@/components/Toast';
import * as XLSX from 'xlsx';

const statusConfig = {
    dang_lam: { label: 'Đang làm', badge: 'badge-warning', icon: Clock },
    da_nop: { label: 'Đã nộp', badge: 'badge-info', icon: AlertCircle },
    duyet: { label: 'Đã duyệt', badge: 'badge-success', icon: CheckCircle },
    tu_choi: { label: 'Từ chối', badge: 'badge-danger', icon: XCircle },
};

export default function DeXuatAdminPage() {
    const [deXuats, setDeXuats] = useState([]);
    const [kiHocs, setKiHocs] = useState([]);
    const [selectedKi, setSelectedKi] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedDx, setSelectedDx] = useState(null);
    const [detailData, setDetailData] = useState(null);
    const addToast = useToast();

    const fetchKiHoc = async () => {
        const res = await fetch('/api/ki-hoc');
        const data = await res.json();
        setKiHocs(data);
        if (data.length > 0) setSelectedKi(data[0].id.toString());
        setLoading(false);
    };

    const fetchDeXuat = async () => {
        if (!selectedKi) return;
        const res = await fetch(`/api/de-xuat?ki_id=${selectedKi}`);
        const data = await res.json();
        setDeXuats(data);
    };

    useEffect(() => { fetchKiHoc(); }, []);
    useEffect(() => { if (selectedKi) fetchDeXuat(); }, [selectedKi]);

    const viewDetail = async (dx) => {
        const res = await fetch(`/api/de-xuat?id=${dx.id}`);
        const data = await res.json();
        setDetailData(data);
        setSelectedDx(dx);
    };

    const updateStatus = async (id, trang_thai, ghi_chu = '') => {
        await fetch('/api/de-xuat', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, trang_thai, ghi_chu }),
        });
        addToast(`Cập nhật trạng thái: ${statusConfig[trang_thai].label}`);
        fetchDeXuat();
        if (selectedDx?.id === id) {
            setSelectedDx(null);
            setDetailData(null);
        }
    };

    const exportToExcel = async () => {
        if (deXuats.length === 0) {
            addToast('Không có đề xuất nào để xuất', 'warning');
            return;
        }

        addToast('Đang tạo file Excel...', 'info');

        try {
            // Fetch chi tiết tất cả đề xuất
            const allDetails = [];
            for (const dx of deXuats) {
                const res = await fetch(`/api/de-xuat?id=${dx.id}`);
                const data = await res.json();
                allDetails.push(data);
            }

            const kiName = kiHocs.find(k => k.id.toString() === selectedKi);
            const kiLabel = kiName ? `${kiName.ten_ki} - ${kiName.nam_hoc}` : '';

            // Sheet 1: Tổng hợp
            const summaryData = allDetails.map((dx, i) => ({
                'STT': i + 1,
                'Giáo viên': dx.ten_gv,
                'Email': dx.email || '',
                'SĐT': dx.so_dien_thoai || '',
                'Số mục vật tư': dx.chi_tiet?.length || 0,
                'Tổng số lượng': dx.chi_tiet?.reduce((sum, ct) => sum + (ct.so_luong || 0), 0) || 0,
                'Trạng thái': statusConfig[dx.trang_thai]?.label || dx.trang_thai,
                'Ngày nộp': dx.ngay_nop ? new Date(dx.ngay_nop).toLocaleDateString('vi-VN') : '',
                'Ghi chú': dx.ghi_chu || '',
            }));

            // Sheet 2: Chi tiết liệt kê
            const detailData = [];
            let stt = 1;
            for (const dx of allDetails) {
                if (!dx.chi_tiet || dx.chi_tiet.length === 0) continue;
                for (const ct of dx.chi_tiet) {
                    detailData.push({
                        'STT': stt++,
                        'Giáo viên': dx.ten_gv,
                        'Môn học': ct.ten_mon || '',
                        'Lớp': ct.ten_lop || '',
                        'Sĩ số': ct.si_so || '',
                        'Hệ': ct.ten_loai_he || ct.loai_he || '',
                        'Tên vật tư': ct.ten_vat_tu || '',
                        'Mã(hiệu)/YCKT': ct.yeu_cau_ky_thuat || '',
                        'Đơn vị tính': ct.don_vi_tinh || '',
                        'Số lượng đề xuất': ct.so_luong || 0,
                        'Số lượng kho': ct.so_luong_kho || 0,
                        'Trạng thái': statusConfig[dx.trang_thai]?.label || dx.trang_thai,
                    });
                }
            }

            // Sheet 3: Thống kê tổng hợp theo vật tư (gom nhóm)
            const vtMap = {};
            for (const dx of allDetails) {
                if (!dx.chi_tiet) continue;
                for (const ct of dx.chi_tiet) {
                    const key = ct.ten_vat_tu;
                    if (!vtMap[key]) {
                        vtMap[key] = {
                            'Tên vật tư': ct.ten_vat_tu,
                            'Mã(hiệu)/YCKT': ct.yeu_cau_ky_thuat || '',
                            'Đơn vị tính': ct.don_vi_tinh || '',
                            'Tổng SL đề xuất': 0,
                            'Số lượng kho': ct.so_luong_kho || 0,
                            'Số GV đề xuất': new Set(),
                        };
                    }
                    vtMap[key]['Tổng SL đề xuất'] += ct.so_luong || 0;
                    vtMap[key]['Số GV đề xuất'].add(dx.ten_gv);
                }
            }
            const statsData = Object.values(vtMap).map((item, i) => ({
                'STT': i + 1,
                'Tên vật tư': item['Tên vật tư'],
                'Mã(hiệu)/YCKT': item['Mã(hiệu)/YCKT'],
                'Đơn vị tính': item['Đơn vị tính'],
                'Tổng SL đề xuất': item['Tổng SL đề xuất'],
                'Số lượng kho': item['Số lượng kho'],
                'Chênh lệch': item['Số lượng kho'] - item['Tổng SL đề xuất'],
                'Số GV đề xuất': item['Số GV đề xuất'].size,
            }));

            // Tạo workbook
            const wb = XLSX.utils.book_new();

            const ws1 = XLSX.utils.json_to_sheet(summaryData);
            ws1['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, ws1, 'Tổng hợp GV');

            const ws2 = XLSX.utils.json_to_sheet(detailData);
            ws2['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 8 }, { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, ws2, 'Chi tiết vật tư');

            const ws3 = XLSX.utils.json_to_sheet(statsData);
            ws3['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
            XLSX.utils.book_append_sheet(wb, ws3, 'Thống kê vật tư');

            // Export
            XLSX.writeFile(wb, `De_Xuat_Du_Tru_${kiLabel.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
            addToast('Xuất file Excel thành công!', 'success');
        } catch (err) {
            console.error('Export error:', err);
            addToast('Lỗi khi xuất file: ' + err.message, 'error');
        }
    };

    const columns = ['dang_lam', 'da_nop', 'duyet', 'tu_choi'];

    if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>📋 Đề xuất dự trù</h1>
                    <p>Quản lý và duyệt đề xuất vật tư từ giáo viên</p>
                </div>
                <div className="page-header-actions">
                    <select className="form-select" style={{ width: 220 }} value={selectedKi} onChange={e => setSelectedKi(e.target.value)}>
                        {kiHocs.map(k => <option key={k.id} value={k.id}>{k.ten_ki} - {k.nam_hoc}</option>)}
                    </select>
                    <button className="btn btn-success" onClick={exportToExcel} disabled={deXuats.length === 0}>
                        <Download size={18} /> Xuất Excel
                    </button>
                    <button className="btn btn-secondary" onClick={fetchDeXuat}>
                        <RefreshCw size={18} /> Làm mới
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="kanban-board">
                {columns.map(status => {
                    const config = statusConfig[status];
                    const StatusIcon = config.icon;
                    const items = deXuats.filter(dx => dx.trang_thai === status);
                    return (
                        <div className="kanban-column" key={status}>
                            <div className="kanban-column-header">
                                <h3>
                                    <StatusIcon size={16} />
                                    {config.label}
                                </h3>
                                <span className="kanban-column-count">{items.length}</span>
                            </div>
                            <div className="kanban-column-body">
                                {items.map(dx => (
                                    <div className="kanban-card" key={dx.id} onClick={() => viewDetail(dx)}>
                                        <h4>{dx.ten_gv}</h4>
                                        <p>{dx.email || 'Chưa có email'}</p>
                                        <div className="kanban-card-footer">
                                            <span style={{ fontSize: 12, color: 'var(--text-accent)' }}>
                                                {dx.so_vat_tu || 0} vật tư
                                            </span>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                SL: {dx.tong_so_luong || 0}
                                            </span>
                                        </div>
                                        {dx.ngay_nop && (
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                                                Nộp: {new Date(dx.ngay_nop).toLocaleDateString('vi-VN')}
                                            </p>
                                        )}
                                    </div>
                                ))}
                                {items.length === 0 && (
                                    <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', padding: 20 }}>Trống</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Detail Modal */}
            {selectedDx && detailData && (
                <div className="modal-overlay" onClick={() => { setSelectedDx(null); setDetailData(null); }}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>Đề xuất của {detailData.ten_gv}</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                                    {detailData.email} • {detailData.so_dien_thoai || ''}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span className={`badge ${statusConfig[detailData.trang_thai].badge}`}>
                                    {statusConfig[detailData.trang_thai].label}
                                </span>
                                <button className="btn-ghost" onClick={() => { setSelectedDx(null); setDetailData(null); }}>✕</button>
                            </div>
                        </div>
                        <div className="modal-body">
                            {detailData.ghi_chu && (
                                <div className="alert alert-info mb-4">
                                    <strong>Ghi chú admin:</strong> {detailData.ghi_chu}
                                </div>
                            )}

                            {detailData.chi_tiet && detailData.chi_tiet.length > 0 ? (
                                <div className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Môn học</th>
                                                <th>Vật tư</th>
                                                <th>Yêu cầu KT</th>
                                                <th>Đơn vị</th>
                                                <th>Số lượng</th>
                                                <th>Kho</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detailData.chi_tiet.map((ct, i) => (
                                                <tr key={ct.id}>
                                                    <td>{i + 1}</td>
                                                    <td>
                                                        <div style={{ fontSize: 13 }}>{ct.ten_mon}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Lớp: {ct.ten_lop} ({ct.si_so} HV)</div>
                                                    </td>
                                                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{ct.ten_vat_tu}</td>
                                                    <td style={{ fontSize: 13 }}>{ct.yeu_cau_ky_thuat || '—'}</td>
                                                    <td><span className="badge badge-info">{ct.don_vi_tinh}</span></td>
                                                    <td style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{ct.so_luong}</td>
                                                    <td>{ct.so_luong_kho}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <FileText size={40} />
                                    <p>Chưa có chi tiết đề xuất</p>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            {detailData.trang_thai === 'da_nop' && (
                                <>
                                    <button className="btn btn-danger" onClick={() => {
                                        const note = prompt('Ghi chú từ chối:');
                                        if (note !== null) updateStatus(detailData.id, 'tu_choi', note);
                                    }}>
                                        <X size={16} /> Từ chối
                                    </button>
                                    <button className="btn btn-success" onClick={() => updateStatus(detailData.id, 'duyet')}>
                                        <Check size={16} /> Duyệt
                                    </button>
                                </>
                            )}
                            {detailData.trang_thai === 'tu_choi' && (
                                <button className="btn btn-warning" onClick={() => updateStatus(detailData.id, 'da_nop')}>
                                    <RefreshCw size={16} /> Chuyển về đã nộp
                                </button>
                            )}
                            {detailData.trang_thai === 'duyet' && (
                                <button className="btn btn-warning" onClick={() => updateStatus(detailData.id, 'da_nop')}>
                                    <RefreshCw size={16} /> Hủy duyệt
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
