---
model: claude-sonnet-4-6
---

# Store OTA Update

Push a JavaScript-only update to users without store review using EAS Update.

## Arguments
$ARGUMENTS

The argument should be a short description of the change (e.g., "fix subscription date calculation")

## Instructions

### Step 1. Validate

1. Run tests: `cd apps/mobile && npm test`
2. Check git status is clean
3. Verify the changes are JS-only (no new native modules, no app.json plugin changes)
   - Run: `eas fingerprint:generate` and compare with last build fingerprint
   - If fingerprint changed, STOP — a new native build is required, use /store-publish instead

### Step 2. Confirm

Display:
```
Branch: production
Message: [from $ARGUMENTS]
Platform: all
```
Ask user to confirm.

### Step 3. Push Update

```bash
cd apps/mobile
eas update --branch production --platform all --message "[MESSAGE]" --non-interactive
```

### Step 4. Verify via Store Consoles (Playwright)

Optionally use Playwright to verify the update is live:
1. Navigate to App Store Connect → TestFlight → check OTA update status
2. Navigate to Play Console → check update channel status

### Step 5. Report

- Display update ID and status
- Note: "OTA update published. Users will receive it on next app launch."
- Note: "This does NOT go through store review."
