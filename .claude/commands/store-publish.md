---
model: claude-sonnet-4-6
---

# Store Publish

Builds and submits Finify to App Store and/or Google Play.

## Arguments
$ARGUMENTS

If no arguments provided, default to both platforms.
Valid arguments: "ios", "android", "all", "preview" (for test build)

## Instructions

### Step 1. Pre-flight Checks

Run ALL of these and report results:

1. **Tests**: `cd apps/mobile && npm test`
2. **Git status**: Ensure working tree is clean
3. **Secrets scan**: Grep source for hardcoded API keys/passwords (exclude node_modules, .test files)
4. **Version check**: Read apps/mobile/app.json, display current version
5. **EAS config**: Read apps/mobile/eas.json, verify submit config has real values (no FILL_ placeholders)
6. **EAS login**: Run `eas whoami` to verify logged in

If ANY check fails, stop and report the issue. Do NOT proceed to build.

### Step 2. Confirm with User

Display a summary:
```
Platform: [ios/android/all]
Profile: [production/preview]
Version: [from app.json]
Auto-submit: [yes/no]
```
Ask: "Proceed with build? (y/n)"

### Step 3. Build

```bash
cd apps/mobile
eas build --platform [PLATFORM] --profile [PROFILE] --non-interactive
```

Monitor build status. If --auto-submit was requested, add `--auto-submit` flag.

### Step 4. Submit (if not auto-submit)

After build completes:
```bash
cd apps/mobile
eas submit --platform [PLATFORM] --latest
```

### Step 5. Post-submit

- Report build ID and status
- For iOS: "Build submitted to TestFlight. Test it, then submit for review in App Store Connect."
- For Android: "Build submitted to internal track. Test it, then promote to production in Play Console."
- Remind about manual steps if first time (IARC, Data Safety, screenshots)

### Step 6. Metadata (iOS only)

If iOS build was submitted:
```bash
eas metadata:lint
eas metadata:push
```
