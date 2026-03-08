'use client';
import { useState, useEffect } from 'react';
import { ShoppingCart, Save, CheckCircle, DollarSign, Package } from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function MuaSamPage() {
    const [items, setItems] = useState([]);
    const [kiHocs, setKiHocs] = useState([]);
    const [selectedKi, setSelectedKi] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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
        const res = await fetch(`/api/mua-sam?ki_id=${selectedKi}`);
        const data = await res.json();
        setItems(data.map(item => ({
            ...item,
            so_luong_duyet: item.so_luong_duyet || item.tong_de_xuat || 0,
            don_gia: item.don_gia || 0,
            trang_thai_mua: item.trang_thai_mua || 'cho_mua',
        })));
    };

    useEffect(() => { if (selectedKi) fetchData(); }, [selectedKi]);

    const updateItem = (idx, field, value) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            const updated = { ...item, [field]: value };
            if (field === 'so_luong_duyet' || field === 'don_gia') {
                updated.thanh_tien = (updated.so_luong_duyet || 0) * (updated.don_gia || 0);
            }
            return updated;
        }));
    };

    const roundUp = (n, to = 10) => Math.ceil(n / to) * to;

    const autoRound = () => {
        setItems(prev => prev.map(item => ({
            ...item,
            so_luong_duyet: item.tong_de_xuat > 0 ? roundUp(item.tong_de_xuat) : item.so_luong_duyet,
            thanh_tien: (item.tong_de_xuat > 0 ? roundUp(item.tong_de_xuat) : item.so_luong_duyet) * (item.don_gia || 0),
        })));
        addToast('Đã làm tròn số lượng lên bội số 10', 'info');
    };

    const handleSave = async () => {
        setSaving(true);
        const payload = items.filter(item => item.tong_de_xuat > 0 || item.so_luong_duyet > 0).map(item => ({
            ki_id: parseInt(selectedKi),
            vat_tu_id: item.vat_tu_id,
            so_luong_de_xuat: item.tong_de_xuat,
            so_luong_duyet: item.so_luong_duyet,
            don_gia: item.don_gia,
            trang_thai: item.trang_thai_mua,
        }));

        const res = await fetch('/api/mua-sam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (res.ok) addToast('Lưu thông tin mua sắm thành công');
        else addToast('Lỗi khi lưu', 'error');
        setSaving(false);
    };

    const totalCost = items.reduce((sum, item) => sum + ((item.so_luong_duyet || 0) * (item.don_gia || 0)), 0);
    const itemsNeedBuy = items.filter(i => i.tong_de_xuat > 0);

    if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShoppingCart size={28} className="text-accent" /> Mua sắm vật tư</h1>
                    <p>Tổng hợp và quản lý mua sắm vật tư theo đề xuất</p>
                </div>
                <div className="page-header-actions">
                    <select className="form-select" style={{ width: 220 }} value={selectedKi} onChange={e => setSelectedKi(e.target.value)}>
                        {kiHocs.map(k => <option key={k.id} value={k.id}>{k.ten_ki} - {k.nam_hoc}</option>)}
                    </select>
                    <button className="btn btn-secondary" onClick={autoRound}>
                        Làm tròn SL
                    </button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? <div className="spinner" /> : <><Save size={18} /> Lưu</>}
                    </button>
                </div>
            </div>

            {/* Summary */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
                <div className="stat-card primary">
                    <div className="stat-icon primary"><Package size={24} /></div>
                    <div className="stat-info">
                        <h3>{itemsNeedBuy.length}</h3>
                        <p>Vật tư cần mua</p>
                    </div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon success"><CheckCircle size={24} /></div>
                    <div className="stat-info">
                        <h3>{items.filter(i => i.trang_thai_mua === 'da_mua').length}</h3>
                        <p>Đã mua</p>
                    </div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon warning"><DollarSign size={24} /></div>
                    <div className="stat-info">
                        <h3>{totalCost.toLocaleString('vi-VN')}đ</h3>
                        <p>Tổng chi phí</p>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Vật tư</th>
                                <th>Yêu cầu KT</th>
                                <th>ĐVT</th>
                                <th>Kho</th>
                                <th>SL đề xuất</th>
                                <th style={{ width: 110 }}>SL duyệt</th>
                                <th style={{ width: 130 }}>Đơn giá</th>
                                <th>Thành tiền</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr><td colSpan={10}><div className="empty-state"><ShoppingCart size={48} /><h3>Chưa có dữ liệu</h3></div></td></tr>
                            ) : items.map((item, idx) => (
                                <tr key={item.vat_tu_id} style={{ background: item.tong_de_xuat > 0 ? 'transparent' : 'var(--bg-glass)' }}>
                                    <td>{idx + 1}</td>
                                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.ten_vat_tu}</td>
                                    <td style={{ fontSize: 13 }}>{item.yeu_cau_ky_thuat || '—'}</td>
                                    <td><span className="badge badge-info">{item.don_vi_tinh}</span></td>
                                    <td>{item.so_luong_kho}</td>
                                    <td style={{ fontWeight: 600, color: item.tong_de_xuat > 0 ? 'var(--text-accent)' : 'var(--text-muted)' }}>
                                        {item.tong_de_xuat}
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            className="form-input"
                                            style={{ padding: '6px 10px', fontSize: 13, textAlign: 'right' }}
                                            value={item.so_luong_duyet}
                                            onChange={e => updateItem(idx, 'so_luong_duyet', parseInt(e.target.value) || 0)}
                                            min="0"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            className="form-input"
                                            style={{ padding: '6px 10px', fontSize: 13, textAlign: 'right' }}
                                            value={item.don_gia}
                                            onChange={e => updateItem(idx, 'don_gia', parseFloat(e.target.value) || 0)}
                                            min="0"
                                        />
                                    </td>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {((item.so_luong_duyet || 0) * (item.don_gia || 0)).toLocaleString('vi-VN')}đ
                                    </td>
                                    <td>
                                        <select
                                            className="form-select"
                                            style={{ padding: '4px 8px', fontSize: 12, minWidth: 100 }}
                                            value={item.trang_thai_mua}
                                            onChange={e => updateItem(idx, 'trang_thai_mua', e.target.value)}
                                        >
                                            <option value="cho_mua">Chờ mua</option>
                                            <option value="da_mua">Đã mua</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {items.length > 0 && (
                    <div className="card-footer">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Tổng cộng:</span>
                            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                                {totalCost.toLocaleString('vi-VN')}đ
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
