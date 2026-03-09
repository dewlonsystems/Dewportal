// =============================================================================
// DEWPORTAL FRONTEND - PASSWORD CHANGE FORM
// =============================================================================
// Password change form for first-time login and regular password changes.
// =============================================================================

'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { FormField } from './FormField';
import { Button, Alert, Spinner } from '@/components/ui';
import {
  forcePasswordChangeSchema,
  ForcePasswordChangeInput,
  passwordChangeSchema,
  PasswordChangeInput,
} from '@/lib/validations';
import { DASHBOARD_ROUTES } from '@/constants/routes';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PasswordChangeFormProps {
  isForceChange?: boolean;  // true for first-time login
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function PasswordChangeForm({
  isForceChange = false,
  onSuccess,
  onError,
}: PasswordChangeFormProps) {
  const router = useRouter();
  const { forcePasswordChange, changePassword } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = isForceChange ? forcePasswordChangeSchema : passwordChangeSchema;

  const methods = useForm<ForcePasswordChangeInput | PasswordChangeInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      temporary_password: isForceChange ? '' : undefined,
      current_password: !isForceChange ? '' : undefined,
      new_password: '',
      confirm_new_password: '',
    },
  });

  const { handleSubmit } = methods;

  // ---------------------------------------------------------------------------
  // Handle Submit
  // ---------------------------------------------------------------------------

  const onSubmit = async (data: ForcePasswordChangeInput | PasswordChangeInput) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const result = isForceChange
        ? await forcePasswordChange(data as ForcePasswordChangeInput)
        : await changePassword(data as PasswordChangeInput);

      if (result.error) {
        setError(result.error);
        onError?.(result.error);
        return;
      }

      // Success
      onSuccess?.();

      if (isForceChange) {
        router.push(DASHBOARD_ROUTES.DASHBOARD);
      } else {
        // Show success message and stay on profile page
        alert('Password changed successfully!');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Password change failed';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Temporary Password (Force Change Only) */}
        {isForceChange && (
          <FormField<ForcePasswordChangeInput>
            name="temporary_password"
            label="Temporary Password"
            type="password"
            placeholder="Enter your temporary password"
            fullWidth
          />
        )}

        {/* Current Password (Regular Change Only) */}
        {!isForceChange && (
          <FormField<PasswordChangeInput>
            name="current_password"
            label="Current Password"
            type="password"
            placeholder="Enter your current password"
            fullWidth
          />
        )}

        {/* New Password */}
        <FormField<ForcePasswordChangeInput>
          name="new_password"
          label="New Password"
          type="password"
          placeholder="Enter your new password"
          hint="Must be at least 8 characters with uppercase, lowercase, number, and special character"
          fullWidth
        />

        {/* Confirm New Password */}
        <FormField<ForcePasswordChangeInput>
          name="confirm_new_password"
          label="Confirm New Password"
          type="password"
          placeholder="Confirm your new password"
          fullWidth
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" color="white" />
              <span className="ml-2">Changing password...</span>
            </>
          ) : (
            isForceChange ? 'Set New Password' : 'Change Password'
          )}
        </Button>

        {/* Password Requirements */}
        <div className="p-4 bg-background rounded-lg border border-border">
          <p className="text-sm font-medium text-text mb-2">Password Requirements:</p>
          <ul className="text-sm text-text-muted space-y-1">
            <li>• At least 8 characters long</li>
            <li>• At least one uppercase letter (A-Z)</li>
            <li>• At least one lowercase letter (a-z)</li>
            <li>• At least one number (0-9)</li>
            <li>• At least one special character (!@#$%^&*)</li>
          </ul>
        </div>
      </form>
    </FormProvider>
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default PasswordChangeForm;