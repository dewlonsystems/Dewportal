// =============================================================================
// DEWPORTAL FRONTEND - COMMON ZOD SCHEMAS
// =============================================================================
// Shared validation schemas used across multiple domains.
// =============================================================================

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Pagination & Filtering
// -----------------------------------------------------------------------------

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().nullable().optional(),
});

export const sortSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']).default('asc'),
});

export const dateRangeSchema = z.object({
  date_from: z.string().datetime().optional().nullable(),
  date_to: z.string().datetime().optional().nullable(),
});

// -----------------------------------------------------------------------------
// Common Field Validators
// -----------------------------------------------------------------------------

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address')
  .transform((val) => val.toLowerCase().trim());

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must not exceed 50 characters')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Username can only contain letters, numbers, and underscores'
  )
  .transform((val) => val.trim());

export const phoneNumberSchema = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number must not exceed 15 digits')
  .regex(
    /^\+?[\d\s-]+$/,
    'Phone number can only contain digits, spaces, hyphens, and plus sign'
  )
  .transform((val) => val.replace(/\D/g, ''));

export const firstNameSchema = z
  .string()
  .min(1, 'First name is required')
  .max(50, 'First name must not exceed 50 characters')
  .regex(/^[a-zA-Z\s]+$/, 'First name can only contain letters and spaces')
  .transform((val) => val.trim());

export const lastNameSchema = z
  .string()
  .min(1, 'Last name is required')
  .max(50, 'Last name must not exceed 50 characters')
  .regex(/^[a-zA-Z\s]+$/, 'Last name can only contain letters and spaces')
  .transform((val) => val.trim());

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    'Password must contain at least one special character'
  );

export const amountSchema = z.coerce
  .number()
  .positive('Amount must be greater than zero')
  .max(1000000, 'Amount must not exceed 1,000,000 KES');

export const referenceSchema = z
  .string()
  .min(1, 'Reference is required')
  .max(100, 'Reference must not exceed 100 characters');

export const descriptionSchema = z
  .string()
  .max(1000, 'Description must not exceed 1000 characters')
  .optional()
  .nullable();

export const reasonSchema = z
  .string()
  .max(500, 'Reason must not exceed 500 characters')
  .optional()
  .nullable();

// -----------------------------------------------------------------------------
// Role & Status Enums
// -----------------------------------------------------------------------------

export const roleEnum = z.enum(['admin', 'staff']);

export const transactionStatusEnum = z.enum(['pending', 'completed', 'failed', 'cancelled']);

export const paymentMethodEnum = z.enum(['mpesa', 'paystack']);

export const notificationSeverityEnum = z.enum(['info', 'warning', 'error', 'success']);

export const auditSeverityEnum = z.enum(['info', 'warning', 'error', 'critical']);

// -----------------------------------------------------------------------------
// ID Schemas
// -----------------------------------------------------------------------------

export const idSchema = z.coerce.number().int().positive();

export const uuidSchema = z.string().uuid('Invalid UUID format');

// -----------------------------------------------------------------------------
// Export Common Schemas
// -----------------------------------------------------------------------------

export const commonSchemas = {
  pagination: paginationSchema,
  sort: sortSchema,
  dateRange: dateRangeSchema,
  email: emailSchema,
  username: usernameSchema,
  phoneNumber: phoneNumberSchema,
  firstName: firstNameSchema,
  lastName: lastNameSchema,
  password: passwordSchema,
  amount: amountSchema,
  reference: referenceSchema,
  description: descriptionSchema,
  reason: reasonSchema,
  role: roleEnum,
  transactionStatus: transactionStatusEnum,
  paymentMethod: paymentMethodEnum,
  notificationSeverity: notificationSeverityEnum,
  auditSeverity: auditSeverityEnum,
  id: idSchema,
  uuid: uuidSchema,
};