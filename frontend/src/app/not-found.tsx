// =============================================================================
// DEWPORTAL FRONTEND - 404 NOT FOUND PAGE
// =============================================================================

import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(0.95); opacity: 0.6; }
          70%  { transform: scale(1.15); opacity: 0;   }
          100% { transform: scale(1.15); opacity: 0;   }
        }
        @keyframes drift {
          0%   { transform: translate(0, 0) rotate(0deg); }
          33%  { transform: translate(6px, -8px) rotate(2deg); }
          66%  { transform: translate(-4px, 4px) rotate(-1deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @keyframes scanline {
          0%   { top: -4px; }
          100% { top: 100%; }
        }
        @keyframes flicker {
          0%, 95%, 100% { opacity: 1; }
          96%            { opacity: 0.7; }
          97%            { opacity: 1; }
          98%            { opacity: 0.5; }
          99%            { opacity: 1; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .float     { animation: float 4s ease-in-out infinite; }
        .drift     { animation: drift 8s ease-in-out infinite; }
        .flicker   { animation: flicker 6s ease-in-out infinite; }
        .fade-up-1 { animation: fade-up 0.6s ease forwards 0.1s; opacity: 0; }
        .fade-up-2 { animation: fade-up 0.6s ease forwards 0.25s; opacity: 0; }
        .fade-up-3 { animation: fade-up 0.6s ease forwards 0.4s; opacity: 0; }
        .fade-up-4 { animation: fade-up 0.6s ease forwards 0.55s; opacity: 0; }

        .pulse-ring::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          border: 2px solid #16a34a;
          animation: pulse-ring 2.5s ease-out infinite;
        }

        .dot-grid {
          background-image: radial-gradient(circle, rgba(22,163,74,0.15) 1px, transparent 1px);
          background-size: 28px 28px;
        }

        .scanline::after {
          content: '';
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(22,163,74,0.4), transparent);
          animation: scanline 3s linear infinite;
          pointer-events: none;
        }
      `}</style>

      <div
        className="min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden"
        style={{ background: '#060e06', fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Dot grid background */}
        <div className="absolute inset-0 dot-grid opacity-60" />

        {/* Green radial glow — bottom left */}
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(22,163,74,0.12) 0%, transparent 70%)' }}
        />
        {/* Orange radial glow — top right */}
        <div
          className="absolute -top-40 -right-40 w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)' }}
        />

        {/* Floating decorative orbs */}
        <div
          className="absolute top-24 left-16 w-3 h-3 rounded-full drift opacity-40"
          style={{ background: '#f97316', animationDelay: '0s' }}
        />
        <div
          className="absolute top-40 right-24 w-2 h-2 rounded-full drift opacity-30"
          style={{ background: '#16a34a', animationDelay: '2s' }}
        />
        <div
          className="absolute bottom-32 left-32 w-2 h-2 rounded-full drift opacity-25"
          style={{ background: '#f97316', animationDelay: '4s' }}
        />
        <div
          className="absolute bottom-24 right-16 w-4 h-4 rounded-full drift opacity-20"
          style={{ background: '#16a34a', animationDelay: '1s' }}
        />

        {/* Main content */}
        <div className="relative z-10 text-center max-w-lg w-full">

          {/* 404 Giant Number */}
          <div className="fade-up-1 relative inline-block mb-8">
            {/* Glow behind number */}
            <div
              className="absolute inset-0 blur-3xl opacity-20 scale-150"
              style={{ background: 'radial-gradient(circle, #16a34a, transparent)' }}
            />
            <div
              className="relative flicker scanline overflow-hidden"
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 'clamp(100px, 22vw, 180px)',
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: '-0.05em',
                background: 'linear-gradient(135deg, #ffffff 30%, #4ade80 60%, #f97316 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                userSelect: 'none',
              }}
            >
              404
            </div>
          </div>

          {/* Floating logo / icon */}
          <div className="fade-up-2 flex justify-center mb-8">
            <div className="relative float pulse-ring">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #0f2e10, #1a4a1a)',
                  border: '1px solid rgba(22,163,74,0.3)',
                  boxShadow: '0 0 30px rgba(22,163,74,0.2)',
                }}
              >
                <svg className="w-8 h-8" fill="none" stroke="#4ade80" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="fade-up-3 mb-10 space-y-3">
            <h1
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 'clamp(22px, 5vw, 30px)',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              Page not found
            </h1>
            <p
              style={{
                fontSize: '15px',
                fontWeight: 300,
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.7,
                maxWidth: '340px',
                margin: '0 auto',
              }}
            >
              The page you're looking for doesn't exist or has been moved. Let's get you back on track.
            </p>
          </div>

          {/* Actions */}
          <div className="fade-up-4 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #16a34a, #15803d)',
                boxShadow: '0 0 0 1px rgba(22,163,74,0.4), 0 8px 24px rgba(22,163,74,0.25)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <svg className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go to Dashboard
            </Link>

            <Link
              href="/"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Login
            </Link>
          </div>

          {/* Bottom brand */}
          <div className="mt-16 fade-up-4">
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.18)', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.05em' }}>
              DEWLON PORTAL &mdash; Error 404
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
