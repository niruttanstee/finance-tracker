'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface MonthlySpendingProps {
  data: { month: string; amount: number }[];
}

export function MonthlySpending({ data }: MonthlySpendingProps) {
  const formattedData = data.map(item => ({
    ...item,
    formattedMonth: format(parseISO(item.month + '-01'), 'MMM yyyy'),
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="formattedMonth" 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
          />
          <Tooltip 
            formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Spent']}
            labelStyle={{ color: '#000' }}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
