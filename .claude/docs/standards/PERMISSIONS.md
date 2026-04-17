# Pre-Approved Permissions

Operations that don't require prompting.

## Allowed Operations

### Development Server
- `Bash(npm*)` — npm scripts (dev, build, lint, test)
- `Bash(npx*)` — npx executables
- `Bash(next*)` — Next.js CLI commands
- `Bash(node*)` — Node.js runtime
- `Bash(tsx*)` — TypeScript executor

### Process Management
- `Bash(ps*)` — View running processes
- `Bash(kill*)` — Stop processes
- `Bash(pkill*)` — Kill processes by name
- `Bash(port*)` — Check port usage

### API Testing
- `Bash(curl*)` — Test API endpoints locally

### File Operations
- `Glob(*.ts)` — Find TypeScript files
- `Glob(*.tsx)` — Find React files
- `Glob(*.json)` — Find JSON files
- `Grep(*.ts)` — Search TypeScript content
- `Grep(*.tsx)` — Search React content
- `Read(*.ts)` — Read TypeScript files
- `Read(*.tsx)` — Read React files
- `Write(*.ts)` — Write TypeScript files
- `Write(*.tsx)` — Write React files

### Always Prompt
- `Bash(git*)` — Git operations require confirmation
