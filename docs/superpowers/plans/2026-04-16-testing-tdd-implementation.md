# Testing & TDD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance finance-tracker with comprehensive testing infrastructure and TDD discipline following Pantas Green patterns.

**Architecture:** Add TDD enforcement to CLAUDE.md, enhance TESTING_GUIDE.md with detailed TDD cycle, create `/implement` skill, add auto-format hook, configure vitest coverage thresholds.

**Tech Stack:** Vitest 4.x, TypeScript, ESLint, Next.js 14

---

## File Map

| File | Action |
|------|--------|
| `CLAUDE.md` | Add Testing & TDD section after Core Principles |
| `.claude/docs/standards/TESTING_GUIDE.md` | Replace content with enhanced version |
| `.claude/skills/implement/SKILL.md` | Create new directory and file |
| `.claude/hooks/auto-format.sh` | Create new file |
| `.claude/settings.json` | Add PostToolUse hook |
| `vitest.config.ts` | Add coverage configuration |
| `package.json` | Add test:coverage and test:watch scripts |
| `tests/setup.ts` | Verify exists and is correct |

---

## Tasks

### Task 1: Update CLAUDE.md — Add TDD Enforcement

**Files:**
- Modify: `CLAUDE.md:32` (after Core Principles section)

- [ ] **Step 1: Add Testing & TDD section after Core Principles (line ~32)**

Insert after line 32 (after the `Avoid useEffect` principle):

```markdown
## Testing & TDD

### TDD Protocol (Mandatory)
1. **Scaffold**: Create function/class stub with `throw new Error('NotImplemented')`
2. **Fail**: Write failing test FIRST — verify it fails before implementing
3. **Pass**: Write minimal code to pass the test
4. **Refactor**: Clean up while keeping tests green

**Rule**: Always run `npm test` BEFORE reporting a fix complete — never claim tests pass without executing them.

### Coverage Requirements
- **New code**: Minimum 80% coverage
- **Critical paths**: 100% coverage (calculations, financial data, auth)
```

- [ ] **Step 2: Add test:coverage to Development Commands**

After the existing `npm run lint` line in Development Commands section, add:

```bash
npm run test:coverage  # Coverage report (requires vitest --coverage)
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add TDD enforcement and coverage requirements"
```

---

### Task 2: Enhance TESTING_GUIDE.md

**Files:**
- Modify: `.claude/docs/standards/TESTING_GUIDE.md`

- [ ] **Step 1: Read current TESTING_GUIDE.md**

```bash
cat .claude/docs/standards/TESTING_GUIDE.md
```

- [ ] **Step 2: Write enhanced content**

Replace entire file content with:

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add .claude/docs/standards/TESTING_GUIDE.md
git commit -m "docs: enhance TESTING_GUIDE with full TDD cycle and patterns"
```

---

### Task 3: Create `/implement` Skill

**Files:**
- Create: `.claude/skills/implement/SKILL.md`

- [ ] **Step 1: Create skills/implement directory**

```bash
mkdir -p .claude/skills/implement
```

- [ ] **Step 2: Write SKILL.md**

```markdown
---
name: implement-code
description: Implements code following TDD and superpowers:subagent-driven-development
user-invocable: true
---

# Implementation Protocol (TDD)

## 1. Context Loading
Read before implementing:
- `.claude/docs/standards/CODING_RULES.md`
- `.claude/docs/standards/TESTING_GUIDE.md`

## 2. TDD Cycle (STRICT)

### Step 1: Scaffold
Create minimal stub with `throw new Error('NotImplemented')`.

### Step 2: Write Failing Test FIRST
Run test to confirm it fails:
```bash
npm test -- --run tests/path/to/test
```

### Step 3: Implement Minimal Code
Write just enough to pass. No more.

### Step 4: Verify
```bash
npm test -- --run tests/path/to/test
npm test -- --run  # Full suite
```

## 3. Parallel Execution
For tasks that can run independently, invoke `superpowers:subagent-driven-development`:
```
Use subagent-driven-development to dispatch parallel agents for independent test files/modules.
```

## 4. Verification Checklist

