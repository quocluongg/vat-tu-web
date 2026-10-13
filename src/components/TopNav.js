'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { ChevronDown, LogOut, Menu, X } from 'lucide-react';

const menuGroups = [
    {
        id: 'tong-quan',
        label: 'Tổng quan',
        items: [
            { href: '/admin', label: 'Trang chủ', desc: 'Theo dõi tình hình hoạt động của hệ thống' },
        ],
    },
    {
        id: 'du-tru',
        label: 'Dự trù',
        items: [
            { href: '/admin/de-xuat', label: 'Dự trù đầu kỳ', desc: 'Lập kế hoạch vật tư cho cả kỳ' },
            // TẠM ẨN: { href: '/admin/phieu-xuat', label: 'Đề xuất bổ sung', desc: 'Xin thêm đột xuất giữa kỳ' },
        ],
    },
    {
        id: 'phieu-xuat',
        label: 'Phiếu xuất',
        items: [
            { href: '/admin/phieu-xuat?loai=tieu_hao', label: 'Phiếu xuất vật tư tiêu hao', desc: 'Duyệt và xuất vật tư tiêu hao' },
            { href: '/admin/bien-ban', label: 'Biên bản sửa chữa', desc: 'Duyệt vật tư sửa chữa (thay phiếu xuất)' },
        ],
    },
    {
        id: 'vat-tu',
        label: 'Vật tư',
        items: [
            { href: '/admin/vat-tu', label: 'Kho vật tư', desc: 'Danh mục và tồn kho vật tư' },
            { href: '/admin/phan-phat', label: 'Vật tư tiêu hao', desc: 'Theo dõi cấp phát vật tư' },
        ],
    },
    {
        id: 'cai-dat',
        label: 'Cài đặt',
        items: [
            { href: '/admin/ki-hoc', label: 'Kỳ học', desc: 'Thiết lập kỳ học và đợt' },
            { href: '/admin/nganh-he', label: 'Chương trình đào tạo', desc: 'Ngành, hệ và môn học' },
            { href: '/admin/nganh-he?tab=lop', label: 'Bộ vật tư theo lớp', desc: 'Gán ngành (bộ vật tư) cho từng lớp' },
            { href: '/admin/giao-vien', label: 'Giáo viên', desc: 'Danh sách giáo viên' },
        ],
    },
];

const parseHref = (href) => {
    const qIndex = href.indexOf('?');
    if (qIndex === -1) return { path: href, loai: null, tab: null };
    const params = new URLSearchParams(href.slice(qIndex + 1));
    return { path: href.slice(0, qIndex), loai: params.get('loai'), tab: params.get('tab') };
};

// Active khi trùng path; với mục có ?loai=/?tab= thì phải trùng cả tham số trên URL hiện tại
const isActiveLink = (pathname, currentLoai, currentTab, href) => {
    const { path, loai, tab } = parseHref(href);
    const pathMatch = pathname === path || (path !== '/admin' && pathname.startsWith(path));
    if (!pathMatch) return false;
    if (loai) return currentLoai === loai;
    if (tab) return currentTab === tab;
    return currentLoai == null && currentTab == null;
};

