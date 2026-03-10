---
model: claude-sonnet-4-6
---

# Store Status

Check the current status of Finify builds, submissions, and store listings.

## Instructions

### Step 1. EAS Build Status (CLI)

```bash
cd apps/mobile

# Recent builds
eas build:list --limit 5 --json

# Current version
cat app.json | grep -E '"version"|"versionCode"|"buildNumber"'

# EAS login status
eas whoami
```

### Step 2. Git Status

```bash
git log --oneline -3
git status --short
```

### Step 3. Store Console Status (Playwright)

Use Playwright browser automation to check both store dashboards:

**App Store Connect:**
1. Navigate to https://appstoreconnect.apple.com → App → App Store
2. Take a snapshot to check: build status, review status, current version live
3. Report findings

**Google Play Console:**
1. Navigate to https://play.google.com/console → App → Dashboard
2. Take a snapshot to check: release status, review status, any policy issues
3. Report findings

### Step 4. Summary

Present a formatted report:
```
📱 Finify Status Report
━━━━━━━━━━━━━━━━━━━━

EAS Builds:
  iOS:     [status] — [date]
  Android: [status] — [date]

App Version: [version]
Git: [clean/dirty] — [latest commit]

App Store Connect:
  Status: [In Review / Ready for Sale / etc.]
  Version: [live version]

Google Play Console:
  Status: [In Review / Published / etc.]
  Version: [live version]

Issues: [any blockers or warnings]
```
