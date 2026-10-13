import Link from 'next/link';
import { Shield, GraduationCap, ArrowRight } from 'lucide-react';

const flowSteps = [
    {
        num: '01',
        title: 'Giáo viên lập đề xuất',
        desc: 'Chọn vật tư theo môn học, lớp phụ trách ngay trên trình duyệt.',
    },
    {
        num: '02',
        title: 'Quản trị xét duyệt',
        desc: 'Duyệt đề xuất, gộp vật tư trùng và chốt danh sách mua sắm.',
    },
    {
        num: '03',
        title: 'Cấp phát & ký nhận',
        desc: 'Xuất kho theo phiếu, theo dõi tồn và in biên bản đầy đủ.',
    },
];

export default function HomePage() {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
            {/* Top bar */}
            <div className="landing-topbar">
                <div className="landing-inner">
                    <div className="landing-topbar-row">
                        <Link href="/" className="landing-brand">
                            <img src="https://vsvc.edu.vn/uploads/12-2017/logo.png" alt="VSVC" />
                            <span>Quản Lý Vật Tư</span>
                        </Link>
                        <Link href="/login" className="btn btn-primary btn-sm">
                            Đăng nhập <ArrowRight size={15} />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="landing-inner">
                {/* Hero */}
                <div className="landing-hero">
                    <span className="landing-badge">VSVC • Hệ thống nội bộ</span>
                    <h1 className="landing-title">
                        Quản lý vật tư <span className="accent">đào tạo</span>
                    </h1>
                    <p className="landing-sub">
                        Đề xuất dự trù, phê duyệt và cấp phát vật tư giảng dạy —
                        tập trung trong một nền tảng duy nhất cho nhà trường.
                    </p>
                </div>

                {/* Portal entries */}
                <div className="portal-grid">
                    <Link href="/login" className="portal-entry">
                        <span className="portal-entry-icon blue"><Shield size={26} /></span>
                        <h2>Ban Quản Trị</h2>
                        <p>
                            Phê duyệt đề xuất dự trù, quản lý kho vật tư, kỳ học
                            và giám sát xuất nhập tồn.
                        </p>
                        <span className="portal-go">Vào cổng quản trị <ArrowRight size={17} /></span>
                    </Link>

                    <Link href="/giao-vien" className="portal-entry">
                        <span className="portal-entry-icon slate"><GraduationCap size={26} /></span>
                        <h2>Giáo Viên</h2>
                        <p>
                            Lập đề xuất vật tư theo môn học, tạo phiếu xuất kho
                            và theo dõi tình trạng đề xuất.
                        </p>
                        <span className="portal-go">Vào cổng giáo viên <ArrowRight size={17} /></span>
                    </Link>
                </div>

                {/* Flow */}
                <div className="flow-grid">
                    {flowSteps.map(step => (
                        <div className="flow-step" key={step.num}>
                            <span className="flow-num">{step.num}</span>
                            <div>
                                <h3>{step.title}</h3>
                                <p>{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="landing-footer">
                    © {new Date().getFullYear()} Trường Cao đẳng Nghề Việt Nam - Singapore. Mọi quyền được bảo lưu.
                </div>
            </div>
        </div>
    );
}