export default function TopNav() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentLoai = searchParams.get('loai');
    const currentTab = searchParams.get('tab');
    const { data: session } = useSession();
    const [openGroup, setOpenGroup] = useState(null);
    const [openUser, setOpenUser] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const navRef = useRef(null);
    const userRef = useRef(null);

    useEffect(() => {
        const onClickOutside = (e) => {
            if (navRef.current && !navRef.current.contains(e.target)) setOpenGroup(null);
            if (userRef.current && !userRef.current.contains(e.target)) setOpenUser(false);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') {
                setOpenGroup(null);
                setOpenUser(false);
                setMobileOpen(false);
            }
        };
        document.addEventListener('mousedown', onClickOutside);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClickOutside);
            document.removeEventListener('keydown', onKey);
        };
    }, []);

    const user = session?.user;
    const initials = (user?.name || user?.username || '?')
        .trim()
        .split(/\s+/)
        .slice(-2)
        .map(w => w.charAt(0))
        .join('')
        .toUpperCase();

    return (
        <>
            <header className="topbar">
                <div className="topbar-inner">
                <Link
                    href="/admin"
                    className="topbar-brand"
                    onClick={() => { setOpenGroup(null); setOpenUser(false); setMobileOpen(false); }}
                >
                    <span className="topbar-logo">
                        <img src="https://vsvc.edu.vn/uploads/12-2017/logo.png" alt="VSVC" />
                    </span>
                    <span className="topbar-text">
                        <span className="topbar-title">Quản Lý Vật Tư</span>
                        <span className="topbar-subtitle">VSVC College System</span>
                    </span>
                </Link>

                <div className="topbar-right" ref={userRef}>
                    <div className="user-menu">
                        <button
                            type="button"
                            className="user-toggle"
                            onClick={() => { setOpenUser(v => !v); setOpenGroup(null); }}
                            aria-expanded={openUser}
                        >
                            <span className="user-avatar">{initials}</span>
                            <span className="user-meta">
                                <span className="user-name">{user?.name || user?.username || 'Người dùng'}</span>
                                <span className="user-role">{user?.username || 'Tài khoản'}</span>
                            </span>
                            <ChevronDown size={16} className={`user-caret ${openUser ? 'open' : ''}`} />
                        </button>

                        {openUser && (
                            <div className="user-dropdown">
                                <div className="user-dropdown-header">
                                    <div className="user-dropdown-name">{user?.name || user?.username || 'Người dùng'}</div>
                                    <div className="user-dropdown-sub">{user?.username || ''}</div>
                                </div>
                                <button
                                    type="button"
                                    className="user-dropdown-item"
                                    onClick={() => signOut({ callbackUrl: '/' })}
                                >
                                    <LogOut size={16} />
                                    Đăng xuất
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                </div>
            </header>

            <nav className="topnav" ref={navRef}>
                <div className="topnav-inner">
                <button
                    type="button"
                    className="topnav-burger"
                    onClick={() => { setMobileOpen(v => !v); setOpenGroup(null); }}
                    aria-expanded={mobileOpen}
                >
                    {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                    <span>{mobileOpen ? 'Đóng menu' : 'Menu'}</span>
                </button>

                <div className="topnav-list">
                    {menuGroups.map(group => {
                        const groupActive = group.items.some(item => isActiveLink(pathname, currentLoai, currentTab, item.href));
                        const isOpen = openGroup === group.id;
                        return (
                            <div
                                key={group.id}
                                className={`nav-group ${groupActive ? 'active' : ''} ${isOpen ? 'open' : ''}`}
                                onMouseEnter={() => setOpenGroup(group.id)}
                                onMouseLeave={() => setOpenGroup(null)}
                            >
                                <button
                                    type="button"
                                    className="nav-trigger"
                                    onClick={() => setOpenGroup(isOpen ? null : group.id)}
                                    aria-haspopup="true"
                                    aria-expanded={isOpen}
                                >
                                    {group.label}
                                    <ChevronDown size={15} className={`nav-caret ${isOpen ? 'open' : ''}`} />
                                </button>

                                {isOpen && (
                                    <div className="nav-dropdown">
                                        {group.items.map(item => (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={() => setOpenGroup(null)}
                                                className={`nav-subitem ${isActiveLink(pathname, currentLoai, currentTab, item.href) ? 'active' : ''}`}
                                            >
                                                <span className="nav-subitem-label">{item.label}</span>
                                                {item.desc && <span className="nav-subitem-desc">{item.desc}</span>}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                </div>

                {mobileOpen && (
                    <div className="topnav-mobile">
                        <div className="topnav-mobile-inner">
                        {menuGroups.map(group => (
                            <div className="mobile-group" key={group.id}>
                                <div className="mobile-group-title">{group.label}</div>
                                {group.items.map(item => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setMobileOpen(false)}
                                        className={`mobile-item ${isActiveLink(pathname, currentLoai, currentTab, item.href) ? 'active' : ''}`}
                                    >
                                        <span className="mobile-item-label">{item.label}</span>
                                        {item.desc && <span className="mobile-item-desc">{item.desc}</span>}
                                    </Link>
                                ))}
                            </div>
                        ))}
                        </div>
                    </div>
                )}
            </nav>
        </>
    );
}
