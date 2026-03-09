// =============================================================================
// DEWPORTAL FRONTEND - ROOT LAYOUT
// =============================================================================
// Root layout with providers and global styles.
// =============================================================================

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from '@/providers';

// -----------------------------------------------------------------------------
// Font Configuration
// -----------------------------------------------------------------------------

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Dewlon Portal',
  description: 'Secure Financial Management System',
  keywords: ['finance', 'payments', 'mpesa', 'paystack', 'kenya'],
  authors: [{ name: 'Dewlon Portal' }],
  robots: {
    index: false,
    follow: false,
  },
};

// -----------------------------------------------------------------------------
// Root Layout Component
// -----------------------------------------------------------------------------

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}