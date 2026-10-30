'use client';
import { useState, useEffect, useCallback } from 'react';
import {
    ClipboardList, Plus, Trash2, CheckCircle, XCircle, Printer, Pencil, FileText,
    Eye, Check, X, Clock, AlertTriangle
} from 'lucide-react';
import { buildBienBanHTML, buildPhieuXuatSuaChuaHTML } from '@/lib/printBienBan';

const EMPTY_FORM = {
    so_bien_ban: '',
    ngay_lap: new Date().toISOString().slice(0, 10),
    gio_lap: new Date().toTimeString().slice(0, 5),
    ki_id: '',
    thanh_phan: 'Thành phần tham gia:\n1. Chủ trì: \n2. Thành viên: ',
    ten_thiet_bi: '',
    ma_so: '',
    phong_khoa: '',
    dia_diem: '',
    nguoi_su_dung: '',
    thoi_gian_phat_hien: '',
    nguoi_phat_hien: '',
    hien_tuong_hu_hong: '',
    tinh_hinh: '',
    nguyen_nhan: '',
    de_nghi_khac_phuc: '',
    ket_qua_kiem_tra: '',
    phuong_an: '',
    vat_tu_list: [{ ten: '', dvt: '', so_luong: 1, don_gia: 0, ghi_chu: '' }],
    cong_viec_nghiem_thu: '',
    ngay_hoan_thanh: '',
    giao_vien_id: '',
    ghi_chu: '',
};

const statusConfig = {
    cho_duyet: { label: 'Chờ duyệt', badge: 'badge-warning', icon: Clock },
    da_duyet: { label: 'Đã duyệt', badge: 'badge-success', icon: CheckCircle },
    tu_choi: { label: 'Từ chối', badge: 'badge-danger', icon: XCircle },
};
const statusCardClass = { cho_duyet: 'warning', da_duyet: 'success', tu_choi: 'danger' };

function Field({ label, required, children }) {
    return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600 }}>
            <span>
                {label}
                {required && <span style={{ color: '#dc2626' }}> *</span>}
            </span>
            {children}
        </label>
    );
}

function SectionTitle({ children }) {
    return (
        <div style={{
            gridColumn: '1 / -1', fontWeight: 700, fontSize: 15, margin: '12px 0 0',
            padding: '10px 12px', borderRadius: 8,
            background: 'var(--bg-secondary, #f8fafc)', border: '1px solid var(--border-color)'
        }}>
            {children}
        </div>
    );
}

