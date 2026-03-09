import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React strict mode for development
  reactStrictMode: true,
  
  // Security headers - applied to all responses
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https:; font-src 'self'; connect-src 'self' ws: wss:;",
          },
        ],
      },
    ];
  },
  
  // TypeScript configuration
  typescript: {
    // Ignore TypeScript errors during development builds
    ignoreBuildErrors: process.env.NODE_ENV === 'development' ? true : false,
  },
  
  // Output configuration for production deployment
  output: 'standalone',
  
  // Image optimization - restricted to local images only
  images: {
    // No remotePatterns - this system does not serve external images
    // Add specific hostnames here only when needed in the future
    domains: [],
  },
  
  // Powered by header removal for security
  poweredByHeader: false,
  
  // Compress responses
  compress: true,
};

export default nextConfig;