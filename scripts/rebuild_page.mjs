import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const target = join(__dirname, '../src/app/admin/nganh-he/page.js');

const code = String.raw`'use client';
import { useState, useEffect, useCallback } from 'react';
import { GraduationCap, Plus, Edit3, Trash2, BookOpen, UserPlus, X, Search, School, Upload, CheckCircle2, AlertCircle, ChevronDown, FolderOpen } from 'lucide-react';
import { useToast } from '@/components/Toast';

const LOAI_HE_MAP = { T: 'Trung cấp', C: 'Cao đẳng', L: 'Liên thông' };
const LOAI_HE_COLOR = { T: '#f59e0b', C: '#38bdf8', L: '#a78bfa' };

function HeBadge({ loai }) {
    const color = LOAI_HE_COLOR[loai] || '#94a3b8';
    const label = LOAI_HE_MAP[loai] || loai || '—';
    return (
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: color + '18', color, border: '1px solid ' + color + '33', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {label}
        </span>
    );
}

export default function NganhHePage() {
    const [nganhs, setNganhs] = useState([]);
    const [hes, setHes] = useState([]);
    const [monHocs, setMonHocs] = useState([]);
    const [lops, setLops] = useState([]);
    const [giaoViens, setGiaoViens] = useState([]);
    const [kiHocs, setKiHocs] = useState([]);
    const [phanCongs, setPhanCongs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('phan_cong');
    const [expandedNganh, setExpandedNganh] = useState({});

    const [showModal, setShowModal] = useState(null);
    const [showPhanCongModal, setShowPhanCongModal] = useState(null);
    const [formPhanCong, setFormPhanCong] = useState({ giao_vien_id: '', lop_id: '' });
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});
    const [selectedKi, setSelectedKi] = useState('');
    const [search, setSearch] = useState('');
    const [showOnlyTH, setShowOnlyTH] = useState(true);
    const [selectedMons, setSelectedMons] = useState(new Set());
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
        if (Array.isArray(khRes) && khRes.length > 0) {
            setSelectedKi(prev => {
                if (prev) return prev;
                const active = khRes.find(k => k.trang_thai !== 'dong') || khRes[0];
                return active.id.toString();
            });
        }
        setLoading(false);
    }, []);

    const fetchPhanCong = useCallback(async () => {
        if (!selectedKi) return;
        const res = await fetch('/api/phan-cong?ki_id=' + selectedKi);
        const data = await res.json();
        setPhanCongs(Array.isArray(data) ? data : []);
    }, [selectedKi]);

    useEffect(() => { fetchAll(); }, [fetchAll]);
    useEffect(() => { if (selectedKi) fetchPhanCong(); }, [selectedKi, fetchPhanCong]);

    /* ---- helpers ---- */
    const openModal = (type, item = null) => { setEditing(item); setForm(item ? { ...item } : {}); setShowModal(type); };

    const submitNganh = async e => {
        e.preventDefault();
        const method = editing ? 'PUT' : 'POST';
        await fetch('/api/nganh', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { id: editing.id, ten_nganh: form.ten_nganh } : { ten_nganh: form.ten_nganh }) });
        addToast('Lưu ngành thành công'); setShowModal(null); fetchAll();
    };
    const submitHe = async e => {
        e.preventDefault();
        const method = editing ? 'PUT' : 'POST';
        await fetch('/api/he-dao-tao', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { id: editing.id, nganh_id: form.nganh_id, ten_he: form.ten_he } : { nganh_id: form.nganh_id, ten_he: form.ten_he }) });
        addToast('Lưu hệ thành công'); setShowModal(null); fetchAll();
    };
    const submitMon = async e => {
        e.preventDefault();
        const method = editing ? 'PUT' : 'POST';
        const res = await fetch('/api/mon-hoc', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { id: editing.id, ten_mon: form.ten_mon } : { ten_mon: form.ten_mon }) });
        const data = await res.json();
        if (res.ok) { addToast('Lưu môn học thành công'); setShowModal(null); fetchAll(); }
        else addToast(data.error || 'Lỗi', 'error');
    };
    const submitLop = async e => {
        e.preventDefault();
        const method = editing ? 'PUT' : 'POST';
        const body = { ten_lop: form.ten_lop, si_so: parseInt(form.si_so) || 0 };
        if (editing) body.id = editing.id;
        const res = await fetch('/api/lop', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (res.ok) { addToast('Lưu lớp thành công'); setShowModal(null); fetchAll(); }
        else addToast(data.error || 'Lỗi', 'error');
    };
    const deleteMon = async id => { if (!confirm('Xóa môn học này?')) return; await fetch('/api/mon-hoc?id=' + id, { method: 'DELETE' }); addToast('Đã xóa'); fetchAll(); };
    const deleteLop = async id => { if (!confirm('Xóa lớp này?')) return; await fetch('/api/lop?id=' + id, { method: 'DELETE' }); addToast('Đã xóa'); fetchAll(); };
    const deleteNganh = async id => { if (!confirm('Xóa ngành này?')) return; await fetch('/api/nganh?id=' + id, { method: 'DELETE' }); addToast('Đã xóa'); fetchAll(); };
    const deleteHe = async id => { if (!confirm('Xóa hệ này?')) return; await fetch('/api/he-dao-tao?id=' + id, { method: 'DELETE' }); addToast('Đã xóa'); fetchAll(); };
    const deletePC = async id => {
        if (!confirm('Xóa phân công này?')) return;
        await fetch('/api/phan-cong?id=' + id, { method: 'DELETE' });
        addToast('Đã xóa phân công'); fetchPhanCong();
    };

    const openPhanCongModal = mon => {
        if (!selectedKi) { addToast('Vui lòng chọn kỳ học', 'error'); return; }
        setShowPhanCongModal(mon); setFormPhanCong({ giao_vien_id: '', lop_id: '' });
    };
    const submitPhanCong = async e => {
        e.preventDefault();
        const res = await fetch('/api/phan-cong', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ giao_vien_id: parseInt(formPhanCong.giao_vien_id), lop_id: parseInt(formPhanCong.lop_id), mon_hoc_id: showPhanCongModal.id, ki_id: parseInt(selectedKi) }) });
        const data = await res.json();
        if (res.ok) { addToast('Thêm phân công thành công'); setShowPhanCongModal(null); fetchPhanCong(); }
        else addToast(data.error || 'Lỗi', 'error');
    };

    const handleImport = async () => {
        if (!selectedKi) { addToast('Chọn kỳ học trước', 'error'); return; }
        if (!csvText.trim()) { addToast('Nhập dữ liệu', 'error'); return; }
        setImporting(true); setImportResult(null);
        const res = await fetch('/api/import-phan-cong', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv_text: csvText, ki_id: parseInt(selectedKi) }) });
        const data = await res.json();
        setImporting(false);
        if (res.ok) { setImportResult(data); addToast('Import thành công: ' + data.phan_cong_them_moi + ' phân công'); fetchAll(); if (selectedKi) fetchPhanCong(); }
        else addToast(data.error || 'Import thất bại', 'error');
    };

    // Filtered lists
    const filteredMon = monHocs.filter(m => {
        if (showOnlyTH && !m.ten_mon.trim().startsWith('TH')) return false;
        if (search && !m.ten_mon.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });
    const allMonIds = filteredMon.map(m => m.id);
    const allSelected = allMonIds.length > 0 && allMonIds.every(id => selectedMons.has(id));
    const someSelected = allMonIds.some(id => selectedMons.has(id));
    const toggleSelectMon = id => setSelectedMons(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
    const toggleSelectAll = () => setSelectedMons(allSelected ? new Set() : new Set(allMonIds));
    const deleteSelectedMons = async () => {
        if (!confirm('Xóa ' + selectedMons.size + ' môn đã chọn?')) return;
        await Promise.all([...selectedMons].map(id => fetch('/api/mon-hoc?id=' + id, { method: 'DELETE' })));
        addToast('Đã xóa ' + selectedMons.size + ' môn'); setSelectedMons(new Set()); fetchAll();
    };

    const filteredLop = lops.filter(l => !search || l.ten_lop.toLowerCase().includes(search.toLowerCase()));
    const filteredPC = phanCongs.filter(pc => !search || pc.ten_gv?.toLowerCase().includes(search.toLowerCase()) || pc.ten_mon?.toLowerCase().includes(search.toLowerCase()) || pc.ten_lop?.toLowerCase().includes(search.toLowerCase()));

    const selectedKiObj = kiHocs.find(k => k.id.toString() === selectedKi);

    if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

    const TABS = [
        { key: 'phan_cong', label: 'Phân công', icon: '📝', count: phanCongs.length, desc: 'GV dạy môn nào, lớp nào' },
        { key: 'mon', label: 'Môn học', icon: '📚', count: monHocs.filter(m => m.ten_mon.startsWith('TH')).length, desc: 'Môn TH cần vật tư' },
        { key: 'lop', label: 'Lớp học', icon: '🏫', count: lops.length, desc: 'Danh sách lớp' },
        { key: 'import', label: 'Import', icon: '⬆️', count: null, desc: 'Nhập dữ liệu nhanh' },
        { key: 'cai_dat', label: 'Cài đặt', icon: '⚙️', count: null, desc: 'Ngành & Hệ' },
    ];

    return (
        <div>
            {/* ── HEADER ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>📋 Quản lý giảng dạy</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Phân công môn học — lớp học — giáo viên</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {selectedKiObj && (
                        <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 100, background: 'rgba(14,165,233,0.1)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)', fontWeight: 600 }}>
                            📅 {selectedKiObj.ten_ki} — {selectedKiObj.nam_hoc}
                        </span>
                    )}
                    <select className="form-select" style={{ width: 200, height: 36, fontSize: 13 }} value={selectedKi} onChange={e => setSelectedKi(e.target.value)}>
                        <option value="">Chọn kỳ học</option>
                        {kiHocs.map(k => <option key={k.id} value={k.id}>{k.ten_ki} - {k.nam_hoc}</option>)}
                    </select>
                </div>
            </div>

            {/* ── TABS ── */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: 'var(--bg-glass)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: 4, overflowX: 'auto' }}>
                {TABS.map(tab => (
                    <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSearch(''); }} style={{
                        flex: 'none', padding: '8px 18px', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-md)',
                        background: activeTab === tab.key ? 'var(--bg-card)' : 'transparent',
                        color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === tab.key ? 600 : 400, fontSize: 13,
                        boxShadow: activeTab === tab.key ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                        transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                    }}>
                        {tab.icon} {tab.label}
                        {tab.count !== null && <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 100, background: activeTab === tab.key ? 'rgba(14,165,233,0.15)' : 'var(--bg-glass)', color: activeTab === tab.key ? 'var(--text-accent)' : 'var(--text-muted)', fontWeight: 600 }}>{tab.count}</span>}
                    </button>
                ))}
            </div>

            {/* ── SEARCH BAR (shared) ── */}
            {['phan_cong', 'mon', 'lop'].includes(activeTab) && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
                    <div className="search-input-wrapper" style={{ flex: 1, maxWidth: 380 }}>
                        <Search size={14} />
                        <input className="search-input" placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    {activeTab === 'mon' && <button className="btn btn-primary" style={{ height: 36, fontSize: 13 }} onClick={() => openModal('mon')}><Plus size={14} /> Thêm môn</button>}
                    {activeTab === 'lop' && <button className="btn btn-primary" style={{ height: 36, fontSize: 13 }} onClick={() => openModal('lop')}><Plus size={14} /> Thêm lớp</button>}
                </div>
            )}

            {/* ══════════════════════════════════════ */}
            {/* TAB: PHÂN CÔNG                         */}
            {/* ══════════════════════════════════════ */}
            {activeTab === 'phan_cong' && (
                <div className="card">
                    <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h2 style={{ fontSize: 15, fontWeight: 600 }}>Danh sách phân công giảng dạy</h2>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                {selectedKiObj ? selectedKiObj.ten_ki + ' — ' + selectedKiObj.nam_hoc : 'Chọn kỳ học để xem'} · {filteredPC.length} phân công
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <div className="search-input-wrapper" style={{ width: 220 }}>
                                <Search size={13} />
                                <input className="search-input" placeholder="Lọc GV / Môn / Lớp..." value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 13 }} />
                            </div>
                            <button className="btn btn-secondary" style={{ height: 36, fontSize: 13 }} onClick={() => setActiveTab('import')}>
                                <Upload size={14} /> Import nhanh
                            </button>
                        </div>
                    </div>
                    {filteredPC.length === 0 ? (
                        <div className="empty-state">
                            <GraduationCap size={44} />
                            <h3>{search ? 'Không tìm thấy' : 'Chưa có phân công nào'}</h3>
                            <p>Dùng <strong>Import nhanh</strong> hoặc nhấn <strong>Phân công</strong> ở tab Môn học</p>
                            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setActiveTab('import')}><Upload size={15} /> Import dữ liệu</button>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 40 }}>#</th>
                                        <th>Giáo viên</th>
                                        <th>Môn học</th>
                                        <th>Lớp</th>
                                        <th style={{ width: 80, textAlign: 'center' }}>Sĩ số</th>
                                        <th style={{ width: 60, textAlign: 'right' }}></th>
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
                                                    <span style={{ fontWeight: 500, fontSize: 13 }}>{pc.ten_gv}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <BookOpen size={13} style={{ color: '#60a5fa', flexShrink: 0 }} />
                                                    <span style={{ fontSize: 13 }}>{pc.ten_mon}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{pc.ten_lop}</span>
                                                    <HeBadge loai={pc.loai_he} />
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{pc.si_so}</td>
                                            <td>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button className="btn-icon" style={{ color: '#f87171' }} onClick={() => deletePC(pc.id)} title="Xóa phân công"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════ */}
            {/* TAB: MÔN HỌC                           */}
            {/* ══════════════════════════════════════ */}
            {activeTab === 'mon' && (
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, userSelect: 'none' }}>
                            <input type="checkbox" checked={showOnlyTH} onChange={e => { setShowOnlyTH(e.target.checked); setSelectedMons(new Set()); }} style={{ width: 14, height: 14, accentColor: 'var(--text-accent)', cursor: 'pointer' }} />
                            <span style={{ fontWeight: 500 }}>Chỉ môn <span style={{ color: '#60a5fa', fontWeight: 700 }}>TH</span></span>
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>(cần vật tư)</span>
                        </label>
                        {someSelected && (
                            <>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', borderLeft: '1px solid var(--border-color)', paddingLeft: 12 }}>
                                    Đã chọn <b style={{ color: 'var(--text-primary)' }}>{selectedMons.size}</b>
                                </span>
                                <button className="btn" style={{ padding: '4px 12px', fontSize: 12, background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }} onClick={deleteSelectedMons}><Trash2 size={12} /> Xóa</button>
                                <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setSelectedMons(new Set())}><X size={12} /> Bỏ chọn</button>
                            </>
                        )}
                        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{filteredMon.length} môn</span>
                    </div>

                    {filteredMon.length === 0 ? (
                        <div className="empty-state">
                            <BookOpen size={44} />
                            <h3>{showOnlyTH ? 'Không có môn TH nào' : 'Chưa có môn học'}</h3>
                            <p>{showOnlyTH ? 'Bỏ tích "Chỉ môn TH" để xem tất cả' : 'Thêm môn học hoặc Import'}</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 40 }}>
                                            <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }} onChange={toggleSelectAll} style={{ width: 14, height: 14, accentColor: 'var(--text-accent)', cursor: 'pointer' }} />
                                        </th>
                                        <th style={{ width: 36 }}>#</th>
                                        <th>Tên môn học</th>
                                        <th>GV giảng dạy kỳ này</th>
                                        <th style={{ width: 100, textAlign: 'right' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMon.map((mon, idx) => {
                                        const pcList = phanCongs.filter(pc => pc.mon_hoc_id === mon.id);
                                        const isSelected = selectedMons.has(mon.id);
                                        return (
                                            <tr key={mon.id} style={{ background: isSelected ? 'rgba(14,165,233,0.04)' : undefined }}>
                                                <td>
                                                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelectMon(mon.id)} style={{ width: 14, height: 14, accentColor: 'var(--text-accent)', cursor: 'pointer' }} />
                                                </td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(96,165,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            <BookOpen size={13} style={{ color: '#60a5fa' }} />
                                                        </div>
                                                        <span style={{ fontWeight: 500, fontSize: 13 }}>{mon.ten_mon}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                                        {pcList.length > 0 ? pcList.map(pc => (
                                                            <span key={pc.id} style={{ fontSize: 11, background: 'rgba(52,211,153,0.08)', color: '#10b981', padding: '2px 9px', borderRadius: 100, border: '1px solid rgba(52,211,153,0.2)', whiteSpace: 'nowrap' }}>
                                                                {pc.ten_gv} <span style={{ opacity: 0.6 }}>· {pc.ten_lop}</span>
                                                            </span>
                                                        )) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Chưa phân công</span>}
                                                        <button onClick={() => openPhanCongModal(mon)} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 9px', fontSize: 11, borderRadius: 100, border: '1px dashed rgba(14,165,233,0.5)', background: 'rgba(14,165,233,0.05)', color: '#0ea5e9', cursor: 'pointer' }}>
                                                            <Plus size={11} /> PC
                                                        </button>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                                        <button className="btn-icon" onClick={() => openModal('mon', mon)} title="Sửa"><Edit3 size={13} /></button>
                                                        <button className="btn-icon" style={{ color: '#f87171' }} onClick={() => deleteMon(mon.id)} title="Xóa"><Trash2 size={13} /></button>
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

            {/* ══════════════════════════════════════ */}
            {/* TAB: LỚP HỌC                           */}
            {/* ══════════════════════════════════════ */}
            {activeTab === 'lop' && (
                <div className="card">
                    {filteredLop.length === 0 ? (
                        <div className="empty-state"><School size={44} /><h3>Chưa có lớp nào</h3><p>Thêm lớp hoặc dùng Import</p></div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 40 }}>#</th>
                                        <th>Tên lớp</th>
                                        <th style={{ width: 120 }}>Hệ</th>
                                        <th style={{ width: 80, textAlign: 'center' }}>Sĩ số</th>
                                        <th>Môn học kỳ này</th>
                                        <th style={{ width: 80, textAlign: 'right' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLop.map((lop, idx) => {
                                        const monList = phanCongs.filter(pc => pc.lop_id === lop.id);
                                        return (
                                            <tr key={lop.id}>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                                                <td><span style={{ fontWeight: 600, fontSize: 13 }}>{lop.ten_lop}</span></td>
                                                <td><HeBadge loai={lop.loai_he} /></td>
                                                <td style={{ textAlign: 'center', fontWeight: 600, fontSize: 13 }}>{lop.si_so}</td>
                                                <td>
                                                    {monList.length > 0 ? (
                                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                            {monList.map(pc => (
                                                                <span key={pc.id} style={{ fontSize: 11, background: 'rgba(14,165,233,0.08)', color: '#0ea5e9', padding: '2px 8px', borderRadius: 100, border: '1px solid rgba(14,165,233,0.2)', whiteSpace: 'nowrap' }}>
                                                                    {pc.ten_mon}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                                        <button className="btn-icon" onClick={() => openModal('lop', lop)}><Edit3 size={13} /></button>
                                                        <button className="btn-icon" style={{ color: '#f87171' }} onClick={() => deleteLop(lop.id)}><Trash2 size={13} /></button>
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

            {/* ══════════════════════════════════════ */}
            {/* TAB: IMPORT                             */}
            {/* ══════════════════════════════════════ */}
            {activeTab === 'import' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
                    <div className="card">
                        <div className="card-header">
                            <h2 style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}><Upload size={18} style={{ color: 'var(--text-accent)' }} /> Import phân công từ Excel / CSV</h2>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontWeight: 600 }}>Kỳ học <span style={{ color: '#f87171' }}>*</span></label>
                                    <select className="form-select" value={selectedKi} onChange={e => setSelectedKi(e.target.value)} required>
                                        <option value="">-- Chọn kỳ --</option>
                                        {kiHocs.map(k => <option key={k.id} value={k.id}>{k.ten_ki} - {k.nam_hoc}</option>)}
                                    </select>
                                </div>
                                <div style={{ background: 'rgba(14,165,233,0.05)', border: '1px dashed rgba(14,165,233,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 12 }}>
                                    <p style={{ fontWeight: 600, color: 'var(--text-accent)', marginBottom: 6 }}>Thứ tự 4 cột:</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        {['1. Họ tên giáo viên', '2. Tên môn học', '3. Tên lớp', '4. Sĩ số'].map(c => <span key={c} style={{ color: 'var(--text-secondary)' }}>→ {c}</span>)}
                                    </div>
                                </div>
                            </div>
                            <textarea className="form-input" style={{ minHeight: 280, fontFamily: 'monospace', fontSize: 12, resize: 'vertical', lineHeight: 1.7 }}
                                value={csvText} onChange={e => setCsvText(e.target.value)}
                                placeholder={"CÁCH 1: Bôi 4 cột trong Excel → Ctrl+C → Click vào đây → Ctrl+V\n\nCÁCH 2: Gõ trực tiếp dạng CSV:\nLê Minh Tấn,TH Điều khiển khí nén,T24CD3DA-N2,16\nTrần Thị Lan,TH Máy điện,C24DC1-N1,28"}
                            />
                            <button className="btn btn-primary" onClick={handleImport} disabled={importing} style={{ width: '100%', marginTop: 12, height: 44, fontWeight: 600, fontSize: 14 }}>
                                {importing ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Đang xử lý...</> : <><Upload size={16} /> Phân tích & Import</>}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="card">
                            <div className="card-header"><h3 style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><AlertCircle size={15} style={{ color: '#f59e0b' }} /> Lưu ý</h3></div>
                            <div className="card-body" style={{ paddingTop: 0 }}>
                                {[
                                    ['✨', 'Tự động tạo GV, Môn, Lớp nếu chưa có'],
                                    ['🧠', 'Tự nhận hệ từ ký tự đầu tên lớp (C/T/L)'],
                                    ['⏭️', 'Bỏ qua nếu phân công đã tồn tại'],
                                    ['🔄', 'Cập nhật sĩ số nếu thay đổi'],
                                ].map(([icon, text], i) => (
                                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '7px 10px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)' }}>
                                        <span>{icon}</span><span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {importResult && (
                            <div className="card" style={{ border: '1px solid rgba(52,211,153,0.4)' }}>
                                <div className="card-header"><h3 style={{ color: '#10b981', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={15} /> Kết quả Import</h3></div>
                                <div className="card-body" style={{ paddingTop: 0 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                                        {[
                                            { label: 'Tổng dòng', value: importResult.tong_dong, color: '#60a5fa' },
                                            { label: 'Import OK', value: importResult.phan_cong_them_moi, color: '#34d399' },
                                            { label: 'Đã có', value: importResult.phan_cong_da_co, color: '#94a3b8' },
                                            { label: 'Lỗi', value: importResult.loi?.length || 0, color: '#f87171' },
                                        ].map(item => (
                                            <div key={item.label} style={{ padding: '8px', background: item.color + '12', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {importResult.loi?.map((err, i) => <div key={i} style={{ fontSize: 11, color: '#ef4444', marginBottom: 3 }}>• {err}</div>)}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════ */}
            {/* TAB: CÀI ĐẶT (Ngành & Hệ)             */}
            {/* ══════════════════════════════════════ */}
            {activeTab === 'cai_dat' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div className="card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: 15, fontWeight: 600 }}>🏛️ Ngành đào tạo</h2>
                            <button className="btn btn-secondary" style={{ height: 32, fontSize: 12 }} onClick={() => openModal('nganh')}><Plus size={13} /> Thêm</button>
                        </div>
                        <div style={{ padding: 0 }}>
                            {nganhs.length === 0 ? (
                                <div className="empty-state" style={{ padding: '32px 20px' }}><GraduationCap size={36} /><h3 style={{ fontSize: 14 }}>Chưa có ngành</h3></div>
                            ) : nganhs.map(nganh => {
                                const expanded = expandedNganh[nganh.id];
                                const nganhHes = hes.filter(h => h.nganh_id === nganh.id);
                                return (
                                    <div key={nganh.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', cursor: 'pointer' }} onClick={() => setExpandedNganh(p => ({ ...p, [nganh.id]: !p[nganh.id] }))}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(0)' : 'rotate(-90deg)' }}><ChevronDown size={15} /></div>
                                                <FolderOpen size={15} style={{ color: '#38bdf8' }} />
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{nganh.ten_nganh}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{nganhHes.length} hệ</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                                                <button className="btn-icon" onClick={() => { openModal('he', null); setForm({ nganh_id: nganh.id, ten_he: '' }); }} title="Thêm hệ"><Plus size={13} /></button>
                                                <button className="btn-icon" onClick={() => openModal('nganh', nganh)}><Edit3 size={13} /></button>
                                                <button className="btn-icon" style={{ color: '#f87171' }} onClick={() => deleteNganh(nganh.id)}><Trash2 size={13} /></button>
                                            </div>
                                        </div>
                                        {expanded && nganhHes.length > 0 && (
                                            <div style={{ paddingLeft: 40, paddingBottom: 10 }}>
                                                {nganhHes.map(he => (
                                                    <div key={he.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', marginRight: 12, marginBottom: 4, borderRadius: 'var(--radius-sm)', background: 'var(--bg-glass)', border: '1px solid var(--border-color)' }}>
                                                        <span style={{ fontSize: 13 }}>{he.ten_he}</span>
                                                        <div style={{ display: 'flex', gap: 2 }}>
                                                            <button className="btn-icon" onClick={() => openModal('he', { ...he, nganh_id: nganh.id })}><Edit3 size={12} /></button>
                                                            <button className="btn-icon" style={{ color: '#f87171' }} onClick={() => deleteHe(he.id)}><Trash2 size={12} /></button>
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
                    <div className="card">
                        <div className="card-header"><h2 style={{ fontSize: 15, fontWeight: 600 }}>ℹ️ Thông tin hệ thống</h2></div>
                        <div className="card-body">
                            {[
                                { label: 'Tổng môn học', value: monHocs.length, icon: '📚' },
                                { label: 'Môn TH', value: monHocs.filter(m => m.ten_mon.startsWith('TH')).length, icon: '🔬' },
                                { label: 'Tổng lớp', value: lops.length, icon: '🏫' },
                                { label: 'Giáo viên', value: giaoViens.length, icon: '👩‍🏫' },
                                { label: 'Phân công kỳ này', value: phanCongs.length, icon: '📝' },
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.icon} {item.label}</span>
                                    <span style={{ fontWeight: 700, fontSize: 16 }}>{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════ */}
            {/* MODALS                                  */}
            {/* ══════════════════════════════════════ */}
            {showModal === 'nganh' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>{editing ? 'Sửa ngành' : 'Thêm ngành'}</h2><button className="btn-ghost" onClick={() => setShowModal(null)}>✕</button></div>
                        <form onSubmit={submitNganh}>
                            <div className="modal-body"><div className="form-group"><label className="form-label">Tên ngành *</label><input className="form-input" value={form.ten_nganh || ''} onChange={e => setForm({ ...form, ten_nganh: e.target.value })} required placeholder="VD: Công nghệ kỹ thuật điện" autoFocus /></div></div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Hủy</button><button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Thêm'}</button></div>
                        </form>
                    </div>
                </div>
            )}
            {showModal === 'he' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>{editing ? 'Sửa hệ' : 'Thêm hệ đào tạo'}</h2><button className="btn-ghost" onClick={() => setShowModal(null)}>✕</button></div>
                        <form onSubmit={submitHe}>
                            <div className="modal-body">
                                <div className="form-group"><label className="form-label">Ngành</label><select className="form-select" value={form.nganh_id || ''} onChange={e => setForm({ ...form, nganh_id: e.target.value })} required><option value="">Chọn ngành</option>{nganhs.map(n => <option key={n.id} value={n.id}>{n.ten_nganh}</option>)}</select></div>
                                <div className="form-group"><label className="form-label">Tên hệ *</label><input className="form-input" value={form.ten_he || ''} onChange={e => setForm({ ...form, ten_he: e.target.value })} required placeholder="VD: Cao đẳng" autoFocus /></div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Hủy</button><button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Thêm'}</button></div>
                        </form>
                    </div>
                </div>
            )}
            {showModal === 'mon' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>{editing ? 'Sửa môn học' : 'Thêm môn học'}</h2><button className="btn-ghost" onClick={() => setShowModal(null)}>✕</button></div>
                        <form onSubmit={submitMon}>
                            <div className="modal-body"><div className="form-group"><label className="form-label">Tên môn học *</label><input className="form-input" value={form.ten_mon || ''} onChange={e => setForm({ ...form, ten_mon: e.target.value })} required placeholder="VD: TH Điều khiển khí nén" autoFocus /></div></div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Hủy</button><button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Thêm'}</button></div>
                        </form>
                    </div>
                </div>
            )}
            {showModal === 'lop' && (
                <div className="modal-overlay" onClick={() => setShowModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>{editing ? 'Sửa lớp' : 'Thêm lớp học'}</h2><button className="btn-ghost" onClick={() => setShowModal(null)}>✕</button></div>
                        <form onSubmit={submitLop}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Tên lớp *</label>
                                    <input className="form-input" value={form.ten_lop || ''} onChange={e => setForm({ ...form, ten_lop: e.target.value })} required placeholder="VD: T24CD3DA-N2" autoFocus />
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}><strong style={{ color: '#38bdf8' }}>C</strong> = Cao đẳng &nbsp; <strong style={{ color: '#f59e0b' }}>T</strong> = Trung cấp &nbsp; <strong style={{ color: '#a78bfa' }}>L</strong> = Liên thông</p>
                                </div>
                                <div className="form-group"><label className="form-label">Sĩ số</label><input className="form-input" type="number" min="0" value={form.si_so || ''} onChange={e => setForm({ ...form, si_so: e.target.value })} placeholder="Số học viên" /></div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Hủy</button><button type="submit" className="btn btn-primary">{editing ? 'Cập nhật' : 'Thêm'}</button></div>
                        </form>
                    </div>
                </div>
            )}
            {showPhanCongModal && (
                <div className="modal-overlay" onClick={() => setShowPhanCongModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2>Thêm phân công giảng dạy</h2><button className="btn-ghost" onClick={() => setShowPhanCongModal(null)}>✕</button></div>
                        <form onSubmit={submitPhanCong}>
                            <div className="modal-body">
                                <div style={{ padding: '8px 12px', background: 'rgba(96,165,250,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(96,165,250,0.2)', marginBottom: 16 }}>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Môn học</p>
                                    <p style={{ fontWeight: 700, fontSize: 14, color: '#60a5fa' }}>{showPhanCongModal.ten_mon}</p>
                                </div>
                                <div className="form-group"><label className="form-label">Giáo viên *</label><select className="form-select" value={formPhanCong.giao_vien_id} onChange={e => setFormPhanCong({ ...formPhanCong, giao_vien_id: e.target.value })} required autoFocus><option value="">-- Chọn giáo viên --</option>{giaoViens.map(gv => <option key={gv.id} value={gv.id}>{gv.ho_ten}</option>)}</select></div>
                                <div className="form-group"><label className="form-label">Lớp học *</label><select className="form-select" value={formPhanCong.lop_id} onChange={e => setFormPhanCong({ ...formPhanCong, lop_id: e.target.value })} required><option value="">-- Chọn lớp --</option>{lops.map(lop => <option key={lop.id} value={lop.id}>{lop.ten_lop} ({lop.si_so} hv)</option>)}</select></div>
                            </div>
                            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowPhanCongModal(null)}>Hủy</button><button type="submit" className="btn btn-primary" style={{ minWidth: 120 }}>Lưu phân công</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
`;

writeFileSync(target, code, 'utf8');
console.log('Done! Lines:', code.split('\n').length);
