#!/usr/bin/env python3
"""
PreToolUse Hook: Block access to sensitive files.
"""

import json
import re
import sys
from pathlib import Path

ALLOWED_ENV_FILES = {'.env.example', '.env.template', '.env.test'}
SENSITIVE_ENV_FILES = {'.env', '.env.local', '.env.production', '.env.staging'}
SENSITIVE_FILES = {'secrets.json', 'credentials.json', 'id_rsa', 'id_ed25519', 'service_account.json'}
SENSITIVE_PATTERNS = {'private_key', 'secret_key', 'api_key', 'password'}
SENSITIVE_EXTENSIONS = {'.pem', '.key', '.p12', '.pfx'}


def is_sensitive_file(file_path: str) -> bool:
    path_obj = Path(file_path)
    name_lower = path_obj.name.lower()
    if name_lower in ALLOWED_ENV_FILES:
        return False
    if name_lower in SENSITIVE_ENV_FILES or name_lower.startswith('.env'):
        return True
    if name_lower in SENSITIVE_FILES:
        return True
    if path_obj.stem.lower() in SENSITIVE_PATTERNS:
        return True
    return path_obj.suffix.lower() in SENSITIVE_EXTENSIONS


def check_glob_pattern(pattern: str) -> bool:
    if not pattern:
        return False
    pattern_lower = pattern.lower()
    if '.env' in pattern_lower:
        return not any(pattern_lower.endswith(allowed) for allowed in ALLOWED_ENV_FILES)
    return any(s in pattern_lower for s in SENSITIVE_FILES | SENSITIVE_PATTERNS)


def check_bash_command(command: str):
    cmd_lower = command.lower()
    normalized = re.sub(r'["\'`\\]', '', cmd_lower)
    for env in SENSITIVE_ENV_FILES:
        if env in normalized:
            return f"Command references sensitive file '{env}'"
    return None


def block(reason: str):
    print(f"BLOCKED: {reason}", file=sys.stderr)
    sys.exit(2)


def main():
    input_data = sys.stdin.read()
    if not input_data:
        sys.exit(0)

    try:
        data = json.loads(input_data)
    except json.JSONDecodeError:
        sys.exit(0)

    tool_name = data.get('tool_name', '')
    tool_input = data.get('tool_input', {})

    if tool_name in ('Read', 'Write', 'Edit'):
        path = tool_input.get('file_path', '') or tool_input.get('path', '')
        if path and is_sensitive_file(path):
            block(f"Access to '{Path(path).name}' is prohibited.")
    elif tool_name == 'Glob':
        pattern = tool_input.get('pattern', '')
        if pattern and check_glob_pattern(pattern):
            block(f"Glob pattern targets sensitive files.")
    elif tool_name == 'Grep':
        path = tool_input.get('path', '')
        pattern = tool_input.get('glob', '')
        if path and is_sensitive_file(path):
            block(f"Grep path targets sensitive file.")
        if pattern and check_glob_pattern(pattern):
            block(f"Grep glob targets sensitive files.")
    elif tool_name == 'Bash':
        command = tool_input.get('command', '')
        if command:
            reason = check_bash_command(command)
            if reason:
                block(reason)

    sys.exit(0)


if __name__ == '__main__':
    main()
