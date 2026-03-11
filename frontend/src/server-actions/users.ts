// =============================================================================
// DEWPORTAL FRONTEND - USER MANAGEMENT SERVER ACTIONS
// =============================================================================
// All user management server actions (admin only).
// =============================================================================

'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { USER_ENDPOINTS } from '@/lib/api/endpoints';
import {
  userCreateSchema,
  userUpdateSchema,
  userFilterSchema,
  staffPasswordResetRequestSchema,
} from '@/lib/validations';
import {
  UserCreateInput,
  UserUpdateInput,
  UserResponse,
  UserListResponse,
  PasswordResetRequestResponse,
  ApiResponse,
  ApiError,
} from '@/types';
import { errorLog, debugLog } from '@/lib/utils';
import {
  buildUrl,
  buildPaginationParams,
  buildFilterParams,
  buildSortParams,
} from '@/lib/api/endpoints';

// -----------------------------------------------------------------------------
// Auth Header Helper
// -----------------------------------------------------------------------------

async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  if (!accessToken) {
    throw new Error('401: No access token available');
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

// -----------------------------------------------------------------------------
// Get Users (Admin)
// -----------------------------------------------------------------------------

export async function getUsersAction(filters?: {
  page?: number;
  pageSize?: number;
  role?: 'admin' | 'staff';
  is_active?: boolean;
  search?: string;
  ordering?: string;
}): Promise<ApiResponse<UserListResponse>> {
  try {
    debugLog('Get users', { filters });

    const authHeaders = await getAuthHeaders();

    const params = buildUrl(
      USER_ENDPOINTS.LIST,
      {
        ...buildPaginationParams(filters?.page, filters?.pageSize),
        ...buildFilterParams({
          role: filters?.role,
          is_active: filters?.is_active,
          search: filters?.search,
        }),
        ...buildSortParams(filters?.ordering),
      }
    );

    const response = await apiGet<UserListResponse>(params, {
      headers: authHeaders,
    });

    return {
      success: true,
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Get users failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to fetch users',
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Get User Detail (Admin)
// -----------------------------------------------------------------------------

export async function getUserDetailAction(userId: number): Promise<ApiResponse<UserResponse>> {
  try {
    debugLog('Get user detail', { userId });

    const authHeaders = await getAuthHeaders();

    const response = await apiGet<UserResponse>(
      USER_ENDPOINTS.DETAIL(userId),
      { headers: authHeaders }
    );

    return {
      success: true,
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Get user detail failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to fetch user',
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Create User (Admin)
// -----------------------------------------------------------------------------

export async function createUserAction(
  formData: UserCreateInput
): Promise<ApiResponse<UserResponse>> {
  try {
    const validatedData = userCreateSchema.parse(formData);

    debugLog('Create user', { username: validatedData.username });

    const authHeaders = await getAuthHeaders();

    const response = await apiPost<UserResponse>(
      USER_ENDPOINTS.LIST,
      validatedData,
      { headers: authHeaders }
    );

    debugLog('User created', { userId: response.data.id });

    revalidatePath('/users');

    return {
      success: true,
      data: response.data,
      status: 201,
      message: 'User created successfully',
    };

  } catch (error) {
    errorLog('Create user failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to create user',
      details: apiError.details,
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Update User (Admin or Self)
// -----------------------------------------------------------------------------

export async function updateUserAction(
  userId: number,
  formData: UserUpdateInput
): Promise<ApiResponse<UserResponse>> {
  try {
    const validatedData = userUpdateSchema.parse(formData);

    debugLog('Update user', { userId });

    const authHeaders = await getAuthHeaders();

    const response = await apiPut<UserResponse>(
      USER_ENDPOINTS.DETAIL(userId),
      validatedData,
      { headers: authHeaders }
    );

    debugLog('User updated', { userId });

    revalidatePath('/users');
    revalidatePath('/profile');

    return {
      success: true,
      data: response.data,
      status: 200,
      message: 'User updated successfully',
    };

  } catch (error) {
    errorLog('Update user failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to update user',
      details: apiError.details,
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Delete User (Admin)
// -----------------------------------------------------------------------------

export async function deleteUserAction(userId: number): Promise<ApiResponse<void>> {
  try {
    debugLog('Delete user', { userId });

    const authHeaders = await getAuthHeaders();

    await apiDelete(USER_ENDPOINTS.DETAIL(userId), {
      headers: authHeaders,
    });

    debugLog('User deleted', { userId });

    revalidatePath('/users');

    return {
      success: true,
      status: 200,
      message: 'User deleted successfully',
    };

  } catch (error) {
    errorLog('Delete user failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to delete user',
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// User Action (Admin: disable, enable, reset_password)
// -----------------------------------------------------------------------------

export async function userActionAction(
  userId: number,
  action: 'disable' | 'enable' | 'reset_password'
): Promise<ApiResponse<void>> {
  try {
    debugLog('User action', { userId, action });

    const authHeaders = await getAuthHeaders();

    await apiPost(
      USER_ENDPOINTS.USER_ACTION(userId, action),
      undefined,
      { headers: authHeaders }
    );

    debugLog('User action completed', { userId, action });

    revalidatePath('/users');

    return {
      success: true,
      status: 200,
      message: `User ${action} successfully`,
    };

  } catch (error) {
    errorLog('User action failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || `Failed to ${action} user`,
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Get Profile (Self)
// -----------------------------------------------------------------------------

export async function getProfileAction(): Promise<ApiResponse<UserResponse>> {
  try {
    debugLog('Get profile');

    const authHeaders = await getAuthHeaders();

    const response = await apiGet<UserResponse>(USER_ENDPOINTS.PROFILE, {
      headers: authHeaders,
    });

    return {
      success: true,
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Get profile failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to fetch profile',
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Update Profile (Self)
// -----------------------------------------------------------------------------

export async function updateProfileAction(
  formData: UserUpdateInput
): Promise<ApiResponse<UserResponse>> {
  try {
    const validatedData = userUpdateSchema.parse(formData);

    debugLog('Update profile');

    const authHeaders = await getAuthHeaders();

    const response = await apiPut<UserResponse>(
      USER_ENDPOINTS.PROFILE,
      validatedData,
      { headers: authHeaders }
    );

    debugLog('Profile updated');

    revalidatePath('/profile');

    return {
      success: true,
      data: response.data,
      status: 200,
      message: 'Profile updated successfully',
    };

  } catch (error) {
    errorLog('Update profile failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to update profile',
      details: apiError.details,
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Request Password Reset (Staff to Admin)
// -----------------------------------------------------------------------------

export async function staffPasswordResetRequestAction(
  reason?: string
): Promise<ApiResponse<void>> {
  try {
    const validatedData = staffPasswordResetRequestSchema.parse({ reason });

    debugLog('Staff password reset request');

    const authHeaders = await getAuthHeaders();

    await apiPost(
      USER_ENDPOINTS.PASSWORD_RESET_REQUEST,
      validatedData,
      { headers: authHeaders }
    );

    debugLog('Password reset request submitted');

    return {
      success: true,
      status: 200,
      message: 'Password reset request submitted. Admin will review.',
    };

  } catch (error) {
    errorLog('Password reset request failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to submit password reset request',
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Get Password Reset Requests (Admin)
// -----------------------------------------------------------------------------

export async function getPasswordResetRequestsAction(): Promise<ApiResponse<PasswordResetRequestResponse[]>> {
  try {
    debugLog('Get password reset requests');

    const authHeaders = await getAuthHeaders();

    const response = await apiGet<PasswordResetRequestResponse[]>(
      USER_ENDPOINTS.PASSWORD_RESET_REQUESTS_ADMIN,
      { headers: authHeaders }
    );

    return {
      success: true,
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Get password reset requests failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to fetch password reset requests',
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Action Password Reset Request (Admin: approve, reject)
// -----------------------------------------------------------------------------

export async function passwordResetRequestActionAction(
  requestId: number,
  action: 'approve' | 'reject',
  notes?: string
): Promise<ApiResponse<void>> {
  try {
    debugLog('Password reset request action', { requestId, action });

    const authHeaders = await getAuthHeaders();

    await apiPost(
      USER_ENDPOINTS.PASSWORD_RESET_REQUEST_ACTION(requestId, action),
      { notes },
      { headers: authHeaders }
    );

    debugLog('Password reset request processed', { requestId, action });

    revalidatePath('/users');

    return {
      success: true,
      status: 200,
      message: `Password reset request ${action}d`,
    };

  } catch (error) {
    errorLog('Password reset request action failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || `Failed to ${action} password reset request`,
      status_code: apiError.status,
    };
  }
}