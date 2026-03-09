// =============================================================================
// DEWPORTAL FRONTEND - USER FORM
// =============================================================================
// User create/edit form for admin user management.
// =============================================================================

'use client';

import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { FormField } from './FormField';
import { Button, Alert, Spinner, Card, CardContent } from '@/components/ui';
import { userCreateSchema, userUpdateSchema, UserCreateInput, UserUpdateInput } from '@/lib/validations';
import { UserRole } from '@/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface UserFormProps {
  mode: 'create' | 'edit';
  initialData?: UserUpdateInput & { username?: string; email?: string; role?: UserRole };
  userId?: number;
  onSubmit?: (data: UserCreateInput | UserUpdateInput) => Promise<void>;
  onCancel?: () => void;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function UserForm({
  mode,
  initialData,
  userId,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const { isAdmin } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreate = mode === 'create';

  const schema = isCreate ? userCreateSchema : userUpdateSchema;

  const methods = useForm<UserCreateInput | UserUpdateInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: initialData?.username || '',
      email: initialData?.email || '',
      first_name: initialData?.first_name || '',
      last_name: initialData?.last_name || '',
      phone_number: initialData?.phone_number || '',
      role: initialData?.role || 'staff',
      password: '',
      confirm_password: '',
    },
  });

  const { handleSubmit, watch } = methods;
  const role = watch('role');

  // ---------------------------------------------------------------------------
  // Handle Submit
  // ---------------------------------------------------------------------------

  const handleFormSubmit = async (data: UserCreateInput | UserUpdateInput) => {
    try {
      setIsSubmitting(true);
      setError(null);

      await onSubmit?.(data);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Operation failed';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Username (Create Only) */}
          {isCreate && (
            <FormField<UserCreateInput>
              name="username"
              label="Username"
              type="text"
              placeholder="Enter username"
              fullWidth
            />
          )}

          {/* Email */}
          <FormField<UserCreateInput>
            name="email"
            label="Email Address"
            type="email"
            placeholder="Enter email"
            fullWidth
          />

          {/* First Name */}
          <FormField<UserCreateInput>
            name="first_name"
            label="First Name"
            type="text"
            placeholder="Enter first name"
            fullWidth
          />

          {/* Last Name */}
          <FormField<UserCreateInput>
            name="last_name"
            label="Last Name"
            type="text"
            placeholder="Enter last name"
            fullWidth
          />

          {/* Phone Number */}
          <FormField<UserCreateInput>
            name="phone_number"
            label="Phone Number"
            type="tel"
            placeholder="Enter phone number"
            fullWidth
          />

          {/* Role (Admin Only) */}
          {isAdmin() && isCreate && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-text">
                Role
              </label>
              <select
                {...methods.register('role')}
                className="input"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

          {/* Password (Create Only) */}
          {isCreate && (
            <>
              <FormField<UserCreateInput>
                name="password"
                label="Password"
                type="password"
                placeholder="Enter password (optional, will auto-generate)"
                fullWidth
              />

              <FormField<UserCreateInput>
                name="confirm_password"
                label="Confirm Password"
                type="password"
                placeholder="Confirm password"
                fullWidth
              />
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" color="white" />
                <span className="ml-2">
                  {isCreate ? 'Creating...' : 'Saving...'}
                </span>
              </>
            ) : (
              isCreate ? 'Create User' : 'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default UserForm;