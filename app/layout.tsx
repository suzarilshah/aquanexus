import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AquaNexus - Intelligent Aquaponics Monitoring',
  description: 'Real-time IoT monitoring platform for aquaponics systems with AI-powered insights',
  keywords: ['aquaponics', 'IoT', 'monitoring', 'ESP32', 'AI', 'sensors'],
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
        <Toaster />
      </body>
    </html>
  );
}
