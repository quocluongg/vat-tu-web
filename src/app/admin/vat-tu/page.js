'use client';
import { useState, useEffect } from 'react';
import { Boxes, Plus, Edit3, Trash2, Search, Upload, Package, PackagePlus } from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function VatTuPage() {
    const [list, setList] = useState([]);
    const [kiHocs, setKiHocs] = useState([]);
    const [nganhs, setNganhs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [showImportStockModal, setShowImportStockModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ ten_vat_tu: '', yeu_cau_ky_thuat: '', don_vi_tinh: '', so_luong_kho: 0, ki_id: '', nganh_id: '' });
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [selectedVatTu, setSelectedVatTu] = useState(new Set());
    const [selectedKi, setSelectedKi] = useState('');
    const [importText, setImportText] = useState('');
    const [importNganhId, setImportNganhId] = useState('');
    const [importStockForm, setImportStockForm] = useState({ id: null, ten_vat_tu: '', yeu_cau_ky_thuat: '', don_vi_tinh: '', so_luong_hien_tai: 0, so_luong_nhap: 0, dang_de_xuat: 0, nganh_id: null, ki_id: null });
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
        });
        setShowModal(true);
    };

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
            ki_id: item.ki_id
        });
        setShowImportStockModal(true);
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
            ki_id: importStockForm.ki_id
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
            await fetchVatTu();
            setActiveTab(currentTab); // Restore tab về lựa chọn trước đó
        }
    };

    const filtered = list.filter(vt => {
        const matchSearch = vt.ten_vat_tu.toLowerCase().includes(search.toLowerCase()) ||
            (vt.yeu_cau_ky_thuat && vt.yeu_cau_ky_thuat.toLowerCase().includes(search.toLowerCase()));

        let matchTab = true;
        if (activeTab === 'chung') {
            matchTab = !vt.nganh_id;
        } else if (activeTab !== 'all') {
            matchTab = vt.nganh_id?.toString() === activeTab;
        }

        return matchSearch && matchTab;
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
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Boxes size={28} className="text-accent" /> Quản lý Vật tư</h1>
                    <p>Danh mục vật tư theo kỳ học</p>
                </div>
                <div className="page-header-actions">
                    <select className="form-select" style={{ width: 220 }} value={selectedKi} onChange={e => setSelectedKi(e.target.value)}>
                        <option value="">Chọn kỳ</option>
                        {kiHocs.map(k => <option key={k.id} value={k.id}>{k.ten_ki} - {k.nam_hoc}</option>)}
                    </select>
                    <button className="btn btn-secondary" onClick={() => { setShowImport(true); setImportNganhId(activeTab !== 'all' && activeTab !== 'chung' ? activeTab : ''); }}>
                        <Upload size={18} /> Import Excel
                    </button>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> Thêm vật tư mới
                    </button>
                </div>
            </div>

            <div className="tabs" style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8, overflowX: 'auto' }}>
                <button
                    className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('all')}
                    style={{ borderRadius: 20, padding: '6px 16px', fontSize: 14 }}
                >
                    Tất cả
                </button>
                <button
                    className={`btn ${activeTab === 'chung' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('chung')}
                    style={{ borderRadius: 20, padding: '6px 16px', fontSize: 14 }}
                >
                    Dùng chung
                </button>
                {nganhs.map(n => (
                    <button
                        key={n.id}
                        className={`btn ${activeTab === n.id.toString() ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setActiveTab(n.id.toString())}
                        style={{ borderRadius: 20, padding: '6px 16px', fontSize: 14, whiteSpace: 'nowrap' }}
                    >
                        {n.ten_nganh}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', marginBottom: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)' }}>
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
                                <th>Ngành</th>
                                <th>Yêu cầu kỹ thuật</th>
                                <th>Đơn vị</th>
                                <th>Tồn kho</th>
                                <th>Đang đề xuất</th>
                                <th style={{ width: 140 }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={8}><div className="empty-state"><Boxes size={48} /><h3>Chưa có vật tư</h3><p>Thêm vật tư hoặc import từ Excel</p></div></td></tr>
                            ) : filtered.map((vt, idx) => {
                                const isSelected = selectedVatTu.has(vt.id);
                                return (
                                    <tr key={vt.id} style={{ background: isSelected ? 'rgba(14,165,233,0.04)' : undefined }}>
                                        <td>
                                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelectVt(vt.id)}
                                                style={{ width: 14, height: 14, accentColor: 'var(--text-accent)', cursor: 'pointer' }} />
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{vt.ten_vat_tu}</td>
                                        <td>
                                            {vt.ten_nganh ? (
                                                <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--text-accent)' }}>{vt.ten_nganh}</span>
                                            ) : (
                                                <span className="badge badge-secondary">Chung</span>
                                            )}
                                        </td>
                                        <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-secondary)', fontSize: 13 }}>{vt.yeu_cau_ky_thuat || '—'}</td>
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
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
                        <div className="modal-header">
                            <h2>Cập nhật nhập hàng kho</h2>
                            <button className="btn-ghost" onClick={() => setShowImportStockModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleImportStockSubmit}>
                            <div className="modal-body">
                                <div className="alert alert-info mb-4" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--text-accent)', padding: 16, borderRadius: 'var(--radius-md)' }}>
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
                                    <div style={{ background: 'rgba(248, 113, 113, 0.1)', padding: 12, borderRadius: 'var(--radius-md)', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(248, 113, 113, 0.2)' }}>
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
                                            style={{ paddingLeft: 42, fontSize: 16, fontWeight: 600 }}
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
                            <div className="form-group mb-4">
                                <label className="form-label">Chọn ngành chèn vật tư vào</label>
                                <select className="form-select" value={importNganhId} onChange={e => setImportNganhId(e.target.value)}>
                                    <option value="">-- Dùng chung (Tất cả ngành) --</option>
                                    {nganhs.map(n => <option key={n.id} value={n.id}>{n.ten_nganh}</option>)}
                                </select>
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
        </div>
    );
}
