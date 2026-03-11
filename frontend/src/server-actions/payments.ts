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

    revalidatePath('/transactions');
    revalidatePath('/payments');

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
// Verify Paystack Payment
// -----------------------------------------------------------------------------

export interface PaystackVerifyResponse {
  success: boolean;
  status: 'completed' | 'failed' | 'pending';
  message?: string;
  transaction?: TransactionResponse;
}

export async function verifyPaystackPaymentAction(
  reference: string
): Promise<ApiResponse<PaystackVerifyResponse>> {
  try {
    if (!reference) {
      return {
        success: false,
        error: 'Missing payment reference',
        data: undefined, // ✅ Fixed: use undefined instead of null
      };
    }

    debugLog('Verify Paystack payment', { reference });

    // ✅ Build URL directly to match backend exactly
    // Backend: GET /api/v1/payments/paystack/verify/?reference=DPABC123
    const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';
    const url = `${API_BASE}/api/v1/payments/paystack/verify/?reference=${encodeURIComponent(reference)}`;

    debugLog('Fetching verification URL', { url });

    // ✅ NO auth headers — endpoint allows unauthenticated access
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    // Handle 404 explicitly
    if (response.status === 404) {
      errorLog('Verification endpoint not found', { url, status: response.status });
      return {
        success: false,
        error: 'Verification service unavailable. Please try again later.',
        data: undefined, // ✅ Fixed
      };
    }

    // Handle other HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      errorLog('Verification API error', { 
        status: response.status, 
        url, 
        error: errorData 
      });
      return {
        success: false,
        error: errorData.error || `Verification failed with status ${response.status}`,
        data: undefined, // ✅ Fixed
      };
    }

    const data = await response.json();

    debugLog('Paystack verification result', {
      reference,
      status: data.status,
      success: data.success,
    });

    // Revalidate transactions if payment completed
    if (data.status === 'completed') {
      revalidatePath('/dashboard/transactions');
      revalidatePath('/dashboard/payments');
    }

    return {
      success: true,
      data: {
        status: data.status,
        message: data.message,
        transaction: data.transaction,
        success: data.success,
      },
      status: 200,
    };

  } catch (error) {
    errorLog('Paystack verification failed', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error while verifying payment',
      data: undefined, // ✅ Fixed
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