// =============================================================================
// DEWPORTAL FRONTEND - LOGIN PAGE
// =============================================================================

'use client';

import { LoginForm } from '@/components/forms';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/useAuthStore';
import Image from 'next/image';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, mustChangePassword } = useAuth();
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);

    if (!isInitialized) return;

    // Only bounce already-authenticated users away on page load.
    // LoginForm handles the redirect after a fresh login itself.
    if (isAuthenticated && !mustChangePassword) {
      router.replace('/dashboard/dashboard');
    } else if (isAuthenticated && mustChangePassword) {
      router.replace('/force-password-change');
    }
  }, [isInitialized]); // ✅ Run once on mount only, not on every auth change

  return (
    <div 
      className="fixed inset-0 w-full h-full overflow-y-auto bg-[#f7f4ef]"
      style={{
        backgroundImage: "url('/images/clouds-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* OVERLAY */}
      <div className="fixed inset-0 bg-gradient-to-br from-white/30 via-white/20 to-white/40 backdrop-blur-[2px]" />

      {/* ANIMATED ELEMENTS */}
      <div className="fixed inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-white/10 rounded-full animate-float-slow"
            style={{
              width: `${20 + Math.random() * 60}px`,
              height: `${20 + Math.random() * 60}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 20}s`,
            }}
          />
        ))}
      </div>

      {/* SCROLLABLE CONTENT CONTAINER */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4">
        
        {/* LOGIN CARD */}
        <div
          className={`w-full max-w-md transform transition-all duration-1000 ${
            isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}
        >
          {/* Card Container */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden">
            
            {/* Card Header */}
            <div className="bg-gradient-to-r from-primary to-primary-light px-8 py-8 text-center">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl overflow-hidden">
                <Image
                  src="/logo.png"
                  alt="Dewlon Portal Logo"
                  width={64}
                  height={64}
                  className="object-contain"
                  priority
                />
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">Welcome Back</h1>
              <p className="text-white/80 text-sm">Sign in to your account</p>
            </div>

            {/* Card Body */}
            <div className="p-8">
              <LoginForm />
            </div>

            {/* Card Footer */}
            <div className="px-8 pb-8 pt-2">
              <div className="border-t border-border pt-6">
                <p className="text-center text-sm text-text-muted mb-4">
                  Having trouble signing in?{' '}
                  <a
                    href="mailto:support@dewlon.com"
                    className="text-primary hover:underline font-medium"
                  >
                    Contact Support
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Card Reflection Effect */}
          <div className="absolute -bottom-4 left-4 right-4 h-8 bg-gradient-to-b from-black/10 to-transparent rounded-b-3xl blur-sm" />
        </div>

        {/* BACK TO HOME */}
        <button
          onClick={() => router.push('/')}
          className={`fixed top-6 left-6 z-20 flex items-center gap-2 text-white/70 hover:text-white transition-all duration-300 ${
            isLoaded ? 'translate-x-0 opacity-100' : '-translate-x-10 opacity-0'
          }`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          <span className="text-sm font-medium">Back to Home</span>
        </button>
      </div>
    </div>
  );
}