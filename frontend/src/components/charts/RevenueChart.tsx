// =============================================================================
// DEWPORTAL FRONTEND - REVENUE CHART
// =============================================================================
// Line chart showing revenue trends over time.
// =============================================================================

'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { ChartContainer } from './ChartContainer';
import { formatCurrency } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  transactions?: number;
}

export interface RevenueChartProps {
  data: RevenueDataPoint[];
  isLoading?: boolean;
  error?: string | null;
  title?: string;
  description?: string;
  period?: '7d' | '30d' | '90d' | '1y';
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function RevenueChart({
  data,
  isLoading,
  error,
  title = 'Revenue Overview',
  description = 'Revenue trends over time',
  period = '30d',
}: RevenueChartProps) {
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-text mb-1">{label}</p>
          <p className="text-sm text-primary font-semibold">
            {formatCurrency(payload[0].value)}
          </p>
          {payload[0].payload.transactions && (
            <p className="text-xs text-text-muted mt-1">
              {payload[0].payload.transactions} transactions
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ChartContainer
      title={title}
      description={description}
      isLoading={isLoading}
      error={error}
      className="h-96"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
            }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `KES ${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#1e3a5f"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#revenueGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default RevenueChart;