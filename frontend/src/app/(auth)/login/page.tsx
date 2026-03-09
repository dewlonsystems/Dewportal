// =============================================================================
// DEWPORTAL FRONTEND - LOGIN PAGE
// =============================================================================
// User login page with form and validation.
// =============================================================================

'use client';

import { LoginForm } from '@/components/forms';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function LoginPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-text">Welcome Back</h2>
        <p className="text-sm text-text-muted">
          Sign in to your account to continue
        </p>
      </div>

      {/* Login Form */}
      <LoginForm />

      {/* Help Text */}
      <div className="pt-4 border-t border-border">
        <p className="text-center text-sm text-text-muted">
          Having trouble signing in?{' '}
          <a href="mailto:support@dewlon.com" className="text-primary hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}