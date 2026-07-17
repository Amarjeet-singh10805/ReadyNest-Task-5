import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/common/Providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: { default: 'SaaS Platform', template: '%s | SaaS Platform' },
  description: 'Multi-tenant SaaS platform for team collaboration and project management',
  keywords: ['SaaS', 'project management', 'team collaboration', 'tasks'],
  authors: [{ name: 'SaaS Platform Team' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'SaaS Platform',
    description: 'Multi-tenant SaaS platform for teams',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.variable + ' font-sans'}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
