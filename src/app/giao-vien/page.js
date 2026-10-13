import Link from 'next/link';
import { ArrowLeft, ArrowRight, FileText, FileOutput, CheckCircle2 } from 'lucide-react';

const entries = [
    {
        href: '/de-xuat',
        icon: <FileText size={26} />,
        tone: 'blue',
        title: 'Dự trù vật tư',
        desc: 'Đăng ký vật tư cần thiết cho các môn học được phân công trong kỳ.',
        points: ['Chọn giáo viên và kỳ học', 'Chọn vật tư theo từng môn', 'Gửi duyệt và in đề xuất'],
        cta: 'Lập đề xuất ngay',
    },
    {
        href: '/phieu-xuat',
        icon: <FileOutput size={26} />,
        tone: 'slate',
        title: 'Phiếu xuất vật tư',
        desc: 'Tạo phiếu nhận vật tư dựa trên đề xuất đã được phê duyệt.',
        points: ['Tạo phiếu xuất theo môn học', 'Theo dõi trạng thái ký duyệt', 'In phiếu để nhận vật tư'],
        cta: 'Tạo phiếu xuất',
    },
];

const flowSteps = [
    {
        num: '01',
        title: 'Lập đề xuất',
        desc: 'Giáo viên đăng ký vật tư cho môn mình dạy.',
    },
    {
        num: '02',
        title: 'Chờ quản trị duyệt',
        desc: 'Ban quản trị xét duyệt và chốt danh sách mua sắm.',
    },
    {
        num: '03',
        title: 'Tạo phiếu & nhận',
        desc: 'Tạo phiếu xuất, ký nhận và nhận vật tư về lớp.',
    },
];

export default function GiaoVienPortalPage() {
    return (
        <div className="public-page">
            <div className="public-container" style={{ maxWidth: 880 }}>
                <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none', marginBottom: 24 }}>
                    <ArrowLeft size={16} /> Về trang chủ
                </Link>

                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 8 }}>Cổng giáo viên</h1>
                    <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
                        Đề xuất vật tư giảng dạy và nhận vật tư theo đúng quy trình 3 bước dưới đây.
                    </p>
                </div>

                <div className="portal-grid">
                    {entries.map(entry => (
                        <Link key={entry.href} href={entry.href} className="portal-entry">
                            <span className={`portal-entry-icon ${entry.tone}`}>{entry.icon}</span>
                            <h2>{entry.title}</h2>
                            <p>{entry.desc}</p>
                            <div className="portal-points">
                                {entry.points.map(point => (
                                    <span key={point}><CheckCircle2 size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} /> {point}</span>
                                ))}
                            </div>
                            <span className="portal-go">{entry.cta} <ArrowRight size={17} /></span>
                        </Link>
                    ))}
                </div>

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
            </div>
        </div>
    );
}
