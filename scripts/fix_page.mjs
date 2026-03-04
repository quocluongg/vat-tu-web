import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = join(__dirname, '../src/app/admin/nganh-he/page.js');

const content = `'use client';
import { useState, useEffect, useCallback } from 'react';
import {
    GraduationCap, Plus, Edit3, Trash2, ChevronDown,
    FolderOpen, BookOpen, Users, UserPlus, X, Search,
    School, Upload, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function NganhHePage() {
    const [nganhs, setNganhs] = useState([]);
    const [hes, setHes] = useState([]);
    const [monHocs, setMonHocs] = useState([]);
    const [lops, setLops] = useState([]);
    const [giaoViens, setGiaoViens] = useState([]);
    const [kiHocs, setKiHocs] = useState([]);
    const [phanCongs, setPhanCongs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('nganh');

    const [expandedNganh, setExpandedNganh] = useState({});
    const [expandedHe, setExpandedHe] = useState({});

    const [showModal, setShowModal] = useState(null);
    const [showPhanCongModal, setShowPhanCongModal] = useState(null);
    const [formPhanCong, setFormPhanCong] = useState({ giao_vien_id: '', lop_id: '' });
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});
    const [selectedKi, setSelectedKi] = useState('');
    const [search, setSearch] = useState('');
    const [selectedMons, setSelectedMons] = useState(new Set());
    const [showOnlyTH, setShowOnlyTH] = useState(true);

    const [csvText, setCsvText] = useState('');
    const [importResult, setImportResult] = useState(null);
    const [importing, setImporting] = useState(false);

    const addToast = useToast();

    const fetchAll = useCallback(async () => {
        const [nganhRes, heRes, mhRes, lopRes, gvRes, khRes] = await Promise.all([
            fetch('/api/nganh').then(r => r.json()),
            fetch('/api/he-dao-tao').then(r => r.json()),
            fetch('/api/mon-hoc').then(r => r.json()),
            fetch('/api/lop').then(r => r.json()),
            fetch('/api/giao-vien').then(r => r.json()),
            fetch('/api/ki-hoc').then(r => r.json()),
        ]);
        setNganhs(Array.isArray(nganhRes) ? nganhRes : []);
        setHes(Array.isArray(heRes) ? heRes : []);
        setMonHocs(Array.isArray(mhRes) ? mhRes : []);
        setLops(Array.isArray(lopRes) ? lopRes : []);
        setGiaoViens(Array.isArray(gvRes) ? gvRes : []);
        setKiHocs(Array.isArray(khRes) ? khRes : []);
        if (Array.isArray(khRes) && khRes.length > 0 && !selectedKi) {
            const active = khRes.find(k => k.trang_thai !== 'dong') || khRes[0];
            setSelectedKi(active.id.toString());
        }
        setLoading(false);
    }, []);

    const fetchPhanCong = useCallback(async () => {
        if (!selectedKi) return;
        const res = await fetch(\`/api/phan-cong?ki_id=\${selectedKi}\`);
        const data = await res.json();
        setPhanCongs(Array.isArray(data) ? data : []);
    }, [selectedKi]);

    useEffect(() => { fetchAll(); }, [fetchAll]);
    useEffect(() => { if (selectedKi) fetchPhanCong(); }, [selectedKi, fetchPhanCong]);

    const toggleNganh = (id) => setExpandedNganh(p => ({ ...p, [id]: !p[id] }));
    const toggleHe = (id) => setExpandedHe(p => ({ ...p, [id]: !p[id] }));

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
        if (res.ok) { addToast(editing ? 'Cập nhật ngành thành công' : 'Thêm ngành thành công'); setShowModal(null); fetchAll(); }
    };
    const deleteNganh = async (id) => {
        if (!confirm('Xóa ngành này sẽ xóa tất cả hệ liên quan. Tiếp tục?')) return;
        await fetch(\`/api/nganh?id=\${id}\`, { method: 'DELETE' });
        addToast('Xóa ngành thành công'); fetchAll();
    };

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
        if (res.ok) { addToast(editing ? 'Cập nhật hệ thành công' : 'Thêm hệ thành công'); setShowModal(null); fetchAll(); }
    };
    const deleteHe = async (id) => {
        if (!confirm('Xóa hệ đào tạo này?')) return;
        await fetch(\`/api/he-dao-tao?id=\${id}\`, { method: 'DELETE' });
        addToast('Xóa hệ đào tạo thành công'); fetchAll();
    };

    const openMonModal = (item = null) => {
        setEditing(item);
        setForm({ ten_mon: item?.ten_mon || '' });
        setShowModal('mon');
    };
    const handleSubmitMon = async (e) => {
        e.preventDefault();
        const method = editing ? 'PUT' : 'POST';
        const body = editing ? { id: editing.id, ten_mon: form.ten_mon } : { ten_mon: form.ten_mon };
        const res = await fetch('/api/mon-hoc', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (res.ok) { addToast(editing ? 'Cập nhật môn học thành công' : 'Thêm môn học thành công'); setShowModal(null); fetchAll(); }
        else addToast(data.error || 'Có lỗi xảy ra', 'error');
    };
    const deleteMon = async (id) => {
        if (!confirm('Xóa môn học này?')) return;
        await fetch(\`/api/mon-hoc?id=\${id}\`, { method: 'DELETE' });
        addToast('Xóa môn học thành công'); fetchAll();
    };

    const openLopModal = (item = null) => {
        setEditing(item);
        setForm({ ten_lop: item?.ten_lop || '', si_so: item?.si_so || '' });
        setShowModal('lop');
    };
    const handleSubmitLop = async (e) => {
        e.preventDefault();
        const method = editing ? 'PUT' : 'POST';
        const body = editing
            ? { id: editing.id, ten_lop: form.ten_lop, si_so: parseInt(form.si_so) || 0 }
            : { ten_lop: form.ten_lop, si_so: parseInt(form.si_so) || 0 };
        const res = await fetch('/api/lop', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (res.ok) { addToast(editing ? 'Cập nhật lớp thành công' : 'Thêm lớp thành công'); setShowModal(null); fetchAll(); }
        else addToast(data.error || 'Có lỗi xảy ra', 'error');
    };
    const deleteLop = async (id) => {
        if (!confirm('Xóa lớp này?')) return;
        await fetch(\`/api/lop?id=\${id}\`, { method: 'DELETE' });
        addToast('Xóa lớp thành công'); fetchAll();
    };

    const handleImport = async () => {
        if (!selectedKi) { addToast('Vui lòng chọn kỳ học trước khi import', 'error'); return; }
        if (!csvText.trim()) { addToast('Vui lòng nhập dữ liệu CSV', 'error'); return; }
        setImporting(true); setImportResult(null);
        const res = await fetch('/api/import-phan-cong', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ csv_text: csvText, ki_id: parseInt(selectedKi) }),
        });
        const data = await res.json();
        setImporting(false);
        if (res.ok) {
            setImportResult(data);
            addToast(\`Import thành công: \${data.phan_cong_them_moi} phân công mới\`);
            fetchAll(); if (selectedKi) fetchPhanCong();
        } else { addToast(data.error || 'Import thất bại', 'error'); }
    };

    const openPhanCongModal = (mon) => {
        if (!selectedKi) { addToast('Vui lòng chọn kỳ học trước khi phân công', 'error'); return; }
        setShowPhanCongModal(mon);
        setFormPhanCong({ giao_vien_id: '', lop_id: '' });
    };

    const handleSubmitPhanCong = async (e) => {
        e.preventDefault();
        if (!formPhanCong.giao_vien_id || !formPhanCong.lop_id) { addToast('Vui lòng chọn đầy đủ', 'error'); return; }
        const res = await fetch('/api/phan-cong', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                giao_vien_id: parseInt(formPhanCong.giao_vien_id),
                lop_id: parseInt(formPhanCong.lop_id),
                mon_hoc_id: showPhanCongModal.id,
                ki_id: parseInt(selectedKi)
            })
        });
        const data = await res.json();
        if (res.ok) { addToast('Thêm phân công thành công'); setShowPhanCongModal(null); fetchPhanCong(); }
        else { addToast(data.error || 'Có lỗi xảy ra', 'error'); }
    };

    const filteredMon = monHocs.filter(m => {
        if (showOnlyTH && !m.ten_mon.trim().startsWith('TH')) return false;
        if (search && !m.ten_mon.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });
    const allMonIds = filteredMon.map(m => m.id);
    const allSelected = allMonIds.length > 0 && allMonIds.every(id => selectedMons.has(id));
    const someSelected = allMonIds.some(id => selectedMons.has(id));
    const toggleSelectMon = (id) => setSelectedMons(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    const toggleSelectAll = () => setSelectedMons(allSelected ? new Set() : new Set(allMonIds));
    const deleteSelectedMons = async () => {
        if (selectedMons.size === 0) return;
        if (!confirm(\`Xóa \${selectedMons.size} môn học đã chọn?\`)) return;
        await Promise.all([...selectedMons].map(id => fetch(\`/api/mon-hoc?id=\${id}\`, { method: 'DELETE' })));
        addToast(\`Đã xóa \${selectedMons.size} môn học\`);
        setSelectedMons(new Set()); fetchAll();
    };

    const filteredLop = lops.filter(l => !search || l.ten_lop.toLowerCase().includes(search.toLowerCase()));
    const LOAI_HE_MAP = { T: 'Trung cấp', C: 'Cao đẳng', L: 'Liên thông' };
    const LOAI_HE_COLOR = { T: '#f59e0b', C: '#38bdf8', L: '#a78bfa' };

    if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>🎓 Chương trình & Phân công</h1>
                    <p>Quản lý ngành, môn học, lớp học và phân công giảng dạy</p>
                </div>
                <div className="page-header-actions">
                    <select className="form-select" style={{ width: 220 }} value={selectedKi} onChange={e => setSelectedKi(e.target.value)}>
                        <option value="">Chọn kỳ học</option>
                        {kiHocs.map(k => <option key={k.id} value={k.id}>{k.ten_ki} - {k.nam_hoc}</option>)}
                    </select>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border-color)' }}>
                {[
                    { key: 'nganh', label: '🏫 Ngành & Hệ', count: nganhs.length },
                    { key: 'mon', label: '📚 Môn học', count: monHocs.length },
                    { key: 'lop', label: '🏫 Lớp học', count: lops.length },
                    { key: 'phan_cong', label: '📝 Phân công', count: phanCongs.length },
                    { key: 'import', label: '⬆️ Import Data', count: null },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                        padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                        background: 'none', color: activeTab === tab.key ? 'var(--text-accent)' : 'var(--text-muted)',
                        borderBottom: \`2px solid \${activeTab === tab.key ? 'var(--text-accent)' : 'transparent'}\`,
                        transition: 'all 0.15s ease', display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        {tab.label}
                        {tab.count !== null && <span className="badge badge-primary" style={{ fontSize: 11 }}>{tab.count}</span>}
                    </button>
                ))}
            </div>

            {(activeTab === 'nganh' || activeTab === 'mon' || activeTab === 'lop' || activeTab === 'phan_cong') && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                    <div className="search-input-wrapper" style={{ minWidth: 280, flex: 1, maxWidth: 400 }}>
                        <Search />
                        <input className="search-input" placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    {activeTab === 'mon' && <button className="btn btn-primary" onClick={() => openMonModal()}><Plus size={16} /> Thêm môn học</button>}
                    {activeTab === 'lop' && <button className="btn btn-primary" onClick={() => openLopModal()}><Plus size={16} /> Thêm lớp</button>}
                    {activeTab === 'nganh' && <button className="btn btn-primary" onClick={() => openNganhModal()}><Plus size={16} /> Thêm ngành</button>}
                </div>
            )}

            {/* TAB: NGANH & HE */}
            {activeTab === 'nganh' && (
                <div className="card">
                    <div className="card-body" style={{ padding: 0 }}>
                        {nganhs.length === 0 ? (
                            <div className="empty-state">
                                <GraduationCap size={48} />
                                <h3>Chưa có ngành nào</h3>
                                <p>Thêm ngành đào tạo để bắt đầu</p>
                            </div>
                        ) : nganhs.filter(n => !search || n.ten_nganh.toLowerCase().includes(search.toLowerCase()) || hes.filter(h => h.nganh_id === n.id).some(h => h.ten_he.toLowerCase().includes(search.toLowerCase()))).map(nganh => {
                            const isExpanded = expandedNganh[nganh.id];
                            const nganhHes = hes.filter(h => h.nganh_id === nganh.id);
                            return (
                                <div key={nganh.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <div onClick={() => toggleNganh(nganh.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', cursor: 'pointer', background: isExpanded ? 'rgba(14,165,233,0.03)' : 'transparent' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ transition: 'transform 0.2s', transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                                                <ChevronDown size={18} />
                                            </div>
                                            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FolderOpen size={18} style={{ color: '#38bdf8' }} />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: 15, fontWeight: 600 }}>{nganh.ten_nganh}</h3>
                                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{nganhHes.length} hệ đào tạo</span>
                                            </div>
                                        </div>
                                        <div className="table-actions" onClick={e => e.stopPropagation()}>
                                            <button className="btn btn-sm btn-secondary" onClick={() => openHeModal(nganh.id)}><Plus size={14} /> Hệ</button>
                                            <button className="btn-icon" onClick={() => openNganhModal(nganh)}><Edit3 size={14} /></button>
                                            <button className="btn-icon" onClick={() => deleteNganh(nganh.id)} style={{ color: '#f87171' }}><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div style={{ paddingLeft: 48, paddingBottom: 12 }}>
                                            {nganhHes.length === 0 ? (
                                                <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 0' }}>Chưa có hệ — <button onClick={() => openHeModal(nganh.id)} style={{ color: 'var(--text-accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>Thêm hệ</button></p>
                                            ) : nganhHes.map(he => (
                                                <div key={he.id} style={{ margin: '6px 12px 6px 0' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-glass)', border: '1px solid var(--border-color)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <GraduationCap size={16} style={{ color: '#818cf8' }} />
                                                            <span style={{ fontSize: 14, fontWeight: 500 }}>{he.ten_he}</span>
                                                        </div>
                                                        <div className="table-actions">
                                                            <button className="btn-icon" onClick={() => openHeModal(nganh.id, he)}><Edit3 size={13} /></button>
                                                            <button className="btn-icon" onClick={() => deleteHe(he.id)} style={{ color: '#f87171' }}><Trash2 size={13} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* TAB: MON HOC */}
            {activeTab === 'mon' && (
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, userSelect: 'none' }}>
                            <input type="checkbox" checked={showOnlyTH} onChange={e => { setShowOnlyTH(e.target.checked); setSelectedMons(new Set()); }}
                                style={{ width: 15, height: 15, accentColor: 'var(--text-accent)', cursor: 'pointer' }} />
                            Chỉ hiện môn <span style={{ background: 'rgba(96,165,250,0.12)', color: '#60a5fa', padding: '1px 8px', borderRadius: 100, fontWeight: 600, fontSize: 12, marginLeft: 2 }}>TH</span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(thực hành — cần vật tư)</span>
                        </label>
                        {someSelected && (
                            <>
                                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Đã chọn <b style={{ color: 'var(--text-primary)' }}>{selectedMons.size}</b> môn</span>
                                <button className="btn" style={{ padding: '5px 14px', fontSize: 13, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }} onClick={deleteSelectedMons}>
                                    <Trash2 size={13} /> Xóa đã chọn
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: 13 }} onClick={() => setSelectedMons(new Set())}>
                                    <X size={13} /> Bỏ chọn
                                </button>
                            </>
                        )}
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{filteredMon.length} môn học</span>
                    </div>
                    {filteredMon.length === 0 ? (
                        <div className="empty-state">
                            <BookOpen size={48} />
                            <h3>{search ? 'Không tìm thấy' : showOnlyTH ? 'Không có môn TH nào' : 'Chưa có môn học nào'}</h3>
                            <p>{showOnlyTH ? 'Bỏ tích "Chỉ hiện môn TH" để xem tất cả' : 'Thêm môn học hoặc dùng Import'}</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 44 }}>
                                            <input type="checkbox" checked={allSelected}
                                                ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                                onChange={toggleSelectAll}
                                                style={{ width: 15, height: 15, accentColor: 'var(--text-accent)', cursor: 'pointer' }} />
                                        </th>
                                        <th style={{ width: 36 }}>TT</th>
                                        <th>Tên môn học</th>
                                        <th>Giáo viên phân công (kỳ này)</th>
                                        <th style={{ width: 120, textAlign: 'right' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMon.map((mon, idx) => {
                                        const pcList = phanCongs.filter(pc => pc.mon_hoc_id === mon.id);
                                        const isSelected = selectedMons.has(mon.id);
                                        return (
                                            <tr key={mon.id} style={{ background: isSelected ? 'rgba(14,165,233,0.05)' : undefined }}>
                                                <td style={{ width: 44 }}>
                                                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelectMon(mon.id)}
                                                        style={{ width: 15, height: 15, accentColor: 'var(--text-accent)', cursor: 'pointer' }} />
                                                </td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 12, width: 36 }}>{idx + 1}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(96,165,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            <BookOpen size={14} style={{ color: '#60a5fa' }} />
                                                        </div>
                                                        <span style={{ fontWeight: 500 }}>{mon.ten_mon}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                        {pcList.length > 0 ? pcList.map(pc => (
                                                            <span key={pc.id} style={{ fontSize: 12, background: 'rgba(52,211,153,0.08)', color: '#10b981', padding: '2px 10px', borderRadius: 100, border: '1px solid rgba(52,211,153,0.2)', whiteSpace: 'nowrap' }}>
                                                                {pc.ten_gv}<span style={{ color: 'rgba(16,185,129,0.5)', marginLeft: 4 }}>/ {pc.ten_lop}</span>
                                                            </span>
                                                        )) : (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa phân công</span>
                                                        )}
                                                        <button onClick={() => openPhanCongModal(mon)} title="Thêm phân công"
                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', fontSize: 12, borderRadius: 100, border: '1px dashed rgba(14,165,233,0.5)', background: 'rgba(14,165,233,0.05)', color: '#0ea5e9', cursor: 'pointer' }}>
                                                            <Plus size={12} /> Phân công
                                                        </button>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                                        <button className="btn-icon" onClick={() => openMonModal(mon)}><Edit3 size={14} /></button>
                                                        <button className="btn-icon" onClick={() => deleteMon(mon.id)} style={{ color: '#f87171' }}><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: LOP HOC */}
            {activeTab === 'lop' && (
                <div className="card">
                    {filteredLop.length === 0 ? (
                        <div className="empty-state"><School size={48} /><h3>Chưa có lớp nào</h3><p>Thêm lớp hoặc dùng Import</p></div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 40 }}>#</th>
                                        <th>Tên lớp</th>
                                        <th style={{ width: 130 }}>Hệ đào tạo</th>
                                        <th style={{ width: 90 }}>Sĩ số</th>
                                        <th>Môn học (kỳ này)</th>
                                        <th style={{ width: 100, textAlign: 'right' }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLop.map((lop, idx) => {
                                        const monList = phanCongs.filter(pc => pc.lop_id === lop.id);
                                        const loai = lop.loai_he;
                                        return (
                                            <tr key={lop.id}>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                                                <td><span style={{ fontWeight: 600 }}>{lop.ten_lop}</span></td>
                                                <td>
                                                    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 100, background: \`\${LOAI_HE_COLOR[loai] || '#94a3b8'}15\`, color: LOAI_HE_COLOR[loai] || '#94a3b8', border: \`1px solid \${LOAI_HE_COLOR[loai] || '#94a3b8'}33\`, fontWeight: 500 }}>
                                                        {LOAI_HE_MAP[loai] || loai || '—'}
                                                    </span>
                                                </td>
                                                <td><span style={{ fontWeight: 600 }}>{lop.si_so}</span><span style={{ color: 'var(--text-muted)', fontSize: 12 }}> hv</span></td>
                                                <td>
                                                    {monList.length > 0 ? (
                                                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                            {monList.map(pc => (
                                                                <span key={pc.id} style={{ fontSize: 12, background: 'rgba(14,165,233,0.08)', color: '#0ea5e9', padding: '2px 8px', borderRadius: 100, border: '1px solid rgba(14,165,233,0.2)', whiteSpace: 'nowrap' }}>
                                                                    {pc.ten_mon}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chưa có môn</span>}
                                                </td>
                                                <td>
                                                    <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                                        <button className="btn-icon" onClick={() => openLopModal(lop)}><Edit3 size={14} /></button>
                                                        <button className="btn-icon" onClick={() => deleteLop(lop.id)} style={{ color: '#f87171' }}><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: PHAN CONG */}
            {activeTab === 'phan_cong' && (() => {
                const filteredPC = phanCongs.filter(pc =>
                    !search || pc.ten_gv?.toLowerCase().includes(search.toLowerCase()) ||
                    pc.ten_mon?.toLowerCase().includes(search.toLowerCase()) ||
                    pc.ten_lop?.toLowerCase().includes(search.toLowerCase())
                );
                return (
                    <div className="card">
                        {filteredPC.length === 0 ? (
                            <div className="empty-state"><GraduationCap size={48} /><h3>Chưa có phân công</h3><p>Dùng tab Import hoặc nút Phân công ở tab Môn học</p></div>
                        ) : (
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 40 }}>#</th>
                                            <th>Giáo viên</th>
                                            <th>Môn học</th>
                                            <th>Lớp</th>
                                            <th style={{ width: 80 }}>Sĩ số</th>
                                            <th style={{ width: 80, textAlign: 'right' }}>Xóa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredPC.map((pc, idx) => (
                                            <tr key={pc.id}>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(129,140,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            <UserPlus size={13} style={{ color: '#818cf8' }} />
                                                        </div>
                                                        <span style={{ fontWeight: 500 }}>{pc.ten_gv}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <BookOpen size={13} style={{ color: '#60a5fa', flexShrink: 0 }} />
                                                        <span style={{ fontSize: 13 }}>{pc.ten_mon}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={{ fontSize: 13, fontWeight: 600, padding: '2px 10px', background: \`\${LOAI_HE_COLOR[pc.loai_he] || '#94a3b8'}12\`, color: LOAI_HE_COLOR[pc.loai_he] || '#94a3b8', borderRadius: 100 }}>{pc.ten_lop}</span>
                                                </td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{pc.si_so} hv</td>
                                                <td>
                                                    <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                                                        <button className="btn-icon" style={{ color: '#f87171' }} onClick={async () => {
                                                            if (!confirm('Xóa phân công này?')) return;
                                                            await fetch(\`/api/phan-cong?id=\${pc.id}\`, { method: 'DELETE' });
                                                            addToast('Đã xóa phân công'); fetchPhanCong();
                                                        }}><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* TAB: IMPORT */}
            {activeTab === 'import' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
                    <div className="card" style={{ border: '1px solid rgba(14,165,233,0.2)' }}>
                        <div className="card-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-accent)' }}><Upload size={20} /> Import phân công nhanh</h3>
                        </div>
                        <div className="card-body">
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label" style={{ fontWeight: 600 }}>1. Kỳ học <span style={{ color: '#f87171' }}>*</span></label>
                                <select className="form-select" value={selectedKi} onChange={e => setSelectedKi(e.target.value)} required>
                                    <option value="">-- Chọn kỳ học --</option>
                                    {kiHocs.map(k => <option key={k.id} value={k.id}>{k.ten_ki} - {k.nam_hoc}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600 }}>2. Dán dữ liệu (4 cột: GV, Môn, Lớp, Sĩ số)</label>
                                <textarea className="form-input" style={{ minHeight: 260, fontFamily: 'monospace', fontSize: 12, resize: 'vertical', lineHeight: 1.6 }}
                                    value={csvText} onChange={e => setCsvText(e.target.value)}
                                    placeholder={"• CÁCH 1: Bôi 4 cột từ Excel → Ctrl+V vào đây\\n\\n• CÁCH 2 (CSV):\\nLê Minh Tấn,TH Điều khiển khí nén,T24CD3DA-N2,16"}
                                />
                            </div>
                            <button className="btn btn-primary btn-lg" onClick={handleImport} disabled={importing} style={{ width: '100%', marginTop: 8, height: 46, fontWeight: 600 }}>
                                {importing ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Đang xử lý...</> : <><Upload size={18} /> Phân tích & Import</>}
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="card">
                            <div className="card-header"><h3 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={16} style={{ color: '#f59e0b' }} /> Hướng dẫn</h3></div>
                            <div className="card-body">
                                {[
                                    { text: 'Tự động tạo Giáo viên, Môn học, Lớp nếu chưa có.', icon: '✨' },
                                    { text: 'Cập nhật lại sĩ số lớp nếu có thay đổi.', icon: '🔄' },
                                    { text: 'Tự động tính loại hệ (CĐ/TC/LT) từ ký tự đầu lớp.', icon: '🧠' },
                                    { text: 'Bỏ qua nếu phân công đã tồn tại.', icon: '⏭️' },
                                ].map((item, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, background: 'var(--bg-glass)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
                                        <span>{item.icon}</span>
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {importResult && (
                            <div className="card" style={{ border: '1px solid #34d399' }}>
                                <div className="card-header"><h3 style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle2 size={18} /> Kết quả Import</h3></div>
                                <div className="card-body">
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                                        {[
                                            { label: 'Tổng', value: importResult.tong_dong, color: '#60a5fa' },
                                            { label: 'Thành công', value: importResult.phan_cong_them_moi, color: '#34d399' },
                                            { label: 'Bỏ qua', value: importResult.phan_cong_da_co, color: '#94a3b8' },
                                            { label: 'Lỗi', value: importResult.loi?.length || 0, color: '#f87171' },
                                        ].map(item => (
                                            <div key={item.label} style={{ padding: '8px 4px', background: \`\${item.color}15\`, borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                                                <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.value}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {importResult.loi?.length > 0 && importResult.loi.map((err, i) => <div key={i} style={{ color: '#ef4444', fontSize: 12 }}>• {err}</div>)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODALS */}
            {showModal === 'nganh' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>{editing ? 'Sửa ngành' : 'Thêm ngành'}</h2><button className="btn-ghost" onClick={() => setShowModal(null)}>✕</button></div>
                        <form onSubmit={handleSubmitNganh}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">Tên ngành *</label><input className="form-input" value={form.ten_nganh || ''} onChange={e => setForm({ ...form, ten_nganh: e.target.value })} required placeholder="VD: Công nghệ kỹ thuật điện" /></div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Thêm'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showModal === 'he' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>{editing ? 'Sửa hệ' : 'Thêm hệ đào tạo'}</h2><button className="btn-ghost" onClick={() => setShowModal(null)}>✕</button></div>
                        <form onSubmit={handleSubmitHe}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">Thuộc ngành</label><select className="form-select" value={form.nganh_id || ''} onChange={e => setForm({ ...form, nganh_id: e.target.value })} required><option value="">Chọn ngành</option>{nganhs.map(n => <option key={n.id} value={n.id}>{n.ten_nganh}</option>)}</select></div>
                                <div className="form-group"><label className="form-label">Tên hệ *</label><input className="form-input" value={form.ten_he || ''} onChange={e => setForm({ ...form, ten_he: e.target.value })} required placeholder="VD: Cao đẳng, Trung cấp" /></div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Thêm'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showModal === 'mon' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>{editing ? 'Sửa môn học' : 'Thêm môn học'}</h2><button className="btn-ghost" onClick={() => setShowModal(null)}>✕</button></div>
                        <form onSubmit={handleSubmitMon}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">Tên môn học *</label><input className="form-input" value={form.ten_mon || ''} onChange={e => setForm({ ...form, ten_mon: e.target.value })} required placeholder="VD: TH Điều khiển khí nén" /></div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Thêm'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showModal === 'lop' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>{editing ? 'Sửa lớp' : 'Thêm lớp học'}</h2><button className="btn-ghost" onClick={() => setShowModal(null)}>✕</button></div>
                        <form onSubmit={handleSubmitLop}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Tên lớp *</label>
                                    <input className="form-input" value={form.ten_lop || ''} onChange={e => setForm({ ...form, ten_lop: e.target.value })} required placeholder="VD: T24CD3DA-N2" />
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Chữ đầu: <strong style={{ color: '#38bdf8' }}>C</strong> = Cao đẳng, <strong style={{ color: '#f59e0b' }}>T</strong> = Trung cấp, <strong style={{ color: '#a78bfa' }}>L</strong> = Liên thông</p>
                                </div>
                                <div className="form-group"><label className="form-label">Sĩ số</label><input className="form-input" type="number" min="0" value={form.si_so || ''} onChange={e => setForm({ ...form, si_so: e.target.value })} placeholder="Số học viên" /></div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Thêm'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showPhanCongModal && (
                <div className="modal-overlay" onClick={() => setShowPhanCongModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>Phân công giảng dạy</h2><button className="btn-ghost" onClick={() => setShowPhanCongModal(null)}>✕</button></div>
                        <form onSubmit={handleSubmitPhanCong}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">Môn học</label><input className="form-input" value={showPhanCongModal.ten_mon} disabled style={{ opacity: 0.8, fontWeight: 600, color: '#38bdf8' }} /></div>
                                <div className="form-group"><label className="form-label">Giáo viên *</label><select className="form-select" value={formPhanCong.giao_vien_id} onChange={e => setFormPhanCong({ ...formPhanCong, giao_vien_id: e.target.value })} required><option value="">-- Chọn giáo viên --</option>{giaoViens.map(gv => <option key={gv.id} value={gv.id}>{gv.ho_ten}</option>)}</select></div>
                                <div className="form-group"><label className="form-label">Lớp học *</label><select className="form-select" value={formPhanCong.lop_id} onChange={e => setFormPhanCong({ ...formPhanCong, lop_id: e.target.value })} required><option value="">-- Chọn lớp --</option>{lops.map(lop => <option key={lop.id} value={lop.id}>{lop.ten_lop} ({lop.si_so} hv)</option>)}</select></div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowPhanCongModal(null)}>Hủy</button>
                                <button type="submit" className="btn btn-primary" style={{ minWidth: 120 }}>Lưu phân công</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
`;

writeFileSync(target, content, 'utf8');
console.log('Done! Written', content.length, 'chars to', target);
