// =============================================================================
// DEWPORTAL FRONTEND - API ENDPOINT DEFINITIONS
// =============================================================================
// All API endpoint paths centralized in one location.
// NOTE: These are NEVER called directly from the browser.
// All calls go through Server Actions with M2M authentication.
// =============================================================================

// -----------------------------------------------------------------------------
// Base API Configuration
// -----------------------------------------------------------------------------

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

// -----------------------------------------------------------------------------
// API Version
// -----------------------------------------------------------------------------

export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

// -----------------------------------------------------------------------------
// Authentication Endpoints
// -----------------------------------------------------------------------------

export const AUTH_ENDPOINTS = {
  LOGIN: `${API_PREFIX}/auth/login/`,
  LOGOUT: `${API_PREFIX}/auth/logout/`,
  TOKEN_REFRESH: `${API_PREFIX}/auth/token/refresh/`,
  FORCE_PASSWORD_CHANGE: `${API_PREFIX}/auth/password/force-change/`,
  SESSION_VERIFY: `${API_PREFIX}/auth/session/verify/`,
  ACCOUNT_STATUS: `${API_PREFIX}/auth/account/status/`,
} as const;

// -----------------------------------------------------------------------------
// User Management Endpoints
// -----------------------------------------------------------------------------

export const USER_ENDPOINTS = {
  LIST: `${API_PREFIX}/users/`,
  DETAIL: (id: number) => `${API_PREFIX}/users/${id}/`,
  PROFILE: `${API_PREFIX}/users/profile/`,
  PASSWORD_CHANGE: `${API_PREFIX}/users/password/change/`,
  PASSWORD_RESET_REQUEST: `${API_PREFIX}/users/password-reset-request/`,
  PASSWORD_RESET_REQUESTS_ADMIN: `${API_PREFIX}/users/password-reset-requests/`,
  PASSWORD_RESET_REQUEST_ACTION: (id: number, action: string) =>
    `${API_PREFIX}/users/password-reset-requests/${id}/action/${action}/`,
  USER_ACTION: (id: number, action: string) =>
    `${API_PREFIX}/users/${id}/action/${action}/`,
} as const;

// -----------------------------------------------------------------------------
// Payment Endpoints
// -----------------------------------------------------------------------------

export const PAYMENT_ENDPOINTS = {
  INITIATE: `${API_PREFIX}/payments/initiate/`,
  TRANSACTIONS_LIST: `${API_PREFIX}/payments/transactions/`,
  TRANSACTIONS_DETAIL: (id: number) => `${API_PREFIX}/payments/transactions/${id}/`,
  SUMMARY: `${API_PREFIX}/payments/summary/`,
  // Callbacks/Webhooks - handled by Django directly, not frontend
  MPESA_CALLBACK: `${API_PREFIX}/payments/callbacks/mpesa/`,
  PAYSTACK_WEBHOOK: `${API_PREFIX}/payments/webhooks/paystack/`,
} as const;

// -----------------------------------------------------------------------------
// Ledger Endpoints
// -----------------------------------------------------------------------------

export const LEDGER_ENDPOINTS = {
  ENTRIES_LIST: `${API_PREFIX}/ledger/entries/`,
  ENTRIES_DETAIL: (id: number) => `${API_PREFIX}/ledger/entries/${id}/`,
  BALANCE: `${API_PREFIX}/ledger/balance/`,
  EXPORT: `${API_PREFIX}/ledger/export/`,
  INTEGRITY_CHECK: `${API_PREFIX}/ledger/integrity-check/`,
} as const;

// -----------------------------------------------------------------------------
// Audit Log Endpoints
// -----------------------------------------------------------------------------

export const AUDIT_ENDPOINTS = {
  LOGS_LIST: `${API_PREFIX}/logs/logs/`,
  LOGS_DETAIL: (id: number) => `${API_PREFIX}/logs/logs/${id}/`,
  SUMMARY: `${API_PREFIX}/logs/summary/`,
  USERS_LAST_SEEN: `${API_PREFIX}/logs/users/last-seen/`,
  SESSIONS: `${API_PREFIX}/logs/sessions/`,
} as const;

// -----------------------------------------------------------------------------
// Notification Endpoints
// -----------------------------------------------------------------------------

export const NOTIFICATION_ENDPOINTS = {
  LIST: `${API_PREFIX}/events/`,
  DETAIL: (id: number) => `${API_PREFIX}/events/${id}/`,
  MARK_READ: `${API_PREFIX}/events/mark-read/`,
  MARK_ALL_READ: `${API_PREFIX}/events/mark-all-read/`,
  BULK_UPDATE: `${API_PREFIX}/events/bulk-update/`,
  SUMMARY: `${API_PREFIX}/events/summary/`,
  WEBSOCKET_CONNECTIONS: `${API_PREFIX}/events/websocket-connections/`,
  WEBSOCKET_TERMINATE: (id: number) =>
    `${API_PREFIX}/events/websocket-connections/${id}/terminate/`,
} as const;

// -----------------------------------------------------------------------------
// Dashboard Endpoints
// -----------------------------------------------------------------------------

export const DASHBOARD_ENDPOINTS = {
  DASHBOARD: `${API_PREFIX}/system/dashboard/`,
  HEALTH: `${API_PREFIX}/system/health/`,
} as const;

// -----------------------------------------------------------------------------
// WebSocket Endpoints
// -----------------------------------------------------------------------------

export const WS_ENDPOINTS = {
  NOTIFICATIONS: (token: string) => `/ws/notifications/${token}/`,
  HEALTH: `/ws/health/`,
} as const;

// -----------------------------------------------------------------------------
// Health Check Endpoints
// -----------------------------------------------------------------------------

export const HEALTH_ENDPOINTS = {
  API_HEALTH: '/api/health/',
  WS_HEALTH: WS_ENDPOINTS.HEALTH,
} as const;

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Build URL with query parameters
 */
export function buildUrl(baseUrl: string, params?: Record<string, string | number | null>): string {
  if (!params) return baseUrl;

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Get full API URL (for server-side use only)
 */
export function getFullApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`;
}

/**
 * Get full WebSocket URL (for server-side use only)
 */
export function getFullWsUrl(endpoint: string): string {
  return `${WS_BASE_URL}${endpoint}`;
}