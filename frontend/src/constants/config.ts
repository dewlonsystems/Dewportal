// =============================================================================
// DEWPORTAL FRONTEND - APPLICATION CONFIGURATION
// =============================================================================
// All application configuration values centralized in one location.
// =============================================================================

// -----------------------------------------------------------------------------
// Application Settings
// -----------------------------------------------------------------------------

export const APP_CONFIG = {
  NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Dewlon Portal',
  URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  VERSION: '1.0.0',
  ENVIRONMENT: process.env.NODE_ENV || 'development',
} as const;

// -----------------------------------------------------------------------------
// Feature Flags
// -----------------------------------------------------------------------------

export const FEATURE_FLAGS = {
  ENABLE_MPESA: process.env.NEXT_PUBLIC_ENABLE_MPESA === 'true',
  ENABLE_PAYSTACK: process.env.NEXT_PUBLIC_ENABLE_PAYSTACK === 'true',
  ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
} as const;

// -----------------------------------------------------------------------------
// WebSocket Configuration
// -----------------------------------------------------------------------------

export const WS_CONFIG = {
  HEARTBEAT_INTERVAL: parseInt(process.env.NEXT_PUBLIC_WS_HEARTBEAT_INTERVAL || '30000', 10),
  RECONNECT_INTERVAL: parseInt(process.env.NEXT_PUBLIC_WS_RECONNECT_INTERVAL || '5000', 10),
  MAX_RECONNECT_ATTEMPTS: 5,
  CONNECTION_TIMEOUT: 10000,
} as const;

// -----------------------------------------------------------------------------
// Session Configuration
// -----------------------------------------------------------------------------

export const SESSION_CONFIG = {
  TIMEOUT: parseInt(process.env.NEXT_PUBLIC_SESSION_TIMEOUT || '900000', 10), // 15 minutes
  REFRESH_THRESHOLD: 60000, // Refresh token 1 minute before expiry
  STORAGE_KEY: 'dewportal_session',
  TOKEN_KEY: 'dewportal_token',
} as const;

// -----------------------------------------------------------------------------
// Pagination Configuration
// -----------------------------------------------------------------------------

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// -----------------------------------------------------------------------------
// Form Configuration
// -----------------------------------------------------------------------------

export const FORM_CONFIG = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBER: true,
  PASSWORD_REQUIRE_SPECIAL: true,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  PHONE_NUMBER_PATTERN: /^\+?[\d\s-]{10,15}$/,
} as const;

// -----------------------------------------------------------------------------
// Payment Configuration
// -----------------------------------------------------------------------------

export const PAYMENT_CONFIG = {
  MPESA: {
    ENABLED: FEATURE_FLAGS.ENABLE_MPESA,
    MIN_AMOUNT: 1,
    MAX_AMOUNT: 150000,
    CURRENCY: 'KES',
  },
  PAYSTACK: {
    ENABLED: FEATURE_FLAGS.ENABLE_PAYSTACK,
    MIN_AMOUNT: 1,
    MAX_AMOUNT: 1000000,
    CURRENCY: 'KES',
  },
} as const;

// -----------------------------------------------------------------------------
// Date & Time Configuration
// -----------------------------------------------------------------------------

export const DATE_CONFIG = {
  TIMEZONE: 'Africa/Nairobi',
  DATE_FORMAT: 'MMM dd, yyyy',
  DATETIME_FORMAT: 'MMM dd, yyyy HH:mm:ss',
  DISPLAY_FORMAT: 'dd/MM/yyyy',
  API_FORMAT: 'yyyy-MM-dd',
} as const;

// -----------------------------------------------------------------------------
// UI Configuration
// -----------------------------------------------------------------------------

export const UI_CONFIG = {
  SIDEBAR_WIDTH: 280,
  HEADER_HEIGHT: 64,
  CONTAINER_MAX_WIDTH: 1200,
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 5000,
  MODAL_CLOSE_ON_OVERLAY: true,
  TABLE_ROWS_PER_PAGE: 20,
} as const;

// -----------------------------------------------------------------------------
// Security Configuration
// -----------------------------------------------------------------------------

export const SECURITY_CONFIG = {
  ENABLE_HTTPS: process.env.NODE_ENV === 'production',
  ENABLE_CSP: true,
  ENABLE_HSTS: true,
  SESSION_SECURE_COOKIE: process.env.NODE_ENV === 'production',
} as const;

// -----------------------------------------------------------------------------
// Logging Configuration
// -----------------------------------------------------------------------------

export const LOGGING_CONFIG = {
  ENABLE_CONSOLE_LOG: FEATURE_FLAGS.ENABLE_DEBUG,
  ENABLE_ERROR_REPORTING: process.env.NODE_ENV === 'production',
  LOG_LEVEL: FEATURE_FLAGS.ENABLE_DEBUG ? 'debug' : 'error',
} as const;

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Check if app is in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if app is in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Get feature flag value
 */
export function getFeatureFlag(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag];
}

/**
 * Get config value with fallback
 */
export function getConfig<T>(key: string, fallback: T): T {
  const keys = key.split('.');
  let value: unknown = {
    APP_CONFIG,
    FEATURE_FLAGS,
    WS_CONFIG,
    SESSION_CONFIG,
    PAGINATION_CONFIG,
    FORM_CONFIG,
    PAYMENT_CONFIG,
    DATE_CONFIG,
    UI_CONFIG,
    SECURITY_CONFIG,
    LOGGING_CONFIG,
  };

  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k];
  }

  return (value as T) ?? fallback;
}