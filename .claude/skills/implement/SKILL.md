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
