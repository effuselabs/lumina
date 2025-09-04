'use client';

import { RevenueData } from '@/types/dashboard';
import { format } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface RevenueChartProps {
  data: RevenueData[];
  type?: 'line' | 'area';
  showComparison?: boolean;
  height?: number;
}

export function RevenueChart({
  data,
  type = 'line',
  showComparison = false,
  height = 300,
}: RevenueChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd');
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; name: string; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="mb-2 font-medium text-gray-900">
            {label ? format(new Date(label), 'MMMM dd, yyyy') : 'No date'}
          </p>
          {payload.map((entry, index: number) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium text-gray-900">
                {entry.name.includes('Revenue') ||
                  entry.name.includes('Earnings')
                  ? formatCurrency(entry.value)
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const chartData = data.map(item => ({
    ...item,
    date: formatDate(item.date),
    fullDate: item.date,
  }));

  if (type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FFD25A" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#FFD25A" stopOpacity={0.1} />
            </linearGradient>
            {showComparison && (
              <>
                <linearGradient
                  id="commissionGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#FF7A5A" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#FF7A5A" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient
                  id="retentionGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#0B2B33" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0B2B33" stopOpacity={0.1} />
                </linearGradient>
              </>
            )}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#FFD25A"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#revenueGradient)"
            name="Total Revenue"
          />

          {showComparison && (
            <>
              <Area
                type="monotone"
                dataKey="commissionEarnings"
                stroke="#FF7A5A"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#commissionGradient)"
                name="Commission Earnings"
              />
              <Area
                type="monotone"
                dataKey="businessRetention"
                stroke="#0B2B33"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#retentionGradient)"
                name="Business Retention"
              />
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} />
        <YAxis
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
          tickFormatter={formatCurrency}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />

        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#FFD25A"
          strokeWidth={3}
          dot={{ fill: '#FFD25A', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, stroke: '#FFD25A', strokeWidth: 2 }}
          name="Total Revenue"
        />

        {showComparison && (
          <>
            <Line
              type="monotone"
              dataKey="commissionEarnings"
              stroke="#FF7A5A"
              strokeWidth={2}
              dot={{ fill: '#FF7A5A', strokeWidth: 2, r: 3 }}
              name="Commission Earnings"
            />
            <Line
              type="monotone"
              dataKey="businessRetention"
              stroke="#0B2B33"
              strokeWidth={2}
              dot={{ fill: '#0B2B33', strokeWidth: 2, r: 3 }}
              name="Business Retention"
            />
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
