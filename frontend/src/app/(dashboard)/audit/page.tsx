// =============================================================================
// DEWPORTAL FRONTEND - AUDIT LOGS PAGE
// =============================================================================
// Admin-only page for viewing system audit logs.
// =============================================================================

'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAudit } from '@/hooks/useAudit';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Card, CardContent, Spinner, Alert } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { DASHBOARD_ROUTES } from '@/constants/routes';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function AuditPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [filters, setFilters] = useState({
    action_type: '',
    severity: '',
    date_from: '',
    date_to: '',
    search: '',
  });

  const { auditLogs, isLoading, loadMore, hasNextPage, cursor } = useAudit(filters);

  // ---------------------------------------------------------------------------
  // Check Admin Access
  // ---------------------------------------------------------------------------

  if (!isAdmin()) {
    router.push(DASHBOARD_ROUTES.DASHBOARD);
    return null;
  }

  // ---------------------------------------------------------------------------
  // Status Colors
  // ---------------------------------------------------------------------------

  const severityColors: Record<string, 'info' | 'warning' | 'error'> = {
    info: 'info',
    warning: 'warning',
    error: 'error',
    critical: 'error',
  };

  // ---------------------------------------------------------------------------
  // Handle Filter Change
  // ---------------------------------------------------------------------------

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  // ---------------------------------------------------------------------------
  // Handle Search
  // ---------------------------------------------------------------------------

  const handleSearch = () => {
    // TODO: Apply filters and reload audit logs
  };

  // ---------------------------------------------------------------------------
  // Handle Reset
  // ---------------------------------------------------------------------------

  const handleReset = () => {
    setFilters({
      action_type: '',
      severity: '',
      date_from: '',
      date_to: '',
      search: '',
    });
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Audit Logs</h1>
        <p className="text-text-muted">System activity and security events</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <input
              type="text"
              name="search"
              placeholder="Search..."
              value={filters.search}
              onChange={handleFilterChange}
              className="input"
            />

            <select
              name="action_type"
              value={filters.action_type}
              onChange={handleFilterChange}
              className="input"
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="user_created">User Created</option>
              <option value="user_updated">User Updated</option>
              <option value="payment_initiated">Payment Initiated</option>
              <option value="transaction_completed">Transaction Completed</option>
            </select>

            <select
              name="severity"
              value={filters.severity}
              onChange={handleFilterChange}
              className="input"
            >
              <option value="">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="critical">Critical</option>
            </select>

            <input
              type="date"
              name="date_from"
              value={filters.date_from}
              onChange={handleFilterChange}
              className="input"
            />

            <input
              type="date"
              name="date_to"
              value={filters.date_to}
              onChange={handleFilterChange}
              className="input"
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button variant="primary" onClick={handleSearch}>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner size="lg" />
            </div>
          ) : auditLogs.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        {log.user_details ? (
                          <div>
                            <p className="font-medium text-text">
                              {log.user_details.first_name} {log.user_details.last_name}
                            </p>
                            <p className="text-xs text-text-muted">@{log.user_details.username}</p>
                          </div>
                        ) : (
                          <span className="text-text-muted">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-text capitalize">
                          {log.action_type.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-text-muted capitalize">
                          {log.category.replace(/_/g, ' ')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={severityColors[log.severity] || 'info'}>
                          {log.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-text-muted font-mono">
                          {log.ip_address || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-text max-w-xs truncate block">
                          {log.description}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Load More */}
              {hasNextPage && (
                <div className="p-4 border-t border-border flex justify-center">
                  <Button variant="outline" onClick={() => loadMore()} isLoading={isLoading}>
                    Load More
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-text-muted">
              No audit logs found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}