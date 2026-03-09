// =============================================================================
// DEWPORTAL FRONTEND - API MODULE EXPORT
// =============================================================================
// Central export for all API-related functionality.
// =============================================================================

// API Client
export {
  apiClient,
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  checkApiHealth,
} from './client';

export type {
  ApiClientConfig,
  ApiResponse,
  ApiError,
} from './client';

// M2M Authentication
export {
  m2mAuth,
  loadPrivateKey,
  generateM2MToken,
  getM2MHeaders,
  clearTokenCache,
  clearPrivateKeyCache,
  clearAllCaches,
  validateM2MConfig,
} from './m2m';

export type {
  M2MTokenPayload,
  M2MTokenResult,
} from './m2m';

// Endpoints
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
  buildPaginationParams,
  buildFilterParams,
  buildDateRangeParams,
  buildSortParams,
} from './endpoints';