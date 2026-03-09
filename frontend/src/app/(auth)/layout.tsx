// =============================================================================
// DEWPORTAL FRONTEND - AUTH LAYOUT
// =============================================================================
// Layout for authentication pages (login, password change).
// =============================================================================

import { ReactNode } from 'react';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">DP</span>
          </div>
          <h1 className="text-2xl font-bold text-text">Dewlon Portal</h1>
          <p className="text-text-muted mt-1">Secure Financial Management</p>
        </div>

        {/* Content */}
        {children}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-text-muted">
          <p>&copy; {new Date().getFullYear()} Dewlon Portal. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}