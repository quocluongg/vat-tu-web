'use client';
import { useState, useEffect } from 'react';
import { Users, Plus, Edit3, Trash2, Search, Upload, Phone, Mail } from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function GiaoVienPage() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ ho_ten: '', email: '', so_dien_thoai: '' });
    const [search, setSearch] = useState('');
    const [importText, setImportText] = useState('');
    const addToast = useToast();

    const fetchData = () => {
        fetch('/api/giao-vien').then(r => r.json()).then(data => { setList(data); setLoading(false); });
    };

    useEffect(() => { fetchData(); }, []);

    const openModal = (item = null) => {
        setEditing(item);
        setForm({ ho_ten: item?.ho_ten || '', email: item?.email || '', so_dien_thoai: item?.so_dien_thoai || '' });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const method = editing ? 'PUT' : 'POST';
        const body = editing ? { ...form, id: editing.id } : form;
        const res = await fetch('/api/giao-vien', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) {
            addToast(editing ? 'Cập nhật thành công' : 'Thêm giáo viên thành công');
            setShowModal(false);
            fetchData();
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa giáo viên này?')) return;
        await fetch(`/api/giao-vien?id=${id}`, { method: 'DELETE' });
        addToast('Xóa thành công');
        fetchData();
    };

    const handleImport = async () => {
        const lines = importText.trim().split('\n').filter(l => l.trim());
        const items = lines.map(line => {
            const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
            return {
                ho_ten: parts[0]?.trim() || '',
                email: parts[1]?.trim() || '',
                so_dien_thoai: parts[2]?.trim() || '',
            };
        }).filter(item => item.ho_ten);

        if (items.length === 0) { addToast('Không có dữ liệu hợp lệ', 'error'); return; }

        const res = await fetch('/api/giao-vien', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(items),
        });
        if (res.ok) {
            addToast(`Import ${items.length} giáo viên thành công`);
            setShowImport(false);
            setImportText('');
            fetchData();
        }
    };

    const filtered = list.filter(gv =>
        gv.ho_ten.toLowerCase().includes(search.toLowerCase()) ||
        (gv.email && gv.email.toLowerCase().includes(search.toLowerCase()))
    );

    if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Users size={28} className="text-accent" /> Quản lý Giáo viên</h1>
                    <p>Danh sách giáo viên trong hệ thống</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
                        <Upload size={18} /> Import
                    </button>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> Thêm giáo viên
                    </button>
                </div>
            </div>

            <div className="search-bar">
                <div className="search-input-wrapper">
                    <Search />
                    <input className="search-input" placeholder="Tìm kiếm giáo viên..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} giáo viên</span>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Họ tên</th>
                                <th>Email</th>
                                <th>Số điện thoại</th>
                                <th style={{ width: 100 }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={5}><div className="empty-state"><Users size={48} /><h3>Không có dữ liệu</h3></div></td></tr>
                            ) : filtered.map((gv, idx) => (
                                <tr key={gv.id}>
                                    <td>{idx + 1}</td>
                                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{gv.ho_ten}</td>
                                    <td>
                                        {gv.email ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Mail size={14} style={{ color: 'var(--text-muted)' }} /> {gv.email}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td>
                                        {gv.so_dien_thoai ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Phone size={14} style={{ color: 'var(--text-muted)' }} /> {gv.so_dien_thoai}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="btn-icon" onClick={() => openModal(gv)}><Edit3 size={16} /></button>
                                            <button className="btn-icon" onClick={() => handleDelete(gv.id)} style={{ color: '#f87171' }}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editing ? 'Sửa giáo viên' : 'Thêm giáo viên'}</h2>
                            <button className="btn-ghost" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Họ tên *</label>
                                    <input className="form-input" value={form.ho_ten} onChange={e => setForm({ ...form, ho_ten: e.target.value })} required />
                                </div>
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Số điện thoại</label>
                                        <input className="form-input" value={form.so_dien_thoai} onChange={e => setForm({ ...form, so_dien_thoai: e.target.value })} />
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

            {showImport && (
                <div className="modal-overlay" onClick={() => setShowImport(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Import Giáo viên</h2>
                            <button className="btn-ghost" onClick={() => setShowImport(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="alert alert-info mb-4">
                                Nhập mỗi giáo viên trên 1 dòng. Định dạng: <strong>Họ tên, Email, Số điện thoại</strong> (phân tách bằng dấu phẩy hoặc tab)
                            </div>
                            <textarea
                                className="form-textarea"
                                style={{ minHeight: 200 }}
                                value={importText}
                                onChange={e => setImportText(e.target.value)}
                                placeholder={`Nguyễn Văn A, nva@email.com, 0901234567\nTrần Thị B, ttb@email.com, 0912345678`}
                            />
                            {importText && (
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                                    {importText.trim().split('\n').filter(l => l.trim()).length} dòng sẽ được import
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
