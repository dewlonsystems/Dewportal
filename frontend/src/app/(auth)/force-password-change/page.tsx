// =============================================================================
// DEWPORTAL FRONTEND - FORCE PASSWORD CHANGE PAGE
// =============================================================================
// First-time login password change page.
// =============================================================================

'use client';

import { PasswordChangeForm } from '@/components/forms';
import { Alert } from '@/components/ui';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ForcePasswordChangePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-text">Set New Password</h2>
        <p className="text-sm text-text-muted">
          Please change your temporary password to continue
        </p>
      </div>

      {/* Security Notice */}
      <Alert variant="info" title="Security Notice">
        For your security, you must change your temporary password before accessing the system.
      </Alert>

      {/* Password Change Form */}
      <PasswordChangeForm isForceChange />

      {/* Help Text */}
      <div className="pt-4 border-t border-border">
        <p className="text-center text-sm text-text-muted">
          Need help?{' '}
          <a href="mailto:support@dewlon.com" className="text-primary hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}