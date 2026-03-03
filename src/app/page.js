'use client';
import Link from 'next/link';
import { Package, Shield, GraduationCap, ArrowRight, FileText, FileOutput } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function HomePage() {
  return (
    <div className="login-page">
      <div style={{ position: 'absolute', top: 24, right: 24 }}>
        <ThemeToggle />
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', padding: 24,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'var(--gradient-primary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20, boxShadow: '0 8px 32px rgba(14, 165, 233, 0.3)',
          }}>
            <Package size={36} color="white" />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
            Quản Lý Vật Tư
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16 }}>
            Hệ thống quản lý vật tư, đề xuất dự trù và xuất kho
          </p>
        </div>

        {/* Cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 24, maxWidth: 700, width: '100%',
        }}>
          {/* Admin Card */}
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <div className="portal-card portal-admin">
              <div className="portal-icon admin">
                <Shield size={32} />
              </div>
              <h2>Quản trị viên</h2>
              <p>Quản lý vật tư, duyệt đề xuất, mua sắm và xuất kho</p>
              <div className="portal-features">
                <span>📊 Dashboard</span>
                <span>📋 Duyệt đề xuất</span>
                <span>🛒 Mua sắm</span>
                <span>📤 Xuất kho</span>
              </div>
              <div className="portal-action">
                Đăng nhập Admin <ArrowRight size={18} />
              </div>
            </div>
          </Link>

          {/* Teacher Card */}
          <Link href="/giao-vien" style={{ textDecoration: 'none' }}>
            <div className="portal-card portal-teacher">
              <div className="portal-icon teacher">
                <GraduationCap size={32} />
              </div>
              <h2>Giáo viên</h2>
              <p>Đề xuất dự trù vật tư và tạo phiếu xuất theo môn học</p>
              <div className="portal-features">
                <span>📝 Đề xuất vật tư</span>
                <span>📄 Phiếu xuất</span>
                <span>🖨️ In phiếu</span>
                <span>📎 Theo dõi</span>
              </div>
              <div className="portal-action">
                Vào trang Giáo viên <ArrowRight size={18} />
              </div>
            </div>
          </Link>
        </div>

        <p style={{ marginTop: 40, fontSize: 13, color: 'var(--text-muted)' }}>
          © 2026 Hệ thống Quản Lý Vật Tư
        </p>
      </div>
    </div>
  );
}
