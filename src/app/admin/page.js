'use client';
import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, BookOpen, Boxes, FileText, ShoppingCart, FileOutput, Calendar, TrendingUp, Clock } from 'lucide-react';

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

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h1>📊 Dashboard</h1>
                    <p>Tổng quan hệ thống quản lý vật tư</p>
                </div>
            </div>

            {stats?.ki_hoc && (
                <div className="card mb-4" style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(6,182,212,0.05))', marginBottom: 24 }}>
                    <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div className="stat-icon primary" style={{ width: 56, height: 56 }}>
                            <Calendar size={28} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{stats.ki_hoc.ten_ki} - {stats.ki_hoc.nam_hoc}</h2>
                            <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                                <span className="badge badge-primary">{statusLabels[stats.ki_hoc.trang_thai]}</span>
                                {stats.ki_hoc.han_de_xuat && (
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Clock size={14} /> Hạn đề xuất: {new Date(stats.ki_hoc.han_de_xuat).toLocaleDateString('vi-VN')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="stats-grid">
                <div className="stat-card primary">
                    <div className="stat-icon primary">
                        <Users size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats?.giao_vien || 0}</h3>
                        <p>Giáo viên</p>
                    </div>
                </div>
                <div className="stat-card accent">
                    <div className="stat-icon accent">
                        <BookOpen size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats?.mon_hoc || 0}</h3>
                        <p>Môn học</p>
                    </div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon success">
                        <Boxes size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats?.vat_tu || 0}</h3>
                        <p>Vật tư</p>
                    </div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon warning">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-info">
                        <h3>{stats?.nganh || 0}</h3>
                        <p>Ngành đào tạo</p>
                    </div>
                </div>
            </div>

            {stats?.de_xuat && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
                    <div className="card">
                        <div className="card-header">
                            <h2><FileText size={18} style={{ marginRight: 8 }} /> Đề xuất dự trù</h2>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="number-highlight">{stats.de_xuat.da_nop}</div>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Đã nộp</p>
                                </div>
                                <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="number-highlight" style={{ background: 'var(--gradient-success)', WebkitBackgroundClip: 'text' }}>{stats.de_xuat.duyet}</div>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Đã duyệt</p>
                                </div>
                                <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="number-highlight" style={{ background: 'var(--gradient-warning)', WebkitBackgroundClip: 'text' }}>{stats.de_xuat.dang_lam}</div>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Đang làm</p>
                                </div>
                                <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="number-highlight" style={{ background: 'var(--gradient-danger)', WebkitBackgroundClip: 'text' }}>{stats.de_xuat.tu_choi}</div>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Từ chối</p>
                                </div>
                            </div>

                            <div style={{ marginTop: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Tiến độ đề xuất</span>
                                    <span style={{ color: 'var(--text-accent)' }}>
                                        {stats.gv_da_de_xuat}/{stats.gv_da_de_xuat + stats.gv_chua_de_xuat} giáo viên
                                    </span>
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-bar-fill primary"
                                        style={{ width: `${(stats.gv_da_de_xuat + stats.gv_chua_de_xuat) > 0 ? (stats.gv_da_de_xuat / (stats.gv_da_de_xuat + stats.gv_chua_de_xuat)) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h2><FileOutput size={18} style={{ marginRight: 8 }} /> Phiếu xuất vật tư</h2>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="number-highlight">{stats.phieu_xuat.total}</div>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Tổng phiếu</p>
                                </div>
                                <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="number-highlight" style={{ background: 'var(--gradient-warning)', WebkitBackgroundClip: 'text' }}>{stats.phieu_xuat.cho_duyet}</div>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Chờ duyệt</p>
                                </div>
                                <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
                                    <div className="number-highlight" style={{ background: 'var(--gradient-success)', WebkitBackgroundClip: 'text' }}>{stats.phieu_xuat.da_xuat}</div>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Đã xuất</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
