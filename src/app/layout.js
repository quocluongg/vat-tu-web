import './globals.css';
import Providers from '@/components/Providers';

export const metadata = {
  title: 'Quản Lý Vật Tư - Hệ Thống Quản Lý Vật Tư',
  description: 'Hệ thống quản lý vật tư, đề xuất dự trù, mua sắm và xuất vật tư cho cơ sở đào tạo',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
