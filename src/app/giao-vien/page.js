'use client';
import Link from 'next/link';
import { ArrowLeft, FileText, FileOutput, ArrowRight, Package, Users } from 'lucide-react';

export default function GiaoVienPortalPage() {
    return (
        <div className="public-page">

            <div className="public-container" style={{ maxWidth: 600 }}>
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none', marginBottom: 24 }}>
                    <ArrowLeft size={16} /> Về trang chủ
                </Link>

                <div className="public-header" style={{ marginBottom: 32 }}>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Users size={28} className="text-primary" /> Cổng Giáo viên</h1>
                    <p>Chọn chức năng bạn muốn sử dụng</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* De xuat */}
                    <Link href="/de-xuat" style={{ textDecoration: 'none' }}>
                        <div className="portal-card portal-feature">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{
                                    width: 56, height: 56, borderRadius: 14,
                                    background: 'rgba(14, 165, 233, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <FileText size={28} style={{ color: '#38bdf8' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Đề xuất dự trù vật tư</h2>
                                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                        Đề xuất vật tư cần thiết cho các môn học được phân công trong kỳ
                                    </p>
                                </div>
                                <ArrowRight size={22} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            </div>
                        </div>
                    </Link>

                    {/* Phieu xuat */}
                    <Link href="/phieu-xuat" style={{ textDecoration: 'none' }}>
                        <div className="portal-card portal-feature">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{
                                    width: 56, height: 56, borderRadius: 14,
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <FileOutput size={28} style={{ color: '#34d399' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Phiếu xuất vật tư</h2>
                                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                        Tạo phiếu xuất vật tư, theo dõi trạng thái và in phiếu
                                    </p>
                                </div>
                                <ArrowRight size={22} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
