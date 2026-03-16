'use client';
import { useState, useEffect } from 'react';
import { FileText, Eye, Check, X, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Users, Package, ChevronRight, List, ChevronDown, Plus, Minus, Send, BookOpen, Search, Printer, Edit2, Download } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { exportExcelTheoNganh, exportExcelMultiNganh } from '@/lib/exportExcel';

export default function DeXuatAdminPage() {
    const [activeTab, setActiveTab] = useState('overview'); // overview, materials, list
    const [deXuats, setDeXuats] = useState([]);
    const [kiHocs, setKiHocs] = useState([]);
    const [selectedKi, setSelectedKi] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedDx, setSelectedDx] = useState(null);
    const [detailData, setDetailData] = useState(null);
    const [detailViewMode, setDetailViewMode] = useState('material'); // material, subject
    const [stats, setStats] = useState(null);
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
        fetchStats();
    };

    const fetchStats = async () => {
        const res = await fetch(`/api/admin/thong-ke?ki_id=${selectedKi}`);
        const data = await res.json();
        setStats(data);
    };

    useEffect(() => { fetchKiHoc(); }, []);
    useEffect(() => { if (selectedKi) fetchDeXuat(); }, [selectedKi]);

    const viewDetail = async (dx) => {
        const res = await fetch(`/api/de-xuat?id=${dx.id}`);
        const data = await res.json();
        setDetailData(data);
        setSelectedDx(dx);
        setDetailViewMode('material');
    };

    const handleExportAllNganh = async () => {
        if (!stats || !stats.nganhStats) return;
        const kiInfo = kiHocs.find(k => k.id.toString() === selectedKi);

        try {
            await exportExcelMultiNganh(stats.nganhStats, kiInfo, `Tong_Hop_Vat_Tu_Ki_${selectedKi}.xlsx`);
            addToast('Đã xuất file tổng hợp (nhiều Sheet)', 'success');
        } catch (error) {
            addToast('Lỗi khi xuất file: ' + error.message, 'error');
        }
    };

    const handleExportSingleNganh = async (nganh) => {
        const kiInfo = kiHocs.find(k => k.id.toString() === selectedKi);
        try {
            await exportExcelTheoNganh(nganh, kiInfo, `Tong_Hop_Vat_Tu_${nganh.ten_nganh.replace(/\s+/g, '_')}.xlsx`);
            addToast(`Đã xuất file cho ngành ${nganh.ten_nganh}`, 'success');
        } catch (error) {
            addToast('Lỗi khi xuất file: ' + error.message, 'error');
        }
    };


    if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

    const kiNameObj = kiHocs.find(k => k.id.toString() === selectedKi);

    const getAggregatedMaterials = () => {
        if (!detailData || !detailData.chi_tiet) return [];
        const map = {};
        detailData.chi_tiet.forEach(ct => {
            const key = ct.vat_tu_id;
            if (!map[key]) {
                map[key] = {
                    ...ct,
                    tong_so_luong: 0,
                    subjects: []
                };
            }
            map[key].tong_so_luong += ct.so_luong || 0;
            if (!map[key].subjects.find(s => s.id === ct.mon_hoc_id && s.ten_lop === ct.ten_lop)) {
                map[key].subjects.push({ id: ct.mon_hoc_id, ten_mon: ct.ten_mon, ten_lop: ct.ten_lop });
            }
        });
        return Object.values(map);
    };

    const getGroupedBySubject = () => {
        if (!detailData || !detailData.chi_tiet) return [];
        const groups = {};
        detailData.chi_tiet.forEach(ct => {
            const sKey = ct.ten_mon;
            if (!groups[sKey]) groups[sKey] = { name: ct.ten_mon, classes: {} };

            const cKey = `${ct.ten_lop}_${ct.si_so}`;
            if (!groups[sKey].classes[cKey]) {
                groups[sKey].classes[cKey] = { name: ct.ten_lop, si_so: ct.si_so, items: [] };
            }
            groups[sKey].classes[cKey].items.push(ct);
        });
        return Object.values(groups).map(s => ({
            ...s,
            classes: Object.values(s.classes)
        }));
    };

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>📋 Quản lý đề xuất</h1>
                    <p>Ghi nhận và tổng hợp đề xuất vật tư để mua sắm</p>
                </div>
                <div className="page-header-actions">
                    <select className="form-select" style={{ width: 220 }} value={selectedKi} onChange={e => setSelectedKi(e.target.value)}>
                        {kiHocs.map(k => <option key={k.id} value={k.id}>{k.ten_ki} - {k.nam_hoc}</option>)}
                    </select>
                    <button className="btn btn-secondary" onClick={fetchDeXuat}>
                        <RefreshCw size={18} /> Làm mới
                    </button>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="tabs mb-6" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-color)', marginBottom: 24 }}>
                <button
                    className={`tab-item ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                    style={{ padding: '12px 24px', borderBottom: activeTab === 'overview' ? '2px solid var(--text-accent)' : 'none', fontWeight: 600, color: activeTab === 'overview' ? 'var(--text-accent)' : 'var(--text-secondary)' }}
                >
                    <Users size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
                    Tổng quan nộp phiếu
                </button>
                <button
                    className={`tab-item ${activeTab === 'materials' ? 'active' : ''}`}
                    onClick={() => setActiveTab('materials')}
                    style={{ padding: '12px 24px', borderBottom: activeTab === 'materials' ? '2px solid var(--text-accent)' : 'none', fontWeight: 600, color: activeTab === 'materials' ? 'var(--text-accent)' : 'var(--text-secondary)' }}
                >
                    <Package size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
                    Tổng hợp vật tư theo ngành
                </button>
                <button
                    className={`tab-item ${activeTab === 'list' ? 'active' : ''}`}
                    onClick={() => setActiveTab('list')}
                    style={{ padding: '12px 24px', borderBottom: activeTab === 'list' ? '2px solid var(--text-accent)' : 'none', fontWeight: 600, color: activeTab === 'list' ? 'var(--text-accent)' : 'var(--text-secondary)' }}
                >
                    <List size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
                    Danh sách đề xuất chi tiết
                </button>
            </div>

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
                <div className="tab-content fade-in">
                    {stats && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
                            <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
                                <div style={{ padding: 16, background: 'rgba(14,165,233,0.1)', borderRadius: 16, color: 'var(--text-accent)' }}>
                                    <Users size={32} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 32, fontWeight: 800 }}>{stats.gvStats.tong_gv}</div>
                                    <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Tổng GV được phân công</div>
                                </div>
                            </div>
                            <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
                                <div style={{ padding: 16, background: 'rgba(16,185,129,0.1)', borderRadius: 16, color: '#10b981' }}>
                                    <CheckCircle size={32} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 32, fontWeight: 800 }}>{stats.gvStats.da_nop}</div>
                                    <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Số giảng viên đã nộp phiếu</div>
                                </div>
                            </div>
                            <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
                                <div style={{ padding: 16, background: 'rgba(239,68,68,0.1)', borderRadius: 16, color: '#ef4444' }}>
                                    <AlertCircle size={32} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 32, fontWeight: 800 }}>{stats.gvStats.tong_gv - stats.gvStats.da_nop}</div>
                                    <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Số giảng viên chưa nộp</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {stats?.gvStats.ds_chua_nop ? (
                        <div className="alert alert-warning flex-col" style={{ padding: 20, borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                <AlertCircle size={24} style={{ color: '#d97706' }} />
                                <strong style={{ fontSize: 16 }}>Danh sách giảng viên chưa hoàn thành nộp đề xuất:</strong>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {stats.gvStats.ds_chua_nop.split(', ').map((name, idx) => (
                                    <span key={idx} className="badge" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', padding: '6px 12px', fontSize: 14 }}>{name}</span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="alert alert-success" style={{ padding: 24, textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
                            <CheckCircle size={48} style={{ margin: '0 auto 16px', color: '#10b981' }} />
                            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Tuyệt vời!</h3>
                            <p>Tất cả giảng viên được phân công đã hoàn thành nộp đề xuất cho học kỳ này.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Materials Aggregation */}
            {activeTab === 'materials' && (
                <div className="tab-content fade-in">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                        <button className="btn btn-primary" onClick={handleExportAllNganh} disabled={!stats || stats.nganhStats.length === 0}>
                            <Download size={18} /> Xuất tất cả các ngành
                        </button>
                    </div>
                    {stats && stats.nganhStats.length > 0 ? (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 20 }}>
                                {stats.nganhStats.map(nganh => (
                                    <div key={nganh.id || 'all'} className="card h-full" style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div className="card-header" style={{ background: 'rgba(0,0,0,0.02)', padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <h3 style={{ fontSize: 18, fontWeight: 700 }}>{nganh.ten_nganh}</h3>
                                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{nganh.materialList.length} vật tư đề xuất</p>
                                                </div>
                                                <button className="btn-icon btn-ghost btn-primary" onClick={() => handleExportSingleNganh(nganh)} title="Xuất Excel ngành này">
                                                    <Download size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="card-body" style={{ flex: 1, maxHeight: 400, overflowY: 'auto' }}>
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ fontSize: 11 }}>Tên vật tư</th>
                                                        <th style={{ textAlign: 'right', fontSize: 11 }}>Tổng SL</th>
                                                        <th style={{ textAlign: 'center', fontSize: 11 }}>ĐVT</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {nganh.materialList.map((m, idx) => (
                                                        <tr key={idx}>
                                                            <td style={{ fontSize: 13 }}>
                                                                <div style={{ fontWeight: 600 }}>{m.ten_vat_tu}</div>
                                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.yeu_cau_ky_thuat || ''}</div>
                                                            </td>
                                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-accent)' }}>{m.tong_de_xuat}</td>
                                                            <td style={{ textAlign: 'center' }}><span className="badge badge-info" style={{ fontSize: 10 }}>{m.don_vi_tinh}</span></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <Package size={60} style={{ color: 'var(--text-muted)', marginBottom: 20 }} />
                            <h3>Chưa có dữ liệu tổng hợp</h3>
                            <p>Dữ liệu sẽ hiển thị sau khi giảng viên bắt đầu nộp đề xuất cho học kỳ này.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Tab 3: Proposal List */}
            {activeTab === 'list' && (
                <div className="tab-content fade-in">
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Giảng viên nộp</th>
                                    <th>Email</th>
                                    <th>Số mục vật tư</th>
                                    <th>Tổng số lượng</th>
                                    <th>Ngày nộp</th>
                                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {deXuats.map((dx, idx) => (
                                    <tr key={dx.id}>
                                        <td>{idx + 1}</td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{dx.ten_gv}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SĐT: {dx.so_dien_thoai || '—'}</div>
                                        </td>
                                        <td>{dx.email}</td>
                                        <td style={{ textAlign: 'center' }}>{dx.so_vat_tu || 0}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{dx.tong_so_luong || 0}</td>
                                        <td>{dx.ngay_nop ? new Date(dx.ngay_nop).toLocaleDateString('vi-VN') : '—'}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn-icon btn-ghost" onClick={() => viewDetail(dx)} title="Xem chi tiết">
                                                <Eye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {deXuats.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chưa có giáo viên nào nộp đề xuất</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedDx && detailData && (
                <div className="modal-overlay" onClick={() => { setSelectedDx(null); setDetailData(null); }}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
                        <div className="modal-header" style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <FileText className="text-accent" size={24} />
                                    Chi tiết đề xuất
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                                    <div style={{ fontWeight: 600, fontSize: 15 }}>{detailData.ten_gv}</div>
                                    <div style={{ width: 1, height: 14, background: 'var(--border-color)' }}></div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{detailData.email}</div>
                                    {detailData.so_dien_thoai && (
                                        <>
                                            <div style={{ width: 1, height: 14, background: 'var(--border-color)' }}></div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{detailData.so_dien_thoai}</div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <div style={{ display: 'flex', background: 'var(--bg-glass)', padding: 4, borderRadius: 10, border: '1px solid var(--border-color)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <button
                                        className={`btn btn-sm ${detailViewMode === 'material' ? 'btn-primary' : 'btn-ghost'}`}
                                        style={{ fontSize: 12, padding: '6px 16px', minWidth: 110, borderRadius: 8, transition: 'all 0.2s' }}
                                        onClick={() => setDetailViewMode('material')}
                                    >
                                        <Package size={14} style={{ marginRight: 6 }} /> Theo vật tư
                                    </button>
                                    <button
                                        className={`btn btn-sm ${detailViewMode === 'subject' ? 'btn-primary' : 'btn-ghost'}`}
                                        style={{ fontSize: 12, padding: '6px 16px', minWidth: 110, borderRadius: 8, transition: 'all 0.2s' }}
                                        onClick={() => setDetailViewMode('subject')}
                                    >
                                        <List size={14} style={{ marginRight: 6 }} /> Theo môn học
                                    </button>
                                </div>
                                <button className="btn-icon btn-ghost" onClick={() => { setSelectedDx(null); setDetailData(null); }} style={{ borderRadius: '50%' }}>✕</button>
                            </div>
                        </div>
                        <div className="modal-body" style={{ padding: '0', background: 'var(--bg-glass)' }}>
                            {detailData.chi_tiet && detailData.chi_tiet.length > 0 ? (
                                <div style={{ padding: '24px 32px' }}>
                                    {detailViewMode === 'material' ? (
                                        <div className="table-container" style={{ border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                                            <table className="data-table">
                                                <thead style={{ background: 'var(--bg-card)' }}>
                                                    <tr>
                                                        <th style={{ padding: '16px 20px', width: 60 }}>STT</th>
                                                        <th style={{ padding: '16px 20px' }}>Tên vật tư / Quy cách</th>
                                                        <th style={{ padding: '16px 20px' }}>Sử dụng cho</th>
                                                        <th style={{ padding: '16px 20px', textAlign: 'center', width: 100 }}>ĐVT</th>
                                                        <th style={{ padding: '16px 20px', textAlign: 'right', width: 120 }}>Số lượng</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {getAggregatedMaterials().map((m, i) => (
                                                        <tr key={m.vat_tu_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                            <td style={{ padding: '12px 20px', color: 'var(--text-muted)' }}>{i + 1}</td>
                                                            <td style={{ padding: '12px 20px' }}>
                                                                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 15 }}>{m.ten_vat_tu}</div>
                                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{m.yeu_cau_ky_thuat || '—'}</div>
                                                            </td>
                                                            <td style={{ padding: '12px 20px' }}>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                                    {m.subjects.map((s, idx) => (
                                                                        <span key={idx} className="badge" style={{ fontSize: 11, background: 'rgba(14, 165, 233, 0.08)', color: 'var(--text-accent)', fontWeight: 500, padding: '4px 10px' }}>
                                                                            {s.ten_mon} ({s.ten_lop})
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                                                                <span className="badge badge-info" style={{ minWidth: 50, fontWeight: 600 }}>{m.don_vi_tinh}</span>
                                                            </td>
                                                            <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                                                                <div style={{ fontWeight: 800, color: 'var(--text-accent)', fontSize: 17 }}>{m.tong_so_luong}</div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                            {getGroupedBySubject().map((subject, sIdx) => (
                                                <div key={sIdx} className="card" style={{ border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', transition: 'all 0.3s ease' }}>
                                                    <div style={{ background: 'var(--bg-card)', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <div style={{ padding: 8, background: 'rgba(14,165,233,0.1)', borderRadius: 10, color: 'var(--text-accent)' }}>
                                                            <FileText size={18} />
                                                        </div>
                                                        <div>
                                                            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{subject.name}</h3>
                                                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Có {subject.classes.length} lớp sử dụng</p>
                                                        </div>
                                                    </div>
                                                    <div style={{ padding: '16px 24px' }}>
                                                        {subject.classes.map((cls, cIdx) => (
                                                            <div key={cIdx} style={{ marginBottom: cIdx === subject.classes.length - 1 ? 0 : 20 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                                                    <Users size={14} className="text-secondary" />
                                                                    <span style={{ fontWeight: 600, fontSize: 14 }}>Lớp: {cls.name}</span>
                                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>(Sĩ số: {cls.si_so})</span>
                                                                </div>
                                                                <div style={{ overflow: 'hidden', border: '1px solid var(--border-color)', borderRadius: 10 }}>
                                                                    <table className="data-table" style={{ margin: 0 }}>
                                                                        <thead style={{ background: 'rgba(0,0,0,0.01)' }}>
                                                                            <tr>
                                                                                <th style={{ width: 50, fontSize: 11, padding: '10px 16px' }}>#</th>
                                                                                <th style={{ fontSize: 11, padding: '10px 16px' }}>Tên vật tư</th>
                                                                                <th style={{ fontSize: 11, padding: '10px 16px' }}>Quy cách / Yêu cầu</th>
                                                                                <th style={{ width: 80, textAlign: 'center', fontSize: 11, padding: '10px 16px' }}>ĐVT</th>
                                                                                <th style={{ width: 100, textAlign: 'right', fontSize: 11, padding: '10px 16px' }}>Số lượng</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {cls.items.map((item, iIdx) => (
                                                                                <tr key={item.id} style={{ borderBottom: iIdx === cls.items.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                                                                                    <td style={{ fontSize: 13, padding: '8px 16px', color: 'var(--text-muted)' }}>{iIdx + 1}</td>
                                                                                    <td style={{ fontSize: 13, padding: '8px 16px', fontWeight: 600 }}>{item.ten_vat_tu}</td>
                                                                                    <td style={{ fontSize: 12, padding: '8px 16px', color: 'var(--text-secondary)' }}>{item.yeu_cau_ky_thuat || '—'}</td>
                                                                                    <td style={{ textAlign: 'center', padding: '8px 16px' }}>
                                                                                        <span className="badge" style={{ fontSize: 10, background: 'rgba(0,0,0,0.04)' }}>{item.don_vi_tinh}</span>
                                                                                    </td>
                                                                                    <td style={{ textAlign: 'right', padding: '8px 16px', fontWeight: 700, color: 'var(--text-main)' }}>{item.so_luong}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="empty-state" style={{ padding: '60px 0' }}>
                                    <Package size={64} style={{ opacity: 0.2, marginBottom: 16 }} />
                                    <p style={{ color: 'var(--text-secondary)' }}>Đề xuất này chưa có nội dung chi tiết</p>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer" style={{ padding: '16px 32px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)', justifyContent: 'flex-end', borderRadius: '0 0 20px 20px' }}>
                            <button className="btn btn-secondary" style={{ padding: '8px 24px', borderRadius: 10 }} onClick={() => { setSelectedDx(null); setDetailData(null); }}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .fade-in {
                    animation: fadeIn 0.3s ease-in;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .tab-item {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 15px;
                }
                .tab-item:hover {
                    background: rgba(0,0,0,0.02);
                }
                .tab-item.active {
                    background: transparent;
                }
            `}</style>
        </div>
    );
}
