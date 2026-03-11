// =============================================================================
// DEWPORTAL FRONTEND - NOTIFICATION SERVER ACTIONS
// =============================================================================
// All notification-related server actions.
// These are the ONLY way to call notification APIs — never from the client.
// =============================================================================

'use server';

import { cookies } from 'next/headers';
import { apiGet, apiPost, apiPatch } from '@/lib/api';
import { NOTIFICATION_ENDPOINTS } from '@/lib/api/endpoints';
import { Notification, ApiResponse, ApiError } from '@/types';
import { debugLog, errorLog } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Cookie / Auth Helpers (mirrors auth actions pattern)
// -----------------------------------------------------------------------------

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('access_token')?.value || null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('401: No access token available');
  return { Authorization: `Bearer ${accessToken}` };
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface NotificationListResponse {
  results: Notification[];
  count: number;
  next: string | null;
  previous: string | null;
}

interface NotificationSummary {
  total: number;
  unread: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
}

// -----------------------------------------------------------------------------
// Fetch Notifications (Initial Load)
// -----------------------------------------------------------------------------

export async function fetchNotificationsAction(params?: {
  page?: number;
  page_size?: number;
  is_read?: boolean;
  severity?: string;
}): Promise<ApiResponse<NotificationListResponse>> {
  try {
    debugLog('Notification Actions: Fetching notifications', params);

    const authHeaders = await getAuthHeaders();

    // Build query string
    const searchParams = new URLSearchParams();
    if (params?.page)      searchParams.set('page',      String(params.page));
    if (params?.page_size) searchParams.set('page_size', String(params.page_size));
    if (params?.is_read !== undefined) searchParams.set('is_read', String(params.is_read));
    if (params?.severity)  searchParams.set('severity',  params.severity);

    const qs = searchParams.toString();
    const url = qs
      ? `${NOTIFICATION_ENDPOINTS.LIST}?${qs}`
      : NOTIFICATION_ENDPOINTS.LIST;

    const response = await apiGet<NotificationListResponse>(url, {
      headers: authHeaders,
    });

    debugLog('Notification Actions: Fetched notifications', {
      count: response.data.count,
    });

    return {
      success: true,
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Notification Actions: Fetch failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to fetch notifications',
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Mark Single Notification As Read
// -----------------------------------------------------------------------------

export async function markNotificationReadAction(
  notificationId: number
): Promise<ApiResponse<void>> {
  try {
    debugLog('Notification Actions: Mark as read', { notificationId });

    const authHeaders = await getAuthHeaders();

    await apiPost(
      NOTIFICATION_ENDPOINTS.MARK_READ,
      { notification_ids: [notificationId] },
      { headers: authHeaders }
    );

    debugLog('Notification Actions: Marked as read', { notificationId });

    return { success: true, status: 200 };

  } catch (error) {
    errorLog('Notification Actions: Mark as read failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to mark notification as read',
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Mark Single Notification As Unread
// -----------------------------------------------------------------------------

export async function markNotificationUnreadAction(
  notificationId: number
): Promise<ApiResponse<void>> {
  try {
    debugLog('Notification Actions: Mark as unread', { notificationId });

    const authHeaders = await getAuthHeaders();

    // Uses bulk-update endpoint with is_read: false
    await apiPatch(
      NOTIFICATION_ENDPOINTS.BULK_UPDATE,
      {
        notification_ids: [notificationId],
        updates: { is_read: false },
      },
      { headers: authHeaders }
    );

    debugLog('Notification Actions: Marked as unread', { notificationId });

    return { success: true, status: 200 };

  } catch (error) {
    errorLog('Notification Actions: Mark as unread failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to mark notification as unread',
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Mark All Notifications As Read
// -----------------------------------------------------------------------------

export async function markAllNotificationsReadAction(): Promise<ApiResponse<void>> {
  try {
    debugLog('Notification Actions: Mark all as read');

    const authHeaders = await getAuthHeaders();

    await apiPost(
      NOTIFICATION_ENDPOINTS.MARK_ALL_READ,
      {},
      { headers: authHeaders }
    );

    debugLog('Notification Actions: All marked as read');

    return { success: true, status: 200 };

  } catch (error) {
    errorLog('Notification Actions: Mark all as read failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to mark all notifications as read',
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Dismiss Notification
// -----------------------------------------------------------------------------

export async function dismissNotificationAction(
  notificationId: number
): Promise<ApiResponse<void>> {
  try {
    debugLog('Notification Actions: Dismiss', { notificationId });

    const authHeaders = await getAuthHeaders();

    await apiPatch(
      NOTIFICATION_ENDPOINTS.BULK_UPDATE,
      {
        notification_ids: [notificationId],
        updates: { is_dismissed: true },
      },
      { headers: authHeaders }
    );

    debugLog('Notification Actions: Dismissed', { notificationId });

    return { success: true, status: 200 };

  } catch (error) {
    errorLog('Notification Actions: Dismiss failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to dismiss notification',
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Fetch Notification Summary
// -----------------------------------------------------------------------------

export async function fetchNotificationSummaryAction(): Promise<ApiResponse<NotificationSummary>> {
  try {
    debugLog('Notification Actions: Fetch summary');

    const authHeaders = await getAuthHeaders();

    const response = await apiGet<NotificationSummary>(
      NOTIFICATION_ENDPOINTS.SUMMARY,
      { headers: authHeaders }
    );

    return {
      success: true,
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Notification Actions: Fetch summary failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to fetch notification summary',
      status_code: apiError.status,
    };
  }
}
