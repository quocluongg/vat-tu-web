'use client';
import { useState, useEffect } from 'react';
import { FileOutput, Eye, Check, X, Truck, Clock, CheckCircle, XCircle, FileCheck } from 'lucide-react';
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

    useEffect(() => { if (selectedKi) fetchData(); }, [selectedKi]);

    const viewDetail = async (px) => {
        const res = await fetch(`/api/phieu-xuat?id=${px.id}`);
        const data = await res.json();
        setDetail(data);
    };

    const updateStatus = async (id, trang_thai) => {
        await fetch('/api/phieu-xuat', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, trang_thai }),
        });
        addToast(`Cập nhật: ${statusConfig[trang_thai].label}`);
        fetchData();
        setDetail(null);
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
                                <th>Số vật tư</th>
                                <th>Ngày tạo</th>
                                <th>Trạng thái</th>
                                <th style={{ width: 100 }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {phieuXuats.length === 0 ? (
                                <tr><td colSpan={7}><div className="empty-state"><FileOutput size={48} /><h3>Chưa có phiếu xuất</h3></div></td></tr>
                            ) : phieuXuats.map(px => (
                                <tr key={px.id}>
                                    <td style={{ fontWeight: 500, color: 'var(--text-accent)' }}>PX-{String(px.id).padStart(4, '0')}</td>
                                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{px.ten_gv}</td>
                                    <td>{px.ten_mon}</td>
                                    <td>{px.so_vat_tu} ({px.tong_so_luong} đơn vị)</td>
                                    <td>{new Date(px.ngay_tao).toLocaleDateString('vi-VN')}</td>
                                    <td><span className={`badge ${statusConfig[px.trang_thai].badge}`}>{statusConfig[px.trang_thai].label}</span></td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="btn-icon" onClick={() => viewDetail(px)} title="Chi tiết"><Eye size={16} /></button>
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
                                    {detail.ten_gv} • {detail.ten_mon} • {detail.ten_nganh} - {detail.ten_he}
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
                                    </tr>
                                </thead>
                                <tbody>
                                    {detail.chi_tiet?.map((ct, i) => (
                                        <tr key={ct.id}>
                                            <td>{i + 1}</td>
                                            <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{ct.ten_vat_tu}</td>
                                            <td>{ct.yeu_cau_ky_thuat || '—'}</td>
                                            <td><span className="badge badge-info">{ct.don_vi_tinh}</span></td>
                                            <td style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{ct.so_luong}</td>
                                            <td>{ct.so_luong_kho}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-footer">
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
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
