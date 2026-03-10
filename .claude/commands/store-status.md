---
model: claude-sonnet-4-6
---

# Store Status

Check the current status of Finify builds and submissions.

## Instructions

Run these commands and present a clean summary:

```bash
# Recent builds
eas build:list --limit 5 --json

# Current version
cat apps/mobile/app.json | grep -E '"version"|"versionCode"|"buildNumber"'

# EAS login status
eas whoami

# Git status
git log --oneline -3
git status --short
```

Present as a formatted table:
- Latest builds (platform, profile, status, created date)
- Current app version
- Git status (clean/dirty, latest commits)
- Any pending issues
