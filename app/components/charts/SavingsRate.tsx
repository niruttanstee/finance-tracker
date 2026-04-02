'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface TrendData {
  month: string;
  spending: number;
  income: number;
  savings: number;
}

interface SavingsRateProps {
  data: TrendData[];
}

export function SavingsRate({ data }: SavingsRateProps) {
  const formattedData = data.map(item => ({
    ...item,
    formattedMonth: format(parseISO(item.month + '-01'), 'MMM yyyy'),
    savingsRate: item.income > 0 ? ((item.savings / item.income) * 100) : 0,
  }));
  
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="formattedMonth" 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `RM ${Number(value).toFixed(0)}`}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
          />
          <Tooltip 
            formatter={(value, name) => {
              const numValue = Number(value);
              if (name === 'Savings Rate') {
                return [`${numValue.toFixed(1)}%`, name];
              }
              return [`RM ${numValue.toFixed(2)}`, name];
            }}
            labelStyle={{ color: '#000' }}
          />
          <Legend />
          <Bar 
            yAxisId="left"
            dataKey="income" 
            fill="#14b8a6" 
            name="Income"
            stackId="a"
          />
          <Bar 
            yAxisId="left"
            dataKey="spending" 
            fill="#ef4444" 
            name="Spending"
            stackId="a"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="savingsRate"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2 }}
            name="Savings Rate"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
