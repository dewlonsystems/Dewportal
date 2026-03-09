// =============================================================================
// DEWPORTAL FRONTEND - ZOD SCHEMAS EXPORT
// =============================================================================
// Central export for all validation schemas.
// Import from this file to use schemas throughout the application.
// =============================================================================

export * from './common';
export * from './auth';
export * from './user';
export * from './payment';
export * from './audit';

// -----------------------------------------------------------------------------
// Combined Schema Export
// -----------------------------------------------------------------------------

import { commonSchemas } from './common';
import { authSchemas } from './auth';
import { userSchemas } from './user';
import { paymentSchemas } from './payment';
import { auditSchemas } from './audit';

export const schemas = {
  common: commonSchemas,
  auth: authSchemas,
  user: userSchemas,
  payment: paymentSchemas,
  audit: auditSchemas,
};

// -----------------------------------------------------------------------------
// Type Exports
// -----------------------------------------------------------------------------

export type {
  // Auth
  LoginInput,
  LogoutInput,
  PasswordChangeInput,
  ForcePasswordChangeInput,
  PasswordResetRequestInput,
  SessionVerifyResponse,
  AccountStatusResponse,
  TokenRefreshInput,
  TokenRefreshResponse,
  LoginResponse,
} from './auth';

export type {
  // User
  UserCreateInput,
  UserUpdateInput,
  ProfileUpdateInput,
  UserResponse,
  UserListResponse,
  StaffPasswordResetRequestInput,
  PasswordResetRequestResponse,
  UserActionInput,
  UserFilterInput,
} from './user';

export type {
  // Payment
  TransactionInitiateInput,
  TransactionInitiateResponse,
  TransactionResponse,
  TransactionListResponse,
  TransactionSummary,
  TransactionFilterInput,
  MpesaCallbackInput,
  PaystackWebhookInput,
} from './payment';

export type {
  // Audit
  AuditActionType,
  AuditLogFilterInput,
  AuditLogResponse,
  AuditLogCursorResponse,
  AuditSummary,
  UserLastSeenResponse,
} from './audit';