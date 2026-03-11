// =============================================================================
// DEWPORTAL FRONTEND - AUTHENTICATION SERVER ACTIONS
// =============================================================================
// All authentication-related server actions.
// These are the ONLY way to authenticate users - never from client.
// =============================================================================

'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiPost, apiGet } from '@/lib/api';
import { AUTH_ENDPOINTS, USER_ENDPOINTS } from '@/lib/api/endpoints';
import {
  loginSchema,
  passwordChangeSchema,
  forcePasswordChangeSchema,
  passwordResetRequestSchema,
  tokenRefreshSchema,
} from '@/lib/validations';
import {
  LoginInput,
  LoginResponse,
  PasswordChangeInput,
  ForcePasswordChangeInput,
  PasswordResetRequestInput,
  ApiResponse,
  ApiError,
} from '@/types';
import { errorLog, debugLog } from '@/lib/utils';
import { DASHBOARD_ROUTES, AUTH_ROUTES } from '@/constants/routes';

// -----------------------------------------------------------------------------
// Cookie Helpers
// -----------------------------------------------------------------------------

async function setAuthCookies(accessToken: string, refreshToken: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 900,
    path: '/',
  });

  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 604800,
    path: '/',
  });

  debugLog('Auth cookies set successfully');
}

async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
  debugLog('Auth cookies cleared');
}

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('access_token')?.value || null;
}

async function getRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('refresh_token')?.value || null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('401: No access token available');
  }
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

// -----------------------------------------------------------------------------
// Login
// -----------------------------------------------------------------------------

