'use client';
import { useState, useEffect } from 'react';
import { Calendar, Plus, Edit3, Trash2, ChevronRight, AlertCircle, Settings, FileText, ShoppingCart, Activity, Lock, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/Toast';

const statusLabels = {
    setup: { label: 'Thiết lập', icon: Settings },
    de_xuat: { label: 'Đề xuất', icon: FileText },
    mua_sam: { label: 'Mua sắm', icon: ShoppingCart },
    hoat_dong: { label: 'Hoạt động', icon: Activity },
    dong: { label: 'Đã đóng', icon: Lock },
};

const statusFlow = ['setup', 'de_xuat', 'mua_sam', 'hoat_dong', 'dong'];

export default function KiHocPage() {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ ten_ki: '', nam_hoc: '', ngay_bat_dau: '', ngay_ket_thuc: '', han_de_xuat: '' });
    const addToast = useToast();

    const fetchData = () => {
        fetch('/api/ki-hoc').then(r => r.json()).then(data => { setList(data); setLoading(false); });
    };

    useEffect(() => { fetchData(); }, []);

    const openModal = (item = null) => {
        if (item) {
            setEditing(item);
            setForm({
                ten_ki: item.ten_ki,
                nam_hoc: item.nam_hoc,
                ngay_bat_dau: item.ngay_bat_dau || '',
                ngay_ket_thuc: item.ngay_ket_thuc || '',
                han_de_xuat: item.han_de_xuat || '',
            });
        } else {
            setEditing(null);
            setForm({ ten_ki: '', nam_hoc: '', ngay_bat_dau: '', ngay_ket_thuc: '', han_de_xuat: '' });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const method = editing ? 'PUT' : 'POST';
        const body = editing ? { ...form, id: editing.id, trang_thai: editing.trang_thai } : form;

        const res = await fetch('/api/ki-hoc', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) {
            addToast(editing ? 'Cập nhật kỳ học thành công' : 'Thêm kỳ học thành công');
            setShowModal(false);
            fetchData();
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Bạn có chắc muốn xóa kỳ học này?')) return;
        await fetch(`/api/ki-hoc?id=${id}`, { method: 'DELETE' });
        addToast('Xóa kỳ học thành công');
        fetchData();
    };

    const handleStatusChange = async (item, newStatus) => {
        await fetch('/api/ki-hoc', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...item, trang_thai: newStatus }),
        });
        addToast(`Chuyển sang trạng thái: ${statusLabels[newStatus].label}`);
        fetchData();
    };

    if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={28} className="text-accent" /> Quản lý Kỳ học</h1>
                    <p>Thiết lập và quản lý các kỳ học / đợt</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-primary" onClick={() => openModal()}>
                        <Plus size={18} /> Thêm kỳ học
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Tên kỳ</th>
                                <th>Năm học</th>
                                <th>Ngày bắt đầu</th>
                                <th>Ngày kết thúc</th>
                                <th>Hạn đề xuất</th>
                                <th style={{ minWidth: 420 }}>Tiến trình kỳ học</th>
                                <th style={{ width: 100 }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.length === 0 ? (
                                <tr><td colSpan={7}><div className="empty-state"><Calendar size={48} /><h3>Chưa có kỳ học</h3><p>Nhấn &ldquo;Thêm kỳ học&rdquo; để bắt đầu</p></div></td></tr>
                            ) : list.map(item => {
                                const currentIdx = statusFlow.indexOf(item.trang_thai);
                                return (
                                    <tr key={item.id}>
                                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.ten_ki}</td>
                                        <td>{item.nam_hoc}</td>
                                        <td>{item.ngay_bat_dau ? new Date(item.ngay_bat_dau).toLocaleDateString('vi-VN') : '—'}</td>
                                        <td>{item.ngay_ket_thuc ? new Date(item.ngay_ket_thuc).toLocaleDateString('vi-VN') : '—'}</td>
                                        <td>{item.han_de_xuat ? new Date(item.han_de_xuat).toLocaleDateString('vi-VN') : '—'}</td>
                                        <td style={{ minWidth: 450, padding: '16px 12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
                                                {statusFlow.map((st, idx) => {
                                                    const isPast = idx < currentIdx;
                                                    const isCurrent = idx === currentIdx;
                                                    const isNext = idx === currentIdx + 1;
                                                    const isFuture = idx > currentIdx + 1;

                                                    const Icon = statusLabels[st].icon;

                                                    let bgColor = 'var(--bg-glass)';
                                                    let iconColor = 'var(--text-muted)';
                                                    let textColor = 'var(--text-muted)';
                                                    let border = '2px solid var(--border-color)';
                                                    let cursor = 'default';

                                                    if (isPast) {
                                                        bgColor = '#10b981';
                                                        iconColor = '#fff';
                                                        textColor = '#10b981';
                                                        border = '2px solid #10b981';
                                                    } else if (isCurrent) {
                                                        bgColor = 'rgba(14, 165, 233, 0.1)';
                                                        iconColor = '#0ea5e9';
                                                        textColor = '#0ea5e9';
                                                        border = '2px solid #0ea5e9';
                                                    } else if (isNext) {
                                                        bgColor = 'transparent';
                                                        iconColor = 'var(--text-primary)';
                                                        textColor = 'var(--text-primary)';
                                                        border = '2px dashed var(--text-muted)';
                                                        cursor = 'pointer';
                                                    }

                                                    return (
                                                        <div key={st} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', flex: 1 }}>
                                                            {/* Connecting Line (before this step) */}
                                                            {idx > 0 && (
                                                                <div style={{
                                                                    position: 'absolute',
                                                                    top: 16, // half of 32px icon
                                                                    right: '50%',
                                                                    width: '100%',
                                                                    height: 3,
                                                                    backgroundColor: isPast || isCurrent ? '#10b981' : 'var(--border-color)',
                                                                    zIndex: 0,
                                                                    transition: 'background-color 0.3s'
                                                                }} />
                                                            )}

                                                            {/* Circle Icon */}
                                                            <div
                                                                onClick={() => isNext && handleStatusChange(item, st)}
                                                                style={{
                                                                    width: 34,
                                                                    height: 34,
                                                                    borderRadius: '50%',
                                                                    backgroundColor: bgColor,
                                                                    border: border,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: iconColor,
                                                                    cursor: cursor,
                                                                    zIndex: 1,
                                                                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                                                    boxShadow: isCurrent ? '0 0 0 4px rgba(14, 165, 233, 0.15)' : 'none',
                                                                    opacity: isFuture ? 0.4 : 1
                                                                }}
                                                                onMouseEnter={(e) => { if (isNext) { e.currentTarget.style.borderColor = '#0ea5e9'; e.currentTarget.style.color = '#0ea5e9'; e.currentTarget.style.transform = 'scale(1.1)'; } }}
                                                                onMouseLeave={(e) => { if (isNext) { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.transform = 'scale(1)'; } }}
                                                                title={isNext ? 'Nhấn để chuyển sang bước này' : isCurrent ? 'Trạng thái hiện tại' : ''}
                                                            >
                                                                {isPast ? <CheckCircle2 size={18} color="#fff" /> : <Icon size={16} />}
                                                            </div>

                                                            {/* Label */}
                                                            <div style={{
                                                                marginTop: 8,
                                                                fontSize: 11,
                                                                fontWeight: isCurrent ? 700 : 600,
                                                                color: textColor,
                                                                textAlign: 'center',
                                                                opacity: isFuture ? 0.4 : 1,
                                                            }}>
                                                                {statusLabels[st].label}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button className="btn-icon" onClick={() => openModal(item)} title="Sửa"><Edit3 size={16} /></button>
                                                <button className="btn-icon" onClick={() => handleDelete(item.id)} title="Xóa" style={{ color: '#f87171' }}><Trash2 size={16} /></button>
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
                            <h2>{editing ? 'Sửa kỳ học' : 'Thêm kỳ học mới'}</h2>
                            <button className="btn-ghost" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Tên kỳ *</label>
                                        <input className="form-input" value={form.ten_ki} onChange={e => setForm({ ...form, ten_ki: e.target.value })} required placeholder="VD: Kỳ 1" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Năm học *</label>
                                        <input className="form-input" value={form.nam_hoc} onChange={e => setForm({ ...form, nam_hoc: e.target.value })} required placeholder="VD: 2025-2026" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Ngày bắt đầu</label>
                                        <input type="date" className="form-input" value={form.ngay_bat_dau} onChange={e => setForm({ ...form, ngay_bat_dau: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Ngày kết thúc</label>
                                        <input type="date" className="form-input" value={form.ngay_ket_thuc} onChange={e => setForm({ ...form, ngay_ket_thuc: e.target.value })} />
                                    </div>
                                    <div className="form-group form-full">
                                        <label className="form-label">Hạn đề xuất</label>
                                        <input type="datetime-local" className="form-input" value={form.han_de_xuat} onChange={e => setForm({ ...form, han_de_xuat: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Thêm mới'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
