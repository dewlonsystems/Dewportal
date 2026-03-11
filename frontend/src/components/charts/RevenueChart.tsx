// =============================================================================
// DEWPORTAL FRONTEND - REVENUE CHART
// =============================================================================

'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
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
}: RevenueChartProps) {

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: any[];
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
          <p className="text-sm font-semibold text-orange-600">
            {formatCurrency(payload[0].value)}
          </p>
          {payload[0].payload.transactions > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {payload[0].payload.transactions} transactions
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="h-72 flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center">
        <span className="text-sm text-gray-400">No revenue data available</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={288}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#16a34a" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) =>
            new Date(value).toLocaleDateString('en-KE', {
              month: 'short',
              day: 'numeric',
            })
          }
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#16a34a"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#revenueGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default RevenueChart;
