// =============================================================================
// DEWPORTAL FRONTEND - TRANSACTIONS PAGE
// =============================================================================
// Transaction listing with filters and pagination.
// =============================================================================

'use client';

import { useState } from 'react';
import { useTransactions } from '@/hooks/useTransactions';
import { TransactionFilterForm } from '@/components/forms';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, Card, CardContent, Spinner } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TransactionFilters } from '@/components/forms/TransactionFilterForm';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>({});
  const { transactions, isLoading, refreshTransactions, loadMore, hasNextPage } = useTransactions(filters);

  // Status colors
  const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
    completed: 'success',
    pending: 'warning',
    failed: 'error',
    cancelled: 'error',
  };

  // Payment method badges (FIXED: Use valid Badge variants)
  const methodBadges: Record<string, 'info' | 'default'> = {
    mpesa: 'info',
    paystack: 'default',
  };

  // ---------------------------------------------------------------------------
  // Handle Filter Change
  // ---------------------------------------------------------------------------

  const handleFilterChange = (newFilters: TransactionFilters) => {
    setFilters(newFilters);
  };

  // ---------------------------------------------------------------------------
  // Handle Reset
  // ---------------------------------------------------------------------------

  const handleReset = () => {
    setFilters({});
    refreshTransactions();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Transactions</h1>
        <p className="text-text-muted">View and manage all transactions</p>
      </div>

      {/* Filter Form */}
      <Card>
        <CardContent className="p-6">
          <TransactionFilterForm
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text">Transaction History</h3>
            <p className="text-sm text-text-muted">{transactions.length} transactions found</p>
          </div>
          <Button variant="outline" onClick={refreshTransactions} disabled={isLoading}>
            Refresh
          </Button>
        </div>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner size="lg" />
            </div>
          ) : transactions.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium">{transaction.reference}</TableCell>
                      <TableCell>{formatDate(transaction.created_at)}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(transaction.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={methodBadges[transaction.payment_method] || 'info'}>
                          {transaction.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[transaction.status] || 'info'}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {transaction.mpesa_receipt_number || transaction.provider_reference || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Load More */}
              {hasNextPage && (
                <div className="p-4 border-t border-border flex justify-center">
                  <Button variant="outline" onClick={loadMore} isLoading={isLoading}>
                    Load More
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-text-muted">
              No transactions found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}