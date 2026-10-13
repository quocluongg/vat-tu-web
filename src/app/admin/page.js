'use client';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard, Users, BookOpen, Boxes, FileText, ShoppingCart,
    FileOutput, Calendar, TrendingUp, Clock, PlusCircle, ArrowRight,
    Activity, CheckCircle2, AlertCircle, BarChart3, Scale, DatabaseBackup
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [backuping, setBackuping] = useState(false);

    useEffect(() => {
        fetch('/api/dashboard')
            .then(r => r.json())
            .then(data => { setStats(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const handleDownloadBackup = async () => {
        setBackuping(true);
        try {
            const res = await fetch('/api/backup');
            if (!res.ok) throw new Error('Tải backup thất bại');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vattu-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch {
            alert('Không thể tải backup. Thử lại sau.');
        }
        setBackuping(false);
    };

    if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

    const statusLabels = {
        setup: 'Thiết lập',
        de_xuat: 'Đề xuất',
        mua_sam: 'Mua sắm',
        hoat_dong: 'Hoạt động',
        dong: 'Đã đóng',
    };

    const gvTotal = stats?.gv_da_de_xuat + stats?.gv_chua_de_xuat || 0;
    const gvProgress = gvTotal > 0 ? (stats.gv_da_de_xuat / gvTotal) * 100 : 0;

    const pxTotal = stats?.phieu_xuat?.total || 0;
    const pxGiao = stats?.phieu_xuat?.da_xuat || 0;
    const pxProgress = pxTotal > 0 ? (pxGiao / pxTotal) * 100 : 0;

    const hasOperationData = Boolean(stats?.ki_hoc && stats?.de_xuat);

    const kpis = [
        { icon: <Users size={16} />, label: 'Giáo viên tham gia', value: stats?.giao_vien || 0 },
        { icon: <BookOpen size={16} />, label: 'Môn học hệ thống', value: stats?.mon_hoc || 0 },
        { icon: <Boxes size={16} />, label: 'Danh mục vật tư', value: stats?.vat_tu || 0 },
        { icon: <TrendingUp size={16} />, label: 'Ngành đào tạo', value: stats?.nganh || 0 },
    ];

    return (
        <div style={{ paddingBottom: 40 }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 24 }}>
                <div className="page-header-left">
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <LayoutDashboard size={28} className="text-accent" />
                        Tổng quan hệ thống
                    </h1>
                    <p>Chào mừng trở lại! Dưới đây là tình hình hoạt động của các phân hệ.</p>
                </div>
                <div className="page-header-actions">
                    <div style={{ background: 'var(--bg-glass)', padding: '8px 16px', borderRadius: 'var(--radius-full)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border-color)' }}>
                        <Clock size={16} className="text-muted" />
                        <span>Hôm nay: {new Date().toLocaleDateString('vi-VN')}</span>
                    </div>
                </div>
            </div>

            {/* KPI row */}
            <div className="dash-stats" style={{ marginBottom: 24 }}>
                {kpis.map(kpi => (
                    <div className="dash-stat" key={kpi.label}>
                        <div className="dash-stat-top">
                            <span className="dash-stat-icon">{kpi.icon}</span>
                            <span className="dash-stat-label">{kpi.label}</span>
                        </div>
                        <div className="dash-stat-value">{kpi.value}</div>
                    </div>
                ))}
            </div>

            <div className="dash-grid">
                {/* Main: operations */}
                <div className="dash-main">
                    <div className="card">
                        <div className="card-header">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Activity size={18} className="text-muted" /> Hoạt động kỳ này
                            </h2>
                        </div>
                        <div className="card-body">
                            {hasOperationData ? (
                                <>
                                    {/* Group 1: proposals */}
                                    <div className="ops-group">
                                        <div className="ops-head">
                                            <h3>
                                                <FileText size={16} className="text-muted" /> Nộp & duyệt đề xuất
                                            </h3>
                                            <Link href="/admin/de-xuat" className="btn btn-ghost btn-sm" style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600 }}>Chi tiết</Link>
                                        </div>
                                        <div style={{ marginBottom: 16 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Tiến độ nộp ({stats.gv_da_de_xuat}/{gvTotal} GV)</span>
                                                <span style={{ fontWeight: 600 }}>{gvProgress.toFixed(0)}%</span>
                                            </div>
                                            <div className="progress-bar" style={{ height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                                                <div className="progress-bar-fill primary" style={{ width: `${gvProgress}%`, height: '100%', background: 'var(--brand)', borderRadius: 4 }} />
                                            </div>
                                        </div>
                                        <div className="dash-counts">
                                            <div className="dash-count">
                                                <span className="dash-count-value">{stats.de_xuat.da_nop}</span>
                                                <span className="dash-count-label">Mới nộp</span>
                                            </div>
                                            <div className="dash-count">
                                                <span className="dash-count-value">{stats.de_xuat.dang_lam}</span>
                                                <span className="dash-count-label">Đang xét</span>
                                            </div>
                                            <div className="dash-count">
                                                <span className="dash-count-value">{stats.de_xuat.duyet}</span>
                                                <span className="dash-count-label">Đã duyệt</span>
                                            </div>
                                            <div className="dash-count">
                                                <span className="dash-count-value">{stats.de_xuat.tu_choi}</span>
                                                <span className="dash-count-label">Từ chối</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="ops-divider" />

                                    {/* Group 2: handover */}
                                    <div className="ops-group">
                                        <div className="ops-head">
                                            <h3>
                                                <FileOutput size={16} className="text-muted" /> Cấp phát vật tư
                                            </h3>
                                            <Link href="/admin/phieu-xuat" className="btn btn-ghost btn-sm" style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 600 }}>Chi tiết</Link>
                                        </div>
                                        <div style={{ marginBottom: 16 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Tỉ lệ hoàn thành giao/nhận ({pxGiao}/{pxTotal} phiếu)</span>
                                                <span style={{ fontWeight: 600 }}>{pxProgress.toFixed(0)}%</span>
                                            </div>
                                            <div className="progress-bar" style={{ height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                                                <div className="progress-bar-fill success" style={{ width: `${pxProgress}%`, height: '100%', background: 'var(--brand)', borderRadius: 4 }} />
                                            </div>
                                        </div>
                                        <div className="dash-counts boxes">
                                            <div className="dash-box">
                                                <span className="dash-box-icon neutral"><Clock size={20} /></span>
                                                <div>
                                                    <div className="dash-box-value">{stats.phieu_xuat.cho_duyet}</div>
                                                    <div className="dash-box-label">Đang đợi cấp phát</div>
                                                </div>
                                            </div>
                                            <div className="dash-box">
                                                <span className="dash-box-icon neutral"><CheckCircle2 size={20} /></span>
                                                <div>
                                                    <div className="dash-box-value">{stats.phieu_xuat.da_xuat}</div>
                                                    <div className="dash-box-label">Đã giao hoàn tất</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="dash-empty">Chưa có dữ liệu</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Side column */}
                <div className="dash-side">
                    {/* Active Semester */}
                    {stats?.ki_hoc ? (
                        <div className="card">
                            <div className="card-header">
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Calendar size={18} className="text-muted" /> Kỳ học hiện tại
                                </h2>
                                <Link href="/admin/ki-hoc" className="btn btn-ghost btn-icon" title="Quản lý kỳ học">
                                    <ArrowRight size={18} />
                                </Link>
                            </div>
                            <div className="card-body">
                                <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                    {stats.ki_hoc.ten_ki} - {stats.ki_hoc.nam_hoc}
                                    <span className={`badge ${stats.ki_hoc.trang_thai === 'hoat_dong' ? 'badge-primary' : 'badge-secondary'}`}>
                                        {statusLabels[stats.ki_hoc.trang_thai]}
                                    </span>
                                </h3>
                                <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap', fontSize: 13.5, flexDirection: 'column' }}>
                                    {stats.ki_hoc.han_de_xuat && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                                            <AlertCircle size={14} className="text-muted" />
                                            Hạn chót đề xuất: <strong style={{ color: 'var(--text-primary)' }}>{new Date(stats.ki_hoc.han_de_xuat).toLocaleDateString('vi-VN')}</strong>
                                        </span>
                                    )}
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                                        <Activity size={14} className="text-muted" />
                                        Trạng thái hệ thống: <span style={{ color: 'var(--text-primary)' }}>Bình thường</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="dash-empty">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 }}>
                                <AlertCircle size={16} className="text-muted" />
                                <span>Chưa có dữ liệu</span>
                            </div>
                            <p style={{ fontSize: 13 }}>Chưa có kỳ học nào đang mở.</p>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="card">
                        <div className="card-header">
                            <h2>Thao tác nhanh</h2>
                        </div>
                        <div className="card-body">
                            <div className="qa-grid">
                                <Link href="/admin/ki-hoc" className="qa-btn qa-btn-primary">
                                    <PlusCircle size={20} /> Tạo kỳ học mới
                                </Link>
                                <Link href="/admin/de-xuat" className="qa-btn">
                                    <CheckCircle2 size={20} /> Duyệt đề xuất
                                </Link>
                                <Link href="/admin/vat-tu" className="qa-btn">
                                    <Boxes size={20} /> Quản lý kho
                                </Link>
                                <Link href="/admin/phieu-xuat" className="qa-btn">
                                    <FileOutput size={20} /> Phiếu ghi nhận
                                </Link>
                                <Link href="/admin/phan-phat" className="qa-btn">
                                    <Scale size={20} /> Giám sát cấp phát
                                </Link>
                                <button
                                    className="qa-btn"
                                    onClick={handleDownloadBackup}
                                    disabled={backuping}
                                >
                                    <DatabaseBackup size={20} />
                                    {backuping ? 'Đang tạo backup…' : 'Tải backup dữ liệu'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