export async function loginAction(
  formData: LoginInput
): Promise<ApiResponse<LoginResponse>> {
  try {
    const validatedData = loginSchema.parse(formData);

    debugLog('Login attempt', { username: validatedData.username });

    // Public endpoint — no auth header needed
    const response = await apiPost<LoginResponse>(
      AUTH_ENDPOINTS.LOGIN,
      validatedData
    );

    await setAuthCookies(response.data.access, response.data.refresh);

    debugLog('Login successful', {
      username: validatedData.username,
      mustChangePassword: response.data.must_change_password,
    });

    revalidatePath('/', 'layout');

    if (response.data.must_change_password) {
      return {
        success: true,
        data: response.data,
        status: 200,
        message: 'Password change required',
        redirect: AUTH_ROUTES.FORCE_PASSWORD_CHANGE,
      };
    }

    return {
      success: true,
      data: response.data,
      status: 200,
      message: 'Login successful',
      redirect: DASHBOARD_ROUTES.DASHBOARD,
    };

  } catch (error) {
    errorLog('Login failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Invalid credentials',
      details: apiError.details,
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Logout
// -----------------------------------------------------------------------------

export async function logoutAction(): Promise<void> {
  try {
    const refreshToken = await getRefreshToken();

    if (refreshToken) {
      try {
        const authHeaders = await getAuthHeaders();
        await apiPost(
          AUTH_ENDPOINTS.LOGOUT,
          { refresh: refreshToken },
          { headers: authHeaders }
        );
      } catch (error) {
        errorLog('Django logout failed, continuing with local logout', error);
      }
    }

    await clearAuthCookies();
    debugLog('Logout successful');
    revalidatePath('/', 'layout');

  } catch (error) {
    errorLog('Logout failed', error);
    await clearAuthCookies();
  }

  // redirect MUST be outside try-catch
  // Next.js redirect() throws NEXT_REDIRECT internally
  // and a catch block will swallow it before Next.js can handle it
  redirect(AUTH_ROUTES.LOGIN);
}

// -----------------------------------------------------------------------------
// Password Change (Regular)
// — endpoint is under USER_ENDPOINTS.PASSWORD_CHANGE
// -----------------------------------------------------------------------------

export async function changePasswordAction(
  formData: PasswordChangeInput
): Promise<ApiResponse<void>> {
  try {
    const validatedData = passwordChangeSchema.parse(formData);

    debugLog('Password change attempt');

    const authHeaders = await getAuthHeaders();

    // Password change lives under users app
    await apiPost(
      USER_ENDPOINTS.PASSWORD_CHANGE,
      validatedData,
      { headers: authHeaders }
    );

    debugLog('Password changed successfully');

    return {
      success: true,
      status: 200,
      message: 'Password changed successfully',
    };

  } catch (error) {
    errorLog('Password change failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Password change failed',
      details: apiError.details,
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Force Password Change (First Login)
// — endpoint is under AUTH_ENDPOINTS.FORCE_PASSWORD_CHANGE
// -----------------------------------------------------------------------------

export async function forcePasswordChangeAction(
  formData: ForcePasswordChangeInput
): Promise<ApiResponse<void>> {
  try {
    const validatedData = forcePasswordChangeSchema.parse(formData);

    debugLog('Force password change attempt');

    const authHeaders = await getAuthHeaders();

    await apiPost(
      AUTH_ENDPOINTS.FORCE_PASSWORD_CHANGE,
      validatedData,
      { headers: authHeaders }
    );

    debugLog('Force password change successful');

    revalidatePath('/', 'layout');

    return {
      success: true,
      status: 200,
      message: 'Password changed successfully. You can now access all features.',
      redirect: DASHBOARD_ROUTES.DASHBOARD,
    };

  } catch (error) {
    errorLog('Force password change failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Password change failed',
      details: apiError.details,
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Password Reset Request (Staff to Admin)
// — endpoint is under USER_ENDPOINTS.PASSWORD_RESET_REQUEST
// -----------------------------------------------------------------------------

export async function requestPasswordResetAction(
  formData: PasswordResetRequestInput
): Promise<ApiResponse<void>> {
  try {
    const validatedData = passwordResetRequestSchema.parse(formData);

    debugLog('Password reset request');

    const authHeaders = await getAuthHeaders();

    // Reset request lives under users app
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
      error: apiError.message || 'Password reset request failed',
      details: apiError.details,
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Token Refresh
// — public endpoint, no auth header needed
// -----------------------------------------------------------------------------

export async function refreshAccessTokenAction(): Promise<ApiResponse<{ access: string }>> {
  try {
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      return {
        success: false,
        error: 'No refresh token available',
        status_code: 401,
      };
    }

    const validatedData = tokenRefreshSchema.parse({ refresh: refreshToken });

    const response = await apiPost<{ access: string }>(
      AUTH_ENDPOINTS.TOKEN_REFRESH,
      validatedData
    );

    const cookieStore = await cookies();
    cookieStore.set('access_token', response.data.access, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 900,
      path: '/',
    });

    debugLog('Access token refreshed');

    return {
      success: true,
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Token refresh failed', error);
    await clearAuthCookies();
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Session expired',
      status_code: apiError.status || 401,
    };
  }
}

// -----------------------------------------------------------------------------
// Session Verification
// -----------------------------------------------------------------------------

export async function verifySessionAction(): Promise<ApiResponse<{
  user: LoginResponse['user'];
  session_valid: boolean;
}>> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return {
        success: false,
        error: 'No access token',
        status_code: 401,
      };
    }

    const response = await apiGet<{
      user: LoginResponse['user'];
      session_valid: boolean;
    }>(
      AUTH_ENDPOINTS.SESSION_VERIFY,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Session verification failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Session invalid',
      status_code: apiError.status || 401,
    };
  }
}

// -----------------------------------------------------------------------------
// Check Account Status
// — public endpoint, no auth header needed
// -----------------------------------------------------------------------------

export async function checkAccountStatusAction(
  username: string
): Promise<ApiResponse<{ exists: boolean }>> {
  try {
    const response = await apiPost<{ exists: boolean }>(
      AUTH_ENDPOINTS.ACCOUNT_STATUS,
      { username }
    );

    return {
      success: true,
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Account status check failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Account status check failed',
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Get Current User
// -----------------------------------------------------------------------------

export async function getCurrentUserAction(): Promise<ApiResponse<LoginResponse['user'] | null>> {
  try {
    const session = await verifySessionAction();

    if (session.error || !session.data) {
      return {
        success: true,
        data: null,
        status: 200,
      };
    }

    return {
      success: true,
      data: session.data.user,
      status: 200,
    };

  } catch (error) {
    errorLog('Get current user failed', error);
    return {
      success: true,
      data: null,
      status: 200,
    };
  }
}

// Add this to your existing auth server actions file

/**
 * Get access token for WebSocket connection.
 * Only used to build the WS URL — token is read from httpOnly cookie server-side.
 */
export async function getAccessTokenForWSAction(): Promise<{ token: string | null }> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value ?? null;
    return { token };
  } catch {
    return { token: null };
  }
}