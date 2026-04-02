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
import { format, parseISO } from 'date-fns';

interface CategorySpendingTrendProps {
  data: { month: string; [category: string]: number | string }[];
  categories: { name: string; color: string }[];
}

export function CategorySpendingTrend({ data, categories }: CategorySpendingTrendProps) {
  const formattedData = data.map(item => ({
    ...item,
    formattedMonth: format(parseISO(item.month + '-01'), 'MMM yyyy'),
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData}>
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
          {categories.map((category) => (
            <Bar
              key={category.name}
              dataKey={category.name}
              stackId="a"
              fill={category.color}
              name={category.name}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
