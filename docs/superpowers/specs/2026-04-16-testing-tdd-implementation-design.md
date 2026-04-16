# Finance Tracker: Comprehensive Testing & TDD Implementation

**Date**: 2026-04-16
**Status**: Active
**Repos**: Finance Tracker (Phase 1), then Kamm.HanaHapp (Phase 2)

---

## Overview

Enhance the finance-tracker repo with comprehensive testing infrastructure and TDD discipline, following Pantas Green patterns. Phase 2 will apply the same approach to kamm.hanahapp with repo-specific adaptations.

---

## 1. CLAUDE.md Enhancement

### Changes

Add TDD enforcement clause and coverage requirements:

```markdown
## Testing & TDD

### TDD Protocol (Mandatory)
1. **Scaffold**: Create function/class stub with `raise NotImplementedError()`
2. **Fail**: Write failing test FIRST — verify it fails before implementing
3. **Pass**: Write minimal code to pass the test
4. **Refactor**: Clean up while keeping tests green

**Rule**: Always run `npm test` BEFORE reporting a fix complete — never claim tests pass without executing them.

### Coverage Requirements
- **New code**: Minimum 80% coverage
- **Critical paths**: 100% coverage (calculations, financial data, auth)
```

### Coverage Commands

Add to Development Commands section:
```bash
npm run test:coverage  # Coverage report
```

---

## 2. TESTING_GUIDE.md Enhancement

### New Content

#### 2.1 TDD Cycle (Detailed)

```markdown
### The TDD Cycle

1. **Scaffold**: Create the function/class stub
```typescript
export function calculateBudgetRemaining(spent: number, budget: number): number {
  throw new NotImplementedError();
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

3. **Pass**: Minimal implementation
```typescript
export function calculateBudgetRemaining(spent: number, budget: number): number {
  return budget - spent;
}
```

4. **Refactor**: Clean up while keeping tests green
```

#### 2.2 Strong Assertions Guidelines

| DO (Strong) | DON'T (Weak) |
|-------------|-------------|
| `expect(result).toBe(50)` | `expect(result).toBeTruthy()` |
| `expect(result).toEqual({ status: 'ok' })` | `expect(result).toBeDefined()` |
| `expect(() => fn()).toThrow()` | `expect(result).toBeGreaterThan(0)` |

#### 2.3 Test Data Patterns

```markdown
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
```

#### 2.4 Unit vs Integration Tests

| Type | Use When | Example |
|------|----------|---------|
| **Unit** | Pure logic, calculations | `calculateBudgetRemaining()` |
| **Integration** | API routes, DB operations | `GET /api/transactions` |

#### 2.5 Mocking Strategy

```markdown
### External APIs / DB
```typescript
vi.mock('@/lib/wise', () => ({
  fetchTransactions: vi.fn().mockResolvedValue([...mockData]),
}));
```
```

---

## 3. Custom Skill: `/implement`

Create `.claude/skills/implement/SKILL.md`:

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
Create minimal stub with `raise NotImplementedError()` equivalent in TypeScript.

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

---

## 4. Auto-format Hook Enhancement

### Add to `.claude/settings.json`

```json
"hooks": {
  "SessionStart": [...],
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
}
```

### Create `.claude/hooks/auto-format.sh`

```bash
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
```

---

## 5. Coverage Configuration

### Update `vitest.config.ts`

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

### Update `package.json` Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 6. Test Directory Structure

```
tests/
├── setup.ts
├── budgets.test.ts
├── api/
│   ├── transactions.test.ts
│   └── sync.test.ts
├── utils/
│   └── format.test.ts
└── components/
    └── FilterBar.test.tsx
```

---

## 7. Files to Create/Modify

| File | Action |
|------|--------|
| `CLAUDE.md` | Update - add TDD enforcement |
| `.claude/docs/standards/TESTING_GUIDE.md` | Enhance - add TDD cycle, assertions, patterns |
| `.claude/skills/implement/SKILL.md` | Create |
| `.claude/hooks/auto-format.sh` | Create |
| `.claude/settings.json` | Update - add PostToolUse hook |
| `vitest.config.ts` | Update - add coverage config |
| `package.json` | Update - add test:coverage script |
| `tests/setup.ts` | Create if not exists |

---

## 8. Implementation Phases

### Phase 1: Finance Tracker (This effort)
- All items above
- Run full test suite to verify

### Phase 2: Kamm.HanaHapp
- Apply same patterns with Kamm-specific adaptations
- Use existing kamm skills as context
- Leverage existing test-agent.sh where applicable

---

## 9. Success Criteria

- [ ] `npm test` runs successfully
- [ ] `npm run test:coverage` produces report
- [ ] Coverage thresholds enforced
- [ ] `/implement` skill is invokable
- [ ] Auto-format hook runs on Write/Edit
- [ ] All existing tests pass
