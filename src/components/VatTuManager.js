'use client';
import { useState, useEffect } from 'react';
import { Boxes, Plus, Edit3, Trash2, Search, Upload, Package, PackagePlus, Copy, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function VatTuManager({ fixedLoai = null, title = 'Quản lý Vật tư', subtitle = 'Danh mục vật tư theo kỳ học' }) {
    const [list, setList] = useState([]);
    const [kiHocs, setKiHocs] = useState([]);
    const [nganhs, setNganhs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [showImportStockModal, setShowImportStockModal] = useState(false);
    const [showSyncModal, setShowSyncModal] = useState(false);
    const [syncSourceKi, setSyncSourceKi] = useState('');
    const [syncNganhId, setSyncNganhId] = useState('');
    const [syncKeepStock, setSyncKeepStock] = useState(false);
    const [syncPreview, setSyncPreview] = useState(null);
    const [syncLoadingPreview, setSyncLoadingPreview] = useState(false);
    const [syncSubmitting, setSyncSubmitting] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ ten_vat_tu: '', yeu_cau_ky_thuat: '', don_vi_tinh: '', so_luong_kho: 0, ki_id: '', nganh_id: '', loai_vat_tu: fixedLoai || 'tieu_hao' });
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [loaiFilterState, setLoaiFilter] = useState('all'); // all | tieu_hao | sua_che
    const loaiFilter = fixedLoai || loaiFilterState;
    const [selectedVatTu, setSelectedVatTu] = useState(new Set());
    const [selectedKi, setSelectedKi] = useState('');
    const [importText, setImportText] = useState('');
    const [importNganhId, setImportNganhId] = useState('');
    const [importLoaiState, setImportLoai] = useState(fixedLoai || 'tieu_hao');
    const importLoai = fixedLoai || importLoaiState;
    const [importStockForm, setImportStockForm] = useState({ id: null, ten_vat_tu: '', yeu_cau_ky_thuat: '', don_vi_tinh: '', so_luong_hien_tai: 0, so_luong_nhap: 0, dang_de_xuat: 0, nganh_id: null, ki_id: null, loai_vat_tu: 'tieu_hao' });
    const addToast = useToast();

    const fetchData = async () => {
        const [khRes, ngRes] = await Promise.all([
            fetch('/api/ki-hoc').then(r => r.json()),
            fetch('/api/nganh').then(r => r.json())
        ]);
        setKiHocs(khRes);
        setNganhs(ngRes);
        if (khRes.length > 0 && !selectedKi) {
            setSelectedKi(khRes[0].id.toString());
        }
        setLoading(false);
    };

    const fetchVatTu = async () => {
        if (!selectedKi) return;
        const res = await fetch(`/api/vat-tu?ki_id=${selectedKi}`);
        const data = await res.json();
        setList(data);
    };

    useEffect(() => { fetchData(); }, []);
    useEffect(() => { if (selectedKi) fetchVatTu(); }, [selectedKi]);

    const openModal = (item = null) => {
        setEditing(item);
        let defaultNganhId = '';
        if (!item && activeTab !== 'all' && activeTab !== 'chung') {
            defaultNganhId = activeTab;
        }
        setForm({
            ten_vat_tu: item?.ten_vat_tu || '',
            yeu_cau_ky_thuat: item?.yeu_cau_ky_thuat || '',
            don_vi_tinh: item?.don_vi_tinh || '',
            so_luong_kho: item?.so_luong_kho || 0,
            ki_id: item?.ki_id?.toString() || selectedKi,
            nganh_id: item?.nganh_id?.toString() || defaultNganhId,
            loai_vat_tu: item?.loai_vat_tu || fixedLoai || (loaiFilter !== 'all' ? loaiFilter : 'tieu_hao'),
        });
        setShowModal(true);
    };

    const vtLoaiOf = (vt) => (vt.loai_vat_tu === 'sua_che' ? 'sua_che' : 'tieu_hao');

    const openImportStock = (item) => {
        setImportStockForm({
            id: item.id,
            ten_vat_tu: item.ten_vat_tu,
            yeu_cau_ky_thuat: item.yeu_cau_ky_thuat,
            don_vi_tinh: item.don_vi_tinh,
            so_luong_hien_tai: item.so_luong_kho,
            so_luong_nhap: '',
            dang_de_xuat: item.dang_de_xuat || 0,
            nganh_id: item.nganh_id || null,
            ki_id: item.ki_id,
            loai_vat_tu: item.loai_vat_tu || 'tieu_hao'
        });
        setShowImportStockModal(true);
    };

    const openSyncModal = () => {
        const otherKis = kiHocs.filter(k => k.id.toString() !== selectedKi.toString());
        const defaultSource = otherKis.length > 0 ? otherKis[0].id.toString() : '';
        const defaultNganh = activeTab !== 'all' && activeTab !== 'chung' ? activeTab : (activeTab === 'chung' ? 'chung' : '');
        setSyncSourceKi(defaultSource);
        setSyncNganhId(defaultNganh);
        setSyncKeepStock(false);
        setSyncPreview(null);
        setShowSyncModal(true);
        if (defaultSource && selectedKi) {
            fetchSyncPreview(defaultSource, defaultNganh, selectedKi);
        }
    };

    const fetchSyncPreview = async (sourceKi, nganhId, targetKi) => {
        if (!sourceKi || !targetKi || sourceKi.toString() === targetKi.toString()) {
            setSyncPreview(null);
            return;
        }
        setSyncLoadingPreview(true);
        try {
            let url = `/api/vat-tu/sync?source_ki_id=${sourceKi}&target_ki_id=${targetKi}`;
            if (nganhId) {
                url += `&nganh_id=${nganhId}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok) {
                setSyncPreview(data);
            } else {
                setSyncPreview(null);
            }
        } catch (e) {
            console.error('Lỗi lấy preview đồng bộ:', e);
            setSyncPreview(null);
        } finally {
            setSyncLoadingPreview(false);
        }
    };

    const handleSyncSubmit = async (e) => {
        e.preventDefault();
        if (!syncSourceKi || !selectedKi) {
            addToast('Vui lòng chọn kỳ học nguồn và đích', 'error');
            return;
        }
        setSyncSubmitting(true);
        try {
            const res = await fetch('/api/vat-tu/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_ki_id: parseInt(syncSourceKi),
                    target_ki_id: parseInt(selectedKi),
                    nganh_id: syncNganhId || null,
                    keep_stock: syncKeepStock
                })
            });
            const data = await res.json();
            if (res.ok) {
                addToast(data.message || 'Đồng bộ vật tư thành công!');
                setShowSyncModal(false);
                await fetchVatTu();
            } else {
                addToast(data.error || 'Có lỗi xảy ra khi đồng bộ', 'error');
            }
        } catch (err) {
            addToast('Lỗi kết nối máy chủ', 'error');
        } finally {
            setSyncSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const method = editing ? 'PUT' : 'POST';
        const body = editing ? { ...form, id: editing.id } : form;
        const currentTab = activeTab; // Lưu lại tab hiện tại
        const res = await fetch('/api/vat-tu', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) {
            addToast(editing ? 'Cập nhật thành công' : 'Thêm vật tư thành công');
            setShowModal(false);
            await fetchVatTu();
            setActiveTab(currentTab); // Restore tab về lựa chọn trước đó
        }
    };

    const handleImportStockSubmit = async (e) => {
        e.preventDefault();
        const amountToAdd = parseInt(importStockForm.so_luong_nhap) || 0;
        if (amountToAdd <= 0) {
            addToast("Số lượng nhập phải lớn hơn 0", "error");
            return;
        }

        const newStock = importStockForm.so_luong_hien_tai + amountToAdd;
        const body = {
            id: importStockForm.id,
            ten_vat_tu: importStockForm.ten_vat_tu,
            yeu_cau_ky_thuat: importStockForm.yeu_cau_ky_thuat,
            don_vi_tinh: importStockForm.don_vi_tinh,
            so_luong_kho: newStock,
            nganh_id: importStockForm.nganh_id,
            ki_id: importStockForm.ki_id,
            loai_vat_tu: importStockForm.loai_vat_tu || 'tieu_hao'
        };

        const currentTab = activeTab; // Lưu lại tab hiện tại
        const res = await fetch('/api/vat-tu', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) {
            addToast(`Đã nhập thêm ${amountToAdd} ${importStockForm.don_vi_tinh}`);
            setShowImportStockModal(false);
            await fetchVatTu();
            setActiveTab(currentTab); // Restore tab về lựa chọn trước đó
        } else {
            addToast("Có lỗi xảy ra khi nhập kho", "error");
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa vật tư này?')) return;
        const currentTab = activeTab;
        const res = await fetch(`/api/vat-tu?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        
        if (res.ok) {
            addToast('Xóa thành công');
            await fetchVatTu();
            setActiveTab(currentTab);
        } else {
            addToast(data.error || 'Có lỗi xảy ra khi xóa', 'error');
        }
    };

    const deleteSelectedVatTu = async () => {
        if (!confirm(`Xóa ${selectedVatTu.size} vật tư đã chọn?`)) return;
        const currentTab = activeTab;
        
        let successCount = 0;
        let errors = [];

        await Promise.all([...selectedVatTu].map(async (id) => {
            const res = await fetch(`/api/vat-tu?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                successCount++;
            } else {
                const vt = list.find(x => x.id === id);
                errors.push(`${vt?.ten_vat_tu || id}: ${data.error}`);
            }
        }));

        if (successCount > 0) {
            addToast(`Đã xóa ${successCount} vật tư`);
        }
        if (errors.length > 0) {
            addToast(`Không thể xóa ${errors.length} vật tư. Vui lòng kiểm tra lại.`, 'error');
            console.error('Delete errors:', errors);
        }

        setSelectedVatTu(new Set());
        await fetchVatTu();
        setActiveTab(currentTab);
    };

    const handleImport = async () => {
        const lines = importText.trim().split('\n').filter(l => l.trim());
        const items = lines.map(line => {
            const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
            return {
                ten_vat_tu: parts[0]?.trim() || '',
                yeu_cau_ky_thuat: parts[1]?.trim() || '',
                don_vi_tinh: parts[2]?.trim() || '',
                so_luong_kho: parseInt(parts[3]?.trim()) || 0,
                ki_id: selectedKi,
                nganh_id: importNganhId || null,
                loai_vat_tu: importLoai,
            };
        }).filter(item => item.ten_vat_tu);

        if (items.length === 0) { addToast('Không có dữ liệu hợp lệ', 'error'); return; }

        const currentTab = activeTab; // Lưu lại tab hiện tại
        const res = await fetch('/api/vat-tu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(items),
        });
        if (res.ok) {
            addToast(`Import ${items.length} vật tư thành công`);
            setShowImport(false);
            setImportText('');
            setImportNganhId('');
            setImportLoai(fixedLoai || 'tieu_hao');
            await fetchVatTu();
            setActiveTab(currentTab); // Restore tab về lựa chọn trước đó
        }
    };

    const matchNganhTab = (vt) => {
        if (activeTab === 'chung') return !vt.nganh_id;
        if (activeTab !== 'all') return vt.nganh_id?.toString() === activeTab;
        return true;
    };

    const listByNganh = list.filter(matchNganhTab);
    const loaiCounts = {
        tieu_hao: listByNganh.filter(vt => vtLoaiOf(vt) === 'tieu_hao').length,
        sua_che: listByNganh.filter(vt => vtLoaiOf(vt) === 'sua_che').length,
    };

    const listByLoai = loaiFilter === 'all' ? list : list.filter(vt => vtLoaiOf(vt) === loaiFilter);
    const nganhCounts = { all: listByLoai.length, chung: 0 };
    listByLoai.forEach(vt => { if (!vt.nganh_id) nganhCounts.chung += 1; });
    nganhs.forEach(n => {
        nganhCounts[n.id] = listByLoai.filter(vt => vt.nganh_id?.toString() === n.id.toString()).length;
    });

    const filtered = listByNganh.filter(vt => {
        const matchSearch = vt.ten_vat_tu.toLowerCase().includes(search.toLowerCase()) ||
            (vt.yeu_cau_ky_thuat && vt.yeu_cau_ky_thuat.toLowerCase().includes(search.toLowerCase()));

        const matchLoai = loaiFilter === 'all' || vtLoaiOf(vt) === loaiFilter;

        return matchSearch && matchLoai;
    });
    const allVtIds = filtered.map(vt => vt.id);
    const allVtSelected = allVtIds.length > 0 && allVtIds.every(id => selectedVatTu.has(id));
    const someVtSelected = allVtIds.some(id => selectedVatTu.has(id));
    const toggleSelectVt = id => setSelectedVatTu(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    const toggleSelectAllVt = () => setSelectedVatTu(allVtSelected ? new Set() : new Set(allVtIds));

    if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1 style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}><Boxes size={28} className="text-accent" /> {title}</h1>
                    <p>{subtitle}</p>
                </div>
                <div className="page-header-actions">
                    <select className="form-select" style={{ width: '100%', maxWidth: 220 }} value={selectedKi} onChange={e => setSelectedKi(e.target.value)}>
                        <option value="">Chọn kỳ</option>
                        {kiHocs.map(k => <option key={k.id} value={k.id}>{k.ten_ki} - {k.nam_hoc}</option>)}
                    </select>
                    <button className="btn btn-secondary" onClick={() => { setShowImport(true); setImportNganhId(activeTab !== 'all' && activeTab !== 'chung' ? activeTab : ''); }}>
                        <Upload size={18} /> Import Excel
                    </button>
                    <button className="btn btn-secondary" onClick={openSyncModal} title="Đồng bộ danh mục vật tư từ kỳ khác sang kỳ này" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Copy size={18} /> Đồng bộ từ kỳ khác
                    </button>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> Thêm vật tư mới
                    </button>
                </div>
            </div>

            {!fixedLoai && (
            <div className="tabs">
                <button type="button" className={`tab ${loaiFilter === 'all' ? 'active' : ''}`} onClick={() => setLoaiFilter('all')}>
                    Tất cả ({listByNganh.length})
                </button>
                <button type="button" className={`tab ${loaiFilter === 'tieu_hao' ? 'active' : ''}`} onClick={() => setLoaiFilter('tieu_hao')}>
                    Tiêu hao ({loaiCounts.tieu_hao})
                </button>
                <button type="button" className={`tab ${loaiFilter === 'sua_che' ? 'active' : ''}`} onClick={() => setLoaiFilter('sua_che')}>
                    Sửa chữa ({loaiCounts.sua_che})
                </button>
            </div>
            )}

            <div className="nganh-tabs">
                <button
                    type="button"
                    className={`nganh-tab ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    Tất cả <span className="nganh-tab-count">{nganhCounts.all}</span>
                </button>
                <button
                    type="button"
                    className={`nganh-tab ${activeTab === 'chung' ? 'active' : ''}`}
                    onClick={() => setActiveTab('chung')}
                >
                    Dùng chung <span className="nganh-tab-count">{nganhCounts.chung}</span>
                </button>
                {nganhs.map(n => (
                    <button
                        key={n.id}
                        type="button"
                        className={`nganh-tab ${activeTab === n.id.toString() ? 'active' : ''}`}
                        onClick={() => setActiveTab(n.id.toString())}
                    >
                        {n.ten_nganh} <span className="nganh-tab-count">{nganhCounts[n.id] ?? 0}</span>
                    </button>
                ))}
            </div>

            <div className="search-bar">
                <div className="search-input-wrapper">
                    <Search />
                    <input className="search-input" placeholder="Tìm vật tư..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} vật tư</span>
            </div>

            {/* Bulk toolbar */}
            {someVtSelected && (
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '8px 16px', marginBottom: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Đã chọn <b style={{ color: 'var(--text-primary)' }}>{selectedVatTu.size}</b> vật tư
                    </span>
                    <button className="btn" style={{ padding: '4px 14px', fontSize: 13, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }} onClick={deleteSelectedVatTu}>
                        <Trash2 size={13} /> Xóa đã chọn
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => setSelectedVatTu(new Set())}>
                        ✕ Bỏ chọn
                    </button>
                </div>
            )}

            <div className="card">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 44 }}>
                                    <input type="checkbox" checked={allVtSelected}
                                        ref={el => { if (el) el.indeterminate = someVtSelected && !allVtSelected; }}
                                        onChange={toggleSelectAllVt}
                                        style={{ width: 14, height: 14, accentColor: 'var(--text-accent)', cursor: 'pointer' }} />
                                </th>
                                <th style={{ width: 36 }}>#</th>
                                <th>Tên vật tư</th>
                                {!fixedLoai && <th style={{ minWidth: 110 }}>Loại</th>}
                                <th>Yêu cầu kỹ thuật</th>
                                <th>Đơn vị</th>
                                <th>Tồn kho</th>
                                <th>Đang đề xuất</th>
                                <th style={{ width: 170 }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={fixedLoai ? 8 : 9}><div className="empty-state"><Boxes size={48} /><h3>{loaiFilter === 'all' ? 'Chưa có vật tư' : 'Không có vật tư loại này'}</h3><p>Thêm vật tư hoặc import từ Excel</p></div></td></tr>
                            ) : filtered.map((vt, idx) => {
                                const isSelected = selectedVatTu.has(vt.id);
                                return (
                                    <tr key={vt.id} style={{ background: isSelected ? 'rgba(28,110,245,0.04)' : undefined }}>
                                        <td>
                                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelectVt(vt.id)}
                                                style={{ width: 14, height: 14, accentColor: 'var(--text-accent)', cursor: 'pointer' }} />
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{vt.ten_vat_tu}</td>
                                        {!fixedLoai && <td><span className={`badge ${vtLoaiOf(vt) === 'sua_che' ? 'badge-warning' : 'badge-info'}`}>{vtLoaiOf(vt) === 'sua_che' ? 'Sửa chữa' : 'Tiêu hao'}</span></td>}
                                        <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)', fontSize: 13 }}>{vt.yeu_cau_ky_thuat || '—'}</td>
                                        <td><span className="badge badge-info">{vt.don_vi_tinh}</span></td>
                                        <td>
                                            <span style={{ fontWeight: 700, color: vt.so_luong_kho > 0 ? '#34d399' : '#f87171' }}>
                                                {vt.so_luong_kho}
                                            </span>
                                        </td>
                                        <td>
                                            {vt.dang_de_xuat > 0 ? (
                                                <span className="badge badge-warning" style={{ fontSize: 12 }}>
                                                    {vt.dang_de_xuat} {vt.don_vi_tinh}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>0</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button className="btn-icon" onClick={() => openImportStock(vt)} title="Nhập thêm kho" style={{ color: '#34d399' }}><PackagePlus size={15} /></button>
                                                <button className="btn-icon" onClick={() => openModal(vt)} title="Sửa"><Edit3 size={15} /></button>
                                                <button className="btn-icon" onClick={() => handleDelete(vt.id)} title="Xóa" style={{ color: '#f87171' }}><Trash2 size={15} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editing ? 'Sửa vật tư' : 'Thêm vật tư mới'}</h2>
                            <button className="btn-ghost" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Tên vật tư *</label>
                                    <input className="form-input" value={form.ten_vat_tu} onChange={e => setForm({ ...form, ten_vat_tu: e.target.value })} required placeholder="VD: Điện trở" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Thuộc ngành</label>
                                    <select className="form-select" value={form.nganh_id} onChange={e => setForm({ ...form, nganh_id: e.target.value })}>
                                        <option value="">-- Dùng chung (Tất cả ngành) --</option>
                                        {nganhs.map(n => <option key={n.id} value={n.id}>{n.ten_nganh}</option>)}
                                    </select>
                                </div>
                                {fixedLoai ? (
                                    <div className="form-group">
                                        <label className="form-label">Loại vật tư</label>
                                        <input className="form-input" value={fixedLoai === 'sua_che' ? 'Sửa chữa (xuất theo biên bản hư hỏng)' : 'Tiêu hao'} disabled />
                                    </div>
                                ) : (
                                <div className="form-group">
                                    <label className="form-label">Loại vật tư</label>
                                    <select className="form-select" value={form.loai_vat_tu} onChange={e => setForm({ ...form, loai_vat_tu: e.target.value })}>
                                        <option value="tieu_hao">Tiêu hao</option>
                                        <option value="sua_che">Sửa chữa (xuất theo biên bản hư hỏng)</option>
                                    </select>
                                </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Yêu cầu kỹ thuật</label>
                                    <input className="form-input" value={form.yeu_cau_ky_thuat} onChange={e => setForm({ ...form, yeu_cau_ky_thuat: e.target.value })} placeholder="VD: 330 Ohm; 1/4W" />
                                </div>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Đơn vị tính *</label>
                                        <input className="form-input" value={form.don_vi_tinh} onChange={e => setForm({ ...form, don_vi_tinh: e.target.value })} required placeholder="VD: Con, Cái, Mét" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tồn kho ban đầu</label>
                                        <input type="number" className="form-input" value={form.so_luong_kho} onChange={e => setForm({ ...form, so_luong_kho: parseInt(e.target.value) || 0 })} min="0" />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Thêm'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Nhập thêm kho */}
            {showImportStockModal && (
                <div className="modal-overlay" onClick={() => setShowImportStockModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 'min(450px, calc(100vw - 48px))' }}>
                        <div className="modal-header">
                            <h2>Cập nhật nhập hàng kho</h2>
                            <button className="btn-ghost" onClick={() => setShowImportStockModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleImportStockSubmit}>
                            <div className="modal-body">
                                <div className="alert alert-info mb-4" style={{ background: 'rgba(28, 110, 245, 0.08)', color: 'var(--text-accent)', padding: 16, borderRadius: 'var(--radius-md)', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Package size={24} style={{ marginBottom: 8 }} />
                                    <h3 style={{ fontSize: 16, marginBottom: 4 }}>{importStockForm.ten_vat_tu}</h3>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                        {importStockForm.yeu_cau_ky_thuat && `${importStockForm.yeu_cau_ky_thuat} • `}
                                        Đơn vị: {importStockForm.don_vi_tinh}
                                    </p>
                                </div>

                                <div className="form-grid" style={{ marginBottom: 24, gap: 16 }}>
                                    <div style={{ background: 'var(--bg-glass)', padding: 16, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Tồn kho hiện tại</p>
                                        <h3 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{importStockForm.so_luong_hien_tai}</h3>
                                    </div>
                                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 16, borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                        <p style={{ fontSize: 13, color: '#34d399', marginBottom: 4 }}>Tồn kho sau khi nhập</p>
                                        <h3 style={{ fontSize: 24, fontWeight: 700, color: '#34d399' }}>
                                            {importStockForm.so_luong_hien_tai + (parseInt(importStockForm.so_luong_nhap) || 0)}
                                        </h3>
                                    </div>
                                </div>

                                {importStockForm.dang_de_xuat > 0 && (
                                    <div style={{ background: 'rgba(248, 113, 113, 0.1)', padding: 12, borderRadius: 'var(--radius-md)', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, border: '1px solid rgba(248, 113, 113, 0.2)' }}>
                                        <div>
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Số lượng đang được đề xuất</p>
                                            <p style={{ fontSize: 18, fontWeight: 700, color: '#f87171' }}>
                                                {importStockForm.dang_de_xuat} {importStockForm.don_vi_tinh}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => setImportStockForm({ ...importStockForm, so_luong_nhap: importStockForm.dang_de_xuat })}
                                            style={{ padding: '8px 14px', fontSize: 13, whiteSpace: 'nowrap' }}
                                        >
                                            <PackagePlus size={14} style={{ marginRight: 6 }} />
                                            Nhập theo đề xuất
                                        </button>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Nhập thêm bao nhiêu hàng mới mua về? *</label>
                                    <div style={{ position: 'relative' }}>
                                        <Plus size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            type="number"
                                            className="form-input"
                                            style={{ paddingLeft: 42, paddingRight: 60, fontSize: 16, fontWeight: 600 }}
                                            value={importStockForm.so_luong_nhap}
                                            onChange={e => setImportStockForm({ ...importStockForm, so_luong_nhap: e.target.value })}
                                            required
                                            min="1"
                                            placeholder="Nhập số lượng..."
                                            autoFocus
                                        />
                                        <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13 }}>
                                            {importStockForm.don_vi_tinh}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowImportStockModal(false)}>Hủy</button>
                                <button type="submit" className="btn btn-success">Cập nhật kho</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showImport && (
                <div className="modal-overlay" onClick={() => setShowImport(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Import Vật tư</h2>
                            <button className="btn-ghost" onClick={() => setShowImport(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-grid mb-4">
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Chọn ngành chèn vật tư vào</label>
                                    <select className="form-select" value={importNganhId} onChange={e => setImportNganhId(e.target.value)}>
                                        <option value="">-- Dùng chung (Tất cả ngành) --</option>
                                        {nganhs.map(n => <option key={n.id} value={n.id}>{n.ten_nganh}</option>)}
                                    </select>
                                </div>
                                {fixedLoai ? (
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Loại vật tư import</label>
                                    <input className="form-input" value={fixedLoai === 'sua_che' ? 'Sửa chữa' : 'Tiêu hao'} disabled />
                                </div>
                                ) : (
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Loại vật tư import</label>
                                    <select className="form-select" value={importLoai} onChange={e => setImportLoai(e.target.value)}>
                                        <option value="tieu_hao">Tiêu hao</option>
                                        <option value="sua_che">Sửa chữa</option>
                                    </select>
                                </div>
                                )}
                            </div>
                            <div className="alert alert-info mb-4">
                                Nhập mỗi vật tư trên 1 dòng. Định dạng: <strong>Tên vật tư, Yêu cầu KT, Đơn vị tính, Tồn kho</strong>
                                <br />Có thể copy trực tiếp từ Excel (phân tách bằng tab)
                            </div>
                            <textarea
                                className="form-textarea"
                                style={{ minHeight: 200, fontFamily: 'monospace', fontSize: 13 }}
                                value={importText}
                                onChange={e => setImportText(e.target.value)}
                                placeholder={`Điện trở\t330 Ohm; 1/4W\tCon\t0\nTụ điện\t100uF/25V\tCon\t50`}
                            />
                            {importText && (
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                                    {importText.trim().split('\n').filter(l => l.trim()).length} dòng sẽ được import vào kỳ hiện tại
                                </p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowImport(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleImport}>Import</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Đồng bộ từ kỳ khác */}
            {showSyncModal && (
                <div className="modal-overlay" onClick={() => !syncSubmitting && setShowSyncModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 'min(540px, calc(100vw - 48px))' }}>
                        <div className="modal-header">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Copy size={20} className="text-accent" /> Đồng bộ vật tư từ kỳ khác
                            </h2>
                            <button className="btn-ghost" disabled={syncSubmitting} onClick={() => setShowSyncModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSyncSubmit}>
                            <div className="modal-body">
                                <div className="alert alert-info mb-4" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(28, 110, 245, 0.08)', color: 'var(--text-accent)', padding: 14, borderRadius: 'var(--radius-md)' }}>
                                    <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                                        Sao chép danh mục vật tư từ kỳ học đã có sang kỳ đang chọn.
                                        Hệ thống sẽ <strong>tự động bỏ qua các vật tư đã tồn tại</strong> (trùng tên & ngành) ở kỳ đích.
                                    </div>
                                </div>

                                <div className="form-group mb-3">
                                    <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Kỳ học đích (Nhận vật tư)</label>
                                    <div style={{ padding: '10px 14px', background: 'rgba(28, 110, 245, 0.08)', border: '1px solid rgba(28, 110, 245, 0.25)', borderRadius: 'var(--radius-md)', fontWeight: 600, color: 'var(--text-accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Boxes size={18} />
                                        {kiHocs.find(k => k.id.toString() === selectedKi.toString())?.ten_ki} - {kiHocs.find(k => k.id.toString() === selectedKi.toString())?.nam_hoc}
                                    </div>
                                </div>

                                <div className="form-group mb-3">
                                    <label className="form-label">Chọn Kỳ học nguồn (Sao chép từ) *</label>
                                    <select 
                                        className="form-select" 
                                        value={syncSourceKi} 
                                        required
                                        onChange={e => {
                                            const val = e.target.value;
                                            setSyncSourceKi(val);
                                            fetchSyncPreview(val, syncNganhId, selectedKi);
                                        }}
                                    >
                                        <option value="">-- Chọn kỳ nguồn cần lấy vật tư --</option>
                                        {kiHocs
                                            .filter(k => k.id.toString() !== selectedKi.toString())
                                            .map(k => (
                                                <option key={k.id} value={k.id}>
                                                    {k.ten_ki} - {k.nam_hoc}
                                                </option>
                                            ))
                                        }
                                    </select>
                                </div>

                                <div className="form-group mb-3">
                                    <label className="form-label">Phạm vi ngành đào tạo</label>
                                    <select 
                                        className="form-select" 
                                        value={syncNganhId} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            setSyncNganhId(val);
                                            fetchSyncPreview(syncSourceKi, val, selectedKi);
                                        }}
                                    >
                                        <option value="">-- Tất cả các ngành (và dùng chung) --</option>
                                        <option value="chung">-- Chỉ danh mục Dùng chung --</option>
                                        {nganhs.map(n => <option key={n.id} value={n.id}>{n.ten_nganh}</option>)}
                                    </select>
                                </div>

                                <div className="form-group mb-4" style={{ background: 'var(--bg-glass)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', margin: 0 }}>
                                        <input 
                                            type="checkbox" 
                                            checked={syncKeepStock} 
                                            onChange={e => setSyncKeepStock(e.target.checked)} 
                                            style={{ width: 16, height: 16, accentColor: 'var(--text-accent)', cursor: 'pointer' }}
                                        />
                                        <div>
                                            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                                                Kế thừa số lượng tồn kho từ kỳ trước
                                            </span>
                                            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                                Nếu bỏ chọn, số lượng tồn kho ban đầu ở kỳ mới sẽ được đặt về <strong>0</strong> (khuyến nghị cho kỳ mới).
                                            </p>
                                        </div>
                                    </label>
                                </div>

                                {syncLoadingPreview ? (
                                    <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                                        <div className="spinner" style={{ width: 20, height: 20, margin: '0 auto 8px' }} />
                                        Đang kiểm tra dữ liệu vật tư...
                                    </div>
                                ) : syncPreview ? (
                                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                                        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                            Dự tính kết quả đồng bộ
                                        </p>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(110px, 100%), 1fr))', gap: 10, textAlign: 'center' }}>
                                            <div style={{ background: 'var(--bg-glass)', padding: '10px 8px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kỳ nguồn có</div>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{syncPreview.source_total}</div>
                                            </div>
                                            <div style={{ background: 'rgba(16,185,129,0.08)', padding: '10px 8px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>
                                                <div style={{ fontSize: 11, color: '#34d399' }}>Sẽ thêm mới</div>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: '#34d399', marginTop: 2 }}>+{syncPreview.new_count}</div>
                                            </div>
                                            <div style={{ background: 'rgba(245,158,11,0.08)', padding: '10px 8px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)' }}>
                                                <div style={{ fontSize: 11, color: '#fbbf24' }}>Bỏ qua (đã có)</div>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: '#fbbf24', marginTop: 2 }}>{syncPreview.duplicate_count}</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" disabled={syncSubmitting} onClick={() => setShowSyncModal(false)}>
                                    Hủy
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary" 
                                    disabled={!syncSourceKi || syncSubmitting || (syncPreview && syncPreview.new_count === 0)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    {syncSubmitting ? (
                                        <>
                                            <RefreshCw size={16} className="spinner" /> Đang đồng bộ...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={16} /> Bắt đầu đồng bộ
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
