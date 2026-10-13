import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { authOptions } from '@/lib/auth';
import TopNav from '@/components/TopNav';
import { ToastProvider } from '@/components/Toast';

export default async function AdminLayout({ children }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    return (
        <ToastProvider>
            <div className="admin-layout">
                <Suspense>
                    <TopNav />
                </Suspense>
                <main className="main-content">
                    {children}
                </main>
            </div>
        </ToastProvider>
    );
}
