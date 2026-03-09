// =============================================================================
// DEWPORTAL FRONTEND - AUTHENTICATION ZOD SCHEMAS
// =============================================================================
// Validation schemas for all authentication-related forms and data.
// =============================================================================

import { z } from 'zod';
import { emailSchema, usernameSchema, passwordSchema } from './common';

// -----------------------------------------------------------------------------
// Login
// -----------------------------------------------------------------------------

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// -----------------------------------------------------------------------------
// Logout
// -----------------------------------------------------------------------------

export const logoutSchema = z.object({
  refresh: z.string().min(1, 'Refresh token is required'),
});

export type LogoutInput = z.infer<typeof logoutSchema>;

// -----------------------------------------------------------------------------
// Password Change (Regular)
// -----------------------------------------------------------------------------

export const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: passwordSchema,
    confirm_new_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_new_password, {
    message: 'Passwords do not match',
    path: ['confirm_new_password'],
  });

export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

// -----------------------------------------------------------------------------
// Force Password Change (First Login)
// -----------------------------------------------------------------------------

export const forcePasswordChangeSchema = z
  .object({
    temporary_password: z.string().min(1, 'Temporary password is required'),
    new_password: passwordSchema,
    confirm_new_password: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.new_password === data.confirm_new_password, {
    message: 'Passwords do not match',
    path: ['confirm_new_password'],
  })
  .refine((data) => data.temporary_password !== data.new_password, {
    message: 'New password must be different from temporary password',
    path: ['new_password'],
  });

export type ForcePasswordChangeInput = z.infer<typeof forcePasswordChangeSchema>;

// -----------------------------------------------------------------------------
// Password Reset Request (Staff)
// -----------------------------------------------------------------------------

export const passwordResetRequestSchema = z.object({
  reason: z
    .string()
    .max(500, 'Reason must not exceed 500 characters')
    .optional()
    .nullable(),
});

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

// -----------------------------------------------------------------------------
// Password Reset Action (Admin)
// -----------------------------------------------------------------------------

export const passwordResetActionSchema = z.object({
  notes: z
    .string()
    .max(500, 'Notes must not exceed 500 characters')
    .optional()
    .nullable(),
});

export type PasswordResetActionInput = z.infer<typeof passwordResetActionSchema>;

// -----------------------------------------------------------------------------
// Session Verify Response
// -----------------------------------------------------------------------------

export const sessionVerifyResponseSchema = z.object({
  user: z.object({
    id: z.number(),
    username: z.string(),
    email: z.string().email(),
    first_name: z.string(),
    last_name: z.string(),
    role: z.enum(['admin', 'staff']),
    must_change_password: z.boolean(),
  }),
  session_valid: z.boolean(),
});

export type SessionVerifyResponse = z.infer<typeof sessionVerifyResponseSchema>;

// -----------------------------------------------------------------------------
// Account Status Check
// -----------------------------------------------------------------------------

export const accountStatusSchema = z.object({
  username: usernameSchema,
});

export type AccountStatusInput = z.infer<typeof accountStatusSchema>;

export const accountStatusResponseSchema = z.object({
  exists: z.boolean(),
  is_locked: z.boolean().optional(),
  locked_until: z.string().datetime().optional().nullable(),
  is_active: z.boolean().optional(),
  must_change_password: z.boolean().optional(),
});

export type AccountStatusResponse = z.infer<typeof accountStatusResponseSchema>;

// -----------------------------------------------------------------------------
// Token Refresh
// -----------------------------------------------------------------------------

export const tokenRefreshSchema = z.object({
  refresh: z.string().min(1, 'Refresh token is required'),
});

export type TokenRefreshInput = z.infer<typeof tokenRefreshSchema>;

export const tokenRefreshResponseSchema = z.object({
  access: z.string(),
});

export type TokenRefreshResponse = z.infer<typeof tokenRefreshResponseSchema>;

// -----------------------------------------------------------------------------
// Login Response
// -----------------------------------------------------------------------------

export const loginResponseSchema = z.object({
  access: z.string(),
  refresh: z.string(),
  must_change_password: z.boolean(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    email: z.string().email(),
    role: z.enum(['admin', 'staff']),
  }),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

// -----------------------------------------------------------------------------
// Export Auth Schemas
// -----------------------------------------------------------------------------

export const authSchemas = {
  login: loginSchema,
  logout: logoutSchema,
  passwordChange: passwordChangeSchema,
  forcePasswordChange: forcePasswordChangeSchema,
  passwordResetRequest: passwordResetRequestSchema,
  passwordResetAction: passwordResetActionSchema,
  sessionVerifyResponse: sessionVerifyResponseSchema,
  accountStatus: accountStatusSchema,
  accountStatusResponse: accountStatusResponseSchema,
  tokenRefresh: tokenRefreshSchema,
  tokenRefreshResponse: tokenRefreshResponseSchema,
  loginResponse: loginResponseSchema,
};