export default function BienBanPage() {
    const [kis, setKis] = useState([]);
    const [gvs, setGvs] = useState([]);
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedKi, setSelectedKi] = useState('all');
    const [detail, setDetail] = useState(null);
    const [mode, setMode] = useState('list'); // list | form
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'ok') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        Promise.all([
            fetch('/api/ki-hoc').then(r => r.json()),
            fetch('/api/giao-vien').then(r => r.json()),
        ]).then(([kiRes, gvRes]) => {
            const kiList = Array.isArray(kiRes) ? kiRes : [];
            const gvList = Array.isArray(gvRes) ? gvRes : [];
            setKis(kiList);
            setGvs(gvList);
            if (kiList.length > 0) {
                setForm(f => ({ ...f, ki_id: kiList[kiList.length - 1].id }));
            }
        });
    }, []);

    const loadList = useCallback(() => {
        setLoading(true);
        const url = selectedKi !== 'all' ? `/api/bien-ban?ki_id=${selectedKi}` : '/api/bien-ban';
        fetch(url)
            .then(r => r.json())
            .then(d => { setList(Array.isArray(d) ? d : []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [selectedKi]);

    useEffect(() => { loadList(); }, [loadList]);

    const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

    const setVatTu = (idx, key, value) => {
        setForm(f => {
            const arr = f.vat_tu_list.map((v, i) => i === idx ? { ...v, [key]: value } : v);
            return { ...f, vat_tu_list: arr };
        });
    };

    const tongTien = form.vat_tu_list.reduce((s, v) => s + (Number(v.so_luong) || 0) * (Number(v.don_gia) || 0), 0);

    const openCreate = () => {
        setForm({ ...EMPTY_FORM, ki_id: kis.length > 0 ? kis[kis.length - 1].id : '' });
        setEditingId(null);
        setDetail(null);
        setMode('form');
    };

    const openEdit = async (id) => {
        try {
            const bb = await fetch(`/api/bien-ban?id=${id}`).then(r => r.json());
            if (bb.error) { showToast(bb.error, 'err'); return; }
            setForm({
                so_bien_ban: bb.so_bien_ban || '',
                ngay_lap: bb.ngay_lap || '',
                gio_lap: bb.gio_lap || '',
                ki_id: bb.ki_id || '',
                thanh_phan: bb.thanh_phan || '',
                ten_thiet_bi: bb.ten_thiet_bi || '',
                ma_so: bb.ma_so || '',
                phong_khoa: bb.phong_khoa || '',
                dia_diem: bb.dia_diem || '',
                nguoi_su_dung: bb.nguoi_su_dung || '',
                thoi_gian_phat_hien: bb.thoi_gian_phat_hien || '',
                nguoi_phat_hien: bb.nguoi_phat_hien || '',
                hien_tuong_hu_hong: bb.hien_tuong_hu_hong || '',
                tinh_hinh: bb.tinh_hinh || '',
                nguyen_nhan: bb.nguyen_nhan || '',
                de_nghi_khac_phuc: bb.de_nghi_khac_phuc || '',
                ket_qua_kiem_tra: bb.ket_qua_kiem_tra || '',
                phuong_an: bb.phuong_an || '',
                vat_tu_list: (bb.vat_tu_list && bb.vat_tu_list.length > 0)
                    ? bb.vat_tu_list
                    : [{ ten: '', dvt: '', so_luong: 1, don_gia: 0, ghi_chu: '' }],
                cong_viec_nghiem_thu: bb.cong_viec_nghiem_thu || '',
                ngay_hoan_thanh: bb.ngay_hoan_thanh || '',
                giao_vien_id: bb.giao_vien_id || '',
                ghi_chu: bb.ghi_chu || '',
            });
            setEditingId(id);
            setDetail(null);
            setMode('form');
        } catch {
            showToast('Không tải được biên bản', 'err');
        }
    };

    const save = async () => {
        if (!form.ten_thiet_bi.trim()) { showToast('Tên thiết bị không được để trống', 'err'); return; }
        if (!form.ngay_lap) { showToast('Ngày lập biên bản không được để trống', 'err'); return; }
        setSaving(true);
        try {
            const payload = {
                ...form,
                ki_id: form.ki_id ? parseInt(form.ki_id) : null,
                giao_vien_id: form.giao_vien_id ? parseInt(form.giao_vien_id) : null,
                vat_tu_list: form.vat_tu_list.filter(v => v.ten.trim()),
            };
            const res = await fetch(editingId ? `/api/bien-ban` : `/api/bien-ban`, {
                method: editingId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingId ? { ...payload, id: editingId } : payload),
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Lỗi lưu biên bản', 'err'); return; }
            showToast(editingId ? 'Đã cập nhật biên bản' : 'Đã tạo biên bản (chờ duyệt)');
            setMode('list');
            loadList();
        } catch {
            showToast('Lỗi kết nối server', 'err');
        } finally {
            setSaving(false);
        }
    };

    const setStatus = async (id, trang_thai) => {
        try {
            const res = await fetch('/api/bien-ban', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, trang_thai }),
            });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Lỗi', 'err'); return; }
            showToast(trang_thai === 'da_duyet' ? 'Đã duyệt biên bản' : trang_thai === 'tu_choi' ? 'Đã từ chối biên bản' : 'Đã gửi lại duyệt');
            setDetail(null);
            loadList();
        } catch {
            showToast('Lỗi kết nối server', 'err');
        }
    };

    const remove = async (id) => {
        if (!confirm('Xóa biên bản này? Hành động không hoàn tác.')) return;
        try {
            const res = await fetch(`/api/bien-ban?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) { showToast(data.error || 'Lỗi xóa', 'err'); return; }
            showToast('Đã xóa biên bản');
            setDetail(null);
            loadList();
        } catch {
            showToast('Lỗi kết nối server', 'err');
        }
    };

    const printBienBan = async (id) => {
        try {
            const bb = await fetch(`/api/bien-ban?id=${id}`).then(r => r.json());
            if (bb.error) { showToast(bb.error, 'err'); return; }
            const html = buildBienBanHTML(bb);

            const printWindow = window.open('', '_blank');
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.onload = () => printWindow.print();
        } catch {
            showToast('Không in được biên bản', 'err');
        }
    };

    const printPhieuXuatSuaChua = async (id) => {
        try {
            const bb = await fetch(`/api/bien-ban?id=${id}`).then(r => r.json());
            if (bb.error) { showToast(bb.error, 'err'); return; }
            const html = buildPhieuXuatSuaChuaHTML(bb);

            const printWindow = window.open('', '_blank');
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.onload = () => printWindow.print();
        } catch {
            showToast('Không in được phiếu xuất sửa chữa', 'err');
        }
    };

    const viewDetail = async (id) => {
        try {
            const bb = await fetch(`/api/bien-ban?id=${id}`).then(r => r.json());
            if (bb.error) { showToast(bb.error, 'err'); return; }
            setDetail(bb);
        } catch {
            showToast('Không tải được biên bản', 'err');
        }
    };

    const countVt = (bb) => {
        try {
            const a = bb.vat_tu_phat_sinh ? JSON.parse(bb.vat_tu_phat_sinh) : [];
            return Array.isArray(a) ? a.length : 0;
        } catch { return 0; }
    };

    const fmtD = (s) => {
        if (!s) return '—';
        const m = String(s).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return m ? `${m[3]}/${m[2]}/${m[1]}` : String(s).slice(0, 10);
    };

    const filtered = filter === 'all' ? list : list.filter(b => b.trang_thai === filter);

    if (mode === 'form') {
        const inputCls = 'form-input';
        return (
            <div style={{ paddingBottom: 60 }}>
                <div className="page-header" style={{ marginBottom: 20 }}>
                    <div className="page-header-left">
                        <h1 style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                            <ClipboardList size={28} className="text-primary" />
                            {editingId ? `Sửa biên bản #${editingId}` : 'Lập biên bản hư hỏng (BM01)'}
                        </h1>
                        <p>Biên bản là căn cứ xuất kho vật tư sửa chữa/thiết bị.</p>
                    </div>
                    <div className="page-header-actions" style={{ display: 'flex', gap: 12 }}>
                        <button className="btn btn-secondary" onClick={() => setMode('list')} disabled={saving}>Hủy</button>
                        <button className="btn btn-primary" onClick={save} disabled={saving}>
                            {saving ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Tạo biên bản'}
                        </button>
                    </div>
                </div>

                <div className="card">
                    <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                            <SectionTitle>Thông tin chung</SectionTitle>
                            <Field label="Số biên bản">
                                <input className={inputCls} value={form.so_bien_ban} onChange={e => set('so_bien_ban', e.target.value)} placeholder="VD: 01/BB-VT" />
                            </Field>
                            <Field label="Ngày lập" required>
                                <input type="date" className={inputCls} value={form.ngay_lap} onChange={e => set('ngay_lap', e.target.value)} />
                            </Field>
                            <Field label="Giờ lập">
                                <input type="time" className={inputCls} value={form.gio_lap} onChange={e => set('gio_lap', e.target.value)} />
                            </Field>
                            <Field label="Kỳ học" required>
                                <select className="form-select" value={form.ki_id} onChange={e => set('ki_id', e.target.value)}>
                                    <option value="">— Chọn kỳ —</option>
                                    {kis.map(k => <option key={k.id} value={k.id}>{k.ten_ki} ({k.nam_hoc})</option>)}
                                </select>
                            </Field>
                            <Field label="Người lập biên bản">
                                <select className="form-select" value={form.giao_vien_id} onChange={e => set('giao_vien_id', e.target.value)}>
                                    <option value="">— Chọn giáo viên —</option>
                                    {gvs.map(g => <option key={g.id} value={g.id}>{g.ho_ten}</option>)}
                                </select>
                            </Field>
                            <Field label="Thành phần tham gia">
                                <textarea className={inputCls} rows={4} value={form.thanh_phan} onChange={e => set('thanh_phan', e.target.value)} />
                            </Field>

                            <SectionTitle>Phần B — Thiết bị hư hỏng</SectionTitle>
                            <Field label="Tên thiết bị" required>
                                <input className={inputCls} value={form.ten_thiet_bi} onChange={e => set('ten_thiet_bi', e.target.value)} />
                            </Field>
                            <Field label="Mã số">
                                <input className={inputCls} value={form.ma_so} onChange={e => set('ma_so', e.target.value)} />
                            </Field>
                            <Field label="Phòng/Khoa">
                                <input className={inputCls} value={form.phong_khoa} onChange={e => set('phong_khoa', e.target.value)} />
                            </Field>
                            <Field label="Địa điểm">
                                <input className={inputCls} value={form.dia_diem} onChange={e => set('dia_diem', e.target.value)} />
                            </Field>
                            <Field label="Người sử dụng">
                                <input className={inputCls} value={form.nguoi_su_dung} onChange={e => set('nguoi_su_dung', e.target.value)} />
                            </Field>
                            <Field label="Thời gian phát hiện">
                                <input className={inputCls} value={form.thoi_gian_phat_hien} onChange={e => set('thoi_gian_phat_hien', e.target.value)} placeholder="VD: 14/09/2026 ca 2" />
                            </Field>
                            <Field label="Người phát hiện">
                                <input className={inputCls} value={form.nguoi_phat_hien} onChange={e => set('nguoi_phat_hien', e.target.value)} />
                            </Field>
                            <Field label="Hiện tượng hư hỏng">
                                <textarea className={inputCls} rows={3} value={form.hien_tuong_hu_hong} onChange={e => set('hien_tuong_hu_hong', e.target.value)} />
                            </Field>

                            <SectionTitle>Phần C–E — Nhận định</SectionTitle>
                            <Field label="C. Tình hình hiện trạng">
                                <textarea className={inputCls} rows={3} value={form.tinh_hinh} onChange={e => set('tinh_hinh', e.target.value)} />
                            </Field>
                            <Field label="Nguyên nhân">
                                <textarea className={inputCls} rows={3} value={form.nguyen_nhan} onChange={e => set('nguyen_nhan', e.target.value)} />
                            </Field>
                            <Field label="D. Đề nghị khắc phục">
                                <textarea className={inputCls} rows={3} value={form.de_nghi_khac_phuc} onChange={e => set('de_nghi_khac_phuc', e.target.value)} />
                            </Field>
                            <Field label="E. Kết quả kiểm tra">
                                <textarea className={inputCls} rows={3} value={form.ket_qua_kiem_tra} onChange={e => set('ket_qua_kiem_tra', e.target.value)} />
                            </Field>
                            <Field label="Phương án xử lý">
                                <textarea className={inputCls} rows={3} value={form.phuong_an} onChange={e => set('phuong_an', e.target.value)} />
                            </Field>

                            <SectionTitle>Phần F — Vật tư phát sinh (dùng để xuất kho sửa chữa)</SectionTitle>
                        </div>

                        <div className="table-container" style={{ marginTop: 8 }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 40 }}>TT</th>
                                        <th>Tên vật tư / linh kiện</th>
                                        <th style={{ width: 100 }}>ĐVT</th>
                                        <th style={{ width: 90 }}>SL</th>
                                        <th style={{ width: 120 }}>Đơn giá</th>
                                        <th style={{ width: 130, textAlign: 'right' }}>Thành tiền</th>
                                        <th style={{ width: 68 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.vat_tu_list.map((v, i) => (
                                        <tr key={i}>
                                            <td>{i + 1}</td>
                                            <td>
                                                <input className="form-input" style={{ minWidth: 140 }} value={v.ten} onChange={e => setVatTu(i, 'ten', e.target.value)} />
                                            </td>
                                            <td>
                                                <input className="form-input" style={{ minWidth: 70 }} value={v.dvt} onChange={e => setVatTu(i, 'dvt', e.target.value)} placeholder="Cái…" />
                                            </td>
                                            <td>
                                                <input type="number" min="0" className="form-input" style={{ minWidth: 70 }} value={v.so_luong} onChange={e => setVatTu(i, 'so_luong', Number(e.target.value))} />
                                            </td>
                                            <td>
                                                <input type="number" min="0" className="form-input" style={{ minWidth: 80 }} value={v.don_gia} onChange={e => setVatTu(i, 'don_gia', Number(e.target.value))} />
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                {((Number(v.so_luong) || 0) * (Number(v.don_gia) || 0)).toLocaleString('vi-VN')}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button className="btn-icon" title="Xóa dòng" onClick={() => setForm(f => ({ ...f, vat_tu_list: f.vat_tu_list.filter((_, j) => j !== i) }))}>
                                                    <Trash2 size={16} style={{ color: '#dc2626' }} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr style={{ borderTop: '2px solid var(--border-color)' }}>
                                        <td colSpan={5} style={{ textAlign: 'right', fontWeight: 700 }}>Tổng cộng:</td>
                                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--brand)' }}>
                                            {tongTien.toLocaleString('vi-VN')} ₫
                                        </td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <button
                            className="btn btn-secondary"
                            style={{ marginTop: 8 }}
                            onClick={() => setForm(f => ({ ...f, vat_tu_list: [...f.vat_tu_list, { ten: '', dvt: '', so_luong: 1, don_gia: 0, ghi_chu: '' }] }))}
                        >
                            <Plus size={16} /> Thêm dòng vật tư
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 20 }}>
                            <SectionTitle>Phần G — Nghiệm thu</SectionTitle>
                            <Field label="Công việc nghiệm thu">
                                <textarea className="form-input" rows={3} value={form.cong_viec_nghiem_thu} onChange={e => set('cong_viec_nghiem_thu', e.target.value)} />
                            </Field>
                            <Field label="Ngày hoàn thành">
                                <input type="date" className="form-input" value={form.ngay_hoan_thanh} onChange={e => set('ngay_hoan_thanh', e.target.value)} />
                            </Field>
                            <Field label="Ghi chú khác">
                                <textarea className="form-input" rows={3} value={form.ghi_chu} onChange={e => set('ghi_chu', e.target.value)} />
                            </Field>
                        </div>
                    </div>
                </div>

                {/* Sticky action bar mobile */}
                <div style={{
                    position: 'sticky', bottom: 0, zIndex: 30, display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap',
                    padding: '12px 0', background: 'var(--bg-primary, #fff)'
                }}>
                    <button className="btn btn-secondary" onClick={() => setMode('list')} disabled={saving}>Hủy</button>
                    <button className="btn btn-primary" onClick={save} disabled={saving}>
                        {saving ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Tạo biên bản'}
                    </button>
                </div>

                {toast && <div className="toast-container"><div className={`toast ${toast.type === 'err' ? 'toast-error' : 'toast-success'}`}>{toast.msg}</div></div>}
            </div>
        );
    }

    const statusCounts = {
        cho_duyet: list.filter(b => b.trang_thai === 'cho_duyet').length,
        da_duyet: list.filter(b => b.trang_thai === 'da_duyet').length,
        tu_choi: list.filter(b => b.trang_thai === 'tu_choi').length,
    };
    const detailPxCount = detail ? (detail.phieu_xuat || []).length : 0;
    const detailEditable = detail && (detail.trang_thai === 'cho_duyet' || detail.trang_thai === 'tu_choi') && detailPxCount === 0;

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1 style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <ClipboardList size={28} className="text-primary" />
                        Quản lý Biên bản
                    </h1>
                    <p>Duyệt biên bản hư hỏng thiết bị (BM01) — căn cứ xuất kho sửa chữa</p>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <select className="form-select" style={{ width: '100%', maxWidth: 220 }} value={selectedKi} onChange={e => setSelectedKi(e.target.value)}>
                        <option value="all">Tất cả kỳ</option>
                        {kis.map(k => <option key={k.id} value={k.id}>{k.ten_ki} - {k.nam_hoc}</option>)}
                    </select>
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={18} /> Lập biên bản mới
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading-overlay"><div className="spinner" /></div>
            ) : (
            <>
            <div className="stats-grid" style={{ marginBottom: 24 }}>
                {Object.entries(statusConfig).map(([key, config]) => (
                    <div className={`stat-card ${statusCardClass[key]}`} key={key}>
                        <div className={`stat-icon ${statusCardClass[key]}`}>
                            <config.icon size={24} />
                        </div>
                        <div className="stat-info">
                            <h3>{statusCounts[key]}</h3>
                            <p>{config.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="tabs">
                {[['all', 'Tất cả', list.length], ['cho_duyet', 'Chờ duyệt', statusCounts.cho_duyet], ['da_duyet', 'Đã duyệt', statusCounts.da_duyet], ['tu_choi', 'Từ chối', statusCounts.tu_choi]].map(([val, label, count]) => (
                    <button type="button" key={val} className={`tab ${filter === val ? 'active' : ''}`} onClick={() => setFilter(val)}>
                        {label} ({count})
                    </button>
                ))}
            </div>

            <div className="card">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã biên bản</th>
                                <th>Thiết bị</th>
                                <th>Người lập</th>
                                <th>Ngày lập</th>
                                <th>Vật tư</th>
                                <th>Trạng thái</th>
                                <th style={{ minWidth: 170, whiteSpace: 'nowrap' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={7}><div className="empty-state"><FileText size={48} /><h3>Chưa có biên bản nào</h3></div></td></tr>
                            ) : filtered.map(bb => (
                                <tr key={bb.id}>
                                    <td style={{ fontWeight: 500, color: 'var(--text-accent)' }}>
                                        BB-{String(bb.id).padStart(4, '0')}
                                        {bb.so_bien_ban && <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>{bb.so_bien_ban}</div>}
                                    </td>
                                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                        {bb.ten_thiet_bi}
                                        {bb.ma_so && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> ({bb.ma_so})</span>}
                                    </td>
                                    <td>{bb.ten_gv || '—'}</td>
                                    <td>{fmtD(bb.ngay_lap)}</td>
                                    <td>{countVt(bb)} vật tư</td>
                                    <td><span className={`badge ${statusConfig[bb.trang_thai]?.badge || 'badge-warning'}`}>{statusConfig[bb.trang_thai]?.label || bb.trang_thai}</span></td>
                                    <td>
                                        <div className="table-actions">
                                            <button className="btn-icon" onClick={() => viewDetail(bb.id)} title="Chi tiết"><Eye size={16} /></button>
                                            <button className="btn-icon" onClick={() => printBienBan(bb.id)} title="In biên bản (BM01)"><FileText size={16} /></button>
                                            {bb.trang_thai === 'da_duyet' && (
                                                <button className="btn-icon" onClick={() => printPhieuXuatSuaChua(bb.id)} title="In phiếu xuất sửa chữa" style={{ color: 'var(--primary, #2563eb)' }}><Printer size={16} /></button>
                                            )}
                                            {bb.trang_thai === 'cho_duyet' && (
                                                <>
                                                    <button className="btn-icon" onClick={() => setStatus(bb.id, 'da_duyet')} title="Duyệt" style={{ color: '#34d399' }}><Check size={16} /></button>
                                                    <button className="btn-icon" onClick={() => setStatus(bb.id, 'tu_choi')} title="Từ chối" style={{ color: '#f87171' }}><X size={16} /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            </>
            )}

            {detail && (
                <div className="modal-overlay" onClick={() => setDetail(null)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>Biên bản BB-{String(detail.id).padStart(4, '0')}{detail.so_bien_ban ? ` — ${detail.so_bien_ban}` : ''}</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                                    {detail.ten_thiet_bi}{detail.ten_gv ? ` • ${detail.ten_gv}` : ''}{detail.ngay_lap ? ` • ${fmtD(detail.ngay_lap)}` : ''}
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <span className={`badge ${statusConfig[detail.trang_thai]?.badge || 'badge-warning'}`}>{statusConfig[detail.trang_thai]?.label || detail.trang_thai}</span>
                                <button className="btn-ghost" onClick={() => setDetail(null)}>✕</button>
                            </div>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, fontSize: 14 }}>
                                <div><strong>Phòng/Khoa:</strong> {detail.phong_khoa || '—'}</div>
                                <div><strong>Địa điểm:</strong> {detail.dia_diem || '—'}</div>
                                <div><strong>Người sử dụng:</strong> {detail.nguoi_su_dung || '—'}</div>
                                <div><strong>Người phát hiện:</strong> {detail.nguoi_phat_hien || '—'}</div>
                                <div><strong>Phát hiện:</strong> {detail.thoi_gian_phat_hien || '—'}</div>
                                <div><strong>Ngày hoàn thành:</strong> {detail.ngay_hoan_thanh ? fmtD(detail.ngay_hoan_thanh) : '—'}</div>
                            </div>
                            {detail.hien_tuong_hu_hong && <p style={{ marginTop: 10, fontSize: 14 }}><strong>Hiện tượng:</strong> {detail.hien_tuong_hu_hong}</p>}
                            {detail.tinh_hinh && <p style={{ marginTop: 6, fontSize: 14 }}><strong>Tình hình:</strong> {detail.tinh_hinh}</p>}
                            {detail.nguyen_nhan && <p style={{ marginTop: 6, fontSize: 14 }}><strong>Nguyên nhân:</strong> {detail.nguyen_nhan}</p>}
                            {detail.de_nghi_khac_phuc && <p style={{ marginTop: 6, fontSize: 14 }}><strong>Đề nghị:</strong> {detail.de_nghi_khac_phuc}</p>}
                            {detail.cong_viec_nghiem_thu && <p style={{ marginTop: 6, fontSize: 14 }}><strong>Nghiệm thu:</strong> {detail.cong_viec_nghiem_thu}</p>}
                            <div className="table-container" style={{ marginTop: 14 }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Vật tư / linh kiện</th>
                                            <th>ĐVT</th>
                                            <th>SL</th>
                                            <th>Đơn giá</th>
                                            <th>Thành tiền</th>
                                            <th>Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(detail.vat_tu_list || []).length === 0 ? (
                                            <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Không có vật tư phát sinh</td></tr>
                                        ) : detail.vat_tu_list.map((v, i) => (
                                            <tr key={i}>
                                                <td>{i + 1}</td>
                                                <td style={{ fontWeight: 500 }}>{v.ten}</td>
                                                <td>{v.dvt || '—'}</td>
                                                <td style={{ textAlign: 'center' }}>{v.so_luong}</td>
                                                <td style={{ textAlign: 'right' }}>{v.don_gia ? Number(v.don_gia).toLocaleString('vi-VN') : '—'}</td>
                                                <td style={{ textAlign: 'right' }}>{(v.thanh_tien ?? (Number(v.so_luong) || 0) * (Number(v.don_gia) || 0)) ? Number(v.thanh_tien ?? (Number(v.so_luong) || 0) * (Number(v.don_gia) || 0)).toLocaleString('vi-VN') : '—'}</td>
                                                <td>{v.ghi_chu || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {detailPxCount > 0 && (
                                <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
                                    <AlertTriangle size={16} /> Đã gắn {detailPxCount} phiếu xuất — không thể sửa/xóa trực tiếp.
                                </div>
                            )}
                        </div>
                        <div className="modal-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button className="btn btn-secondary" onClick={() => printBienBan(detail.id)}>
                                    <FileText size={16} /> In biên bản
                                </button>
                                {detail.trang_thai === 'da_duyet' && (
                                    <button className="btn btn-primary" onClick={() => printPhieuXuatSuaChua(detail.id)}>
                                        <Printer size={16} /> In phiếu xuất sửa chữa
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                {detailEditable && (
                                    <button className="btn btn-secondary" onClick={() => openEdit(detail.id)}>
                                        <Pencil size={16} /> Sửa
                                    </button>
                                )}
                                {detail.trang_thai === 'cho_duyet' && (
                                    <>
                                        <button className="btn btn-secondary" style={{ color: '#f87171' }} onClick={() => setStatus(detail.id, 'tu_choi')}>
                                            <X size={16} /> Từ chối
                                        </button>
                                        <button className="btn btn-primary" onClick={() => setStatus(detail.id, 'da_duyet')}>
                                            <Check size={16} /> Duyệt
                                        </button>
                                    </>
                                )}
                                {detail.trang_thai === 'tu_choi' && (
                                    <button className="btn btn-secondary" onClick={() => setStatus(detail.id, 'cho_duyet')}>
                                        Gửi duyệt lại
                                    </button>
                                )}
                                {detail.trang_thai === 'da_duyet' && detailPxCount === 0 && (
                                    <button className="btn btn-secondary" style={{ color: '#f87171' }} onClick={() => remove(detail.id)}>
                                        <Trash2 size={16} /> Xóa
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {toast && <div className="toast-container"><div className={`toast ${toast.type === 'err' ? 'toast-error' : 'toast-success'}`}>{toast.msg}</div></div>}
        </div>
    );
}
