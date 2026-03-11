// =============================================================================
// DEWPORTAL FRONTEND - TRANSACTION STATUS CHART
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
}: TransactionStatusChartProps) {

  const statusColors: Record<string, string> = {
    completed: '#16a34a',
    pending:   '#f97316',
    failed:    '#ef4444',
    cancelled: '#64748b',
  };

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: any[];
  }) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as TransactionStatusDataPoint;
      const total = data.reduce((acc, curr) => acc + curr.value, 0);
      const percentage = total > 0
        ? ((point.value / total) * 100).toFixed(1)
        : '0.0';
      return (
        <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: statusColors[point.status] }}
            />
            <p className="text-sm font-medium text-gray-700 capitalize">
              {point.name}
            </p>
          </div>
          <p className="text-sm text-gray-600">
            {point.value} transactions ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!data || data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="h-64 flex items-center justify-center">
        <span className="text-sm text-gray-400">No transactions yet</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={4}
          dataKey="value"
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
        <Legend
          formatter={(value) => (
            <span className="text-xs text-gray-600 capitalize">{value}</span>
          )}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default TransactionStatusChart;
