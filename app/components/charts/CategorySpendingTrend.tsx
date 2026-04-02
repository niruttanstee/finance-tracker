'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface CategorySpendingTrendProps {
  data: { month: string; [category: string]: number | string }[];
  categories: { name: string; color: string }[];
}

export function CategorySpendingTrend({ data, categories }: CategorySpendingTrendProps) {
  // Filter out Income category and categories with no spending
  const spendingCategories = categories.filter(cat => {
    if (cat.name === 'Income') return false;
    // Check if this category has any spending across all months
    const hasSpending = data.some(monthData => {
      const amount = Number(monthData[cat.name]) || 0;
      return amount > 0;
    });
    return hasSpending;
  });

  // Add total spending to each data point
  const formattedData = data.map(item => {
    const total = spendingCategories.reduce((sum, cat) => {
      const amount = Number(item[cat.name]) || 0;
      return sum + amount;
    }, 0);
    
    return {
      ...item,
      formattedMonth: format(parseISO(item.month + '-01'), 'MMM yyyy'),
      'Total': total,
    };
  });

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
            tickFormatter={(value) => `RM ${Number(value).toFixed(0)}`}
          />
          <Tooltip 
            formatter={(value, name) => [`RM ${Number(value).toFixed(2)}`, name]}
            labelStyle={{ color: '#000' }}
          />
          <Legend />
          {/* Total Spending line - bold black */}
          <Line
            type="monotone"
            dataKey="Total"
            stroke="#000000"
            strokeWidth={3}
            dot={{ fill: '#000000', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          {/* Individual category lines */}
          {spendingCategories.map((category) => (
            <Line
              key={category.name}
              type="monotone"
              dataKey={category.name}
              stroke={category.color}
              strokeWidth={1.5}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}