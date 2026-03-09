// =============================================================================
// DEWPORTAL FRONTEND - USER MANAGEMENT PAGE
// =============================================================================
// Admin-only page for managing system users.
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Card, CardContent, Spinner, Modal, Alert } from '@/components/ui';
import { UserForm } from '@/components/forms';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { DASHBOARD_ROUTES } from '@/constants/routes';
import { 
  getUsersAction, 
  createUserAction, 
  updateUserAction, 
  userActionAction 
} from '@/server-actions/users';
import { UserCreateInput, UserUpdateInput } from '@/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'staff';
  is_active: boolean;
  is_locked: boolean;
  last_seen?: string | null;
  created_at: string;
}

// Form data types that match UserForm's onSubmit signature
type UserFormData = 
  | { username: string; email: string; first_name: string; last_name: string; password: string; confirm_password?: string; role: 'admin' | 'staff'; is_active?: boolean; phone_number?: string | null }
  | { first_name?: string; last_name?: string; email?: string; phone_number?: string | null; role?: 'admin' | 'staff'; is_active?: boolean };

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function UsersPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'create' | 'edit'>('create');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Check Admin Access
  // ---------------------------------------------------------------------------

  if (!isAdmin()) {
    router.push(DASHBOARD_ROUTES.DASHBOARD);
    return null;
  }

  // ---------------------------------------------------------------------------
  // Load Users
  // ---------------------------------------------------------------------------

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const result = await getUsersAction();
      
      if (result.error) {
        setError(result.error);
        return;
      }     

      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  // ---------------------------------------------------------------------------
  // Handle Create User
  // ---------------------------------------------------------------------------

  const handleCreate = () => {
    setActionType('create');
    setEditingUser(null);
    setError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  // ---------------------------------------------------------------------------
  // Handle Edit User
  // ---------------------------------------------------------------------------

  const handleEdit = (user: User) => {
    setActionType('edit');
    setEditingUser(user);
    setError(null);
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  // ---------------------------------------------------------------------------
  // Transform form data to match server action input types
  // ---------------------------------------------------------------------------

  const prepareCreateData = (formData: UserFormData): UserCreateInput => {
    const data = formData as { username: string; email: string; first_name: string; last_name: string; password: string; confirm_password?: string; role: 'admin' | 'staff'; is_active?: boolean; phone_number?: string | null };
    
    // Remove confirm_password (validation only field) and handle null phone_number
    const { confirm_password, ...cleanData } = data;
    
    return {
      username: cleanData.username,
      email: cleanData.email,
      first_name: cleanData.first_name,
      last_name: cleanData.last_name,
      password: cleanData.password,
      role: cleanData.role,
      phone_number: cleanData.phone_number === null ? undefined : cleanData.phone_number,
      is_active: cleanData.is_active ?? true,
    } as UserCreateInput;
  };

  const prepareUpdateData = (formData: UserFormData): UserUpdateInput => {
    const data = formData as { first_name?: string; last_name?: string; email?: string; phone_number?: string | null; role?: 'admin' | 'staff'; is_active?: boolean };
    
    // Handle null phone_number -> undefined for API compatibility
    return {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone_number: data.phone_number === null ? undefined : data.phone_number,
      role: data.role,
      is_active: data.is_active,
    } as UserUpdateInput;
  };

  // ---------------------------------------------------------------------------
  // Handle Form Submit
  // ---------------------------------------------------------------------------

  const handleFormSubmit = async (formData: UserFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      let result;
      if (actionType === 'create') {
        const preparedData = prepareCreateData(formData);
        result = await createUserAction(preparedData);
      } else {
        const preparedData = prepareUpdateData(formData);
        result = await updateUserAction(editingUser!.id, preparedData);
      }

      if (result.error) {
        throw new Error(result.error);
      }

      setSuccessMessage(`User ${actionType === 'create' ? 'created' : 'updated'} successfully`);
      setIsModalOpen(false);
      
      // Refresh users list
      await loadUsers();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handle Disable/Enable User
  // ---------------------------------------------------------------------------

  const handleToggleActive = async (user: User) => {
    try {
      setIsLoading(true);
      
      const action = user.is_active ? 'disable' : 'enable';
      const result = await userActionAction(user.id, action);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setSuccessMessage(`User ${action === 'disable' ? 'disabled' : 'enabled'} successfully`);
      
      // Refresh users list
      await loadUsers();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handle Reset Password
  // ---------------------------------------------------------------------------

  const handleResetPassword = async (user: User) => {
    if (!confirm(`Reset password for ${user.username}?`)) return;

    try {
      setIsLoading(true);
      
      const result = await userActionAction(user.id, 'reset_password');
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setSuccessMessage(`Password reset for ${user.username}. Temporary password sent via email.`);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">User Management</h1>
          <p className="text-text-muted">Create and manage system users</p>
        </div>
        <Button variant="primary" onClick={handleCreate} disabled={isLoading}>
          + Create User
        </Button>
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

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading && users.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Spinner size="lg" />
            </div>
          ) : users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary font-medium text-sm">
                            {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-text">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-text-muted">@{user.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'error' : 'info'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={user.is_active ? 'success' : 'error'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {user.is_locked && (
                          <Badge variant="error">Locked</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.last_seen ? formatDate(user.last_seen) : 'Never'}
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(user)}
                          disabled={isLoading}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(user)}
                          disabled={isLoading}
                        >
                          {user.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetPassword(user)}
                          disabled={isLoading}
                        >
                          Reset Password
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-64 text-text-muted">
              No users found. Create your first user to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={actionType === 'create' ? 'Create User' : 'Edit User'}
        size="lg"
      >
        <UserForm
          mode={actionType}
          initialData={editingUser || undefined}
          userId={editingUser?.id}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}