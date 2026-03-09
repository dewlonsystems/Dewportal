// =============================================================================
// DEWPORTAL FRONTEND - ACTIVITY CHART
// =============================================================================
// Bar chart showing system activity over time.
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
  Legend,
} from 'recharts';
import { ChartContainer } from './ChartContainer';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ActivityDataPoint {
  date: string;
  logins: number;
  transactions: number;
  payments: number;
}

export interface ActivityChartProps {
  data: ActivityDataPoint[];
  isLoading?: boolean;
  error?: string | null;
  title?: string;
  description?: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function ActivityChart({
  data,
  isLoading,
  error,
  title = 'System Activity',
  description = 'Activity trends over time',
}: ActivityChartProps) {
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-text mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-text-muted capitalize">{entry.name}:</span>
              <span className="font-medium text-text">{entry.value}</span>
            </div>
          ))}
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
      className="h-80"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
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
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="logins" fill="#1e3a5f" radius={[4, 4, 0, 0]} name="Logins" />
          <Bar dataKey="transactions" fill="#22c55e" radius={[4, 4, 0, 0]} name="Transactions" />
          <Bar dataKey="payments" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Payments" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default ActivityChart;