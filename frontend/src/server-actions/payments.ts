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
// M2M + Auth Headers Helper (for binary/file downloads)
// Used by receipt and export actions that need raw fetch for binary responses.
// -----------------------------------------------------------------------------

async function getFileDownloadHeaders(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  if (!accessToken) {
    throw new Error('401: No access token available');
  }

  const { getM2MHeaders } = await import('@/lib/api/m2m');
  const m2mHeaders = await getM2MHeaders();

  return {
    ...m2mHeaders,
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
        data: undefined,
      };
    }

    debugLog('Verify Paystack payment', { reference });

    // ✅ Use apiGet — automatically attaches X-System-API-Key and
    //    X-M2M-Authorization headers required by M2MAuthenticationMiddleware.
    const url = `${PAYMENT_ENDPOINTS.PAYSTACK_VERIFY}?reference=${encodeURIComponent(reference)}`;

    const response = await apiGet<PaystackVerifyResponse>(url, {
      // No Authorization header — endpoint is AllowAny for user JWT,
      // but M2M headers are handled automatically by apiClient.
    });

    debugLog('Paystack verification result', {
      reference,
      status: response.data.status,
      success: response.data.success,
    });

    if (response.data.status === 'completed') {
      revalidatePath('/transactions');
      revalidatePath('/payments');
    }

    return {
      success: true,
      data: {
        status:      response.data.status,
        message:     response.data.message,
        transaction: response.data.transaction,
        success:     response.data.success,
      },
      status: 200,
    };

  } catch (error) {
    errorLog('Paystack verification failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Network error while verifying payment',
      data: undefined,
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
          status:         filters?.status,
          payment_method: filters?.payment_method,
          search:         filters?.search,
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

// -----------------------------------------------------------------------------
// Download Transaction Receipt (PDF)
// -----------------------------------------------------------------------------

export async function downloadReceiptAction(
  transactionId: number
): Promise<ApiResponse<{ blob: string; filename: string }>> {
  try {
    debugLog('Download receipt', { transactionId });

    const headers = await getFileDownloadHeaders();

    const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';
    const url = `${API_BASE}/api/v1/payments/transactions/${transactionId}/receipt/`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Failed to generate receipt (${response.status})`,
        data: undefined,
      };
    }

    // Convert PDF binary → base64 to pass through server action boundary
    const arrayBuffer = await response.arrayBuffer();
    const base64      = Buffer.from(arrayBuffer).toString('base64');

    const disposition  = response.headers.get('Content-Disposition') || '';
    const filenameMatch = disposition.match(/filename="(.+)"/);
    const filename     = filenameMatch?.[1] || `receipt_${transactionId}.pdf`;

    debugLog('Receipt downloaded', { transactionId, filename });

    return {
      success: true,
      data: { blob: base64, filename },
      status: 200,
    };

  } catch (error) {
    errorLog('Download receipt failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to download receipt',
      data: undefined,
    };
  }
}

// -----------------------------------------------------------------------------
// Export Transactions as PDF
// -----------------------------------------------------------------------------

export async function exportTransactionsPdfAction(filters?: {
  status?: string;
  payment_method?: string;
  date_from?: string;
  date_to?: string;
}): Promise<ApiResponse<{ blob: string; filename: string }>> {
  try {
    debugLog('Export transactions PDF', { filters });

    const headers = await getFileDownloadHeaders();

    const params = new URLSearchParams({ format: 'pdf' });
    if (filters?.status)         params.set('status',         filters.status);
    if (filters?.payment_method) params.set('payment_method', filters.payment_method);
    if (filters?.date_from)      params.set('date_from',      filters.date_from);
    if (filters?.date_to)        params.set('date_to',        filters.date_to);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';
    const url = `${API_BASE}/api/v1/payments/export/?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(60000), // exports can take longer
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Export failed (${response.status})`,
        data: undefined,
      };
    }

    const arrayBuffer   = await response.arrayBuffer();
    const base64        = Buffer.from(arrayBuffer).toString('base64');
    const disposition   = response.headers.get('Content-Disposition') || '';
    const filenameMatch = disposition.match(/filename="(.+)"/);
    const filename      = filenameMatch?.[1] || 'transactions_export.pdf';

    debugLog('PDF export downloaded', { filename });

    return {
      success: true,
      data: { blob: base64, filename },
      status: 200,
    };

  } catch (error) {
    errorLog('Export PDF failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to export transactions as PDF',
      data: undefined,
    };
  }
}

// -----------------------------------------------------------------------------
// Export Transactions as Excel
// -----------------------------------------------------------------------------

export async function exportTransactionsExcelAction(filters?: {
  status?: string;
  payment_method?: string;
  date_from?: string;
  date_to?: string;
}): Promise<ApiResponse<{ blob: string; filename: string }>> {
  try {
    debugLog('Export transactions Excel', { filters });

    const headers = await getFileDownloadHeaders();

    const params = new URLSearchParams({ format: 'excel' });
    if (filters?.status)         params.set('status',         filters.status);
    if (filters?.payment_method) params.set('payment_method', filters.payment_method);
    if (filters?.date_from)      params.set('date_from',      filters.date_from);
    if (filters?.date_to)        params.set('date_to',        filters.date_to);

    const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';
    const url = `${API_BASE}/api/v1/payments/export/?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `Export failed (${response.status})`,
        data: undefined,
      };
    }

    const arrayBuffer   = await response.arrayBuffer();
    const base64        = Buffer.from(arrayBuffer).toString('base64');
    const disposition   = response.headers.get('Content-Disposition') || '';
    const filenameMatch = disposition.match(/filename="(.+)"/);
    const filename      = filenameMatch?.[1] || 'transactions_export.xlsx';

    debugLog('Excel export downloaded', { filename });

    return {
      success: true,
      data: { blob: base64, filename },
      status: 200,
    };

  } catch (error) {
    errorLog('Export Excel failed', error);
    const apiError = error as ApiError;
    return {
      success: false,
      error: apiError.message || 'Failed to export transactions as Excel',
      data: undefined,
    };
  }
}