'use client';
import React, { useState, useEffect, useRef } from 'react';
import { FileText, ChevronDown, Plus, Minus, Send, CheckCircle, BookOpen, Package, Search, X, Printer, Edit2 } from 'lucide-react';

const SearchableMaterialSelect = ({ vatTus, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const sortedVatTus = [...vatTus].sort((a, b) => a.ten_vat_tu.localeCompare(b.ten_vat_tu));
    const filteredVatTus = sortedVatTus.filter(vt => {
        const str = `${vt.ten_vat_tu} ${vt.yeu_cau_ky_thuat || ''}`.toLowerCase();
        return str.includes(search.toLowerCase());
    });

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            <div
                className="form-input"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'var(--bg-input)' }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span style={{ color: 'var(--text-secondary)' }}>
                    <Search size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'text-bottom' }} />
                    Tìm và thêm vật tư...
                </span>
                <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                    background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                    zIndex: 50, maxHeight: 350, display: 'flex', flexDirection: 'column', overflow: 'hidden'
                }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.1)' }}>
                        <Search size={16} style={{ color: 'var(--text-accent)' }} />
                        <input
                            type="text"
                            style={{ border: 'none', padding: 0, height: 'auto', background: 'transparent', boxShadow: 'none', color: 'var(--text-primary)', outline: 'none', flex: 1, fontSize: 14 }}
                            placeholder="Gõ tên hoặc yêu cầu kĩ thuật để tìm..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            autoFocus
                        />
                        {search && <X size={16} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => setSearch('')} />}
                    </div>

                    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)', background: 'rgba(14,165,233,0.03)' }}>
                        <button
                            className="btn btn-ghost btn-sm btn-full"
                            style={{ justifyContent: 'flex-start', color: 'var(--text-accent)', fontWeight: 600 }}
                            onClick={() => onSelect('NEW_MATERIAL_REQUEST')}
                        >
                            <Plus size={16} /> Thêm vật tư ngoài danh mục
                        </button>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
                        {filteredVatTus.length === 0 ? (
                            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy vật tư "{search}"</div>
                        ) : (
                            filteredVatTus.map((vt, idx) => (
                                <div
                                    key={vt.id}
                                    className="material-dropdown-item"
                                    style={{
                                        padding: '12px 16px',
                                        borderBottom: idx === filteredVatTus.length - 1 ? 'none' : '1px solid var(--border-color)',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => {
                                        onSelect(vt.id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                >
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, fontSize: 14 }}>{vt.ten_vat_tu}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ flex: 1, paddingRight: 8 }}>{vt.yeu_cau_ky_thuat || '—'} • {vt.don_vi_tinh}</span>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {vt.dang_de_xuat > 0 && (
                                                <span className="badge" style={{ fontSize: 11, background: 'rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
                                                    Đang ĐX: {vt.dang_de_xuat}
                                                </span>
                                            )}
                                            <span className={`badge ${vt.so_luong_kho > 0 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 11 }}>
                                                Kho: {vt.so_luong_kho}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
export default function DeXuatPublicPage() {
    const [kiHocs, setKiHocs] = useState([]);
    const [giaoViens, setGiaoVien] = useState([]);
    const [selectedKi, setSelectedKi] = useState('');
    const [selectedGv, setSelectedGv] = useState('');
    const [phanCongs, setPhanCongs] = useState([]);
    const [vatTus, setVatTus] = useState([]);
    const [nganhs, setNganhs] = useState([]);
    const [selectedNganhDeXuat, setSelectedNganhDeXuat] = useState('all');
    const [selections, setSelections] = useState({}); // { monHocId: { vatTuId: soLuong } }
    const [expandedMon, setExpandedMon] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [kiInfo, setKiInfo] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showNewMaterialModal, setShowNewMaterialModal] = useState(false);
    const [activePcIdForNewMaterial, setActivePcIdForNewMaterial] = useState(null);
    const [newMaterialData, setNewMaterialData] = useState({ ten_vat_tu: '', yeu_cau_ky_thuat: '', don_vi_tinh: '' });
    const [vatTuTams, setVatTuTams] = useState([]); // {id, ten_vat_tu, ...}

    useEffect(() => {
        fetch('/api/ki-hoc').then(r => r.json()).then(data => {
            const activeKis = data.filter(k => k.trang_thai === 'de_xuat');
            setKiHocs(activeKis);
            if (activeKis.length > 0) {
                setSelectedKi(activeKis[0].id.toString());
                setKiInfo(activeKis[0]);
            }
        });
        fetch('/api/giao-vien').then(r => r.json()).then(setGiaoVien);
        fetch('/api/nganh').then(r => r.json()).then(setNganhs);
    }, []);

    useEffect(() => {
        if (selectedKi && selectedGv) {
            // Reset các state
            setSelections({});
            setExpandedMon({});
            setIsEditMode(false);
            setSubmitted(false);

            // Fetch phân công & vật tư & vật tư tạm của GV này
            Promise.all([
                fetch(`/api/phan-cong?ki_id=${selectedKi}&giao_vien_id=${selectedGv}`).then(r => r.json()),
                fetch(`/api/vat-tu?ki_id=${selectedKi}`).then(r => r.json()),
                fetch(`/api/vat-tu-tam?ki_id=${selectedKi}&giao_vien_id=${selectedGv}`).then(r => r.json())
            ]).then(([pcData, vtData, vtTamData]) => {
                setPhanCongs(pcData);
                setVatTus(vtData);
                setVatTuTams(vtTamData);

                // Sau khi có pcData, đi lấy đề xuất cũ (nếu có)
                fetch(`/api/de-xuat?ki_id=${selectedKi}&giao_vien_id=${selectedGv}`)
                    .then(r => r.json())
                    .then(dxList => {
                        if (dxList && dxList.length > 0) {
                            setIsEditMode(true);
                            // Lấy chi tiết đề xuất đầu tiên
                            fetch(`/api/de-xuat?id=${dxList[0].id}`)
                                .then(r => r.json())
                                .then(dxDetail => {
                                    if (dxDetail.chi_tiet && dxDetail.chi_tiet.length > 0) {
                                        const loadedSelections = {};
                                        // Mảng chi_tiet cần map lại ra pcId
                                        dxDetail.chi_tiet.forEach(ct => {
                                            // Tìm pcId tương ứng với mon_hoc_id và lop_id
                                            const pc = pcData.find(p => p.mon_hoc_id === ct.mon_hoc_id && p.lop_id === ct.lop_id);
                                            if (pc) {
                                                if (!loadedSelections[pc.id]) {
                                                    loadedSelections[pc.id] = {};
                                                }
                                                // Phân biệt vat_tu_id và vat_tu_tam_id
                                                if (ct.vat_tu_tam_id) {
                                                    loadedSelections[pc.id][`tam_${ct.vat_tu_tam_id}`] = ct.so_luong;
                                                } else {
                                                    loadedSelections[pc.id][ct.vat_tu_id] = ct.so_luong;
                                                }
                                            }
                                        });
                                        // Khôi phục form
                                        setSelections(loadedSelections);
                                        // Tự động mở rộng các panel môn học có tồn tại vật tư
                                        const expanded = {};
                                        Object.keys(loadedSelections).forEach(pcId => {
                                            if (Object.keys(loadedSelections[pcId]).length > 0) {
                                                expanded[pcId] = true;
                                            }
                                        });
                                        setExpandedMon(expanded);
                                    }
                                });
                        }
                    });
            });
        }
    }, [selectedKi, selectedGv]);

    const togglePc = (pcId) => {
        setExpandedMon(prev => ({ ...prev, [pcId]: !prev[pcId] }));
    };

    const updateQuantity = (pcId, vtId, delta) => {
        setSelections(prev => {
            const pcSelections = prev[pcId] || {};
            const current = pcSelections[vtId] || 0;
            const newVal = Math.max(0, current + delta);

            const updatedPc = { ...pcSelections };
            if (newVal === 0) {
                delete updatedPc[vtId];
            } else {
                updatedPc[vtId] = newVal;
            }

            return { ...prev, [pcId]: updatedPc };
        });
    };

    const setQuantity = (pcId, vtId, value) => {
        setSelections(prev => {
            const pcSelections = { ...(prev[pcId] || {}) };
            if (value === '') {
                pcSelections[vtId] = '';
            } else {
                const val = parseInt(value);
                if (!isNaN(val)) {
                    if (val < 0) {
                        pcSelections[vtId] = 0;
                    } else {
                        pcSelections[vtId] = val;
                    }
                }
            }
            return { ...prev, [pcId]: pcSelections };
        });
    };

    const getTotalItems = () => {
        let total = 0;
        Object.values(selections).forEach(mon => {
            Object.values(mon).forEach(qty => {
                const num = parseInt(qty);
                if (!isNaN(num)) total += num;
            });
        });
        return total;
    };

    const getChiTiet = () => {
        const result = [];
        Object.entries(selections).forEach(([pcId, vatTuMap]) => {
            const pc = phanCongs.find(p => p.id === parseInt(pcId));
            if (!pc) return;
            Object.entries(vatTuMap).forEach(([vtId, soLuong]) => {
                const num = parseInt(soLuong);
                if (!isNaN(num) && num > 0) {
                    const item = {
                        mon_hoc_id: pc.mon_hoc_id,
                        lop_id: pc.lop_id,
                        so_luong: num
                    };
                    if (vtId.toString().startsWith('tam_')) {
                        item.vat_tu_tam_id = parseInt(vtId.toString().replace('tam_', ''));
                    } else {
                        item.vat_tu_id = parseInt(vtId);
                    }
                    result.push(item);
                }
            });
        });
        return result;
    };

    const handleCreateNewMaterial = async () => {
        if (!newMaterialData.ten_vat_tu || !newMaterialData.don_vi_tinh) {
            alert('Vui lòng nhập tên và đơn vị tính');
            return;
        }
        try {
            // Determine nganh_id from the currently selected filter
            let nganh_id = null;
            if (selectedNganhDeXuat && selectedNganhDeXuat !== 'all' && selectedNganhDeXuat !== 'chung') {
                nganh_id = parseInt(selectedNganhDeXuat);
            }
            const res = await fetch('/api/vat-tu-tam', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newMaterialData,
                    ki_id: parseInt(selectedKi),
                    giao_vien_id: parseInt(selectedGv),
                    nganh_id
                })
            });
            if (res.ok) {
                const data = await res.json();
                const newTamId = data.id;
                const newTamItem = { ...newMaterialData, id: newTamId, is_tam: true, nganh_id };

                setVatTuTams(prev => [...prev, newTamItem]);
                setQuantity(activePcIdForNewMaterial, `tam_${newTamId}`, 1);

                setShowNewMaterialModal(false);
                setNewMaterialData({ ten_vat_tu: '', yeu_cau_ky_thuat: '', don_vi_tinh: '' });
            }
        } catch (err) {
            alert('Lỗi khi thêm vật tư mới');
        }
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
                <div className="public-container" style={{ textAlign: 'center', paddingTop: 100 }}>
                    <div className="no-print">
                        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                            <CheckCircle size={40} color="#34d399" />
                        </div>
                        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Gửi đề xuất thành công!</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 32 }}>
                            Đề xuất dự trù vật tư của bạn đã được gửi đến quản lý kho. Vui lòng chờ duyệt.
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn btn-warning btn-lg" onClick={() => setSubmitted(false)}>
                                <Edit2 size={20} /> Chỉnh sửa lại
                            </button>
                            <button className="btn btn-primary btn-lg" onClick={() => { setSubmitted(false); setSelections({}); setSelectedGv(''); fetch('/api/vat-tu?ki_id=' + selectedKi).then(r => r.json()).then(setVatTus); }}>
                                Tạo đề xuất mới
                            </button>
                        </div>
                    </div>
                </div>
                {/* Print Layout */}
                <PrintLayout kiInfo={kiInfo} selectedGv={selectedGv} giaoViens={giaoViens} phanCongs={phanCongs} vatTus={vatTus} vatTuTams={vatTuTams} selections={selections} />
            </div>
        );
    }

    if (kiHocs.length === 0) {
        return (
            <div className="public-page">
                <div className="public-container" style={{ textAlign: 'center', paddingTop: 100 }}>
                    <FileText size={60} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                    <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Chưa mở đề xuất</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Hiện tại chưa có kỳ nào mở nhận đề xuất dự trù vật tư.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="public-page" style={{ position: 'relative' }}>
            <div className="public-container">
                <div className="no-print">
                    <div className="public-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1>📋 Đề xuất dự trù vật tư</h1>
                            <p>
                                {kiInfo && `${kiInfo.ten_ki} - ${kiInfo.nam_hoc}`}
                                {kiInfo?.han_de_xuat && ` • Hạn: ${new Date(kiInfo.han_de_xuat).toLocaleDateString('vi-VN')}`}
                            </p>
                        </div>
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
                    {selectedGv && (() => {
                        const filteredVatTus = vatTus.filter(vt => {
                            if (selectedNganhDeXuat === 'all') return true;
                            if (selectedNganhDeXuat === 'chung') return !vt.nganh_id;
                            return vt.nganh_id?.toString() === selectedNganhDeXuat;
                        });

                        return (
                            <div className="card mb-4" style={{ marginBottom: 24 }}>
                                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <h2>2. Chọn vật tư</h2>
                                        <span className="badge badge-primary">{phanCongs.length} môn học</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Bộ vật tư:</span>
                                        <select className="form-select" style={{ width: 'auto', minWidth: 200, padding: '4px 32px 4px 12px', fontSize: 14 }} value={selectedNganhDeXuat} onChange={e => setSelectedNganhDeXuat(e.target.value)}>
                                            <option value="all">Tất cả</option>
                                            <option value="chung">Dùng chung</option>
                                            {nganhs.map(n => <option key={n.id} value={n.id.toString()}>{n.ten_nganh}</option>)}
                                        </select>
                                    </div>
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
                                            const isExpanded = expandedMon[pc.id];
                                            const pcSelections = selections[pc.id] || {};
                                            const selectedCount = Object.keys(pcSelections).length;
                                            return (
                                                <div key={pc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <div
                                                        className="accordion-header"
                                                        onClick={() => togglePc(pc.id)}
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
                                                            <div style={{ marginBottom: 16 }}>
                                                                <SearchableMaterialSelect
                                                                    vatTus={filteredVatTus}
                                                                    onSelect={(val) => {
                                                                        if (val === 'NEW_MATERIAL_REQUEST') {
                                                                            setActivePcIdForNewMaterial(pc.id);
                                                                            setShowNewMaterialModal(true);
                                                                        } else {
                                                                            setQuantity(pc.id, val, (pcSelections[val] || 0) + 1);
                                                                        }
                                                                    }}
                                                                />
                                                            </div>

                                                            {Object.keys(pcSelections).length > 0 ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                    {Object.keys(pcSelections).map(vtId => {
                                                                        let vt;
                                                                        let isTam = false;
                                                                        if (vtId.toString().startsWith('tam_')) {
                                                                            const tId = parseInt(vtId.replace('tam_', ''));
                                                                            vt = vatTuTams.find(v => v.id === tId);
                                                                            isTam = true;
                                                                        } else {
                                                                            vt = vatTus.find(v => v.id === parseInt(vtId));
                                                                        }
                                                                        if (!vt) return null;
                                                                        const qty = pcSelections[vtId];
                                                                        return (
                                                                            <div className="material-item" key={vtId} style={{ background: 'rgba(14,165,233,0.05)', borderColor: 'rgba(14,165,233,0.2)' }}>
                                                                                <div className="material-info">
                                                                                    <h4>{vt.ten_vat_tu}</h4>
                                                                                    <p>
                                                                                        {vt.yeu_cau_ky_thuat && `${vt.yeu_cau_ky_thuat} • `}
                                                                                        {vt.don_vi_tinh} • Kho: {vt.so_luong_kho}
                                                                                    </p>
                                                                                </div>
                                                                                <div className="material-qty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                                                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                                        <button className="btn-icon" onClick={() => updateQuantity(pc.id, vtId, -1)} disabled={qty === 0 || qty === ''}>
                                                                                            <Minus size={16} />
                                                                                        </button>
                                                                                        <input
                                                                                            type="number"
                                                                                            className="form-input"
                                                                                            style={{ width: 70, textAlign: 'center', padding: '6px' }}
                                                                                            value={qty === '' ? '' : qty}
                                                                                            onChange={e => setQuantity(pc.id, vtId, e.target.value)}
                                                                                            onBlur={() => {
                                                                                                if (qty === '' || parseInt(qty) === 0) {
                                                                                                    setSelections(prev => {
                                                                                                        const pcSel = { ...(prev[pc.id] || {}) };
                                                                                                        delete pcSel[vt.id];
                                                                                                        return { ...prev, [pc.id]: pcSel };
                                                                                                    });
                                                                                                }
                                                                                            }}
                                                                                            min="0"
                                                                                        />
                                                                                        <button className="btn-icon" onClick={() => updateQuantity(pc.id, vtId, 1)}>
                                                                                            <Plus size={16} />
                                                                                        </button>
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                                                        {pc.si_so > 0 && (
                                                                                            <button
                                                                                                className="btn"
                                                                                                style={{ padding: '2px 8px', fontSize: 11, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                                                                                                onClick={() => setQuantity(pc.id, vtId, pc.si_so)}
                                                                                                title="Sĩ số lớp"
                                                                                            >
                                                                                                SS ({pc.si_so})
                                                                                            </button>
                                                                                        )}
                                                                                        <button
                                                                                            className="btn"
                                                                                            style={{ padding: '2px 8px', fontSize: 11, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                                                                                            onClick={() => updateQuantity(pc.id, vtId, 10)}
                                                                                        >
                                                                                            +10
                                                                                        </button>
                                                                                        <button
                                                                                            className="btn"
                                                                                            style={{ padding: '2px 8px', fontSize: 11, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                                                                                            onClick={() => updateQuantity(pc.id, vtId, 50)}
                                                                                        >
                                                                                            +50
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                                                                    Chưa chọn vật tư nào cho môn học này
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* New Material Modal */}
                    {showNewMaterialModal && (() => {
                        const nganhName = selectedNganhDeXuat === 'all' ? 'Tất cả (chưa xác định)'
                            : selectedNganhDeXuat === 'chung' ? 'Dùng chung'
                            : nganhs.find(n => n.id.toString() === selectedNganhDeXuat)?.ten_nganh || 'Không rõ';
                        return (
                            <div className="modal-overlay">
                                <div className="modal">
                                    <div className="modal-header">
                                        <h2>Đề xuất vật tư ngoài danh mục</h2>
                                        <button className="btn-icon btn-ghost" onClick={() => setShowNewMaterialModal(false)}><X size={20} /></button>
                                    </div>
                                    <div className="modal-body">
                                        <div className="alert alert-info" style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>
                                            <strong>Bộ vật tư ngành:</strong> {nganhName}
                                            {selectedNganhDeXuat === 'all' && (
                                                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>Vui lòng chọn bộ vật tư ngành cụ thể trước khi thêm để vật tư được phân loại đúng.</div>
                                            )}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Tên vật tư <span style={{ color: 'red' }}>*</span></label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Ví dụ: Cảm biến siêu âm HC-SR04"
                                                value={newMaterialData.ten_vat_tu}
                                                onChange={e => setNewMaterialData(prev => ({ ...prev, ten_vat_tu: e.target.value }))}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Yêu cầu kỹ thuật / Mã hiệu / Quy cách</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Ví dụ: 5V, dải đo 2cm-400cm"
                                                value={newMaterialData.yeu_cau_ky_thuat}
                                                onChange={e => setNewMaterialData(prev => ({ ...prev, yeu_cau_ky_thuat: e.target.value }))}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Đơn vị tính <span style={{ color: 'red' }}>*</span></label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Ví dụ: Cái, Bộ, Mét..."
                                                value={newMaterialData.don_vi_tinh}
                                                onChange={e => setNewMaterialData(prev => ({ ...prev, don_vi_tinh: e.target.value }))}
                                            />
                                        </div>
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            * Vật tư này sẽ ở trạng thái "Đợi duyệt" cho đến khi quản trị viên xác nhận.
                                        </p>
                                    </div>
                                    <div className="modal-footer">
                                        <button className="btn btn-secondary" onClick={() => setShowNewMaterialModal(false)}>Hủy</button>
                                        <button className="btn btn-primary" onClick={handleCreateNewMaterial}>
                                            <Plus size={18} /> Gửi đề xuất vật tư
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

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
                                    className={`btn ${isEditMode ? 'btn-warning' : 'btn-primary'} btn-lg btn-full`}
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                >
                                    {submitting ? <div className="spinner" /> : <><Send size={20} /> {isEditMode ? 'Cập nhật đề xuất' : 'Gửi đề xuất'}</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Print Layout */}
                <PrintLayout kiInfo={kiInfo} selectedGv={selectedGv} giaoViens={giaoViens} phanCongs={phanCongs} vatTus={vatTus} vatTuTams={vatTuTams} selections={selections} />
            </div>
        </div>
    );
}

// Print Layout Component
const PrintLayout = ({ kiInfo, selectedGv, giaoViens, phanCongs, vatTus, vatTuTams, selections }) => {
    const gv = giaoViens.find(g => g.id === parseInt(selectedGv));
    const now = new Date();

    // Lấy những môn được chọn
    const activePCs = phanCongs.filter(pc => {
        const sel = selections[pc.id] || {};
        return Object.keys(sel).length > 0;
    });

    if (!gv || activePCs.length === 0) return null;

    // Trong mẫu form_de_xuat.md, phiếu có 2 phần (bản trên và bản dưới giống nhau cắt đôi). 
    // Hoặc mỗi môn học sẽ in thành một tờ phiếu riêng tương đương với format đó.
    // Dưới đây ta in từng môn trên một phiếu (có class phân trang nếu cần)
    return (
        <div className="print-only" style={{ display: 'none', background: 'white', color: 'black', padding: '0', fontSize: '13pt', fontFamily: '"Times New Roman", Times, serif' }}>
            {activePCs.map((pc, index) => {
                const pcSel = selections[pc.id] || {};
                const vtIds = Object.keys(pcSel);

                const renderPhieu = (isCopy = false) => (
                    <div style={{ marginBottom: isCopy ? '40px' : '30px', pageBreakInside: 'avoid' }}>
                        {/* Header Trường */}
                        <div style={{ marginBottom: 15, textAlign: 'center' }}>
                            <div style={{ fontWeight: 'bold' }}>UBND THÀNH PHỐ HỒ CHÍ MINH</div>
                            <div style={{ fontWeight: 'bold' }}>TRƯỜNG CAO ĐẲNG NGHỀ VIỆT NAM – SINGAPORE</div>
                            <div>**********************</div>
                        </div>

                        {/* Tên Phiếu */}
                        <h2 style={{ textAlign: 'center', fontSize: '16pt', fontWeight: 'bold', marginBottom: 20 }}>PHIẾU XUẤT VẬT TƯ CHO ĐÀO TẠO</h2>

                        {/* Thông tin */}
                        <table style={{ width: '100%', marginBottom: 15, border: 'none' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '60%', verticalAlign: 'top', paddingRight: 20 }}>
                                        <div style={{ marginBottom: 6 }}>Tên người đề nghị: {gv?.ho_ten}</div>
                                        <div style={{ marginBottom: 6 }}>Chức vụ: Giảng viên</div>
                                        <div style={{ marginBottom: 6 }}>Phòng (Khoa): .............................................................</div>
                                    </td>
                                    <td style={{ width: '40%', verticalAlign: 'top' }}>
                                        <div style={{ marginBottom: 6 }}>Lớp: {pc.ten_lop}</div>
                                        <div style={{ marginBottom: 6 }}>Sĩ số: {pc.si_so}</div>
                                        <div style={{ marginBottom: 6 }}>Môn: {pc.ten_mon}</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Bảng Chi tiết */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
                            <thead>
                                <tr>
                                    <th style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', width: 40 }}>TT</th>
                                    <th style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'left' }}>Tên vật tư</th>
                                    <th style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'left' }}>Mã(hiệu) / YCKT</th>
                                    <th style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', width: 60 }}>ĐVT</th>
                                    <th style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', width: 80 }}>Số lượng</th>
                                    <th style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center', width: 80 }}>Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vtIds.map((vtId, idx) => {
                                    let vt;
                                    if (vtId.toString().startsWith('tam_')) {
                                        const tId = parseInt(vtId.replace('tam_', ''));
                                        vt = vatTuTams.find(v => v.id === tId);
                                    } else {
                                        vt = vatTus.find(v => v.id === parseInt(vtId));
                                    }
                                    const qty = pcSel[vtId];
                                    if (!vt || parseInt(qty) <= 0) return null;
                                    return (
                                        <tr key={vtId}>
                                            <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center' }}>{idx + 1}</td>
                                            <td style={{ border: '1px solid black', padding: '4px 6px' }}>{vt.ten_vat_tu}</td>
                                            <td style={{ border: '1px solid black', padding: '4px 6px' }}>{vt.yeu_cau_ky_thuat || ''}</td>
                                            <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center' }}>{vt.don_vi_tinh}</td>
                                            <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center' }}>{qty}</td>
                                            <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'center' }}></td>
                                        </tr>
                                    );
                                })}
                                {/* Điền thêm dòng trống cho đẹp form giống mẫu (optional) */}
                                {Array.from({ length: Math.max(0, 5 - vtIds.length) }).map((_, i) => (
                                    <tr key={`empty-${i}`}>
                                        <td style={{ border: '1px solid black', padding: '4px 6px', color: 'transparent' }}>-</td>
                                        <td style={{ border: '1px solid black', padding: '4px 6px' }}></td>
                                        <td style={{ border: '1px solid black', padding: '4px 6px' }}></td>
                                        <td style={{ border: '1px solid black', padding: '4px 6px' }}></td>
                                        <td style={{ border: '1px solid black', padding: '4px 6px' }}></td>
                                        <td style={{ border: '1px solid black', padding: '4px 6px' }}></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Chữ ký */}
                        <table style={{ width: '100%', border: 'none', marginTop: 15 }}>
                            <tbody>
                                <tr>
                                    <td colSpan={3} style={{ textAlign: 'right', paddingBottom: 10, fontStyle: 'italic' }}>
                                        Bình Dương, Ngày ........ tháng ........ năm ............
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ width: '33.33%', textAlign: 'center', fontWeight: 'bold' }}>Hiệu trưởng</td>
                                    <td style={{ width: '33.33%', textAlign: 'center', fontWeight: 'bold' }}>Trưởng khoa</td>
                                    <td style={{ width: '33.33%', textAlign: 'center', fontWeight: 'bold' }}>Người đề nghị</td>
                                </tr>
                                <tr>
                                    <td style={{ height: 80 }}></td>
                                    <td></td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td style={{ textAlign: 'center' }}></td>
                                    <td style={{ textAlign: 'center' }}></td>
                                    <td style={{ textAlign: 'center' }}>{gv?.ho_ten}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Cut line */}
                    </div>
                );

                return (
                    <div key={pc.id} style={{ pageBreakAfter: index < activePCs.length - 1 ? 'always' : 'auto' }}>
                        {renderPhieu(false)}
                    </div>
                );
            })}
        </div>
    );
};
