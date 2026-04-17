import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBudgetsWithSpending } from '../lib/budgets';

// Use vi.hoisted to define mocks that can be referenced in vi.mock
const {
  mockCategoriesFindMany,
  mockCategoryBudgetsFindMany,
  mockCategoryBudgetsFindFirst,
  mockCategoriesFindFirst,
  mockSelectFromWhere,
} = vi.hoisted(() => ({
  mockCategoriesFindMany: vi.fn(),
  mockCategoryBudgetsFindMany: vi.fn(),
  mockCategoryBudgetsFindFirst: vi.fn(),
  mockCategoriesFindFirst: vi.fn(),
  mockSelectFromWhere: vi.fn(),
}));

// Mock the database module
vi.mock('../lib/db', () => ({
  db: {
    query: {
      categories: {
        findMany: mockCategoriesFindMany,
        findFirst: mockCategoriesFindFirst,
      },
      categoryBudgets: {
        findMany: mockCategoryBudgetsFindMany,
        findFirst: mockCategoryBudgetsFindFirst,
      },
    },
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: mockSelectFromWhere,
        }),
      }),
    }),
  },
}));

vi.mock('../lib/schema', () => ({
  transactions: {
    category: 'category',
    type: 'type',
    userId: 'userId',
    date: 'date',
  },
  categories: {},
  categoryBudgets: {},
}));

describe('getBudgetsWithSpending', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for spending query - empty
    mockSelectFromWhere.mockResolvedValue([]);
  });

  it('returns budget card for future month when category has defaultBudget but no category_budgets entry', async () => {
    const categories = [
      {
        id: 'food',
        name: 'Food & Dining',
        color: '#ef4444',
        isDefault: true,
        defaultBudget: 500,
        noRollover: false,
        userId: mockUserId,
      },
    ];

    // No category_budgets entries for future month
    mockCategoriesFindMany.mockResolvedValue(categories);
    mockCategoryBudgetsFindMany.mockResolvedValue([]);

    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);
    const futureYearMonth = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;

    const result = await getBudgetsWithSpending(futureYearMonth, mockUserId);

    // BUG: Currently returns empty array because there's no category_budgets entry
    // EXPECTED: Should return a budget card computed from defaultBudget (500 MYR)
    expect(result.length).toBe(1);
    expect(result[0]).toMatchObject({
      categoryId: 'food',
      categoryName: 'Food & Dining',
      categoryColor: '#ef4444',
      monthlyLimit: 500,
      baseBudget: 500,
      rolloverAmount: 0,
      spent: 0,
      remaining: 500,
      overspent: false,
      savedAmount: 500,
      noRollover: false,
    });
  });

  it('returns budget card for current month when category has category_budgets entry', async () => {
    const categories = [
      {
        id: 'food',
        name: 'Food & Dining',
        color: '#ef4444',
        isDefault: true,
        defaultBudget: 500,
        noRollover: false,
        userId: mockUserId,
      },
    ];

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const categoryBudgets = [
      {
        id: `food_${currentYearMonth}`,
        categoryId: 'food',
        yearMonth: currentYearMonth,
        monthlyLimit: 500,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockCategoriesFindMany.mockResolvedValue(categories);
    mockCategoryBudgetsFindMany.mockResolvedValue(categoryBudgets);

    const result = await getBudgetsWithSpending(currentYearMonth, mockUserId);

    expect(result.length).toBe(1);
    expect(result[0].categoryName).toBe('Food & Dining');
  });
});
