'use client';
import Link from 'next/link';
import { Package, Shield, GraduationCap, ArrowRight, BookOpen, Layers } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function HomePage() {
  return (
    <div className="landing-page" style={{ minHeight: '100vh', background: 'var(--bg-primary)', position: 'relative' }}>
      {/* Background Decor */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: '100%', height: '400px', background: 'var(--gradient-primary)', opacity: 0.05, borderBottomLeftRadius: '50% 10%' }}></div>

      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}>
        <ThemeToggle />
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 24px', position: 'relative', zIndex: 1 }}>

        {/* Header / Logo Area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 60 }}>
          <div style={{
            background: 'white', padding: '16px', borderRadius: '16px',
            boxShadow: 'var(--shadow-md)', marginBottom: 24, display: 'inline-block'
          }}>
            <img
              src="http://vsvc.edu.vn/uploads/12-2017/logo.png"
              alt="VSVC Logo"
              style={{ height: 80, objectFit: 'contain' }}
            />
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: 'var(--text-accent)', marginBottom: 16, letterSpacing: '-0.5px' }}>
            HỆ THỐNG QUẢN LÝ VẬT TƯ
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 18, maxWidth: 600, lineHeight: 1.6 }}>
            Phần mềm quản lý trang thiết bị, đề xuất dự trù và theo dõi cấp phát vật tư dành riêng cho nhà trường.
          </p>
        </div>

        {/* Portal Cards Section */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 32, maxWidth: 900, margin: '0 auto'
        }}>

          {/* Admin Card */}
          <Link href="/login" style={{ textDecoration: 'none' }}>
            <div className="portal-card" style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)', padding: 40, transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: 'var(--shadow-md)', height: '100%', display: 'flex', flexDirection: 'column',
              position: 'relative', overflow: 'hidden'
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-8px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: 'var(--gradient-primary)' }}></div>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(0,51,153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <Shield size={32} color="var(--text-accent)" />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>Ban Quản Trị</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 32, flex: 1, lineHeight: 1.5 }}>
                Duyệt đề xuất dự trù, quản lý danh mục vật tư, phòng ban và giám sát xuất nhập tồn kho.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-accent)', fontWeight: 600, fontSize: 15 }}>
                Vào Cổng Quản Trị <ArrowRight size={18} />
              </div>
            </div>
          </Link>

          {/* Teacher Card */}
          <Link href="/giao-vien" style={{ textDecoration: 'none' }}>
            <div className="portal-card" style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xl)', padding: 40, transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: 'var(--shadow-md)', height: '100%', display: 'flex', flexDirection: 'column',
              position: 'relative', overflow: 'hidden'
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-8px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: 'var(--gradient-accent)' }}></div>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(220,38,38, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                <GraduationCap size={32} color="#dc2626" />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>Giáo Viên</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 32, flex: 1, lineHeight: 1.5 }}>
                Lập đề xuất trang thiết bị dạy học, tạo phiếu xuất kho và quản lý vật tư cho từng môn học.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontWeight: 600, fontSize: 15 }}>
                Vào Cổng Giáo Viên <ArrowRight size={18} />
              </div>
            </div>
          </Link>

        </div>

        {/* Footer Area */}
        <div style={{ textAlign: 'center', marginTop: 80, borderTop: '1px solid var(--border-color)', paddingTop: 32 }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Trường Cao đẳng Nghề Việt Nam - Singapore. Mọi quyền được bảo lưu.
          </p>
        </div>

      </div>
    </div>
  );
}
