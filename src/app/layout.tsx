import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'The Cost of One Spin',
  description:
    'Reduce poker machine gambling through accountability, budgets, streaks and goals. Make every dollar visible. Celebrate every dollar not gambled.',
  applicationName: 'The Cost of One Spin',
  appleWebApp: { capable: true, title: 'Cost of One Spin', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#0a0f1a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
