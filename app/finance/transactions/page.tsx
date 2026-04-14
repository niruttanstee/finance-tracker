'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionList } from '@/app/components/transactions/TransactionList';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface Transaction {
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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const offset = (currentPage - 1) * 50;
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '50',
        offset: String(offset),
      });

      const [transactionsRes, categoriesRes] = await Promise.all([
        fetch(`/api/transactions?${params}`),
        fetch('/api/categories'),
      ]);

      const transactionsData = await transactionsRes.json();
      const categoriesData = await categoriesRes.json();

      setTransactions(transactionsData.data || []);
      setTotalPages(transactionsData.totalPages || 1);
      setTotal(transactionsData.total || 0);
      setCategories(categoriesData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  async function handleCategoryChange(transactionId: string, category: string | undefined) {
    try {
      const response = await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: transactionId, category }),
      });

      if (response.ok) {
        // Update local state
        setTransactions(prev =>
          prev.map(t =>
            t.id === transactionId ? { ...t, category } : t
          )
        );
      }
    } catch (error) {
      console.error('Error updating category:', error);
    }
  }

  if (loading) {
    return (
      <main className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Transactions</h1>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </main>
    );
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            {total} total transactions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({total} total)
            </span>
          </div>

          <TransactionList
            transactions={transactions}
            categories={categories}
            onCategoryChange={handleCategoryChange}
          />

          <Pagination className="mt-4">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
                <PaginationItem key={page}>
                  <PaginationLink
                    isActive={page === currentPage}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              {totalPages > 5 && <PaginationEllipsis />}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </CardContent>
      </Card>
    </main>
  );
}
