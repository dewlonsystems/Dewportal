// =============================================================================
// DEWPORTAL FRONTEND - TRANSACTION STATUS CHART
// =============================================================================
// Pie chart showing transaction status distribution.
// =============================================================================

'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer } from './ChartContainer';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TransactionStatusDataPoint {
  name: string;
  value: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
}

export interface TransactionStatusChartProps {
  data: TransactionStatusDataPoint[];
  isLoading?: boolean;
  error?: string | null;
  title?: string;
  description?: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function TransactionStatusChart({
  data,
  isLoading,
  error,
  title = 'Transaction Status',
  description = 'Distribution by status',
}: TransactionStatusChartProps) {
  // Status colors
  const statusColors: Record<string, string> = {
    completed: '#22c55e',
    pending: '#f59e0b',
    failed: '#ef4444',
    cancelled: '#64748b',
  };

  // Custom tooltip component
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: any[];
  }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as TransactionStatusDataPoint;
      const total = data.reduce(
        (acc: number, curr: TransactionStatusDataPoint) => acc + curr.value,
        0
      );
      const percentage = total > 0
        ? ((point.value / total) * 100).toFixed(1)
        : '0.0';

      return (
        <div className="bg-surface border border-border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: statusColors[point.status] }}
            />
            <p className="text-sm font-medium text-text capitalize">
              {point.name}
            </p>
          </div>
          <p className="text-sm text-text">
            {point.value} transactions ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const CustomLegend = ({ payload }: { payload?: any[] }) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload?.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-text capitalize">{entry.value}</span>
          </div>
        ))}
      </div>
    );
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
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            label={({ name, percent }) =>
              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={statusColors[entry.status]}
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default TransactionStatusChart;