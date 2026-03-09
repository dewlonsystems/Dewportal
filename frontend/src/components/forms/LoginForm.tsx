// =============================================================================
// DEWPORTAL FRONTEND - LOGIN FORM
// =============================================================================
// Login form with validation and error handling.
// =============================================================================

'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { FormField } from './FormField';
import { Button, Alert, Spinner } from '@/components/ui';
import { loginSchema, LoginInput, LoginResponse } from '@/lib/validations';
import { DASHBOARD_ROUTES, AUTH_ROUTES } from '@/constants/routes'; 

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface LoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function LoginForm({ onSuccess, onError }: LoginFormProps) {
  const router = useRouter();
  const { login, mustChangePassword } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const methods = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const { handleSubmit, reset } = methods;

  // ---------------------------------------------------------------------------
  // Handle Submit
  // ---------------------------------------------------------------------------

  const onSubmit = async (data: LoginInput) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const result = await login(data);

      if (result.error) {
        const errorMsg = result.error.trim() || 'Login failed. Please try again.';
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }
      
      const loginData = result.data as LoginResponse | undefined;


      // Handle force password change redirect
      if (mustChangePassword || loginData?.must_change_password) {
        router.push(AUTH_ROUTES.FORCE_PASSWORD_CHANGE);
        return;
      }

      // Success
      onSuccess?.();
      router.push(DASHBOARD_ROUTES.DASHBOARD);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
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

        {/* Username Field */}
        <FormField<LoginInput>
          name="username"
          label="Username"
          type="text"
          placeholder="Enter your username"
          autoComplete="username"
          fullWidth
        />

        {/* Password Field */}
        <FormField<LoginInput>
          name="password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
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
              <span className="ml-2">Signing in...</span>
            </>
          ) : (
            'Sign In'
          )}
        </Button>

        {/* Forgot Password Link */}
        <div className="text-center">
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => {
              // TODO: Implement password reset request flow
            }}
          >
            Forgot your password?
          </button>
        </div>
      </form>
    </FormProvider>
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default LoginForm;