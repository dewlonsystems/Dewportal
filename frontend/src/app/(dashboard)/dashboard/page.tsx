// =============================================================================
// DEWPORTAL FRONTEND - DASHBOARD PAGE
// =============================================================================

'use client';

import { useDashboard } from '@/hooks/useDashboard';
import { useTransactions } from '@/hooks/useTransactions';
import { StatCard, RevenueChart, DailyRevenueChart, TransactionStatusChart } from '@/components/charts';
import { Card, CardContent, Badge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { RevenueDataPoint, DailyRevenueDataPoint, TransactionStatusDataPoint } from '@/components/charts';
import { useAuth } from '@/hooks/useAuth';

// -----------------------------------------------------------------------------
// Skeleton Loader
// -----------------------------------------------------------------------------

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 bg-[length:200%_100%] ${className}`}
      style={{ animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }}
    />
  );
}

// -----------------------------------------------------------------------------
// Stat Card — Premium version
// -----------------------------------------------------------------------------

function PremiumStatCard({
  title,
  value,
  subtitle,
  icon,
  accent,
  isLoading,
  trend,
  trendValue,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
  isLoading: boolean;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300 group"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      {/* Accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] opacity-80"
        style={{ background: accent }}
      />

      {/* Background glow */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-[0.06] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.1]"
        style={{ background: accent }}
      />

      <div className="flex items-start justify-between mb-4">
        {/* Icon */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm"
          style={{ background: `${accent}18` }}
        >
          <span style={{ color: accent }}>{icon}</span>
        </div>

        {/* Trend badge */}
        {trend && trendValue && !isLoading && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
            trend === 'up' ? 'bg-emerald-50 text-emerald-600' :
            trend === 'down' ? 'bg-red-50 text-red-500' :
            'bg-gray-50 text-gray-500'
          }`}>
            {trend === 'up' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
            {trend === 'down' && (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {trendValue}
          </div>
        )}
      </div>

      {/* Value */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
      ) : (
        <div>
          <p className="text-2xl font-bold text-gray-900 tracking-tight leading-none mb-1">
            {value}
          </p>
          <p className="text-sm text-gray-400 font-medium">{title}</p>
          {subtitle && (
            <p className="text-xs text-gray-300 mt-1">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Activity Item
// -----------------------------------------------------------------------------

function ActivityItem({ transaction, isLast }: { transaction: any; isLast: boolean }) {
  const statusConfig: Record<string, { color: string; bg: string; dot: string }> = {
    completed: { color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-400' },
    pending:   { color: 'text-amber-600',   bg: 'bg-amber-50',   dot: 'bg-amber-400'   },
    failed:    { color: 'text-red-500',      bg: 'bg-red-50',     dot: 'bg-red-400'     },
    cancelled: { color: 'text-gray-500',     bg: 'bg-gray-50',    dot: 'bg-gray-400'    },
  };

  const cfg = statusConfig[transaction.status] || statusConfig.pending;

  return (
    <div className={`flex items-center gap-4 py-3.5 ${!isLast ? 'border-b border-gray-50' : ''} hover:bg-gray-50/50 transition-colors px-6 -mx-6 rounded-xl`}>
      {/* Status dot */}
      <div className="flex-shrink-0 relative">
        <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center`}>
          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{transaction.reference}</p>
        <p className="text-xs text-gray-400 mt-0.5">{formatDate(transaction.created_at)}</p>
      </div>

      {/* Amount + status */}
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold text-gray-900">{formatCurrency(transaction.amount)}</p>
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.color}`}>
          {transaction.status}
        </span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Section Header
// -----------------------------------------------------------------------------

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Main Dashboard
// -----------------------------------------------------------------------------

export default function DashboardPage() {
  const { dashboardData, isLoading: dashboardLoading } = useDashboard();
  const { transactions, transactionSummary, isLoading: transactionsLoading } = useTransactions();
  const { user } = useAuth();

  const isLoading = dashboardLoading || transactionsLoading;

  const revenueChartData: RevenueDataPoint[] = dashboardData?.daily_revenue?.map((item) => ({
    date: item.date,
    revenue: item.revenue,
    transactions: 0,
  })) || [];

  const dailyRevenueChartData: DailyRevenueDataPoint[] = dashboardData?.daily_revenue?.map((item) => ({
    date: item.date,
    revenue: item.revenue,
    day: new Date(item.date).toLocaleDateString('en-KE', { weekday: 'short' }),
  })) || [];

  const transactionStatusData: TransactionStatusDataPoint[] = transactionSummary
    ? [
        { name: 'Completed', value: transactionSummary.completed_transactions, status: 'completed' as const },
        { name: 'Pending',   value: transactionSummary.pending_transactions,   status: 'pending'   as const },
        { name: 'Failed',    value: transactionSummary.failed_transactions,    status: 'failed'    as const },
      ]
    : [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.first_name || user?.username || 'there';

  return (
    <>
      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div className="space-y-8 pb-8">

        {/* ── Page Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#c45c1a] mb-1">{greeting} 👋</p>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {firstName}'s Dashboard
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-2 self-start sm:self-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-700">Live</span>
          </div>
        </div>

        {/* ── Stat Cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <PremiumStatCard
            title="Total Revenue"
            value={isLoading ? '—' : formatCurrency(dashboardData?.summary.total_revenue || 0)}
            accent="#c45c1a"
            isLoading={isLoading}
            trend="up"
            trendValue="This month"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <PremiumStatCard
            title="Total Transactions"
            value={isLoading ? '—' : (dashboardData?.summary.total_transactions || 0).toLocaleString()}
            accent="#1a3d2b"
            isLoading={isLoading}
            trend="neutral"
            trendValue="All time"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />

          <PremiumStatCard
            title="Completed"
            value={isLoading ? '—' : (transactionSummary?.completed_transactions || 0).toLocaleString()}
            accent="#059669"
            isLoading={isLoading}
            trend="up"
            trendValue="Successful"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />

          <PremiumStatCard
            title="Pending"
            value={isLoading ? '—' : (transactionSummary?.pending_transactions || 0).toLocaleString()}
            accent="#d97706"
            isLoading={isLoading}
            trend="neutral"
            trendValue="Awaiting"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* ── Charts Row 1 ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Revenue Trends — wider */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <SectionHeader
              title="Revenue Trends"
              subtitle="Last 30 days"
              action={
                <span className="text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
                  30d
                </span>
              }
            />
            <RevenueChart
              data={revenueChartData}
              isLoading={isLoading}
              title=""
              description=""
            />
          </div>

          {/* Transaction Status — narrower */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <SectionHeader
              title="Status Breakdown"
              subtitle="All transactions"
            />
            <TransactionStatusChart
              data={transactionStatusData}
              isLoading={isLoading}
              title=""
              description=""
            />
          </div>
        </div>

        {/* ── Charts Row 2 + Activity ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Daily Revenue */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <SectionHeader
              title="Daily Revenue"
              subtitle="This week"
            />
            <DailyRevenueChart
              data={dailyRevenueChartData}
              isLoading={isLoading}
              title=""
              description=""
            />
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <SectionHeader
              title="Recent Activity"
              subtitle="Latest transactions"
              action={
                <button className="text-xs font-semibold text-[#1a3d2b] hover:text-[#c45c1a] transition-colors">
                  View all →
                </button>
              }
            />

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className="h-3 w-14 ml-auto" />
                    </div>
                  </div>
                ))}
              </div>
            ) : transactions.length > 0 ? (
              <div>
                {transactions.slice(0, 5).map((transaction, i) => (
                  <ActivityItem
                    key={transaction.id}
                    transaction={transaction}
                    isLast={i === Math.min(transactions.length, 5) - 1}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-400">No transactions yet</p>
                <p className="text-xs text-gray-300 mt-1">Transactions will appear here</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
}

// -----------------------------------------------------------------------------
// Helper
// -----------------------------------------------------------------------------

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-KE', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}