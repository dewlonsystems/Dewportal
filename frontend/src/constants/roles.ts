// =============================================================================
// DEWPORTAL FRONTEND - ROLE DEFINITIONS
// =============================================================================
// All user role constants and permissions.
// =============================================================================

// -----------------------------------------------------------------------------
// Role Types
// -----------------------------------------------------------------------------

export type UserRole = 'admin' | 'staff';

// -----------------------------------------------------------------------------
// Role Constants
// -----------------------------------------------------------------------------

export const ROLES = {
  ADMIN: 'admin',  // ✅ Remove `as UserRole` - let `as const` infer literal type
  STAFF: 'staff',  // ✅ Same here
} as const;

// -----------------------------------------------------------------------------
// Role Labels (Display Names)
// -----------------------------------------------------------------------------

export const ROLE_LABELS: Record<UserRole, string> = {
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.STAFF]: 'Staff Member',
}; // ✅ Removed `as const` (conflicts with Record + computed keys)

// -----------------------------------------------------------------------------
// Role Descriptions
// -----------------------------------------------------------------------------

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [ROLES.ADMIN]: 'Full system access with user management capabilities',
  [ROLES.STAFF]: 'Limited access to personal data and transactions',
}; // ✅ Removed `as const`

// -----------------------------------------------------------------------------
// Role Permissions
// -----------------------------------------------------------------------------

export interface RolePermissions {
  canViewDashboard: boolean;
  canViewPayments: boolean;
  canInitiatePayments: boolean;
  canViewTransactions: boolean;
  canViewOwnTransactions: boolean;
  canViewAllTransactions: boolean;
  canViewUsers: boolean;
  canCreateUsers: boolean;
  canUpdateUsers: boolean;
  canDeleteUsers: boolean;
  canViewAuditLogs: boolean;
  canExportData: boolean;
  canManageProfile: boolean;
  canRequestPasswordReset: boolean;
  canApprovePasswordReset: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  [ROLES.ADMIN]: {
    canViewDashboard: true,
    canViewPayments: true,
    canInitiatePayments: true,
    canViewTransactions: true,
    canViewOwnTransactions: true,
    canViewAllTransactions: true,
    canViewUsers: true,
    canCreateUsers: true,
    canUpdateUsers: true,
    canDeleteUsers: true,
    canViewAuditLogs: true,
    canExportData: true,
    canManageProfile: true,
    canRequestPasswordReset: true,
    canApprovePasswordReset: true,
  },
  [ROLES.STAFF]: {
    canViewDashboard: true,
    canViewPayments: true,
    canInitiatePayments: true,
    canViewTransactions: true,
    canViewOwnTransactions: true,
    canViewAllTransactions: false,
    canViewUsers: false,
    canCreateUsers: false,
    canUpdateUsers: false,
    canDeleteUsers: false,
    canViewAuditLogs: false,
    canExportData: false,
    canManageProfile: true,
    canRequestPasswordReset: true,
    canApprovePasswordReset: false,
  },
}; // ✅ Removed `as const`

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

/**
 * Check if user is admin
 */
export function isAdmin(role: UserRole | undefined | null): boolean {
  return role === ROLES.ADMIN;
}

/**
 * Check if user is staff
 */
export function isStaff(role: UserRole | undefined | null): boolean {
  return role === ROLES.STAFF;
}

/**
 * Get role label
 */
export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role];
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  return ROLE_DESCRIPTIONS[role];
}

// -----------------------------------------------------------------------------
// Role-Based UI Configuration
// -----------------------------------------------------------------------------

export const ADMIN_ONLY_FEATURES = [
  'user-management',
  'audit-logs',
  'system-settings',
  'data-export',
  'password-reset-approval',
] as const;

export const STAFF_VISIBLE_FEATURES = [
  'dashboard',
  'payments',
  'own-transactions',
  'profile',
  'password-reset-request',
] as const;