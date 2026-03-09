// =============================================================================
// DEWPORTAL FRONTEND - HOME PAGE
// =============================================================================
// Redesigned with neutral overlay, proper icons, and brand colors.
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function HomePage() {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Trigger entrance animations
    const timer = setTimeout(() => setIsLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleProceed = () => {
    setIsLoading(true);
    // Small delay to show spinner before navigation
    setTimeout(() => {
      router.push('/login');
    }, 800);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Logo - Top Left */}
      <div 
        className={`absolute top-6 left-6 z-20 transition-all duration-1000 ${
          isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
        }`}
      >
        <a href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 bg-white rounded-lg overflow-hidden shadow-lg group-hover:shadow-xl transition-shadow">
            <Image
              src="/logo.png"
              alt="Dewlon Portal"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <span className="text-white font-semibold text-lg hidden sm:block drop-shadow-md">
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
          onLoadedData={() => setVideoLoaded(true)}
        >
          <source src="/videos/management-bg.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {/* Neutral Gray/Cream Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/75 to-slate-900/85" />
        
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className={`absolute top-1/4 left-1/4 w-96 h-96 bg-accent/15 rounded-full blur-3xl transition-all duration-2000 ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`} 
        />
        <div 
          className={`absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-primary-light/15 rounded-full blur-3xl transition-all duration-2000 delay-500 ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          }`} 
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center pt-12 pb-20">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Main Heading */}
          <div
            className={`space-y-4 transition-all duration-1000 ease-out ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
          >
            <h1 
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-tight"
              style={{
                textShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
              }}
            >
              Secure Financial
              <br />
              <span className="text-secondary-light">Management</span>
            </h1>
            
            <div className="flex items-center justify-center gap-3 pt-2">
              <div className="h-px w-12 bg-accent/60" />
              <p className="text-xl sm:text-2xl md:text-3xl text-white/90 font-light">
                Built for Excellence
              </p>
              <div className="h-px w-12 bg-accent/60" />
            </div>
          </div>

          {/* Subheading */}
          <p
            className={`text-lg sm:text-xl md:text-2xl text-white/85 max-w-3xl mx-auto leading-relaxed transition-all duration-1000 ease-out delay-300 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            Streamline payments, track transactions, and manage your financial
            operations with enterprise-grade security and real-time insights.
          </p>

          {/* Feature Highlights with SVG Icons */}
          <div 
            className={`flex flex-wrap justify-center gap-4 pt-4 transition-all duration-1000 ease-out delay-500 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                label: 'Real-Time Analytics'
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                ),
                label: 'Multi-Channel Payments'
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                label: 'Audit-Ready Records'
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ),
                label: 'Role-Based Access'
              },
            ].map((feature, index) => (
              <div
                key={feature.label}
                className="group px-6 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-300 cursor-default"
                style={{
                  animationDelay: `${800 + index * 150}ms`,
                }}
              >
                <div className="flex items-center gap-2 text-white">
                  {feature.icon}
                  <span className="text-sm font-medium">{feature.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ✅ CTA Button with Loading Spinner */}
          <div
            className={`pt-6 transition-all duration-1000 ease-out delay-700 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <button
              onClick={handleProceed}
              disabled={isLoading}
              className={`group relative inline-flex items-center gap-3 px-10 py-5 bg-accent hover:bg-accent-hover text-white font-semibold text-lg rounded-2xl shadow-2xl hover:shadow-accent/25 transition-all duration-300 overflow-hidden ${
                isLoading ? 'cursor-not-allowed opacity-90' : 'hover:-translate-y-1'
              }`}
            >
              {/* Shine effect - only when not loading */}
              {!isLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              )}
              
              {/* ✅ Loading Spinner */}
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <svg 
                    className="animate-spin h-5 w-5 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Loading...</span>
                </div>
              ) : (
                /* ✅ Normal Button Content */
                <>
                  <span>Proceed to Login</span>
                  <svg 
                    className="w-5 h-5 group-hover:translate-x-1 transition-transform" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M13 7l5 5m0 0l-5 5m5-5H6" 
                    />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background/20 to-transparent z-10 pointer-events-none" />
    </div>
  );
}