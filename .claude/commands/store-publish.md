---
model: claude-sonnet-4-6
---

# Store Publish

Builds and submits Finify to App Store and/or Google Play using EAS CLI (build) + Playwright browser automation (store interactions).

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
5. **EAS config**: Read apps/mobile/eas.json, verify config
6. **EAS login**: Run `eas whoami` to verify logged in

If ANY check fails, stop and report the issue. Do NOT proceed to build.

### Step 2. Confirm with User

Display a summary:
```
Platform: [ios/android/all]
Profile: [production/preview]
Version: [from app.json]
```
Ask: "Proceed with build? (y/n)"

### Step 3. Build (EAS CLI)

```bash
cd apps/mobile
eas build --platform [PLATFORM] --profile [PROFILE] --non-interactive
```

Monitor build status until complete.

### Step 4. Upload

**iOS**: Use `eas submit --platform ios --latest` to upload to TestFlight (more reliable than browser upload for iOS).

**Android**: Download the .aab artifact, then use **Playwright browser automation** to upload to Google Play Console:
1. Navigate to Play Console → App → Testing → Internal testing
2. Create new release
3. Upload .aab via browser_file_upload
4. Fill release notes
5. Review and start rollout

### Step 5. Store Metadata (Playwright)

Use the **store-publisher agent** for all store console interactions:
- Fill store listing (title, description, keywords, screenshots)
- Set up privacy policy / support URLs
- Complete age rating / IARC questionnaire
- Fill Data Safety form (Android)
- Upload screenshots

Reference files:
- Store listing: ~/openclaw-work/finify/launch-pack/store_listing_en.md
- Data safety: ~/openclaw-work/finify/launch-pack/data_safety_notes.md
- Screenshots brief: ~/openclaw-work/finify/launch-pack/screenshots_brief.md

### Step 6. Submit for Review (Playwright)

**NEVER submit without user confirmation.** Show a full summary of what will be submitted first.

**iOS**: Navigate to App Store Connect version page → select build → fill review notes → click "Submit for Review"
**Android**: Promote from internal testing → production track

### Step 7. Post-submit

- Report submission status
- Take screenshots of both dashboards for verification
- For iOS: "Submitted for App Review. Expect 1-3 days."
- For Android: "Submitted for review. Expect hours to days."
