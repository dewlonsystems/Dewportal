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
  timeout: 30000,
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

    try {
      const m2mHeaders = await getM2MHeaders();

      Object.entries(m2mHeaders).forEach(([key, value]) => {
        if (value) {
          config.headers.set(key, value);
        }
      });

    } catch (error) {
      errorLog('Request could not be completed', error);
      throw new Error('Service is temporarily unavailable. Please try again later.');
    }

    return config;
  },
  (error: AxiosError) => {
    errorLog('Request failed to send', error);
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
    const responseData = error.response?.data as Record<string, unknown>;

    let djangoMessage = '';

    if (responseData) {
      if (typeof responseData.detail === 'string') {
        djangoMessage = responseData.detail;
      } else if (Array.isArray(responseData.non_field_errors)) {
        djangoMessage = responseData.non_field_errors[0];
      } else if (typeof responseData.error === 'string') {
        djangoMessage = responseData.error;
      } else if (typeof responseData.message === 'string') {
        djangoMessage = responseData.message;
      }

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
      message: djangoMessage || error.message || 'Something went wrong. Please try again.',
      status: error.response?.status,
      code: (responseData?.error as string) || (responseData?.code as string),
      details: responseData as Record<string, string[]>,
    };

    errorLog('Request returned an error', {
      status: errorData.status,
      message: errorData.message,
      url: error.config?.url,
      method: error.config?.method,
    });

    return Promise.reject(errorData);
  }
);

// -----------------------------------------------------------------------------
// API Client Methods
// -----------------------------------------------------------------------------

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
      error: 'Service is currently unavailable.',
    };
  }
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export { apiClient };
export default apiClient;