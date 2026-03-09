// =============================================================================
// DEWPORTAL FRONTEND - DASHBOARD PAGE
// =============================================================================
// Main dashboard with analytics, charts, and summaries.
// =============================================================================

'use client';

import { useDashboard } from '@/hooks/useDashboard';
import { useTransactions } from '@/hooks/useTransactions';
import { StatCard, RevenueChart, DailyRevenueChart, TransactionStatusChart } from '@/components/charts';
import { Card, CardContent, Badge, Spinner } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { RevenueDataPoint, DailyRevenueDataPoint, TransactionStatusDataPoint } from '@/components/charts';

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function DashboardPage() {
  const { dashboardData, isLoading: dashboardLoading } = useDashboard();
  const { transactions, transactionSummary, isLoading: transactionsLoading } = useTransactions();

  const isLoading = dashboardLoading || transactionsLoading;

  // Status colors
  const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
    completed: 'success',
    pending: 'warning',
    failed: 'error',
    cancelled: 'error',
  };

  // Transform daily revenue data for RevenueChart
  const revenueChartData: RevenueDataPoint[] = dashboardData?.daily_revenue?.map((item) => ({
    date: item.date,
    revenue: item.revenue,
    transactions: 0, // Optional, can be added later
  })) || [];

  // Transform daily revenue data for DailyRevenueChart (add day property)
  const dailyRevenueChartData: DailyRevenueDataPoint[] = dashboardData?.daily_revenue?.map((item) => ({
    date: item.date,
    revenue: item.revenue,
    day: new Date(item.date).toLocaleDateString('en-KE', { weekday: 'short' }),
  })) || [];

  // Prepare transaction status data for pie chart
  const transactionStatusData: TransactionStatusDataPoint[] = transactionSummary
    ? [
        {
          name: 'Completed',
          value: transactionSummary.completed_transactions,
          status: 'completed' as const,
        },
        {
          name: 'Pending',
          value: transactionSummary.pending_transactions,
          status: 'pending' as const,
        },
        {
          name: 'Failed',
          value: transactionSummary.failed_transactions,
          status: 'failed' as const,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <p className="text-text-muted">Overview of your financial activity</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={dashboardData?.summary.total_revenue || 0}
          variant="currency"
          isLoading={isLoading}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Total Transactions"
          value={dashboardData?.summary.total_transactions || 0}
          variant="count"
          isLoading={isLoading}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          }
        />

        <StatCard
          title="Completed"
          value={transactionSummary?.completed_transactions || 0}
          variant="count"
          trend="up"
          isLoading={isLoading}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Pending"
          value={transactionSummary?.pending_transactions || 0}
          variant="count"
          trend="neutral"
          isLoading={isLoading}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart
          data={revenueChartData}
          isLoading={isLoading}
          title="Revenue Trends"
          description="Revenue over the last 30 days"
        />

        <DailyRevenueChart
          data={dailyRevenueChartData}
          isLoading={isLoading}
          title="Daily Revenue"
          description="Revenue breakdown by day"
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TransactionStatusChart
          data={transactionStatusData}
          isLoading={isLoading}
          title="Transaction Status"
          description="Distribution by status"
        />

        {/* Recent Activity */}
        <Card>
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-text">Recent Activity</h3>
            <p className="text-sm text-text-muted">Latest transactions</p>
          </div>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
              </div>
            ) : transactions.length > 0 ? (
              <div className="divide-y divide-border">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-background/50">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-text">{transaction.reference}</p>
                      <p className="text-xs text-text-muted">
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-text">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <Badge variant={statusColors[transaction.status] || 'info'}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-text-muted">
                No recent transactions
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Helper: Format Date
// -----------------------------------------------------------------------------

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-KE', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}