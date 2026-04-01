'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';

type Transaction = {
  id: string;
  date: Date;
  merchant: string;
  description: string;
  amount: number;
  currency: string;
  originalAmount: number | null;
  originalCurrency: string | null;
  exchangeRate: number | null;
  type: 'DEBIT' | 'CREDIT';
  category: string | undefined;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onCategoryChange: (transactionId: string, category: string | undefined) => void;
}

export function TransactionList({
  transactions,
  categories,
  onCategoryChange,
}: TransactionListProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleCategoryChange = async (transactionId: string, category: string | undefined) => {
    setUpdating(transactionId);
    await onCategoryChange(transactionId, category);
    setUpdating(null);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Merchant</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Category</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            return (
              <TableRow key={transaction.id}>
                <TableCell>
                  {format(new Date(transaction.date), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{transaction.merchant}</div>
                  <div className="text-sm text-muted-foreground">
                    {transaction.description}
                  </div>
                </TableCell>
                <TableCell
                  className={
                    transaction.type === 'CREDIT'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                  title={transaction.originalCurrency ? 
                    `${transaction.originalCurrency} ${transaction.originalAmount?.toFixed(2)} @ ${transaction.exchangeRate?.toFixed(4)}` : 
                    undefined}
                >
                  {transaction.type === 'CREDIT' ? '+' : '-'}RM {transaction.amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Select
                    value={transaction.category || 'uncategorized'}
                    onValueChange={(value) => {
                      const id = transaction.id;
                      if (id && value) {
                        handleCategoryChange(
                          id, 
                          value === 'uncategorized' ? undefined : value
                        );
                      }
                    }}
                    disabled={updating === transaction.id}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uncategorized">Uncategorized</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
