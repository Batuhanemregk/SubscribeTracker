#!/usr/bin/env bash
# Stop hook: once per session, if code/schema changed but docs did not, nudge to update docs + memory.
# Loop-safe: fires at most once per session_id (sentinel in /tmp); never blocks again afterward.
set -uo pipefail

input=$(cat)
sid=$(printf '%s' "$input" | jq -r '.session_id // "nosession"' 2>/dev/null)
marker="/tmp/claude-finify-docnudge-${sid}"

# Already nudged this session -> allow stop.
[ -f "$marker" ] && exit 0

dir="${CLAUDE_PROJECT_DIR:-$PWD}"
cd "$dir" 2>/dev/null || exit 0

# Count uncommitted source/schema changes vs doc changes.
code=$(git status --porcelain -- apps supabase 2>/dev/null | grep -cE '\.(ts|tsx|sql|json)$' || true)
docs=$(git status --porcelain -- future-work.md CLAUDE.md 2>/dev/null | grep -c . || true)

if [ "${code:-0}" -gt 0 ] && [ "${docs:-0}" -eq 0 ]; then
  : > "$marker"
  jq -n '{decision:"block",reason:"You changed code/schema this session but have not updated future-work.md or CLAUDE.md. If this is a significant change, update future-work.md (append; mark done, never delete) and CLAUDE.md, and save any durable learning to memory. If no doc update is warranted, briefly say why, then stop. (One-time reminder per session.)"}'
fi

exit 0
