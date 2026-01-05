import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { BottomNav } from '@/components/layout/BottomNav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PRINTLY - Print Anywhere, Anytime',
  description: 'Scan, Upload, Print - No app needed',
  icons: {
    icon: '/Printly.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        {/* <BottomNav /> */}
        <Toaster />
      </body>
    </html>
  );
}
