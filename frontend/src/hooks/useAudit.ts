// =============================================================================
// DEWPORTAL FRONTEND - AUDIT HOOK
// =============================================================================
// Custom hook for audit log data.
// =============================================================================

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuditLogsAction } from '@/server-actions';
import { AuditLog, AuditLogCursorResponse } from '@/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface UseAuditReturn {
  auditLogs: AuditLog[];
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  cursor: string | null;
  hasNextPage: boolean;
  loadMore: () => void;
  refresh: () => void;
}

// -----------------------------------------------------------------------------
// Hook Implementation
// -----------------------------------------------------------------------------

export function useAudit(filters?: {
  action_type?: string;
  severity?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}): UseAuditReturn {
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<AuditLogCursorResponse, Error>({
    queryKey: ['auditLogs', filters, cursor],
    queryFn: async (): Promise<AuditLogCursorResponse> => {
      const result = await getAuditLogsAction({
        ...filters,
        cursor,
        limit: 20,
      });

      if (result.error || !result.data) {
        throw new Error(result.error || 'No data returned');
      }

      setHasNextPage(result.data.has_more);
      setCursor(result.data.next_cursor);

      return result.data;
    },
    enabled: true,
  });

  const loadMore = () => {
    if (hasNextPage) {
      refetch();
    }
  };

  const refresh = () => {
    setCursor(null);
    refetch();
  };

  return {
    auditLogs: data?.records || [],
    isLoading,
    isFetching,
    error: error instanceof Error ? error.message : null,
    cursor,
    hasNextPage,
    loadMore,
    refresh,
  };
}

export type { UseAuditReturn };
// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default useAudit;