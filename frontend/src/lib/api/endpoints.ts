// =============================================================================
// DEWPORTAL FRONTEND - API ENDPOINT HELPERS
// =============================================================================
// Helper functions for building API URLs with query parameters.
// Re-exports from constants/api.ts with additional utilities.
// =============================================================================

export {
  API_BASE_URL,
  WS_BASE_URL,
  API_VERSION,
  API_PREFIX,
  AUTH_ENDPOINTS,
  USER_ENDPOINTS,
  PAYMENT_ENDPOINTS,
  LEDGER_ENDPOINTS,
  AUDIT_ENDPOINTS,
  NOTIFICATION_ENDPOINTS,
  DASHBOARD_ENDPOINTS,
  WS_ENDPOINTS,
  HEALTH_ENDPOINTS,
  buildUrl,
  getFullApiUrl,
  getFullWsUrl,
} from '@/constants/api';

// -----------------------------------------------------------------------------
// Additional Endpoint Helpers
// -----------------------------------------------------------------------------

/**
 * Build pagination query params
 */
export function buildPaginationParams(
  page?: number,
  pageSize?: number,
  cursor?: string | null
): Record<string, string | number | null> {
  return {
    page: page ?? null,
    page_size: pageSize ?? null,
    cursor: cursor ?? null,
  };
}

/**
 * Build filter query params
 */
export function buildFilterParams(filters: Record<string, unknown>): Record<string, string | number | null> {
  const params: Record<string, string | number | null> = {};
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params[key] = String(value);
    }
  });
  
  return params;
}

/**
 * Build date range query params
 */
export function buildDateRangeParams(
  dateFrom?: string | null,
  dateTo?: string | null
): Record<string, string | null> {
  return {
    date_from: dateFrom ?? null,
    date_to: dateTo ?? null,
  };
}

/**
 * Build sort query params
 */
export function buildSortParams(field?: string, direction?: 'asc' | 'desc'): Record<string, string | null> {
  if (!field) return { ordering: null };
  return { ordering: direction === 'desc' ? `-${field}` : field };
}