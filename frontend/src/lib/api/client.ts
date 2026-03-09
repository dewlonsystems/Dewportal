// =============================================================================
// DEWPORTAL FRONTEND - API CLIENT CONFIGURATION
// =============================================================================
// Axios client configuration for API requests.
// NOTE: This is for SERVER-SIDE use only (Server Actions).
// Browser should NEVER make direct API calls to Django.
// =============================================================================

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosHeaders,
} from 'axios';
import { API_BASE_URL } from '@/constants/api';
import { errorLog, debugLog } from '@/lib/utils';
import { getM2MHeaders } from './m2m';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ApiClientConfig extends AxiosRequestConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: Record<string, string[]>;
}

// -----------------------------------------------------------------------------
// Client Configuration
// -----------------------------------------------------------------------------

const DEFAULT_CONFIG: ApiClientConfig = {
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
};

// -----------------------------------------------------------------------------
// Create Axios Instance
// -----------------------------------------------------------------------------

const apiClient: AxiosInstance = axios.create(DEFAULT_CONFIG);

// -----------------------------------------------------------------------------
// Request Interceptor
// -----------------------------------------------------------------------------

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    debugLog('API Request', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
    });

    // Add M2M authentication headers for all requests
    // This is CRITICAL - all Django API calls must have M2M auth
    try {
      const m2mHeaders = await getM2MHeaders();
      
      // Properly set headers using AxiosHeaders methods
      // This fixes the TypeScript type error with Axios v1.x
      Object.entries(m2mHeaders).forEach(([key, value]) => {
        if (value) {
          config.headers.set(key, value);
        }
      });

    } catch (error) {
      errorLog('Failed to add M2M headers', error);
      throw new Error('M2M authentication failed');
    }

    return config;
  },
  (error: AxiosError) => {
    errorLog('API Request Error', error);
    return Promise.reject(error);
  }
);

// -----------------------------------------------------------------------------
// Response Interceptor
// -----------------------------------------------------------------------------

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    debugLog('API Response', {
      status: response.status,
      url: response.config.url,
    });

    return response;
  },
  (error: AxiosError) => {
    // 🎯 Extract meaningful message from Django response
    const responseData = error.response?.data as Record<string, unknown>;
    
    let djangoMessage = '';
    
    // Check common Django REST Framework error patterns
    if (responseData) {
      if (typeof responseData.detail === 'string') {
        djangoMessage = responseData.detail; // { "detail": "Invalid credentials" }
      } else if (Array.isArray(responseData.non_field_errors)) {
        djangoMessage = responseData.non_field_errors[0]; // { "non_field_errors": ["Invalid credentials"] }
      } else if (typeof responseData.error === 'string') {
        djangoMessage = responseData.error; // { "error": "Invalid credentials" }
      } else if (typeof responseData.message === 'string') {
        djangoMessage = responseData.message; // { "message": "Invalid credentials" }
      }
      
      // Fallback: find first field with array errors (e.g., { "username": ["required"] })
      if (!djangoMessage) {
        const firstFieldError = Object.values(responseData).find(
          (val) => Array.isArray(val) && val.length > 0 && typeof val[0] === 'string'
        ) as string[];
        if (firstFieldError?.[0]) {
          djangoMessage = firstFieldError[0];
        }
      }
    }

    const errorData: ApiError = {
      message: djangoMessage || error.message || 'An error occurred', // ✅ Prioritize Django message
      status: error.response?.status,
      code: (responseData?.error as string) || (responseData?.code as string),
      details: responseData as Record<string, string[]>,
    };

    errorLog('API Response Error', {
      ...errorData,
      url: error.config?.url,
      method: error.config?.method,
    });

    return Promise.reject(errorData);
  }
);

// -----------------------------------------------------------------------------
// API Client Methods
// -----------------------------------------------------------------------------

/**
 * GET request
 */
export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.get<T>(url, config);
  return {
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers as Record<string, string>,
  };
}

/**
 * POST request
 */
export async function apiPost<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.post<T>(url, data, config);
  return {
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers as Record<string, string>,
  };
}

/**
 * PUT request
 */
export async function apiPut<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.put<T>(url, data, config);
  return {
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers as Record<string, string>,
  };
}

/**
 * PATCH request
 */
export async function apiPatch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.patch<T>(url, data, config);
  return {
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers as Record<string, string>,
  };
}

/**
 * DELETE request
 */
export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> {
  const response = await apiClient.delete<T>(url, config);
  return {
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers as Record<string, string>,
  };
}

// -----------------------------------------------------------------------------
// Health Check
// -----------------------------------------------------------------------------

/**
 * Check API health
 */
export async function checkApiHealth(): Promise<{
  healthy: boolean;
  status?: number;
  error?: string;
}> {
  try {
    const response = await apiClient.get('/api/health/');
    return {
      healthy: response.status === 200,
      status: response.status,
    };
  } catch (error) {
    return {
      healthy: false,
      error: (error as ApiError).message,
    };
  }
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export { apiClient };
export default apiClient;