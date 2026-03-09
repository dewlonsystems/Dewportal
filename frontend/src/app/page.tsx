// =============================================================================
// DEWPORTAL FRONTEND - HOME PAGE
// =============================================================================
// Landing page with video background, animated text, and login CTA.
// Professional management-themed design.
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleProceed = () => {
    router.push('/login');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-900">
      {/* Logo - Top Left (Not Centered) */}
      <div className="absolute top-6 left-6 z-20">
        <a href="https://dewlons.com" className="flex items-center gap-3">
          <img
            src="https://dewlons.com/logo"
            alt="Dewlon Portal"
            className="h-10 w-auto object-contain"
          />
          <span className="text-white font-semibold text-lg hidden sm:block">
            Dewlon Portal
          </span>
        </a>
      </div>

      {/* Background Video */}
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
          onLoadedData={() => setIsLoaded(true)}
        >
          <source src="/videos/management-bg.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Subtle Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
        {/* Animated Text Container */}
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Main Heading - Smooth Slide-Up Animation */}
          <h1
            className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight transition-all duration-1000 ease-out ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{
              textShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            }}
          >
            Secure Financial Management
            <br />
            <span className="text-blue-400">Built for Excellence</span>
          </h1>

          {/* Subheading - Fade-In with Delay */}
          <p
            className={`text-lg sm:text-xl md:text-2xl text-slate-200 max-w-2xl mx-auto leading-relaxed transition-all duration-1000 ease-out delay-300 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Streamline payments, track transactions, and manage your financial
            operations with enterprise-grade security and real-time insights.
          </p>

          {/* Feature Highlights - Staggered Fade-In */}
          <div className="flex flex-wrap justify-center gap-6 pt-4">
            {[
              'Real-Time Analytics',
              'Multi-Channel Payments',
              'Audit-Ready Records',
              'Role-Based Access',
            ].map((feature, index) => (
              <div
                key={feature}
                className={`px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-sm text-white transition-all duration-700 ease-out ${
                  isLoaded
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4'
                }`}
                style={{
                  transitionDelay: `${600 + index * 150}ms`,
                }}
              >
                {feature}
              </div>
            ))}
          </div>

          {/* CTA Button - Pulse Animation */}
          <div
            className={`pt-8 transition-all duration-1000 ease-out delay-700 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Button
              variant="primary"
              size="lg"
              onClick={handleProceed}
              className="px-8 py-4 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Proceed to Login
            </Button>
          </div>
        </div>

        {/* Scroll Indicator - Subtle Bounce */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
          <div className="flex flex-col items-center gap-2 text-white/60">
            <span className="text-xs uppercase tracking-wider">Scroll</span>
            <div className="w-6 h-10 border-2 border-white/40 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-bounce" />
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements - Subtle Floating Shapes */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>
    </div>
  );
}