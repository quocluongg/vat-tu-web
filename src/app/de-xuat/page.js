'use client';
import { useState, useEffect } from 'react';
import { FileText, ChevronDown, Plus, Minus, Send, CheckCircle, BookOpen, Package } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function DeXuatPublicPage() {
    const [kiHocs, setKiHocs] = useState([]);
    const [giaoViens, setGiaoViens] = useState([]);
    const [selectedKi, setSelectedKi] = useState('');
    const [selectedGv, setSelectedGv] = useState('');
    const [phanCongs, setPhanCongs] = useState([]);
    const [vatTus, setVatTus] = useState([]);
    const [selections, setSelections] = useState({}); // { monHocId: { vatTuId: soLuong } }
    const [expandedMon, setExpandedMon] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [kiInfo, setKiInfo] = useState(null);

    useEffect(() => {
        fetch('/api/ki-hoc').then(r => r.json()).then(data => {
            const activeKis = data.filter(k => k.trang_thai === 'de_xuat');
            setKiHocs(activeKis);
            if (activeKis.length > 0) {
                setSelectedKi(activeKis[0].id.toString());
                setKiInfo(activeKis[0]);
            }
        });
        fetch('/api/giao-vien').then(r => r.json()).then(setGiaoViens);
    }, []);

    useEffect(() => {
        if (selectedKi && selectedGv) {
            fetch(`/api/phan-cong?ki_id=${selectedKi}&giao_vien_id=${selectedGv}`)
                .then(r => r.json()).then(setPhanCongs);
            fetch(`/api/vat-tu?ki_id=${selectedKi}`)
                .then(r => r.json()).then(setVatTus);
        }
    }, [selectedKi, selectedGv]);

    const toggleMon = (monId) => {
        setExpandedMon(prev => ({ ...prev, [monId]: !prev[monId] }));
    };

    const updateQuantity = (monId, vtId, delta) => {
        setSelections(prev => {
            const monSelections = prev[monId] || {};
            const current = monSelections[vtId] || 0;
            const newVal = Math.max(0, current + delta);

            const updatedMon = { ...monSelections };
            if (newVal === 0) {
                delete updatedMon[vtId];
            } else {
                updatedMon[vtId] = newVal;
            }

            return { ...prev, [monId]: updatedMon };
        });
    };

    const setQuantity = (monId, vtId, value) => {
        const val = parseInt(value) || 0;
        setSelections(prev => {
            const monSelections = { ...(prev[monId] || {}) };
            if (val === 0) {
                delete monSelections[vtId];
            } else {
                monSelections[vtId] = val;
            }
            return { ...prev, [monId]: monSelections };
        });
    };

    const getTotalItems = () => {
        let total = 0;
        Object.values(selections).forEach(mon => {
            Object.values(mon).forEach(qty => { total += qty; });
        });
        return total;
    };

    const getChiTiet = () => {
        const result = [];
        Object.entries(selections).forEach(([monId, vatTuMap]) => {
            // Find lop_id from phanCong (each phanCong entry has mon_hoc_id + lop_id)
            const pc = phanCongs.find(p => p.mon_hoc_id === parseInt(monId));
            const lopId = pc?.lop_id || null;
            Object.entries(vatTuMap).forEach(([vtId, soLuong]) => {
                if (soLuong > 0) {
                    result.push({
                        mon_hoc_id: parseInt(monId),
                        lop_id: lopId,
                        vat_tu_id: parseInt(vtId),
                        so_luong: soLuong
                    });
                }
            });
        });
        return result;
    };

    const handleSubmit = async () => {
        const chiTiet = getChiTiet();
        if (chiTiet.length === 0) {
            setError('Vui lòng chọn ít nhất một vật tư');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const res = await fetch('/api/de-xuat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    giao_vien_id: parseInt(selectedGv),
                    ki_id: parseInt(selectedKi),
                    chi_tiet: chiTiet,
                }),
            });

            if (res.ok) {
                setSubmitted(true);
            } else {
                const data = await res.json();
                setError(data.error || 'Có lỗi xảy ra');
            }
        } catch (err) {
            setError('Không thể kết nối đến server');
        }
        setSubmitting(false);
    };

    if (submitted) {
        return (
            <div className="public-page">
                <div style={{ position: 'absolute', top: 24, right: 24 }}>
                    <ThemeToggle />
                </div>
                <div className="public-container" style={{ textAlign: 'center', paddingTop: 100 }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                        <CheckCircle size={40} color="#34d399" />
                    </div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Gửi đề xuất thành công!</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 32 }}>
                        Đề xuất dự trù vật tư của bạn đã được gửi đến quản lý kho. Vui lòng chờ duyệt.
                    </p>
                    <button className="btn btn-primary btn-lg" onClick={() => { setSubmitted(false); setSelections({}); setSelectedGv(''); }}>
                        Tạo đề xuất mới
                    </button>
                </div>
            </div>
        );
    }

    if (kiHocs.length === 0) {
        return (
            <div className="public-page">
                <div style={{ position: 'absolute', top: 24, right: 24 }}>
                    <ThemeToggle />
                </div>
                <div className="public-container" style={{ textAlign: 'center', paddingTop: 100 }}>
                    <FileText size={60} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                    <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Chưa mở đề xuất</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Hiện tại chưa có kỳ nào mở nhận đề xuất dự trù vật tư.</p>
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
                    <h1>📋 Đề xuất dự trù vật tư</h1>
                    <p>
                        {kiInfo && `${kiInfo.ten_ki} - ${kiInfo.nam_hoc}`}
                        {kiInfo?.han_de_xuat && ` • Hạn: ${new Date(kiInfo.han_de_xuat).toLocaleDateString('vi-VN')}`}
                    </p>
                </div>

                {/* Step 1: Select Teacher */}
                <div className="card mb-4" style={{ marginBottom: 24 }}>
                    <div className="card-header">
                        <h2>1. Chọn giáo viên</h2>
                    </div>
                    <div className="card-body">
                        <select className="form-select" value={selectedGv} onChange={e => { setSelectedGv(e.target.value); setSelections({}); }}>
                            <option value="">-- Chọn giáo viên đề xuất --</option>
                            {giaoViens.map(gv => <option key={gv.id} value={gv.id}>{gv.ho_ten}</option>)}
                        </select>
                    </div>
                </div>

                {/* Step 2: Select materials per subject */}
                {selectedGv && (
                    <div className="card mb-4" style={{ marginBottom: 24 }}>
                        <div className="card-header">
                            <h2>2. Chọn vật tư cho từng môn</h2>
                            <span className="badge badge-primary">{phanCongs.length} môn học</span>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            {phanCongs.length === 0 ? (
                                <div className="empty-state">
                                    <BookOpen size={40} />
                                    <h3>Chưa được phân công môn nào</h3>
                                    <p>Liên hệ quản lý để được phân công môn học</p>
                                </div>
                            ) : (
                                phanCongs.map(pc => {
                                    const isExpanded = expandedMon[pc.mon_hoc_id];
                                    const monSelections = selections[pc.mon_hoc_id] || {};
                                    const selectedCount = Object.keys(monSelections).length;
                                    return (
                                        <div key={pc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <div
                                                className="accordion-header"
                                                onClick={() => toggleMon(pc.mon_hoc_id)}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <ChevronDown size={20} style={{ transform: isExpanded ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
                                                    <BookOpen size={18} style={{ color: 'var(--text-accent)' }} />
                                                    <div>
                                                        <h3>{pc.ten_mon}</h3>
                                                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lớp: {pc.ten_lop} ({pc.si_so} HV) • {pc.ten_loai_he || pc.loai_he}</p>
                                                    </div>
                                                </div>
                                                {selectedCount > 0 && (
                                                    <span className="badge badge-success">{selectedCount} vật tư đã chọn</span>
                                                )}
                                            </div>
                                            {isExpanded && (
                                                <div style={{ padding: '0 20px 16px' }}>
                                                    {vatTus.map(vt => {
                                                        const qty = monSelections[vt.id] || 0;
                                                        return (
                                                            <div className="material-item" key={vt.id} style={{ background: qty > 0 ? 'rgba(14,165,233,0.05)' : 'transparent', borderColor: qty > 0 ? 'rgba(14,165,233,0.2)' : 'var(--border-color)' }}>
                                                                <div className="material-info">
                                                                    <h4>{vt.ten_vat_tu}</h4>
                                                                    <p>
                                                                        {vt.yeu_cau_ky_thuat && `${vt.yeu_cau_ky_thuat} • `}
                                                                        {vt.don_vi_tinh} • Kho: {vt.so_luong_kho}
                                                                    </p>
                                                                </div>
                                                                <div className="material-qty">
                                                                    <button className="btn-icon" onClick={() => updateQuantity(pc.mon_hoc_id, vt.id, -1)} disabled={qty === 0}>
                                                                        <Minus size={16} />
                                                                    </button>
                                                                    <input
                                                                        type="number"
                                                                        className="form-input"
                                                                        style={{ width: 70, textAlign: 'center', padding: '6px' }}
                                                                        value={qty}
                                                                        onChange={e => setQuantity(pc.mon_hoc_id, vt.id, e.target.value)}
                                                                        min="0"
                                                                    />
                                                                    <button className="btn-icon" onClick={() => updateQuantity(pc.mon_hoc_id, vt.id, 1)}>
                                                                        <Plus size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* Summary & Submit */}
                {selectedGv && getChiTiet().length > 0 && (
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="card-header">
                            <h2>3. Xác nhận & Gửi</h2>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                <div style={{ padding: 16, background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                    <Package size={24} style={{ color: 'var(--text-accent)', marginBottom: 8 }} />
                                    <div className="number-highlight">{getChiTiet().length}</div>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Mục vật tư</p>
                                </div>
                                <div style={{ padding: 16, background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                    <FileText size={24} style={{ color: '#34d399', marginBottom: 8 }} />
                                    <div className="number-highlight" style={{ background: 'var(--gradient-success)', WebkitBackgroundClip: 'text' }}>{getTotalItems()}</div>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Tổng số lượng</p>
                                </div>
                            </div>

                            {error && <div className="alert alert-error mb-4">{error}</div>}

                            <button
                                className="btn btn-primary btn-lg btn-full"
                                onClick={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? <div className="spinner" /> : <><Send size={20} /> Gửi đề xuất</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
