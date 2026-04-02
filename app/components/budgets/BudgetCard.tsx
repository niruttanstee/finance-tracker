'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';

interface BudgetCardProps {
  categoryName: string;
  categoryColor: string;
  monthlyLimit: number;
  baseBudget: number;
  rolloverAmount: number;
  spent: number;
  remaining: number;
  overspent: boolean;
  savedAmount: number;
  noRollover?: boolean;
}

export function BudgetCard({
  categoryName,
  categoryColor,
  monthlyLimit,
  baseBudget,
  rolloverAmount,
  spent,
  remaining,
  overspent,
  savedAmount,
  noRollover,
}: BudgetCardProps) {
  const percentage = Math.min(100, (spent / monthlyLimit) * 100);
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const daysRemaining = daysInMonth - currentDay;

  return (
    <Card className={`transition-colors ${overspent ? 'bg-red-50 ring-red-500 dark:bg-red-950/20 dark:ring-red-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: categoryColor }}
            >
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{categoryName}</h3>
              <p className="text-sm text-muted-foreground">
                {daysRemaining} days remaining
              </p>
              {noRollover && (
                <Badge variant="secondary" className="text-xs mt-1">
                  No Rollover
                </Badge>
              )}
            </div>
          </div>
          {overspent ? (
            <AlertTriangle className="h-6 w-6 text-red-600" />
          ) : savedAmount > 0 ? (
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm text-muted-foreground">Spent</p>
            <p className={`text-2xl font-bold ${overspent ? 'text-red-600' : ''}`}>
              {spent.toLocaleString()} MYR
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Budget</p>
            <p className="text-2xl font-bold text-muted-foreground">
              {monthlyLimit.toLocaleString()} MYR
            </p>
          </div>
        </div>

        <div className="space-y-2" data-overspent={overspent}>
          <Progress
            value={percentage}
            className="h-3"
          />
          <div className="flex justify-between text-sm">
            <span className={overspent ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
              {percentage.toFixed(0)}% used
            </span>
            {overspent ? (
              <span className="text-red-600 font-medium">
                Over by {(spent - monthlyLimit).toLocaleString()} MYR
              </span>
            ) : (
              <span className="text-green-600">
                {remaining.toLocaleString()} MYR remaining
              </span>
            )}
          </div>
        </div>

        {rolloverAmount > 0 && (
          <div className="pt-2 border-t border-dashed">
            <p className="text-sm text-blue-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              +{rolloverAmount.toLocaleString()} MYR rollover from last month
            </p>
          </div>
        )}

        {savedAmount > 0 && (
          <div className="pt-2 border-t border-dashed">
            <p className="text-sm text-green-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {savedAmount.toLocaleString()} MYR will roll over to next month
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}