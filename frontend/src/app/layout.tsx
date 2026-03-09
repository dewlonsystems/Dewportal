// =============================================================================
// DEWPORTAL FRONTEND - ROOT LAYOUT
// =============================================================================
// Root layout with providers, global styles, and mobile optimizations.
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
// Metadata - Enhanced with Mobile Status Bar Support
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
  
  // ✅ Mobile Status Bar & Theme Colors
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1a3d2b' },
    { media: '(prefers-color-scheme: dark)', color: '#122a1e' },
  ],
  
  // ✅ Apple Web App Settings
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Dewlon Portal',
  },
  
  // ✅ Viewport Settings for Mobile
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover', // ✅ Critical for full-screen on notched devices
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
      <head>
        {/* ✅ Mobile Status Bar - Fallback for older browsers */}
        <meta name="theme-color" content="#1a3d2b" />
        
        {/* ✅ iOS Safari Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Dewlon Portal" />
        
        {/* ✅ Android Chrome Support */}
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* ✅ Prevent phone number/email auto-linking */}
        <meta name="format-detection" content="telephone=no, email=no, address=no" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}