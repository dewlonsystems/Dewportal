// =============================================================================
// DEWPORTAL FRONTEND - DASHBOARD HOOK
// =============================================================================
// Custom hook for dashboard data.
// Provides summarized data with real-time updates via WebSocket.
// =============================================================================

'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDashboardDataAction } from '@/server-actions';
import { DashboardResponse } from '@/types';
import { debugLog, errorLog } from '@/lib/utils';
import { useWebSocket } from './useWebSocket';
import { useAuthStore, selectIsAuthenticated } from '@/stores/useAuthStore';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface UseDashboardReturn {
  dashboardData: DashboardResponse | null;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  totalRevenue: number;
  totalTransactions: number;
  dailyRevenue: Array<{ date: string; revenue: number }>;
  recentActivity: Array<{ id: number; action: string; user: string; timestamp: string }>;
  refresh: () => void;
}

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function useDashboard(): UseDashboardReturn {
  const queryClient = useQueryClient();
  const { isConnected } = useWebSocket();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  // ---------------------------------------------------------------------------
  // Dashboard Query
  // ---------------------------------------------------------------------------

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      debugLog('useDashboard: Fetching dashboard data');

      const result = await getDashboardDataAction();

      if (result.error) {
        throw new Error(result.error || 'Failed to load dashboard data');
      }

      if (!result.data) {
        throw new Error('No dashboard data returned');
      }

      return result.data;
    },
    enabled: isAuthenticated,
    refetchOnMount: 'always',
    staleTime: 1000 * 60, // 1 minute
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error instanceof Error && error.message.includes('401')) return false;
      return failureCount < 2;
    },
  });

  // ---------------------------------------------------------------------------
  // Refresh
  // ---------------------------------------------------------------------------

  const refresh = useCallback(() => {
    debugLog('useDashboard: Refreshing dashboard data');
    refetch();
  }, [refetch]);

  // ---------------------------------------------------------------------------
  // Derived Data
  // ---------------------------------------------------------------------------

  const totalRevenue = data?.summary?.total_revenue || 0;
  const totalTransactions = data?.summary?.total_transactions || 0;
  const dailyRevenue = data?.daily_revenue || [];
  const recentActivity = data?.recent_activity || [];

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    dashboardData: data || null,
    isLoading,
    isFetching,
    error: error instanceof Error ? error.message : null,
    totalRevenue,
    totalTransactions,
    dailyRevenue,
    recentActivity,
    refresh,
  };
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export type { UseDashboardReturn };
export default useDashboard;