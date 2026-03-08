'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
    Package, LayoutDashboard, Calendar, GraduationCap, Users, BookOpen,
    Boxes, FileText, ShoppingCart, FileOutput, LogOut, Settings, Menu, X
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';


const menuItems = [
    {
        section: 'Tổng quan',
        items: [
            { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
        ]
    },
    {
        section: 'Thiết lập',
        items: [
            { href: '/admin/ki-hoc', label: 'Kỳ học', icon: Calendar },
            { href: '/admin/nganh-he', label: 'Chương trình đào tạo', icon: GraduationCap },
            { href: '/admin/giao-vien', label: 'Giáo viên', icon: Users },
            { href: '/admin/vat-tu', label: 'Vật tư', icon: Boxes },
        ]
    },
    {
        section: 'Nghiệp vụ',
        items: [
            { href: '/admin/de-xuat', label: 'Đề xuất dự trù', icon: FileText },
            { href: '/admin/phieu-xuat', label: 'Phiếu xuất', icon: FileOutput },
        ]
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div className="mobile-nav">
                <div className="mobile-nav-logo">
                    <img src="http://vsvc.edu.vn/uploads/12-2017/logo.png" alt="VSVC" style={{ width: 32, height: 32, objectFit: 'contain', background: 'white', borderRadius: 6, padding: 2 }} />
                    <span>Quản Lý Vật Tư</span>
                </div>
                <button className="btn-icon mobile-menu-btn" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(false)}></div>

            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ background: 'white', padding: 8, borderRadius: 8, display: 'inline-block', width: 'fit-content' }}>
                        <img src="http://vsvc.edu.vn/uploads/12-2017/logo.png" alt="VSVC" style={{ height: 40, objectFit: 'contain' }} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: 18, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800 }}>Quản Lý Vật Tư</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>VSVC College System</p>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {menuItems.map((section, i) => (
                        <div className="sidebar-section" key={i}>
                            <div className="sidebar-section-title">{section.section}</div>
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href ||
                                    (item.href !== '/admin' && pathname.startsWith(item.href));
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`sidebar-link ${isActive ? 'active' : ''}`}
                                    >
                                        <Icon size={20} />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <ThemeToggle showLabel={true} />
                    <button
                        className="sidebar-link"
                        onClick={() => signOut({ callbackUrl: '/' })}
                        style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', marginTop: 4 }}
                    >
                        <LogOut size={20} />
                        Đăng xuất
                    </button>
                </div>
            </aside>
        </>
    );
}
