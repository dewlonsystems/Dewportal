import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    // ── Allowed origins per environment ──────────────────────────────────────
    const apiOrigin = isDev ? 'http://localhost:8000' : 'https://auth.dewlons.com';
    const wsOrigin  = isDev ? 'ws://localhost:8000'   : 'wss://auth.dewlons.com';

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-Frame-Options',          value: 'DENY' },
          { key: 'X-XSS-Protection',         value: '1; mode=block' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          {
            key: 'Content-Security-Policy',
            // ✅ Explicit domains — no wildcard ws:/wss:
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              `connect-src 'self' ${apiOrigin} ${wsOrigin}`,  // ✅ explicit
            ].join('; '),
          },
        ],
      },
    ];
  },

  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },

  output: 'standalone',
  images: { domains: [] },
  poweredByHeader: false,
  compress: true,
};

export default nextConfig;