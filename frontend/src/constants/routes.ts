// =============================================================================
// DEWPORTAL FRONTEND - ROUTE DEFINITIONS
// =============================================================================
// All application routes centralized in one location.
// Used for navigation, redirects, and middleware protection.
// =============================================================================

// -----------------------------------------------------------------------------
// Public Routes (No Authentication Required)
// -----------------------------------------------------------------------------

export const PUBLIC_ROUTES = {
  HOME: '/',
  LOGIN: '/login',
} as const;

// -----------------------------------------------------------------------------
// Authentication Routes (No Auth or Redirect if Authenticated)
// -----------------------------------------------------------------------------

export const AUTH_ROUTES = {
  LOGIN: '/login',
  FORCE_PASSWORD_CHANGE: '/force-password-change',
} as const;

// -----------------------------------------------------------------------------
// Dashboard Routes (Authentication Required)
// -----------------------------------------------------------------------------

export const DASHBOARD_ROUTES = {
  ROOT: '/dashboard',
  DASHBOARD: '/dashboard',
  PAYMENTS: '/payments',
  TRANSACTIONS: '/transactions',
  VERIFY: '/payments/verify',
  USERS: '/users',
  PROFILE: '/profile',
  AUDIT: '/audit',
} as const;

// -----------------------------------------------------------------------------
// Admin-Only Routes (Admin Role Required)
// -----------------------------------------------------------------------------

export const ADMIN_ROUTES = {
  USERS: '/users',
  AUDIT: '/audit',
} as const;

// -----------------------------------------------------------------------------
// API Routes (Internal Next.js API - if needed)
// -----------------------------------------------------------------------------

export const API_ROUTES = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  PAYMENTS: '/api/payments',
  TRANSACTIONS: '/api/transactions',
} as const;

// -----------------------------------------------------------------------------
// External URLs
// -----------------------------------------------------------------------------

export const EXTERNAL_URLS = {
  // Mpesa STK Push callback (handled by Django, not frontend)
  MPESA_CALLBACK: process.env.NEXT_PUBLIC_API_URL + '/api/v1/payments/callbacks/mpesa/',
  
  // Paystack webhook (handled by Django, not frontend)
  PAYSTACK_WEBHOOK: process.env.NEXT_PUBLIC_API_URL + '/api/v1/payments/webhooks/paystack/',
  
  // Support & Documentation
  SUPPORT_EMAIL: 'support@dewlon.com',
  SECURITY_EMAIL: 'security@dewlon.com',
} as const;

// -----------------------------------------------------------------------------
// Route Metadata
// -----------------------------------------------------------------------------

export interface RouteConfig {
  path: string;
  title: string;
  description?: string;
  requiresAuth: boolean;
  allowedRoles?: ('admin' | 'staff')[];
  icon?: string;
}

export const ROUTE_CONFIGS: Record<string, RouteConfig> = {
  [DASHBOARD_ROUTES.DASHBOARD]: {
    path: DASHBOARD_ROUTES.DASHBOARD,
    title: 'Dashboard',
    description: 'Overview and analytics',
    requiresAuth: true,
    allowedRoles: ['admin', 'staff'],
    icon: 'layout-dashboard',
  },
  [DASHBOARD_ROUTES.PAYMENTS]: {
    path: DASHBOARD_ROUTES.PAYMENTS,
    title: 'Payments',
    description: 'Initiate and manage payments',
    requiresAuth: true,
    allowedRoles: ['admin', 'staff'],
    icon: 'credit-card',
  },
  [DASHBOARD_ROUTES.TRANSACTIONS]: {
    path: DASHBOARD_ROUTES.TRANSACTIONS,
    title: 'Transactions',
    description: 'View transaction history',
    requiresAuth: true,
    allowedRoles: ['admin', 'staff'],
    icon: 'receipt',
  },
  [DASHBOARD_ROUTES.USERS]: {
    path: DASHBOARD_ROUTES.USERS,
    title: 'User Management',
    description: 'Manage system users',
    requiresAuth: true,
    allowedRoles: ['admin'],
    icon: 'users',
  },
  [DASHBOARD_ROUTES.PROFILE]: {
    path: DASHBOARD_ROUTES.PROFILE,
    title: 'Profile',
    description: 'Manage your profile',
    requiresAuth: true,
    allowedRoles: ['admin', 'staff'],
    icon: 'user',
  },
  [DASHBOARD_ROUTES.AUDIT]: {
    path: DASHBOARD_ROUTES.AUDIT,
    title: 'Audit Logs',
    description: 'System audit trail',
    requiresAuth: true,
    allowedRoles: ['admin'],
    icon: 'file-text',
  },
};

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Check if a route requires authentication
 */
export function requiresAuth(path: string): boolean {
  return ['/dashboard', '/payments', '/transactions', '/users', '/profile', '/audit']
    .some((p) => path.startsWith(p));
}

/**
 * Check if a route is admin-only
 */
export function isAdminRoute(path: string): boolean {
  return ['/users', '/audit'].some((route) => path.startsWith(route));
}

/**
 * Get allowed roles for a route
 */
export function getAllowedRoles(path: string): ('admin' | 'staff')[] | undefined {
  const config = ROUTE_CONFIGS[path];
  return config?.allowedRoles;
}

/**
 * Get route title from path
 */
export function getRouteTitle(path: string): string {
  const config = ROUTE_CONFIGS[path];
  return config?.title || 'Dewlon Portal';
}

// -----------------------------------------------------------------------------
// Redirect Paths
// -----------------------------------------------------------------------------

export const REDIRECT_AFTER_LOGIN = DASHBOARD_ROUTES.DASHBOARD;
export const REDIRECT_AFTER_LOGOUT = AUTH_ROUTES.LOGIN;
export const REDIRECT_FORCE_PASSWORD_CHANGE = AUTH_ROUTES.FORCE_PASSWORD_CHANGE;