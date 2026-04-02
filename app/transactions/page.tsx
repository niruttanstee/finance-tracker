'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionList } from '../components/transactions/TransactionList';
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

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [transactionsRes, categoriesRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/categories'),
      ]);

      const transactionsData = await transactionsRes.json();
      const categoriesData = await categoriesRes.json();

      setTransactions(transactionsData.data || []);
      setCategories(categoriesData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

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
            {transactions.length} total transactions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionList
            transactions={transactions}
            categories={categories}
            onCategoryChange={handleCategoryChange}
          />
        </CardContent>
      </Card>
    </main>
  );
}
