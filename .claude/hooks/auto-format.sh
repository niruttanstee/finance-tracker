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
