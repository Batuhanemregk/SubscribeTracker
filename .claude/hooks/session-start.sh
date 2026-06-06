#!/usr/bin/env bash
# SessionStart hook: surface future-work.md and remind Claude to keep docs/memory current.
set -uo pipefail

dir="${CLAUDE_PROJECT_DIR:-$PWD}"
fw="$dir/future-work.md"

reminder="Finify doc-maintenance reminder: after any significant code or schema change, update future-work.md (append; move finished items to the COMPLETED section, never delete) and CLAUDE.md, and record durable learnings in memory. Read the pending work below before starting."

if [ -f "$fw" ]; then
  body="$reminder

--- future-work.md (current, first 150 lines) ---
$(head -n 150 "$fw")"
else
  body="$reminder"
fi

jq -cn --arg c "$body" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}'
