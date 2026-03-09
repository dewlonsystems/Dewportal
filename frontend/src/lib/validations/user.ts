// =============================================================================
// DEWPORTAL FRONTEND - USER MANAGEMENT ZOD SCHEMAS
// =============================================================================
// Validation schemas for all user-related forms and data.
// =============================================================================

import { z } from 'zod';
import {
  emailSchema,
  usernameSchema,
  phoneNumberSchema,
  firstNameSchema,
  lastNameSchema,
  passwordSchema,
  roleEnum,
  idSchema,
} from './common';

// -----------------------------------------------------------------------------
// User Create (Admin)
// -----------------------------------------------------------------------------

export const userCreateSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    first_name: firstNameSchema,
    last_name: lastNameSchema,
    phone_number: phoneNumberSchema.optional().nullable(),
    role: roleEnum,
    password: passwordSchema.optional(),
    confirm_password: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.password && data.confirm_password) {
        return data.password === data.confirm_password;
      }
      return true;
    },
    {
      message: 'Passwords do not match',
      path: ['confirm_password'],
    }
  );

export type UserCreateInput = z.infer<typeof userCreateSchema>;

// -----------------------------------------------------------------------------
// User Update (Admin or Self)
// -----------------------------------------------------------------------------

export const userUpdateSchema = z.object({
  first_name: firstNameSchema.optional(),
  last_name: lastNameSchema.optional(),
  phone_number: phoneNumberSchema.optional().nullable(),
  email: emailSchema.optional(),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

// -----------------------------------------------------------------------------
// User Profile Update (Self)
// -----------------------------------------------------------------------------

export const profileUpdateSchema = z.object({
  first_name: firstNameSchema,
  last_name: lastNameSchema,
  phone_number: phoneNumberSchema.optional().nullable(),
  email: emailSchema,
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// -----------------------------------------------------------------------------
// User Response Schema
// -----------------------------------------------------------------------------

export const userResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string().optional(),
  phone_number: z.string().nullable().optional(),
  role: roleEnum,
  is_active: z.boolean(),
  is_locked: z.boolean(),
  must_change_password: z.boolean(),
  last_seen: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;

// -----------------------------------------------------------------------------
// User List Response (Paginated)
// -----------------------------------------------------------------------------

export const userListResponseSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(userResponseSchema),
});

export type UserListResponse = z.infer<typeof userListResponseSchema>;

// -----------------------------------------------------------------------------
// Password Reset Request (Staff to Admin)
// -----------------------------------------------------------------------------

export const staffPasswordResetRequestSchema = z.object({
  reason: z
    .string()
    .max(500, 'Reason must not exceed 500 characters')
    .optional()
    .nullable(),
});

export type StaffPasswordResetRequestInput = z.infer<typeof staffPasswordResetRequestSchema>;

// -----------------------------------------------------------------------------
// Password Reset Request Admin Response
// -----------------------------------------------------------------------------

export const passwordResetRequestResponseSchema = z.object({
  id: z.number(),
  user: z.number(),
  user_details: userResponseSchema.optional(),
  status: z.enum(['pending', 'approved', 'rejected']),
  reason: z.string().nullable().optional(),
  admin_notes: z.string().nullable().optional(),
  processed_by: z.number().nullable().optional(),
  processed_by_details: userResponseSchema.optional().nullable(),
  processed_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
});

export type PasswordResetRequestResponse = z.infer<typeof passwordResetRequestResponseSchema>;

// -----------------------------------------------------------------------------
// User Action (Admin: disable, enable, reset_password)
// -----------------------------------------------------------------------------

export const userActionSchema = z.object({
  action: z.enum(['disable', 'enable', 'reset_password']),
});

export type UserActionInput = z.infer<typeof userActionSchema>;

// -----------------------------------------------------------------------------
// User Filter Schema
// -----------------------------------------------------------------------------

export const userFilterSchema = z.object({
  role: roleEnum.optional(),
  is_active: z.coerce.boolean().optional(),
  is_locked: z.coerce.boolean().optional(),
  search: z.string().optional(),
  ordering: z.string().optional(),
});

export type UserFilterInput = z.infer<typeof userFilterSchema>;

// -----------------------------------------------------------------------------
// Export User Schemas
// -----------------------------------------------------------------------------

export const userSchemas = {
  userCreate: userCreateSchema,
  userUpdate: userUpdateSchema,
  profileUpdate: profileUpdateSchema,
  userResponse: userResponseSchema,
  userListResponse: userListResponseSchema,
  staffPasswordResetRequest: staffPasswordResetRequestSchema,
  passwordResetRequestResponse: passwordResetRequestResponseSchema,
  userAction: userActionSchema,
  userFilter: userFilterSchema,
};