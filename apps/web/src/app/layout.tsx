import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'CodePulse — University Coding Intelligence Platform',
    template: '%s | CodePulse',
  },
  description:
    'Aggregate, verify, and rank student programming activity from GitHub, Codeforces, and LeetCode into a unified profile.',
  keywords: ['coding', 'university', 'programming', 'placement', 'student', 'github', 'leetcode', 'codeforces'],
  authors: [{ name: 'CodePulse Team' }],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    siteName: 'CodePulse',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}
