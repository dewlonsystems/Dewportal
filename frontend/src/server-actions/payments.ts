// =============================================================================
// DEWPORTAL FRONTEND - PAYMENT SERVER ACTIONS
// =============================================================================
// All payment-related server actions.
// =============================================================================

'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { apiPost, apiGet } from '@/lib/api';
import { PAYMENT_ENDPOINTS } from '@/lib/api/endpoints';
import { transactionInitiateSchema } from '@/lib/validations';
import {
  TransactionInitiateInput,
  TransactionInitiateResponse,
  TransactionResponse,
  TransactionListResponse,
  TransactionSummary,
  ApiResponse,
  ApiError,
} from '@/types';
import { errorLog, debugLog } from '@/lib/utils';
import {
  buildUrl,
  buildPaginationParams,
  buildFilterParams,
  buildSortParams,
  buildDateRangeParams,
} from '@/lib/api/endpoints';

// -----------------------------------------------------------------------------
// Auth Header Helper
// -----------------------------------------------------------------------------

async function getAuthHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  if (!accessToken) {
    throw new Error('401: No access token available');
  }

  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

// -----------------------------------------------------------------------------
// Initiate Payment
// -----------------------------------------------------------------------------

export async function initiatePaymentAction(
  formData: TransactionInitiateInput
): Promise<ApiResponse<TransactionInitiateResponse>> {
  try {
    const validatedData = transactionInitiateSchema.parse(formData);

    debugLog('Initiate payment', {
      paymentMethod: validatedData.payment_method,
      amount: validatedData.amount,
    });

    const authHeaders = await getAuthHeaders();

    const response = await apiPost<TransactionInitiateResponse>(
      PAYMENT_ENDPOINTS.INITIATE,
      validatedData,
      { headers: authHeaders }
    );

    debugLog('Payment initiated', {
      reference: response.data.transaction?.reference,
      success: response.data.success,
    });

    revalidatePath('/dashboard/transactions');
    revalidatePath('/dashboard/payments');

    return {
      success: true,
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Initiate payment failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Payment initiation failed',
      details: apiError.details,
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Get Transactions
// -----------------------------------------------------------------------------

export async function getTransactionsAction(filters?: {
  page?: number;
  pageSize?: number;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method?: 'mpesa' | 'paystack';
  search?: string;
  date_from?: string;
  date_to?: string;
  ordering?: string;
}): Promise<ApiResponse<TransactionListResponse>> {
  try {
    debugLog('Get transactions', { filters });

    const authHeaders = await getAuthHeaders();

    const params = buildUrl(
      PAYMENT_ENDPOINTS.TRANSACTIONS_LIST,
      {
        ...buildPaginationParams(filters?.page, filters?.pageSize),
        ...buildFilterParams({
          status: filters?.status,
          payment_method: filters?.payment_method,
          search: filters?.search,
        }),
        ...buildDateRangeParams(filters?.date_from, filters?.date_to),
        ...buildSortParams(filters?.ordering),
      }
    );

    const response = await apiGet<TransactionListResponse>(params, {
      headers: authHeaders,
    });

    return {
      success: true,
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Get transactions failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to fetch transactions',
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Get Transaction Detail
// -----------------------------------------------------------------------------

export async function getTransactionDetailAction(
  transactionId: number
): Promise<ApiResponse<TransactionResponse>> {
  try {
    debugLog('Get transaction detail', { transactionId });

    const authHeaders = await getAuthHeaders();

    const response = await apiGet<TransactionResponse>(
      PAYMENT_ENDPOINTS.TRANSACTIONS_DETAIL(transactionId),
      { headers: authHeaders }
    );

    return {
      success: true,
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Get transaction detail failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to fetch transaction',
      status_code: apiError.status,
    };
  }
}

// -----------------------------------------------------------------------------
// Get Transaction Summary
// -----------------------------------------------------------------------------

export async function getTransactionSummaryAction(): Promise<ApiResponse<TransactionSummary>> {
  try {
    debugLog('Get transaction summary');

    const authHeaders = await getAuthHeaders();

    const response = await apiGet<TransactionSummary>(
      PAYMENT_ENDPOINTS.SUMMARY,
      { headers: authHeaders }
    );

    return {
      success: true,
      data: response.data,
      status: 200,
    };

  } catch (error) {
    errorLog('Get transaction summary failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to fetch transaction summary',
      status_code: apiError.status,
    };
  }
}