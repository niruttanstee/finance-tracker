'use client';

import { useState } from 'react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
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
};

interface Category {
  id: string;
  name: string;
  color: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  categories: Category[];
  onCategoryChange: (transactionId: string, category: string | undefined) => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
}

export function TransactionTable({
  transactions,
  categories,
  onCategoryChange,
  sorting,
  onSortingChange,
}: TransactionTableProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleCategoryChange = async (
    transactionId: string,
    value: string
  ) => {
    setUpdating(transactionId);
    await onCategoryChange(
      transactionId,
      value === 'uncategorized' ? undefined : value
    );
    setUpdating(null);
  };

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.date), 'MMM dd, yyyy'),
    },
    {
      accessorKey: 'merchant',
      header: 'Merchant',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.merchant}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.description}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span
          className={
            row.original.type === 'CREDIT'
              ? 'text-green-600'
              : 'text-red-600'
          }
          title={
            row.original.originalCurrency
              ? `${row.original.originalCurrency} ${row.original.originalAmount?.toFixed(2)} @ ${row.original.exchangeRate?.toFixed(4)}`
              : undefined
          }
        >
          {row.original.type === 'CREDIT' ? '+' : '-'}RM{' '}
          {row.original.amount.toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <Select
          value={row.original.category || 'uncategorized'}
          onValueChange={(value) => handleCategoryChange(row.original.id, value)}
          disabled={updating === row.original.id}
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
      ),
    },
  ];

  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}