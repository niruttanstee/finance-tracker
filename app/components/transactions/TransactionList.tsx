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
import { EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

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
  ignored: boolean;
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
  onIgnoreTransaction: (transactionId: string, ignored: boolean) => void;
}

export function TransactionList({
  transactions,
  categories,
  onCategoryChange,
  onIgnoreTransaction,
}: TransactionListProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleIgnore = async (transactionId: string, ignored: boolean) => {
    setUpdating(transactionId);
    await onIgnoreTransaction(transactionId, ignored);
    setUpdating(null);
  };

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
              <TableRow key={transaction.id} className={transaction.ignored ? 'opacity-50' : ''}>
                <TableCell>
                  {format(new Date(transaction.date), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{transaction.merchant}</div>
                  <div className="text-sm text-muted-foreground">
                    {transaction.description}
                  </div>
                </TableCell>
                <TableCell className={transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}>
                  {transaction.type === 'CREDIT' ? '+' : '-'}RM {transaction.amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Select
                      value={transaction.category || 'uncategorized'}
                      onValueChange={(value) => {
                        handleCategoryChange(transaction.id, value === 'uncategorized' ? undefined : value as string);
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
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${transaction.ignored ? 'text-muted-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => handleIgnore(transaction.id, !transaction.ignored)}
                      disabled={updating === transaction.id}
                      title={transaction.ignored ? 'Undo ignore' : 'Ignore transaction'}
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
