// =============================================================================
// DEWPORTAL FRONTEND - USER PROFILE PAGE
// =============================================================================
// User profile management and password change.
// =============================================================================

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, Button, Alert, Spinner } from '@/components/ui';
import { PasswordChangeForm } from '@/components/forms';
import { FormField } from '@/components/forms/FormField';
import { useForm, FormProvider } from 'react-hook-form';
import { formatDate } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const methods = useForm<ProfileFormData>({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
    },
  });

  const { handleSubmit } = methods;

  // ---------------------------------------------------------------------------
  // Handle Profile Update
  // ---------------------------------------------------------------------------

  const handleProfileUpdate = async (data: ProfileFormData) => {
    try {
      setIsSaving(true);
      setError(null);

      // TODO: Call server action to update profile
      // await updateProfileAction(data);

      setSuccessMessage('Profile updated successfully');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Profile</h1>
        <p className="text-text-muted">Manage your account settings</p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" dismissible onDismiss={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader
            title="Profile Information"
            description="Update your personal information"
          />
          <CardContent>
            <FormProvider {...methods}>
              <form onSubmit={handleSubmit(handleProfileUpdate)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField<ProfileFormData>
                    name="first_name"
                    label="First Name"
                    type="text"
                    fullWidth
                  />
                  <FormField<ProfileFormData>
                    name="last_name"
                    label="Last Name"
                    type="text"
                    fullWidth
                  />
                </div>

                <FormField<ProfileFormData>
                  name="email"
                  label="Email Address"
                  type="email"
                  fullWidth
                />

                <FormField<ProfileFormData>
                  name="phone_number"
                  label="Phone Number"
                  type="tel"
                  fullWidth
                />

                <div className="pt-4">
                  <Button type="submit" variant="primary" isLoading={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </FormProvider>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader
            title="Account Information"
            description="Your account details"
          />
          <CardContent className="space-y-4">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Username</span>
              <span className="font-medium text-text">{user?.username}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Role</span>
              <span className="font-medium text-text capitalize">{user?.role}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Member Since</span>
              <span className="font-medium text-text">
                {user?.created_at ? formatDate(user.created_at) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Last Login</span>
              <span className="font-medium text-text">
                {user?.last_seen ? formatDate(user.last_seen) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-text-muted">Account Status</span>
              <span className={`font-medium ${user?.is_active ? 'text-success' : 'text-error'}`}>
                {user?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Change Password"
            description="Update your password for security"
          />
          <CardContent>
            <PasswordChangeForm isForceChange={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}