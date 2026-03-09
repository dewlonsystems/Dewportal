// =============================================================================
// DEWPORTAL FRONTEND - AUDIT LOG ZOD SCHEMAS
// =============================================================================
// Validation schemas for audit log queries and responses.
// =============================================================================

import { z } from 'zod';
import {
  idSchema,
  auditSeverityEnum,
  dateRangeSchema,
  paginationSchema,
} from './common';

// -----------------------------------------------------------------------------
// Audit Action Types
// -----------------------------------------------------------------------------

export const auditActionTypeEnum = z.enum([
  'login',
  'logout',
  'login_failed',
  'account_locked',
  'password_changed',
  'password_reset_requested',
  'password_reset_approved',
  'password_reset_rejected',
  'user_created',
  'user_updated',
  'user_deleted',
  'user_disabled',
  'user_enabled',
  'transaction_initiated',
  'transaction_completed',
  'transaction_failed',
  'payment_initiated',
  'payment_callback',
  'payment_webhook',
  'ledger_entry_created',
  'profile_updated',
  'token_blacklisted',
  'token_refreshed',
  'session_expired',
  'permission_denied',
  'api_request',
  'websocket_connected',
  'websocket_disconnected',
  'system_event',
  'config_changed',
  'export_data',
  'integrity_check',
  'other',
]);

export type AuditActionType = z.infer<typeof auditActionTypeEnum>;

// -----------------------------------------------------------------------------
// Audit Log Filter Schema
// -----------------------------------------------------------------------------

export const auditLogFilterSchema = z.object({
  user_id: idSchema.optional(),
  action_type: auditActionTypeEnum.optional(),
  category: z.string().optional(),
  severity: auditSeverityEnum.optional(),
  date_from: z.string().datetime().optional().nullable(),
  date_to: z.string().datetime().optional().nullable(),
  search: z.string().optional(),
  cursor: z.string().nullable().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type AuditLogFilterInput = z.infer<typeof auditLogFilterSchema>;

// -----------------------------------------------------------------------------
// Audit Log Response Schema
// -----------------------------------------------------------------------------

export const auditLogResponseSchema = z.object({
  id: z.number(),
  user: z.number().nullable().optional(),
  user_details: z
    .object({
      id: z.number(),
      username: z.string(),
      email: z.string().email(),
      first_name: z.string(),
      last_name: z.string(),
      role: z.enum(['admin', 'staff']),
    })
    .nullable()
    .optional(),
  action_type: auditActionTypeEnum,
  severity: auditSeverityEnum,
  category: z.string(),
  description: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  related_object_type: z.string().nullable().optional(),
  related_object_id: z.number().nullable().optional(),
  related_object_reference: z.string().nullable().optional(),
  related_object_details: z
    .object({
      type: z.string(),
      id: z.number(),
      reference: z.string(),
    })
    .nullable()
    .optional(),
  ip_address: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  request_method: z.string().nullable().optional(),
  request_path: z.string().nullable().optional(),
  session_id: z.string().nullable().optional(),
  server_hostname: z.string().nullable().optional(),
  is_finalized: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type AuditLogResponse = z.infer<typeof auditLogResponseSchema>;

// -----------------------------------------------------------------------------
// Audit Log Cursor Pagination Response
// -----------------------------------------------------------------------------

export const auditLogCursorResponseSchema = z.object({
  records: z.array(auditLogResponseSchema),
  next_cursor: z.string().nullable(),
  previous_cursor: z.string().nullable(),
  has_more: z.boolean(),
  limit: z.number(),
  total_returned: z.number(),
  filters_applied: z.record(z.string(), z.unknown()),
});

export type AuditLogCursorResponse = z.infer<typeof auditLogCursorResponseSchema>;

// -----------------------------------------------------------------------------
// Audit Summary Schema
// -----------------------------------------------------------------------------

export const auditSummarySchema = z.object({
  period_counts: z.object({
    last_24h: z.number(),
    last_7d: z.number(),
    last_30d: z.number(),
    total: z.number(),
  }),
  severity_breakdown: z.record(z.string(), z.number()),
  top_action_types: z.array(
    z.object({
      action_type: auditActionTypeEnum,
      count: z.number(),
    })
  ),
  category_breakdown: z.record(z.string(), z.number()).optional(),
  unique_users: z.number().nullable().optional(),
  generated_at: z.string().datetime(),
});

export type AuditSummary = z.infer<typeof auditSummarySchema>;

// -----------------------------------------------------------------------------
// User Last Seen Response
// -----------------------------------------------------------------------------

export const userLastSeenResponseSchema = z.object({
  users: z.array(
    z.object({
      id: z.number(),
      username: z.string(),
      email: z.string().email(),
      first_name: z.string(),
      last_name: z.string(),
      role: z.enum(['admin', 'staff']),
      last_seen: z.string().datetime().nullable().optional(),
      is_active: z.boolean(),
      is_locked: z.boolean(),
      is_online: z.boolean(),
    })
  ),
  count: z.number(),
});

export type UserLastSeenResponse = z.infer<typeof userLastSeenResponseSchema>;

// -----------------------------------------------------------------------------
// Export Audit Schemas
// -----------------------------------------------------------------------------

export const auditSchemas = {
  auditActionType: auditActionTypeEnum,
  auditLogFilter: auditLogFilterSchema,
  auditLogResponse: auditLogResponseSchema,
  auditLogCursorResponse: auditLogCursorResponseSchema,
  auditSummary: auditSummarySchema,
  userLastSeenResponse: userLastSeenResponseSchema,
};