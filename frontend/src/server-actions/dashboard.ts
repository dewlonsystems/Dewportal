// =============================================================================
// DEWPORTAL FRONTEND - DASHBOARD SERVER ACTIONS
// =============================================================================
// Dashboard data server actions.
// =============================================================================

'use server';

import { cookies } from 'next/headers';
import { apiGet } from '@/lib/api';
import { DASHBOARD_ENDPOINTS } from '@/lib/api/endpoints';
import { DashboardResponse, ApiResponse, ApiError } from '@/types';
import { errorLog, debugLog } from '@/lib/utils';

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
// Get Dashboard Data
// -----------------------------------------------------------------------------

export async function getDashboardDataAction(): Promise<ApiResponse<DashboardResponse>> {
  try {
    debugLog('Get dashboard data');

    const authHeaders = await getAuthHeaders();

    const response = await apiGet<DashboardResponse>(
      DASHBOARD_ENDPOINTS.DASHBOARD,
      { headers: authHeaders }
    );

    debugLog('Dashboard data retrieved', {
      totalRevenue: response.data.summary.total_revenue,
      totalTransactions: response.data.summary.total_transactions,
    });

    return {
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Get dashboard data failed', error);

    const apiError = error as ApiError;
    return {
      error: apiError.message || 'Failed to fetch dashboard data',
      status_code: apiError.status,
    };
  }
}