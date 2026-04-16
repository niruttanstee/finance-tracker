# Testing Guide

## 1. Test Strategy

### Priority Order
1. **API routes** — Test GET/PATCH/POST endpoints
2. **Utility functions** — Pure functions with clear inputs/outputs
3. **Component behavior** — User interactions and state changes

### Test Structure
```
tests/
├── setup.ts           # Global test setup
├── budgets.test.ts    # Budget calculations
├── api/
│   ├── transactions.test.ts
│   └── sync.test.ts
├── utils/
│   └── format.test.ts
└── components/
    └── FilterBar.test.tsx
```

---

## 2. Test-Driven Development (TDD) Protocol

**Mandatory for all new features and bug fixes.**

### The TDD Cycle

1. **Scaffold**: Create the function/class stub
```typescript
export function calculateBudgetRemaining(spent: number, budget: number): number {
  throw new Error('NotImplemented');
}
```

2. **Fail**: Write failing test first
```typescript
describe('calculateBudgetRemaining', () => {
  it('returns remaining budget when spent is less than budget', () => {
    const result = calculateBudgetRemaining(50, 100);
    expect(result).toBe(50);
  });
});
```

Run test to verify it fails:
```bash
npm test -- --run tests/utils/budgets.test.ts
```

3. **Pass**: Minimal implementation
```typescript
export function calculateBudgetRemaining(spent: number, budget: number): number {
  return budget - spent;
}
```

4. **Refactor**: Clean up while keeping tests green

---

## 3. Running Tests

```bash
npm test              # Run all tests (single run)
npm test -- --watch   # Watch mode
npm run test:coverage  # Coverage report with thresholds
```

### Coverage Thresholds
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

---

## 4. API Testing

### Using fetch in tests
```typescript
import { describe, it, expect } from 'vitest'

describe('GET /api/transactions', () => {
  it('returns transactions for authenticated user', async () => {
    const res = await fetch('http://localhost:3000/api/transactions', {
      headers: {
        'Cookie': 'session=test-session',
      },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })
})
```

---

## 5. Component Testing

### With React Testing Library
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { FilterBar } from '@/components/FilterBar'

it('updates filter state on input', () => {
  render(<FilterBar />)
  const input = screen.getByPlaceholderText('Filter...')
  fireEvent.change(input, { target: { value: 'groceries' } })
  expect(input).toHaveValue('groceries')
})
```

---

## 6. Test Utilities

### Mocking fetch
```typescript
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ transactions: [] }),
  })
) as ReturnType<typeof fetch>
```

### Database test setup
Use a test database or mock the db module:
```typescript
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}))
```

---

## 7. Strong Assertion Guidelines

### DO (Strong Assertions)
```typescript
expect(result).toBe(50)
expect(result).toEqual({ status: 'ok', value: 100 })
expect(() => fn()).toThrow()
```

### DON'T (Weak Assertions)
```typescript
expect(result).toBeTruthy()
expect(result).toBeDefined()
expect(result).toBeGreaterThan(0)
```

---

## 8. Test Data Patterns

### Parameterized Inputs
```typescript
it('calculates correctly for various amounts', () => {
  const testCases = [
    { spent: 10, budget: 100, expected: 90 },
    { spent: 0, budget: 100, expected: 100 },
    { spent: 100, budget: 100, expected: 0 },
  ];

  for (const { spent, budget, expected } of testCases) {
    expect(calculateBudgetRemaining(spent, budget)).toBe(expected);
  }
});
```

---

## 9. Unit vs Integration Tests

| Type | Use When | Base Class |
|------|----------|------------|
| **Unit** | Pure logic, calculations | `describe` with `it` |
| **Integration** | API routes, DB operations | `describe` with `it`, may need `testserver` |

---

## 10. Common Pitfalls

| Pitfall | Problem | Solution |
|---------|---------|----------|
| Magic numbers | `assertEqual(result, 42)` | Use named variables with comments |
| Testing implementation | Mocking internal details | Test behavior, not implementation |
| Flaky tests | Random failures | Use deterministic data, mock time |
| Missing edge cases | Only happy path | Test boundaries, errors, empty inputs |
