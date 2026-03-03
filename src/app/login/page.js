'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Package, Lock, User, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
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
            <div style={{ position: 'absolute', top: 24, right: 24 }}>
                <ThemeToggle />
            </div>
            <div className="login-container">
                <div className="login-card">
                    <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none', marginBottom: 20 }}>
                        <ArrowLeft size={16} /> Về trang chủ
                    </Link>

                    <div className="login-logo">
                        <div className="login-logo-icon">
                            <Package size={32} color="white" />
                        </div>
                        <h1>Quản Lý Vật Tư</h1>
                        <p>Đăng nhập quản trị viên</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div className="alert alert-error mb-4">
                                <Lock size={16} />
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Tên đăng nhập</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    className="form-input"
                                    style={{ paddingLeft: 42 }}
                                    placeholder="Nhập tên đăng nhập"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mật khẩu</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="password"
                                    className="form-input"
                                    style={{ paddingLeft: 42 }}
                                    placeholder="Nhập mật khẩu"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
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

                    <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginTop: 24 }}>
                        Mặc định: admin / admin123
                    </p>
                </div>
            </div>
        </div>
    );
}
