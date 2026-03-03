'use client';
import { useState, useEffect, useCallback } from 'react';
import {
    GraduationCap, Plus, Edit3, Trash2, ChevronDown, ChevronRight,
    FolderOpen, BookOpen, Users, UserPlus, X, Search
} from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function NganhHePage() {
    const [nganhs, setNganhs] = useState([]);
    const [hes, setHes] = useState([]);
    const [monHocs, setMonHocs] = useState([]);
    const [giaoViens, setGiaoViens] = useState([]);
    const [kiHocs, setKiHocs] = useState([]);
    const [phanCongs, setPhanCongs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Expand states: nganhId, heId
    const [expandedNganh, setExpandedNganh] = useState({});
    const [expandedHe, setExpandedHe] = useState({});

    // Modals
    const [showModal, setShowModal] = useState(null); // 'nganh', 'he', 'mon', 'phan_cong'
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});
    const [selectedKi, setSelectedKi] = useState('');
    const [search, setSearch] = useState('');

    const addToast = useToast();

    const fetchAll = useCallback(async () => {
        const [nganhRes, heRes, mhRes, gvRes, khRes] = await Promise.all([
            fetch('/api/nganh').then(r => r.json()),
            fetch('/api/he-dao-tao').then(r => r.json()),
            fetch('/api/mon-hoc').then(r => r.json()),
            fetch('/api/giao-vien').then(r => r.json()),
            fetch('/api/ki-hoc').then(r => r.json()),
        ]);
        setNganhs(nganhRes);
        setHes(heRes);
        setMonHocs(mhRes);
        setGiaoViens(gvRes);
        setKiHocs(khRes);
        if (khRes.length > 0 && !selectedKi) {
            const active = khRes.find(k => k.trang_thai !== 'dong') || khRes[0];
            setSelectedKi(active.id.toString());
        }
        setLoading(false);
    }, []);

    const fetchPhanCong = useCallback(async () => {
        if (!selectedKi) return;
        const res = await fetch(`/api/phan-cong?ki_id=${selectedKi}`);
        const data = await res.json();
        setPhanCongs(data);
    }, [selectedKi]);

    useEffect(() => { fetchAll(); }, [fetchAll]);
    useEffect(() => { if (selectedKi) fetchPhanCong(); }, [selectedKi, fetchPhanCong]);

    // Toggle expand
    const toggleNganh = (id) => setExpandedNganh(p => ({ ...p, [id]: !p[id] }));
    const toggleHe = (id) => setExpandedHe(p => ({ ...p, [id]: !p[id] }));

    // Expand all
    const expandAll = () => {
        const nObj = {};
        nganhs.forEach(n => nObj[n.id] = true);
        setExpandedNganh(nObj);
        const hObj = {};
        hes.forEach(h => hObj[h.id] = true);
        setExpandedHe(hObj);
    };

    const collapseAll = () => {
        setExpandedNganh({});
        setExpandedHe({});
    };

    // ===== NGANH =====
    const openNganhModal = (item = null) => {
        setEditing(item);
        setForm({ ten_nganh: item?.ten_nganh || '' });
        setShowModal('nganh');
    };

    const handleSubmitNganh = async (e) => {
        e.preventDefault();
        const method = editing ? 'PUT' : 'POST';
        const body = editing ? { id: editing.id, ten_nganh: form.ten_nganh } : { ten_nganh: form.ten_nganh };
        const res = await fetch('/api/nganh', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) {
            addToast(editing ? 'Cập nhật ngành thành công' : 'Thêm ngành thành công');
            setShowModal(null);
            fetchAll();
        }
    };

    const deleteNganh = async (id) => {
        if (!confirm('Xóa ngành này sẽ xóa tất cả hệ, môn học và phân công liên quan. Tiếp tục?')) return;
        await fetch(`/api/nganh?id=${id}`, { method: 'DELETE' });
        addToast('Xóa ngành thành công');
        fetchAll();
    };

    // ===== HE DAO TAO =====
    const openHeModal = (nganhId, item = null) => {
        setEditing(item);
        setForm({ nganh_id: item?.nganh_id || nganhId, ten_he: item?.ten_he || '' });
        setShowModal('he');
    };

    const handleSubmitHe = async (e) => {
        e.preventDefault();
        const method = editing ? 'PUT' : 'POST';
        const body = editing ? { id: editing.id, nganh_id: form.nganh_id, ten_he: form.ten_he } : { nganh_id: form.nganh_id, ten_he: form.ten_he };
        const res = await fetch('/api/he-dao-tao', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) {
            addToast(editing ? 'Cập nhật hệ thành công' : 'Thêm hệ thành công');
            setShowModal(null);
            fetchAll();
        }
    };

    const deleteHe = async (id) => {
        if (!confirm('Xóa hệ đào tạo này sẽ xóa tất cả môn học liên quan. Tiếp tục?')) return;
        await fetch(`/api/he-dao-tao?id=${id}`, { method: 'DELETE' });
        addToast('Xóa hệ đào tạo thành công');
        fetchAll();
    };

    // ===== MON HOC =====
    const openMonModal = (heId, item = null) => {
        setEditing(item);
        setForm({ he_dao_tao_id: item?.he_dao_tao_id || heId, ten_mon: item?.ten_mon || '' });
        setShowModal('mon');
    };

    const handleSubmitMon = async (e) => {
        e.preventDefault();
        const method = editing ? 'PUT' : 'POST';
        const body = editing ? { id: editing.id, he_dao_tao_id: form.he_dao_tao_id, ten_mon: form.ten_mon } : { he_dao_tao_id: form.he_dao_tao_id, ten_mon: form.ten_mon };
        const res = await fetch('/api/mon-hoc', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) {
            addToast(editing ? 'Cập nhật môn học thành công' : 'Thêm môn học thành công');
            setShowModal(null);
            fetchAll();
        }
    };

    const deleteMon = async (id) => {
        if (!confirm('Xóa môn học này?')) return;
        await fetch(`/api/mon-hoc?id=${id}`, { method: 'DELETE' });
        addToast('Xóa môn học thành công');
        fetchAll();
    };

    // ===== PHAN CONG =====
    const openPhanCongModal = (monId) => {
        setForm({ giao_vien_id: '', mon_hoc_id: monId });
        setShowModal('phan_cong');
    };

    const handlePhanCong = async (e) => {
        e.preventDefault();
        if (!selectedKi) {
            addToast('Vui lòng chọn kỳ học trước khi phân công', 'error');
            return;
        }
        const res = await fetch('/api/phan-cong', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ giao_vien_id: form.giao_vien_id, mon_hoc_id: form.mon_hoc_id, ki_id: selectedKi }),
        });
        if (res.ok) {
            addToast('Phân công giáo viên thành công');
            setShowModal(null);
            fetchPhanCong();
        } else {
            const data = await res.json();
            addToast(data.error || 'Có lỗi xảy ra', 'error');
        }
    };

    const deletePhanCong = async (id) => {
        await fetch(`/api/phan-cong?id=${id}`, { method: 'DELETE' });
        addToast('Xóa phân công thành công');
        fetchPhanCong();
    };

    // Get teachers assigned to a specific subject
    const getMonPhanCong = (monId) => {
        return phanCongs.filter(pc => pc.mon_hoc_id === monId);
    };

    // Filter by search
    const matchesSearch = (text) => {
        if (!search) return true;
        return text.toLowerCase().includes(search.toLowerCase());
    };

    // Stats
    const totalMon = monHocs.length;
    const totalPC = phanCongs.length;

    if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>🎓 Chương trình đào tạo</h1>
                    <p>Ngành → Hệ → Môn học → Giáo viên phụ trách</p>
                </div>
                <div className="page-header-actions">
                    <select
                        className="form-select"
                        style={{ width: 220 }}
                        value={selectedKi}
                        onChange={e => setSelectedKi(e.target.value)}
                    >
                        <option value="">Chọn kỳ</option>
                        {kiHocs.map(k => (
                            <option key={k.id} value={k.id}>
                                {k.ten_ki} - {k.nam_hoc}
                            </option>
                        ))}
                    </select>
                    <button className="btn btn-primary" onClick={() => openNganhModal()}>
                        <Plus size={18} /> Thêm ngành
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="search-input-wrapper" style={{ minWidth: 280, flex: 1, maxWidth: 400 }}>
                    <Search />
                    <input
                        className="search-input"
                        placeholder="Tìm ngành, hệ, môn học..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-secondary" onClick={expandAll}>Mở tất cả</button>
                    <button className="btn btn-sm btn-secondary" onClick={collapseAll}>Thu gọn</button>
                </div>
                <div style={{ display: 'flex', gap: 16, marginLeft: 'auto' }}>
                    <span className="badge badge-primary" style={{ padding: '6px 14px', fontSize: 13 }}>
                        {nganhs.length} ngành
                    </span>
                    <span className="badge badge-accent" style={{ padding: '6px 14px', fontSize: 13 }}>
                        {hes.length} hệ
                    </span>
                    <span className="badge badge-info" style={{ padding: '6px 14px', fontSize: 13 }}>
                        {totalMon} môn
                    </span>
                    <span className="badge badge-success" style={{ padding: '6px 14px', fontSize: 13 }}>
                        {totalPC} phân công
                    </span>
                </div>
            </div>

            {/* Tree View */}
            <div className="card">
                <div className="card-body" style={{ padding: 0 }}>
                    {nganhs.length === 0 ? (
                        <div className="empty-state">
                            <GraduationCap size={48} />
                            <h3>Chưa có ngành nào</h3>
                            <p>Thêm ngành đào tạo để bắt đầu xây dựng chương trình</p>
                        </div>
                    ) : (
                        nganhs.filter(n => {
                            if (!search) return true;
                            // Show nganh if it matches, or any child matches
                            const nganhHes = hes.filter(h => h.nganh_id === n.id);
                            const hasMatchingHe = nganhHes.some(h => matchesSearch(h.ten_he));
                            const hasMatchingMon = nganhHes.some(h => {
                                const heMons = monHocs.filter(m => m.he_dao_tao_id === h.id);
                                return heMons.some(m => matchesSearch(m.ten_mon));
                            });
                            return matchesSearch(n.ten_nganh) || hasMatchingHe || hasMatchingMon;
                        }).map(nganh => {
                            const isNganhExpanded = expandedNganh[nganh.id];
                            const nganhHes = hes.filter(h => h.nganh_id === nganh.id);
                            const nganhMonCount = nganhHes.reduce((sum, h) => {
                                return sum + monHocs.filter(m => m.he_dao_tao_id === h.id).length;
                            }, 0);

                            return (
                                <div key={nganh.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    {/* ===== NGANH LEVEL ===== */}
                                    <div
                                        onClick={() => toggleNganh(nganh.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '14px 24px', cursor: 'pointer',
                                            background: isNganhExpanded ? 'rgba(14, 165, 233, 0.03)' : 'transparent',
                                            transition: 'background 0.15s ease',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'transform 0.2s ease',
                                                transform: isNganhExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                            }}>
                                                <ChevronDown size={18} />
                                            </div>
                                            <div style={{
                                                width: 36, height: 36, borderRadius: 'var(--radius-md)',
                                                background: 'rgba(14, 165, 233, 0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <FolderOpen size={18} style={{ color: '#38bdf8' }} />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: 15, fontWeight: 600 }}>{nganh.ten_nganh}</h3>
                                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                    {nganhHes.length} hệ • {nganhMonCount} môn
                                                </span>
                                            </div>
                                        </div>
                                        <div className="table-actions" onClick={e => e.stopPropagation()}>
                                            <button className="btn btn-sm btn-secondary" onClick={() => openHeModal(nganh.id)} title="Thêm hệ đào tạo">
                                                <Plus size={14} /> Hệ
                                            </button>
                                            <button className="btn-icon" onClick={() => openNganhModal(nganh)} title="Sửa ngành">
                                                <Edit3 size={14} />
                                            </button>
                                            <button className="btn-icon" onClick={() => deleteNganh(nganh.id)} title="Xóa ngành" style={{ color: '#f87171' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* ===== HE LEVEL ===== */}
                                    {isNganhExpanded && (
                                        <div style={{ paddingLeft: 36, paddingBottom: nganhHes.length > 0 ? 8 : 0 }}>
                                            {nganhHes.length === 0 ? (
                                                <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 24px 16px' }}>
                                                    Chưa có hệ đào tạo —
                                                    <button onClick={() => openHeModal(nganh.id)} style={{ color: 'var(--text-accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>
                                                        Thêm hệ
                                                    </button>
                                                </p>
                                            ) : (
                                                nganhHes.filter(h => {
                                                    if (!search) return true;
                                                    const heMons = monHocs.filter(m => m.he_dao_tao_id === h.id);
                                                    return matchesSearch(h.ten_he) || heMons.some(m => matchesSearch(m.ten_mon)) || matchesSearch(nganh.ten_nganh);
                                                }).map(he => {
                                                    const isHeExpanded = expandedHe[he.id];
                                                    const heMons = monHocs.filter(m => m.he_dao_tao_id === he.id);

                                                    return (
                                                        <div key={he.id} style={{ margin: '0 12px 6px 12px' }}>
                                                            <div
                                                                onClick={() => toggleHe(he.id)}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                                    padding: '10px 16px',
                                                                    borderRadius: 'var(--radius-md)',
                                                                    cursor: 'pointer',
                                                                    background: isHeExpanded ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-glass)',
                                                                    border: '1px solid',
                                                                    borderColor: isHeExpanded ? 'rgba(99, 102, 241, 0.15)' : 'var(--border-color)',
                                                                    transition: 'all 0.15s ease',
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                    <div style={{
                                                                        transition: 'transform 0.2s ease',
                                                                        transform: isHeExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                                                        display: 'flex',
                                                                    }}>
                                                                        <ChevronDown size={16} />
                                                                    </div>
                                                                    <GraduationCap size={16} style={{ color: '#818cf8' }} />
                                                                    <span style={{ fontSize: 14, fontWeight: 500 }}>{he.ten_he}</span>
                                                                    <span className="badge badge-accent" style={{ fontSize: 11 }}>{heMons.length} môn</span>
                                                                </div>
                                                                <div className="table-actions" onClick={e => e.stopPropagation()}>
                                                                    <button className="btn btn-sm btn-secondary" onClick={() => openMonModal(he.id)} title="Thêm môn học" style={{ fontSize: 12, padding: '4px 10px' }}>
                                                                        <Plus size={12} /> Môn
                                                                    </button>
                                                                    <button className="btn-icon" onClick={() => openHeModal(nganh.id, he)} title="Sửa hệ" style={{ width: 30, height: 30 }}>
                                                                        <Edit3 size={13} />
                                                                    </button>
                                                                    <button className="btn-icon" onClick={() => deleteHe(he.id)} title="Xóa hệ" style={{ color: '#f87171', width: 30, height: 30 }}>
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* ===== MON HOC LEVEL ===== */}
                                                            {isHeExpanded && (
                                                                <div style={{ margin: '6px 0 6px 32px' }}>
                                                                    {heMons.length === 0 ? (
                                                                        <p style={{ color: 'var(--text-muted)', fontSize: 12, padding: '6px 0' }}>
                                                                            Chưa có môn —
                                                                            <button onClick={() => openMonModal(he.id)} style={{ color: 'var(--text-accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>
                                                                                Thêm môn
                                                                            </button>
                                                                        </p>
                                                                    ) : (
                                                                        heMons.filter(m => {
                                                                            if (!search) return true;
                                                                            return matchesSearch(m.ten_mon) || matchesSearch(he.ten_he) || matchesSearch(nganh.ten_nganh);
                                                                        }).map(mon => {
                                                                            const monPC = getMonPhanCong(mon.id);
                                                                            return (
                                                                                <div
                                                                                    key={mon.id}
                                                                                    style={{
                                                                                        padding: '10px 14px',
                                                                                        borderRadius: 'var(--radius-md)',
                                                                                        border: '1px solid var(--border-color)',
                                                                                        marginBottom: 6,
                                                                                        background: 'var(--bg-card)',
                                                                                        transition: 'border-color 0.15s ease',
                                                                                    }}
                                                                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                                                                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                                                                                >
                                                                                    {/* Mon header */}
                                                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                                                            <BookOpen size={15} style={{ color: '#60a5fa' }} />
                                                                                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{mon.ten_mon}</span>
                                                                                        </div>
                                                                                        <div className="table-actions" style={{ gap: 4 }}>
                                                                                            <button
                                                                                                className="btn-icon"
                                                                                                onClick={() => openPhanCongModal(mon.id)}
                                                                                                title="Phân công GV"
                                                                                                style={{ width: 28, height: 28, color: '#34d399' }}
                                                                                            >
                                                                                                <UserPlus size={13} />
                                                                                            </button>
                                                                                            <button className="btn-icon" onClick={() => openMonModal(he.id, mon)} title="Sửa môn" style={{ width: 28, height: 28 }}>
                                                                                                <Edit3 size={12} />
                                                                                            </button>
                                                                                            <button className="btn-icon" onClick={() => deleteMon(mon.id)} title="Xóa môn" style={{ color: '#f87171', width: 28, height: 28 }}>
                                                                                                <Trash2 size={12} />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* GV assigned */}
                                                                                    {monPC.length > 0 && (
                                                                                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                                                            {monPC.map(pc => (
                                                                                                <div
                                                                                                    key={pc.id}
                                                                                                    className="chip"
                                                                                                    style={{
                                                                                                        background: 'rgba(16, 185, 129, 0.08)',
                                                                                                        borderColor: 'rgba(16, 185, 129, 0.2)',
                                                                                                        color: '#34d399',
                                                                                                        padding: '4px 10px',
                                                                                                        fontSize: 12,
                                                                                                    }}
                                                                                                >
                                                                                                    <Users size={12} />
                                                                                                    {pc.ten_gv}
                                                                                                    <button
                                                                                                        onClick={() => deletePhanCong(pc.id)}
                                                                                                        className="chip-remove"
                                                                                                        title="Xóa phân công"
                                                                                                        style={{ width: 16, height: 16 }}
                                                                                                    >
                                                                                                        <X size={10} />
                                                                                                    </button>
                                                                                                </div>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}

                                                                                    {monPC.length === 0 && (
                                                                                        <div style={{ marginTop: 6 }}>
                                                                                            <button
                                                                                                onClick={() => openPhanCongModal(mon.id)}
                                                                                                style={{
                                                                                                    background: 'none', border: '1px dashed rgba(255,255,255,0.1)',
                                                                                                    borderRadius: 'var(--radius-sm)', padding: '4px 10px',
                                                                                                    color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer',
                                                                                                    display: 'flex', alignItems: 'center', gap: 4,
                                                                                                    transition: 'all 0.15s ease',
                                                                                                }}
                                                                                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(52,211,153,0.3)'; e.currentTarget.style.color = '#34d399'; }}
                                                                                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                                                                                            >
                                                                                                <UserPlus size={12} /> Thêm giáo viên dạy
                                                                                            </button>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ===== MODAL: NGANH ===== */}
            {showModal === 'nganh' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editing ? 'Sửa ngành' : 'Thêm ngành mới'}</h2>
                            <button className="btn-ghost" onClick={() => setShowModal(null)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmitNganh}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Tên ngành *</label>
                                    <input className="form-input" value={form.ten_nganh || ''} onChange={e => setForm({ ...form, ten_nganh: e.target.value })} required placeholder="VD: Công nghệ kỹ thuật điện" />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Thêm'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== MODAL: HE ===== */}
            {showModal === 'he' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editing ? 'Sửa hệ đào tạo' : 'Thêm hệ đào tạo'}</h2>
                            <button className="btn-ghost" onClick={() => setShowModal(null)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmitHe}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Thuộc ngành</label>
                                    <select className="form-select" value={form.nganh_id || ''} onChange={e => setForm({ ...form, nganh_id: e.target.value })} required>
                                        <option value="">Chọn ngành</option>
                                        {nganhs.map(n => <option key={n.id} value={n.id}>{n.ten_nganh}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Tên hệ *</label>
                                    <input className="form-input" value={form.ten_he || ''} onChange={e => setForm({ ...form, ten_he: e.target.value })} required placeholder="VD: Cao đẳng, Trung cấp, Liên thông CĐ" />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Thêm'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== MODAL: MON HOC ===== */}
            {showModal === 'mon' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editing ? 'Sửa môn học' : 'Thêm môn học'}</h2>
                            <button className="btn-ghost" onClick={() => setShowModal(null)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmitMon}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Tên môn *</label>
                                    <input className="form-input" value={form.ten_mon || ''} onChange={e => setForm({ ...form, ten_mon: e.target.value })} required placeholder="VD: Kỹ thuật điện tử, Lập trình PLC" />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Thêm'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ===== MODAL: PHAN CONG GV ===== */}
            {showModal === 'phan_cong' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Phân công giáo viên</h2>
                            <button className="btn-ghost" onClick={() => setShowModal(null)}>✕</button>
                        </div>
                        <form onSubmit={handlePhanCong}>
                            <div className="modal-body">
                                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                                    Môn: <strong>{monHocs.find(m => m.id === form.mon_hoc_id)?.ten_mon}</strong>
                                    {' • '}Kỳ: <strong>{kiHocs.find(k => k.id.toString() === selectedKi)?.ten_ki}</strong>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Chọn giáo viên *</label>
                                    <select className="form-select" value={form.giao_vien_id || ''} onChange={e => setForm({ ...form, giao_vien_id: e.target.value })} required>
                                        <option value="">-- Chọn giáo viên --</option>
                                        {giaoViens.filter(gv => {
                                            // Exclude already assigned teachers
                                            const assigned = getMonPhanCong(form.mon_hoc_id).map(pc => pc.giao_vien_id);
                                            return !assigned.includes(gv.id);
                                        }).map(gv => (
                                            <option key={gv.id} value={gv.id}>{gv.ho_ten}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Hủy</button>
                                <button type="submit" className="btn btn-success">
                                    <UserPlus size={16} /> Phân công
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
