// =============================================================================
// DEWPORTAL FRONTEND - PAYMENT ZOD SCHEMAS
// =============================================================================
// Validation schemas for all payment-related forms and data.
// =============================================================================

import { z } from 'zod';
import {
  amountSchema,
  paymentMethodEnum,
  phoneNumberSchema,
  descriptionSchema,
  transactionStatusEnum,
  idSchema,
} from './common';

// -----------------------------------------------------------------------------
// Transaction Initiate
// -----------------------------------------------------------------------------

export const transactionInitiateSchema = z
  .object({
    payment_method: z.enum(['mpesa', 'paystack']),
    amount: z.coerce.number().min(1, 'Amount must be at least 1'),
    phone_number: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      // Phone number is required for Mpesa
      if (data.payment_method === 'mpesa' && !data.phone_number) {
        return false;
      }
      return true;
    },
    {
      message: 'Phone number is required for Mpesa payments',
      path: ['phone_number'],
    }
  );

export type TransactionInitiateInput = z.infer<typeof transactionInitiateSchema>;

// -----------------------------------------------------------------------------
// Transaction Initiate Response
// -----------------------------------------------------------------------------

export const transactionInitiateResponseSchema = z.object({
  success: z.boolean(),
  transaction: z
    .object({
      id: z.number(),
      reference: z.string(),
      amount: z.string(),
      payment_method: paymentMethodEnum,
      status: transactionStatusEnum,
      created_at: z.string().datetime(),
    })
    .optional(),
  checkout_request_id: z.string().optional(),
  authorization_url: z.string().url().optional(),
  access_code: z.string().optional(),
  message: z.string(),
  error: z.string().optional(),
});

export type TransactionInitiateResponse = z.infer<typeof transactionInitiateResponseSchema>;

// -----------------------------------------------------------------------------
// Transaction Response
// -----------------------------------------------------------------------------

export const transactionResponseSchema = z.object({
  id: z.number(),
  reference: z.string(),
  provider_reference: z.string().nullable().optional(),
  user: z.number(),
  user_details: z
    .object({
      id: z.number(),
      username: z.string(),
      email: z.string().email(),
      first_name: z.string(),
      last_name: z.string(),
    })
    .optional(),
  amount: z.string(),
  payment_method: paymentMethodEnum,
  status: transactionStatusEnum,
  description: z.string().nullable().optional(),
  mpesa_phone_number: z.string().nullable().optional(),
  mpesa_receipt_number: z.string().nullable().optional(),
  paystack_authorization_url: z.string().url().nullable().optional(),
  created_at: z.string().datetime(),
  callback_received_at: z.string().datetime().nullable().optional(),
});

export type TransactionResponse = z.infer<typeof transactionResponseSchema>;

// -----------------------------------------------------------------------------
// Transaction List Response (Paginated)
// -----------------------------------------------------------------------------

export const transactionListResponseSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(transactionResponseSchema),
});

export type TransactionListResponse = z.infer<typeof transactionListResponseSchema>;

// -----------------------------------------------------------------------------
// Transaction Summary
// -----------------------------------------------------------------------------

export const transactionSummarySchema = z.object({
  total_revenue: z.string(),
  currency: z.string(),
  completed_transactions: z.number(),
  pending_transactions: z.number(),
  failed_transactions: z.number(),
  total_transactions: z.number(),
});

export type TransactionSummary = z.infer<typeof transactionSummarySchema>;

// -----------------------------------------------------------------------------
// Transaction Filter Schema
// -----------------------------------------------------------------------------

export const transactionFilterSchema = z.object({
  status: transactionStatusEnum.optional(),
  payment_method: paymentMethodEnum.optional(),
  user: idSchema.optional(),
  search: z.string().optional(),
  date_from: z.string().datetime().optional().nullable(),
  date_to: z.string().datetime().optional().nullable(),
  ordering: z.string().optional(),
});

export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;

// -----------------------------------------------------------------------------
// Mpesa Callback Schema (for reference - handled by Django)
// -----------------------------------------------------------------------------

export const mpesaCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      CheckoutRequestID: z.string(),
      ResultCode: z.number(),
      ResultDesc: z.string(),
      CallbackMetadata: z
        .object({
          Item: z.array(
            z.object({
              Name: z.string(),
              Value: z.union([z.string(), z.number()]),
            })
          ),
        })
        .optional(),
    }),
  }),
});

export type MpesaCallbackInput = z.infer<typeof mpesaCallbackSchema>;

// -----------------------------------------------------------------------------
// Paystack Webhook Schema (for reference - handled by Django)
// -----------------------------------------------------------------------------

export const paystackWebhookSchema = z.object({
  event: z.string(),
  data: z.object({
    transaction: z.object({
      reference: z.string(),
      status: z.string(),
      amount: z.number(),
      currency: z.string(),
      paid_at: z.string().datetime().optional(),
      channel: z.string().optional(),
    }),
    customer: z
      .object({
        email: z.string().email(),
        customer_code: z.string().optional(),
      })
      .optional(),
  }),
});

export type PaystackWebhookInput = z.infer<typeof paystackWebhookSchema>;

// -----------------------------------------------------------------------------
// Export Payment Schemas
// -----------------------------------------------------------------------------

export const paymentSchemas = {
  transactionInitiate: transactionInitiateSchema,
  transactionInitiateResponse: transactionInitiateResponseSchema,
  transactionResponse: transactionResponseSchema,
  transactionListResponse: transactionListResponseSchema,
  transactionSummary: transactionSummarySchema,
  transactionFilter: transactionFilterSchema,
  mpesaCallback: mpesaCallbackSchema,
  paystackWebhook: paystackWebhookSchema,
};