Before completing:
- [ ] All new tests pass
- [ ] No existing tests broken
- [ ] Coverage meets minimums (80% new, 100% critical)
- [ ] No sensitive data in logs
- [ ] Types are proper (no `any`)
- [ ] Lint passes

## 5. Output
Provide summary of files modified, test results, and any issues.
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/implement/SKILL.md
git commit -m "feat: add /implement skill for TDD workflow"
```

---

### Task 4: Create Auto-format Hook

**Files:**
- Create: `.claude/hooks/auto-format.sh`

- [ ] **Step 1: Create auto-format.sh**

```bash
cat > .claude/hooks/auto-format.sh << 'EOF'
#!/bin/bash
# Auto-format on Write/Edit
# Skip if no files provided or linting not configured

FILES="$CLAUDE_TOOL_INPUTS"
if [ -z "$FILES" ]; then
  exit 0
fi

# Run lint fix on TypeScript/TSX files
cd "$(git rev-parse --show-toplevel)" 2>/dev/null || exit 0

for file in $FILES; do
  case "$file" in
    *.ts|*.tsx)
      npx eslint --fix "$file" 2>/dev/null
      ;;
  esac
done
EOF
chmod +x .claude/hooks/auto-format.sh
```

- [ ] **Step 2: Commit**

```bash
git add .claude/hooks/auto-format.sh
git commit -m "feat: add auto-format hook for Write/Edit operations"
```

---

### Task 5: Update settings.json with PostToolUse Hook

**Files:**
- Modify: `.claude/settings.json`

- [ ] **Step 1: Read current settings.json**

```bash
cat .claude/settings.json
```

- [ ] **Step 2: Add PostToolUse hook**

Add to the `hooks` section (after SessionStart):

```json
"PostToolUse": [
  {
    "matcher": "Write|Edit",
    "hooks": [
      {
        "type": "command",
        "command": "bash .claude/hooks/auto-format.sh"
      }
    ]
  }
]
```

- [ ] **Step 3: Commit**

```bash
git add .claude/settings.json
git commit -m "feat: add PostToolUse hook for auto-formatting"
```

---

### Task 6: Update vitest.config.ts with Coverage

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Write updated vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add vitest.config.ts
git commit -m "feat: add vitest coverage thresholds (80%)"
```

---

### Task 7: Update package.json with Test Scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Read current package.json scripts section**

Current scripts section:
```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:init": "tsx scripts/init-db.ts",
    "db:reset": "npx tsx scripts/reset-and-sync.ts",
    "db:push": "drizzle-kit push",
    "test": "vitest"
  },
```

- [ ] **Step 2: Update scripts section**

Replace `"test": "vitest"` with:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:init": "tsx scripts/init-db.ts",
    "db:reset": "npx tsx scripts/reset-and-sync.ts",
    "db:push": "drizzle-kit push",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
```

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add test:watch and test:coverage scripts"
```

---

### Task 8: Verify Existing tests/setup.ts

**Files:**
- Verify: `tests/setup.ts`

- [ ] **Step 1: Read tests/setup.ts**

```bash
cat tests/setup.ts
```

- [ ] **Step 2: If missing or incorrect, create/update**

The setup file should import jest-dom for extended assertions:

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 3: Commit if modified**

```bash
git add tests/setup.ts
git commit -m "fix: ensure tests/setup.ts imports jest-dom"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test -- --run
```

Expected: All tests pass

- [ ] **Step 2: Run coverage report**

```bash
npm run test:coverage
```

Expected: Coverage report generated with thresholds

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: No errors

- [ ] **Step 4: Commit all remaining changes**

```bash
git status
git add -A
git commit -m "feat: complete testing infrastructure setup"
```

---

## Success Criteria

- [ ] `npm test -- --run` passes
- [ ] `npm run test:coverage` produces coverage report
- [ ] Coverage thresholds enforced (80%)
- [ ] `/implement` skill is invokable
- [ ] Auto-format hook runs on Write/Edit
- [ ] All existing tests pass
- [ ] CLAUDE.md has TDD enforcement
- [ ] TESTING_GUIDE.md has full TDD cycle documentation
