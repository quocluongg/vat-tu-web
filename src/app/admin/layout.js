import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Sidebar from '@/components/Sidebar';
import { ToastProvider } from '@/components/Toast';

export default async function AdminLayout({ children }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    return (
        <ToastProvider>
            <div className="admin-layout">
                <Sidebar />
                <main className="main-content">
                    {children}
                </main>
            </div>
        </ToastProvider>
    );
}
