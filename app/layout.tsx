import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'App Complaint Intelligence',
  description: 'Daily analysis of iOS App Store complaints across top 100 apps',
};

const NAV_LINKS = [
  { href: '/',           label: 'Dashboard' },
  { href: '/trends',     label: 'Trends' },
  { href: '/categories', label: 'By Category' },
  { href: '/apps',       label: 'Apps' },
  { href: '/pm-jobs',    label: 'PM Jobs' },
  { href: '/runs',       label: 'Agent Runs' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.className} bg-gray-950 text-gray-100 min-h-screen`}>
        <header className="border-b border-gray-800 bg-gray-900">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">📱</span>
              <span className="font-semibold text-white">App Complaint Intelligence</span>
              <span className="text-xs text-gray-500 hidden sm:block">
                Top 100 iOS · Daily
              </span>
            </div>
            <nav className="flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 rounded-md text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
