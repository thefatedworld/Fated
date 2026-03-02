import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FatedWorld Admin',
  description: 'FatedWorld Admin Panel — Internal Use Only',
  robots: 'noindex, nofollow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
