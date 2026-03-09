// =============================================================================
// DEWPORTAL FRONTEND - AUDIT LOG SERVER ACTIONS
// =============================================================================
// Audit log server actions (admin only).
// =============================================================================

'use server';

import { cookies } from 'next/headers';
import { apiGet } from '@/lib/api';
import { AUDIT_ENDPOINTS } from '@/lib/api/endpoints';
import {
  AuditLogCursorResponse,
  AuditSummary,
  UserLastSeenResponse,
  ApiResponse,
  ApiError,
} from '@/types';
import { errorLog, debugLog } from '@/lib/utils';
import { buildUrl } from '@/lib/api/endpoints';

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
// Get Audit Logs (Cursor Paginated)
// -----------------------------------------------------------------------------

export async function getAuditLogsAction(filters?: {
  cursor?: string | null;
  limit?: number;
  user_id?: number;
  action_type?: string;
  category?: string;
  severity?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}): Promise<ApiResponse<AuditLogCursorResponse>> {
  try {
    debugLog('Get audit logs', { filters });

    const authHeaders = await getAuthHeaders();
    const params = buildUrl(AUDIT_ENDPOINTS.LOGS_LIST, filters);

    const response = await apiGet<AuditLogCursorResponse>(params, {
      headers: authHeaders,
    });

    return {
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Get audit logs failed', error);
    const apiError = error as ApiError;
    return {
      error: apiError.message || 'Failed to fetch audit logs',
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Get Audit Summary
// -----------------------------------------------------------------------------

export async function getAuditSummaryAction(): Promise<ApiResponse<AuditSummary>> {
  try {
    debugLog('Get audit summary');

    const authHeaders = await getAuthHeaders();

    const response = await apiGet<AuditSummary>(AUDIT_ENDPOINTS.SUMMARY, {
      headers: authHeaders,
    });

    return {
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Get audit summary failed', error);
    const apiError = error as ApiError;
    return {
      error: apiError.message || 'Failed to fetch audit summary',
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Get User Last Seen
// -----------------------------------------------------------------------------

export async function getUserLastSeenAction(): Promise<ApiResponse<UserLastSeenResponse>> {
  try {
    debugLog('Get user last seen');

    const authHeaders = await getAuthHeaders();

    const response = await apiGet<UserLastSeenResponse>(
      AUDIT_ENDPOINTS.USERS_LAST_SEEN,
      { headers: authHeaders }
    );

    return {
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Get user last seen failed', error);
    const apiError = error as ApiError;
    return {
      error: apiError.message || 'Failed to fetch user last seen data',
      status_code: apiError.status,
    };
  }
}