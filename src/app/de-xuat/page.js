'use client';
import React, { useState, useEffect, useRef } from 'react';
import { FileText, ChevronDown, Plus, Minus, Send, CheckCircle, BookOpen, Package, Search, X, Printer, Edit2 } from 'lucide-react';

const SearchableMaterialSelect = ({ vatTus, onSelect, pcNganhId = null, pcTenNganh = '' }) => {
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

    const isSameNganh = (vt) => !vt.nganh_id || (pcNganhId && vt.nganh_id === pcNganhId);
    const loaiLabel = (vt) => (vt.loai_vat_tu === 'sua_che' ? 'Sửa chữa' : 'Tiêu hao');

    const sortedVatTus = [...vatTus].sort((a, b) => {
        const sa = isSameNganh(a) ? 0 : 1;
        const sb = isSameNganh(b) ? 0 : 1;
        if (sa !== sb) return sa - sb;
        return a.ten_vat_tu.localeCompare(b.ten_vat_tu);
    });
    const q = search.toLowerCase().trim();
    // Mặc định chỉ show vật tư cùng ngành (+ dùng chung). Gõ tìm mới thấy cả ngành khác (disabled).
    const filteredVatTus = sortedVatTus.filter(vt => {
        const str = `${vt.ten_vat_tu} ${vt.yeu_cau_ky_thuat || ''}`.toLowerCase();
        if (!str.includes(q)) return false;
        if (!q) return isSameNganh(vt);
        return true;
    }).slice(0, 100);

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

                    <div style={{ overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
                        <div style={{ padding: '8px 16px 0', fontSize: 11, color: 'var(--text-muted)' }}>
                            {q
                                ? `${filteredVatTus.length} kết quả${pcTenNganh ? ` • ngành ${pcTenNganh} chọn được, ngành khác bị khóa` : ''}`
                                : `${filteredVatTus.length} vật tư ${pcTenNganh ? `ngành ${pcTenNganh}` : 'dùng chung'} • gõ để tìm cả ngành khác`}
                        </div>
                        {filteredVatTus.length === 0 ? (
                            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy vật tư "{search}"</div>
                        ) : (
                            filteredVatTus.map((vt, idx) => {
                                const disabled = !isSameNganh(vt);
                                const isSuaChe = vt.loai_vat_tu === 'sua_che';
                                return (
                                <div
                                    key={vt.id}
                                    className="material-dropdown-item"
                                    style={{
                                        padding: '12px 16px',
                                        borderBottom: idx === filteredVatTus.length - 1 ? 'none' : '1px solid var(--border-color)',
                                        cursor: disabled ? 'not-allowed' : 'pointer',
                                        opacity: disabled ? 0.55 : 1,
                                        background: disabled ? 'rgba(0,0,0,0.08)' : 'transparent',
                                    }}
                                    onClick={() => {
                                        if (disabled) return;
                                        onSelect(vt.id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    title={disabled ? `Thuộc ngành ${vt.ten_nganh || 'khác'} — không chọn được cho lớp này` : vt.ten_vat_tu}
                                >
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        {vt.ten_vat_tu}
                                        <span className="badge" style={{ fontSize: 10, background: isSuaChe ? 'rgba(249,115,22,0.15)' : 'rgba(16,185,129,0.15)', color: isSuaChe ? '#ea580c' : '#059669' }}>
                                            {loaiLabel(vt)}
                                        </span>
                                        {disabled && (
                                            <span className="badge" style={{ fontSize: 10, background: 'rgba(107,114,128,0.2)', color: 'var(--text-muted)' }}>
                                                🔒 {vt.ten_nganh || 'Ngành khác'}
                                            </span>
                                        )}
                                    </div>
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
                                );
                            })
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
    const [selections, setSelections] = useState({}); // { monHocId: { vatTuId: soLuong } }
    const [expandedMon, setExpandedMon] = useState({});
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [kiInfo, setKiInfo] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [vatTuTams, setVatTuTams] = useState([]); // {id, ten_vat_tu, ...}
    const [initLoading, setInitLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(false);

    useEffect(() => {
        fetch('/api/ki-hoc').then(r => r.json()).then(data => {
            const activeKis = data.filter(k => k.trang_thai === 'de_xuat');
            setKiHocs(activeKis);
            if (activeKis.length > 0) {
                setSelectedKi(activeKis[0].id.toString());
                setKiInfo(activeKis[0]);
            }
            setInitLoading(false);
        }).catch(() => setInitLoading(false));
        fetch('/api/giao-vien').then(r => r.json()).then(setGiaoVien);
    }, []);

    useEffect(() => {
        if (selectedKi && selectedGv) {
            // Reset các state
            setSelections({});
            setExpandedMon({});
            setIsEditMode(false);
            setSubmitted(false);
            setDataLoading(true);

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
            }).catch(() => {}).finally(() => setDataLoading(false));
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

    if (initLoading) {
        return (
            <div className="public-page">
                <div className="public-container" style={{ textAlign: 'center', paddingTop: 100 }}>
                    <div className="spinner" style={{ margin: '0 auto 16px' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Đang tải dữ liệu...</p>
                </div>
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
                        return (
                            <div className="card mb-4" style={{ marginBottom: 24 }}>
                                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <h2>2. Chọn vật tư</h2>
                                        <span className="badge badge-primary">{phanCongs.length} môn học</span>
                                    </div>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        Bộ vật tư được xác định theo từng lớp
                                    </span>
                                </div>
                                <div className="card-body" style={{ padding: 0 }}>
                                    {dataLoading ? (
                                        <div style={{ padding: 48, textAlign: 'center' }}>
                                            <div className="spinner" style={{ margin: '0 auto 12px' }} />
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đang tải phân công...</div>
                                        </div>
                                    ) : phanCongs.length === 0 ? (
                                        <div className="empty-state">
                                            <BookOpen size={40} />
                                            <h3>Chưa được phân công môn nào</h3>
                                            <p>Liên hệ quản lý để được phân công môn học</p>
                                        </div>
                                    ) : (
                                        phanCongs?.map(pc => {
                                            const isExpanded = expandedMon[pc.id];
                                            const pcSelections = selections[pc.id] || {};
                                            // Bộ vật tư của dòng này quyết định theo ngành của lớp
                                            const pcNganhId = pc.lop_nganh_id || null;
                                            return (
                                                <div key={pc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <div
                                                        className="accordion-header"
                                                        onClick={() => togglePc(pc.id)}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                                                            <ChevronDown size={20} style={{ transform: isExpanded ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
                                                            <BookOpen size={18} style={{ color: 'var(--text-accent)', flexShrink: 0 }} />
                                                            <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                                                                <h3>{pc.ten_mon}</h3>
                                                                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Lớp: {pc.ten_lop} ({pc.si_so} HV) • {pc.ten_loai_he || pc.loai_he}</p>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginLeft: 'auto' }}>
                                                            <span className={`badge ${pcNganhId ? 'badge-primary' : 'badge-warning'}`} style={{ fontSize: 11, maxWidth: '100%', whiteSpace: 'normal', textAlign: 'left' }}>
                                                                Bộ vật tư: {pc.ten_nganh || 'Chưa gán ngành'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {isExpanded && (
                                                        <div style={{ padding: '0 20px 16px' }}>
                                                            {!pcNganhId && (
                                                                <div className="alert alert-warning" style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, fontSize: 13 }}>
                                                                    Lớp <strong>{pc.ten_lop}</strong> chưa được gán ngành — chỉ hiện vật tư <strong>Dùng chung</strong>.
                                                                    Liên hệ quản trị viên để gán ngành cho lớp.
                                                                </div>
                                                            )}
                                                            <div style={{ marginBottom: 16 }}>
                                                                <SearchableMaterialSelect
                                                                    vatTus={vatTus}
                                                                    pcNganhId={pcNganhId}
                                                                    pcTenNganh={pc.ten_nganh}
                                                                    onSelect={(val) => {
                                                                        setQuantity(pc.id, val, (pcSelections[val] || 0) + 1);
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
                                                                        // Đã chọn từ trước nhưng không thuộc bộ vật tư của lớp (dữ liệu cũ)
                                                                        const vtNganhId = vt.nganh_id || null;
                                                                        const outsideSet = pcNganhId ? (vtNganhId && vtNganhId !== pcNganhId) : !!vtNganhId;
                                                                        return (
                                                                            <div className="material-item" key={vtId} style={{ background: 'rgba(14,165,233,0.05)', borderColor: 'rgba(14,165,233,0.2)' }}>
                                                                                <div className="material-info">
                                                                                     <h4 style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                                                        {vt.ten_vat_tu}
                                                                                        {!isTam && (
                                                                                            <span className="badge" style={{ fontSize: 10, background: vt.loai_vat_tu === 'sua_che' ? 'rgba(249,115,22,0.15)' : 'rgba(16,185,129,0.15)', color: vt.loai_vat_tu === 'sua_che' ? '#ea580c' : '#059669' }}>
                                                                                                {vt.loai_vat_tu === 'sua_che' ? 'Sửa chữa' : 'Tiêu hao'}
                                                                                            </span>
                                                                                        )}
                                                                                        {outsideSet && (
                                                                                            <span className="badge badge-warning" style={{ fontSize: 10 }} title="Vật tư này không thuộc bộ vật tư của lớp — nên xóa nếu chọn nhầm">
                                                                                                Ngoài ngành lớp
                                                                                            </span>
                                                                                        )}
                                                                                    </h4>
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
                                        <div style={{ marginBottom: 6 }}>Phòng (Khoa): Điện - Điện tử</div>
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

                        <div style={{ textAlign: 'center', fontSize: '10pt', fontStyle: 'italic', marginTop: '20px', opacity: 0.6 }}>
                            Phần mềm quản lý vật tư Khoa Điện - Điện tử
                        </div>

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
