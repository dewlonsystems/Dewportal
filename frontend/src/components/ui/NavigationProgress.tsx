// =============================================================================
// DEWPORTAL FRONTEND - NAVIGATION PROGRESS
// =============================================================================
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setIsNavigating(false);
    setProgress(100);
    const timer = setTimeout(() => setProgress(0), 400);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  // Simulate progress on link clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a, button');
      if (!target) return;
      setIsNavigating(true);
      setProgress(30);
      setTimeout(() => setProgress(60), 100);
      setTimeout(() => setProgress(80), 300);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (!isNavigating && progress === 0) return null;

  return (
    <>
      {/* Top progress bar */}
      <div
        className="fixed top-0 left-0 z-[9999] h-[3px] bg-[#c45c1a] transition-all duration-300 ease-out"
        style={{ width: `${progress}%`, opacity: progress === 100 ? 0 : 1 }}
      />

      {/* Page overlay with spinner */}
      {isNavigating && (
        <div className="fixed inset-0 z-[9998] bg-white/20 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-6 py-4 flex items-center gap-3">
            <svg
              className="animate-spin w-5 h-5 text-[#c45c1a]"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Loading...</span>
          </div>
        </div>
      )}
    </>
  );
}

export default NavigationProgress;