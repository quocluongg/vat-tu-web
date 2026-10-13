'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Lock, User, ArrowRight, ArrowLeft, Eye, EyeOff, ShieldCheck, Boxes, FileCheck } from 'lucide-react';
import Link from 'next/link';

const sidePoints = [
    {
        icon: <ShieldCheck size={18} />,
        title: 'Phê duyệt tập trung',
        desc: 'Xét duyệt đề xuất dự trù của giáo viên theo từng kỳ học.',
    },
    {
        icon: <Boxes size={18} />,
        title: 'Kho vật tư rõ ràng',
        desc: 'Theo dõi tồn kho, nhập xuất và định mức cấp phát.',
    },
    {
        icon: <FileCheck size={18} />,
        title: 'Biên bản đầy đủ',
        desc: 'Hư hỏng, sửa chữa và quyết toán đều có chứng từ.',
    },
];

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await signIn('credentials', {
            redirect: false,
            username,
            password,
        });

        if (result?.ok) {
            router.push('/admin');
        } else {
            setError('Tên đăng nhập hoặc mật khẩu không đúng');
        }
        setLoading(false);
    };

    return (
        <div className="login-page">
            <div className="login-split">
                {/* Brand panel */}
                <div className="login-side">
                    <div className="login-side-logo">
                        <img src="https://vsvc.edu.vn/uploads/12-2017/logo.png" alt="VSVC" />
                        <span>Quản Lý Vật Tư</span>
                    </div>
                    <h2>Cổng quản trị hệ thống vật tư đào tạo</h2>
                    <p>Dành cho ban quản trị nhà trường: phê duyệt, điều phối và giám sát toàn bộ vòng đời vật tư.</p>
                    <div className="login-points">
                        {sidePoints.map(point => (
                            <div className="login-point" key={point.title}>
                                <span className="login-point-icon">{point.icon}</span>
                                <div>
                                    <h3>{point.title}</h3>
                                    <p>{point.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="login-side-foot">Trường Cao đẳng Nghề Việt Nam - Singapore</div>
                </div>

                {/* Form */}
                <div className="login-form-wrap">
                    <Link href="/" className="login-back">
                        <ArrowLeft size={16} /> Về trang chủ
                    </Link>

                    <h1>Đăng nhập quản trị</h1>
                    <p className="login-sub">Nhập tài khoản được cấp để tiếp tục công việc.</p>

                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="alert alert-error mb-4">
                                <Lock size={16} />
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label" htmlFor="login-username">Tên đăng nhập</label>
                            <div className="login-input-wrap">
                                <User size={18} />
                                <input
                                    id="login-username"
                                    type="text"
                                    className="form-input"
                                    placeholder="Nhập tên đăng nhập"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="login-password">Mật khẩu</label>
                            <div className="login-input-wrap">
                                <Lock size={18} />
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="Nhập mật khẩu"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="login-eye"
                                    onClick={() => setShowPassword(v => !v)}
                                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: 8 }}>
                            {loading ? (
                                <div className="spinner" />
                            ) : (
                                <>
                                    Đăng nhập
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
