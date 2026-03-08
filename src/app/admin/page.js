'use client';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard, Users, BookOpen, Boxes, FileText, ShoppingCart,
    FileOutput, Calendar, TrendingUp, Clock, PlusCircle, ArrowRight,
    Activity, CheckCircle2, AlertCircle, BarChart3
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/dashboard')
            .then(r => r.json())
            .then(data => { setStats(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

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

    return (
        <div style={{ paddingBottom: 40 }}>
            {/* Header Section */}
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

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 32, overflowX: 'auto', paddingBottom: 8 }} className="custom-scrollbar">
                <Link href="/admin/ki-hoc" className="btn btn-primary btn-sm" style={{ borderRadius: 'var(--radius-full)' }}>
                    <PlusCircle size={16} /> Tạo kỳ học mới
                </Link>
                <Link href="/admin/de-xuat" className="btn btn-secondary btn-sm" style={{ borderRadius: 'var(--radius-full)' }}>
                    <CheckCircle2 size={16} className="text-success" /> Duyệt đề xuất
                </Link>
                <Link href="/admin/vat-tu" className="btn btn-secondary btn-sm" style={{ borderRadius: 'var(--radius-full)' }}>
                    <Boxes size={16} className="text-accent" /> Quản lý kho
                </Link>
                <Link href="/admin/phieu-xuat" className="btn btn-secondary btn-sm" style={{ borderRadius: 'var(--radius-full)' }}>
                    <FileOutput size={16} className="text-warning" /> Phiếu ghi nhận
                </Link>
            </div>

            {/* Active Semester Alert */}
            {stats?.ki_hoc ? (
                <div className="card mb-4" style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.1) 0%, rgba(99,102,241,0.05) 100%)', marginBottom: 24, borderLeft: '4px solid var(--text-accent)' }}>
                    <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div className="stat-icon primary" style={{ width: 56, height: 56, background: 'var(--bg-card)', boxShadow: 'var(--shadow-md)' }}>
                            <Calendar size={28} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, display: 'flex', gap: 12, alignItems: 'center' }}>
                                Kỳ học hiện tại: {stats.ki_hoc.ten_ki} - {stats.ki_hoc.nam_hoc}
                                <span className={`badge ${stats.ki_hoc.trang_thai === 'hoat_dong' ? 'badge-success' : 'badge-primary'}`}>
                                    {statusLabels[stats.ki_hoc.trang_thai]}
                                </span>
                            </h2>
                            <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap', fontSize: 14 }}>
                                {stats.ki_hoc.han_de_xuat && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                                        <AlertCircle size={14} className="text-warning" />
                                        Hạn chót đề xuất: <strong style={{ color: 'var(--text-primary)' }}>{new Date(stats.ki_hoc.han_de_xuat).toLocaleDateString('vi-VN')}</strong>
                                    </span>
                                )}
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                                    <Activity size={14} className="text-success" />
                                    Trạng thái hệ thống: <span style={{ color: 'var(--text-primary)' }}>Bình thường</span>
                                </span>
                            </div>
                        </div>
                        <Link href="/admin/ki-hoc" className="btn btn-ghost btn-icon">
                            <ArrowRight size={20} />
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="card mb-4" style={{ marginBottom: 24, borderLeft: '4px solid var(--text-warning)' }}>
                    <div className="card-body">
                        <p style={{ display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={18} className="text-warning" /> Chưa có kỳ học nào đang mở.</p>
                    </div>
                </div>
            )}

            {/* Core Stats Overview */}
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={18} className="text-muted" /> Dữ liệu cơ sở
            </h3>
            <div className="stats-grid" style={{ marginBottom: 32 }}>
                <div className="stat-card primary">
                    <div className="stat-icon primary"><Users size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats?.giao_vien || 0}</h3>
                        <p>Giáo viên tham gia</p>
                    </div>
                </div>
                <div className="stat-card accent">
                    <div className="stat-icon accent"><BookOpen size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats?.mon_hoc || 0}</h3>
                        <p>Môn học hệ thống</p>
                    </div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon success"><Boxes size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats?.vat_tu || 0}</h3>
                        <p>Danh mục vật tư</p>
                    </div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon warning"><TrendingUp size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats?.nganh || 0}</h3>
                        <p>Ngành đào tạo</p>
                    </div>
                </div>
            </div>

            {/* Operations Progress */}
            {stats?.ki_hoc && stats?.de_xuat && (
                <>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Activity size={18} className="text-muted" /> Tình hình xử lý nghiệp vụ kỳ này
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>

                        {/* De Xuat Widget */}
                        <div className="card">
                            <div className="card-header">
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FileText size={18} className="text-accent" /> Tiến độ nộp & duyệt đề xuất
                                </h2>
                                <Link href="/admin/de-xuat" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>Chi tiết</Link>
                            </div>
                            <div className="card-body">
                                <div style={{ marginBottom: 24 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Tiến độ nộp ({stats.gv_da_de_xuat}/{gvTotal} GV)</span>
                                        <span style={{ fontWeight: 600 }}>{gvProgress.toFixed(0)}%</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                                        <div className="progress-bar-fill primary" style={{ width: `${gvProgress}%`, height: '100%', background: 'var(--gradient-primary)', borderRadius: 4 }} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 8px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                        <span style={{ fontSize: 24, fontWeight: 700 }}>{stats.de_xuat.da_nop}</span>
                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Mới nộp</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 8px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 'var(--radius-md)' }}>
                                        <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-accent)' }}>{stats.de_xuat.dang_lam}</span>
                                        <span style={{ fontSize: 12, color: 'var(--text-accent)' }}>Đang xét</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 8px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-md)' }}>
                                        <span style={{ fontSize: 24, fontWeight: 700, color: '#34d399' }}>{stats.de_xuat.duyet}</span>
                                        <span style={{ fontSize: 12, color: '#34d399' }}>Đã duyệt</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 8px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)' }}>
                                        <span style={{ fontSize: 24, fontWeight: 700, color: '#f87171' }}>{stats.de_xuat.tu_choi}</span>
                                        <span style={{ fontSize: 12, color: '#f87171' }}>Từ chối</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Phieu Xuat Widget */}
                        <div className="card">
                            <div className="card-header">
                                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <FileOutput size={18} className="text-warning" /> Quy trình cấp phát vật tư
                                </h2>
                                <Link href="/admin/phieu-xuat" className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>Chi tiết</Link>
                            </div>
                            <div className="card-body">
                                <div style={{ marginBottom: 24 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Tỉ lệ hoàn thành giao/nhận ({pxGiao}/{pxTotal} phiếu)</span>
                                        <span style={{ fontWeight: 600 }}>{pxProgress.toFixed(0)}%</span>
                                    </div>
                                    <div className="progress-bar" style={{ height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                                        <div className="progress-bar-fill success" style={{ width: `${pxProgress}%`, height: '100%', background: 'var(--gradient-success)', borderRadius: 4 }} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div style={{ padding: 16, background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.phieu_xuat.cho_duyet}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Đang đợi cấp phát</div>
                                        </div>
                                    </div>
                                    <div style={{ padding: 16, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399' }}>
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.phieu_xuat.da_xuat}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Đã giao hoàn tất</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}
