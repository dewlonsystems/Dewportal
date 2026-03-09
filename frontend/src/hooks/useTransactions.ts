// =============================================================================
// DEWPORTAL FRONTEND - TRANSACTIONS HOOK
// =============================================================================

'use client';

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTransactionsAction,
  getTransactionDetailAction,
  getTransactionSummaryAction,
} from '@/server-actions';
import { Transaction, TransactionSummary, TransactionListResponse } from '@/types';
import { debugLog, errorLog } from '@/lib/utils';
import { useAuthStore, selectIsAuthenticated } from '@/stores/useAuthStore';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface TransactionFilters {
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method?: 'mpesa' | 'paystack';
  search?: string;
  date_from?: string;
  date_to?: string;
  ordering?: string;
  page?: number;
}

interface UseTransactionsReturn {
  transactions: Transaction[];
  transactionSummary: TransactionSummary | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  hasNextPage: boolean;
  nextPage: string | null;
  loadMore: () => void;
  getTransactionDetail: (id: number) => Promise<Transaction | null>;
  refreshTransactions: () => void;
  refreshSummary: () => void;
}

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function useTransactions(filters?: TransactionFilters): UseTransactionsReturn {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  // ---------------------------------------------------------------------------
  // Transactions Query
  // ---------------------------------------------------------------------------

  const {
    data: transactionsData,
    isLoading,
    isFetching,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ['transactions', filters, currentPage],
    queryFn: async (): Promise<TransactionListResponse> => {
      debugLog('useTransactions: Fetching transactions', { filters, page: currentPage });

      const result = await getTransactionsAction({
        ...filters,
        page: currentPage,
        pageSize: 20,
      });

      if (result.error) {
        throw new Error(result.error || 'Failed to load transactions');
      }

      if (!result.data) {
        throw new Error('No transaction data returned');
      }

      setHasNextPage(!!result.data.next);

      return result.data;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 30, // 30 seconds
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) return false;
      return failureCount < 2;
    },
  });

  // ---------------------------------------------------------------------------
  // Transaction Summary Query
  // ---------------------------------------------------------------------------

  const {
    data: summaryData,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['transactionSummary'],
    queryFn: async (): Promise<TransactionSummary> => {
      debugLog('useTransactions: Fetching transaction summary');

      const result = await getTransactionSummaryAction();

      if (result.error) {
        throw new Error(result.error || 'Failed to load transaction summary');
      }

      if (!result.data) {
        throw new Error('No summary data returned');
      }

      return result.data;
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60, // 1 minute
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('401')) return false;
      return failureCount < 2;
    },
  });

  // ---------------------------------------------------------------------------
  // Get Transaction Detail
  // ---------------------------------------------------------------------------

  const getTransactionDetail = useCallback(async (id: number): Promise<Transaction | null> => {
    try {
      debugLog('useTransactions: Fetching transaction detail', { id });

      const result = await getTransactionDetailAction(id);

      if (result.error || !result.data) {
        errorLog('useTransactions: Get detail failed', result.error);
        return null;
      }

      return result.data;

    } catch (error) {
      errorLog('useTransactions: Get detail error', error);
      return null;
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Load More
  // ---------------------------------------------------------------------------

  const loadMore = useCallback(() => {
    if (hasNextPage) {
      debugLog('useTransactions: Loading more transactions');
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasNextPage]);

  // ---------------------------------------------------------------------------
  // Refresh
  // ---------------------------------------------------------------------------

  const refreshTransactions = useCallback(() => {
    debugLog('useTransactions: Refreshing transactions');
    setCurrentPage(1);
    refetchTransactions();
  }, [refetchTransactions]);

  const refreshSummary = useCallback(() => {
    debugLog('useTransactions: Refreshing summary');
    refetchSummary();
  }, [refetchSummary]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    transactions: transactionsData?.results || [],
    transactionSummary: summaryData || null,
    isLoading,
    isFetching,
    error: transactionsError instanceof Error ? transactionsError.message : null,
    hasNextPage,
    nextPage: transactionsData?.next || null,
    loadMore,
    getTransactionDetail,
    refreshTransactions,
    refreshSummary,
  };
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export type { UseTransactionsReturn };
export default useTransactions;