// =============================================================================
// DEWPORTAL FRONTEND - DAILY REVENUE CHART
// =============================================================================
// Bar chart showing daily revenue breakdown.
// =============================================================================

'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChartContainer } from './ChartContainer';
import { formatCurrency } from '@/lib/utils';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface DailyRevenueDataPoint {
  date: string;
  revenue: number;
  day: string;
}

export interface DailyRevenueChartProps {
  data: DailyRevenueDataPoint[];
  isLoading?: boolean;
  error?: string | null;
  title?: string;
  description?: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function DailyRevenueChart({
  data,
  isLoading,
  error,
  title = 'Daily Revenue',
  description = 'Revenue breakdown by day',
}: DailyRevenueChartProps) {
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-text mb-1">{label}</p>
          <p className="text-sm text-primary font-semibold">
            {formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Color for bars
  const barColor = '#1e3a5f';

  return (
    <ChartContainer
      title={title}
      description={description}
      isLoading={isLoading}
      error={error}
      className="h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `KES ${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="revenue" fill={barColor} radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={barColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default DailyRevenueChart;