// =============================================================================
// DEWPORTAL FRONTEND - TANSTACK QUERY PROVIDER
// =============================================================================
// Provides React Query (TanStack Query) context to the entire application.
// Handles server state, caching, background refetching, and WebSocket-triggered updates.
// =============================================================================

'use client';

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode, type ReactElement } from 'react';
import { errorLog, debugLog } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface QueryProviderProps {
  children: ReactNode;
}

// -----------------------------------------------------------------------------
// Query Client Configuration
// -----------------------------------------------------------------------------

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Retry configuration
        retry: 1,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Stale time (how long data is considered fresh)
        staleTime: 1000 * 60 * 5, // 5 minutes

        // Cache time (how long inactive data stays in cache)
        gcTime: 1000 * 60 * 30, // 30 minutes

        // Refetch configuration
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: 'always',

        // Error handling
        throwOnError: false,
      },
      mutations: {
        retry: 0,
        throwOnError: false,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        errorLog('React Query: Query error', {
          queryKey: query.queryKey,
          errorType: typeof error,
          errorIsError: error instanceof Error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorRaw: error,
          errorStringified: JSON.stringify(error),
        });
      },
      onSuccess: (data, query) => {
        debugLog('React Query: Query success', {
          queryKey: query.queryKey,
          hasData: !!data,
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, variables, context, mutation) => {
        errorLog('React Query: Mutation error', {
          mutationKey: mutation.options.mutationKey,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      },
      onSuccess: (data, variables, context, mutation) => {
        debugLog('React Query: Mutation success', {
          mutationKey: mutation.options.mutationKey,
        });
      },
    }),
  });
}

// -----------------------------------------------------------------------------
// Provider Component
// -----------------------------------------------------------------------------

export function QueryProvider({ children }: QueryProviderProps): ReactElement {
  // Create query client once per component lifecycle
  // This prevents query client recreation on re-renders
  const [queryClient] = useState(() => createQueryClient());

  debugLog('QueryProvider: Initialized');

  return (
    <QueryClientProvider client={queryClient}>
      {children}

      {/* React Query DevTools (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default QueryProvider;