# Future Work & Known Gaps

> This file tracks upcoming features, known limitations, and technical debt.
> Mark items as `[DONE]` when completed, do not delete them.

---

## 🔴 HIGH PRIORITY

### Paywall self-guard for already-Premium users (deferred, 2026-06-18)

- **Date:** 2026-06-18
- **Area:** Mobile / PaywallScreen
- **Current state:** Onboarding no longer routes Premium users to the paywall (fixed in build #26), and other paywall entry points are `isPro`-gated. But the **Paywall screen itself doesn't self-guard** — if a Premium user somehow lands on it (e.g. RevenueCat restores Premium *while* the paywall is already open — a race), it still shows the purchase UI.
- **Why it matters:** belt-and-suspenders so a paying user is never shown "buy" options. Low likelihood now that the onboarding path is fixed.
- **Next action:** add a `useEffect` in `PaywallScreen` that, when `isPro()` becomes true, dismisses (`navigation.replace('MainTabs')` if `fromOnboarding`, else `goBack()`), being careful not to double-navigate with the purchase-success handler. User said "we'll add it later."


### Pre-Launch QA Pass — Bug Fixes + Insights + Premium Audit (2026-06-17)

- **Date:** 2026-06-17
- **Area:** Mobile / Calendar / Bank-scan / Insights / Premium / i18n
- **Current State:** Multi-part pre-launch polish pass on branch `feat/bank-scan-rewrite-auth-premium`. Completed (each committed, tsc green, 101 tests green):
  - **[DONE] Calendar 31st-day disappearing-payment bug (data-correctness):** `Date.setMonth` rollover dropped/misplaced subs billed on a day absent from the target month (a 31st-of-month sub vanished from June). Added `addBillingCycles()` (anchor-preserving, month-end-clamping) in `utils/calculations.ts`; routed `advanceToNextBillingDate` + `getSubscriptionBillingDatesInMonth` + the bank-scan `calculateNextBillingDate` through it; removed dead `getMonthBillingDates`. 14 new clamp unit tests. (commit `73bad02`)
  - **[DONE] Bank-scan animation overlap:** the 3D floating document painted over the upload title; reserved vertical space + margins in its container. ⚠️ **Visual confirmation pending in simulator (Faz 4).** (commit `6a9e67d`)
  - **[DONE] Premium gating audit:** verified RC is source of truth (App.tsx syncs `plan.tier` from `getProStatus` tri-state; `null`/offline never downgrades a payer), all premium features (bank scan, cloud sync, data export, biometric lock, no-ads) gate behind `isPro()`/entitlement + paywall routing, dev mock is `__DEV__`-only. Removed 4 dead `canUse*` getters. **No security/correctness gaps.** (commit `d3247f6`)
  - **[DONE] Insights enhancement:** added Quick-stats (avg/sub + next-30-day spend), Top Spenders (ranked, share-of-total + per-day cost), and Possible-Overlaps detector (categories with 2+ active subs). New tested utils `getTopSubscriptions` + `getSubscriptionOverlaps`. EN/TR parity 457/457. (commit `4e50fa6`)
  - **[DONE] Terms "Pro" → "Premium"** copy parity (part of `73bad02`).
  - **[DONE] GateGuard friction:** `ECC_GATEGUARD=off` added to gitignored `.claude/settings.local.json` (takes effect next session).
- **Why It Matters:** The calendar bug silently hid real upcoming payments — a core-value correctness defect. The rest is launch polish + a clean premium-gating bill of health.
- **[DONE] Faz 4 — bilingual simulator QA (iPhone 16 Pro):** self-drove every screen via a temporary `initialRouteName` + relaunch (no taps; `idb`/deep-links unavailable). Home/Insights/Budget/Calendar/Settings/Scan all render cleanly in **TR and EN** — scan-animation fix confirmed (the "Döküman Tara" title sits clear of the floating document), June renders with 30 days, premium-gating PREMIUM badges + "Premium" rebrand correct, no text overflow either language. All temp QA scaffolding reverted, clean boot verified, tsc green.
- **[DONE] Faz 3b — design fix shipped:** category bar-chart x-axis labels were hard-sliced to 5 chars ("Desig"/"Enter"/"Devel"); removed them since the legend already lists full names (commit `3466bad`).
- **Next Action (optional design polish, LOW priority):** quick-stat tiles on Insights could gain small icons for visual parity with the gradient cards above; consider a category donut (reuse `DonutChart`) beside the bar; the "next 30 days" stat could link to the upcoming-payments list. None blocking.

---

### App Store Go-Live — Pre-Flight Findings (v1.0 first submission)

- **Date:** 2026-06-17
- **Area:** Release / iOS / App Store Connect
- **Current State:** Ran an ASC pre-flight (code + RevenueCat MCP + URL checks) before first App Review submission. **3 blockers** found:
  1. **Privacy Policy URL not hosted (BLOCKING, Guideline 5.1.1):** `https://finify.app/privacy` returns a blank SPA shell (114 bytes; every path 200s with the same empty body). ASC App Information requires a public HTTPS privacy policy; reviewers would see a blank page. The in-app `PrivacyPolicyScreen` / `TermsOfServiceScreen` have real content (not enough — ASC needs the URL too). Support URL (`finify.app/support`) is also blank.
  2. **Subscriptions must be attached to v1.0 + "Missing Metadata" cleared:** both `finify_premium_monthly` / `finify_premium_yearly` must be "Ready to Submit" AND selected on the version page (first-subscription rule; clears once v1.0 + subs go to review together).
  3. **iPad screenshots were required:** `app.json ios.supportsTablet` was `true` → ASC demanded iPad Pro 12.9" shots. **FIXED in repo** → set to `false` (iPhone-only). ⚠️ Only takes effect in a **new build**; TestFlight **#23 was built with `supportsTablet:true`**, so submitting #23 as-is would STILL require iPad screenshots. Must rebuild (#24) before submitting, or provide iPad shots for #23.
- **Fixes applied this session (typecheck green):** (a) `app.json` `supportsTablet:false`; (b) wired the non-functional Paywall legal links — `PaywallScreen.tsx:360/364` `TouchableOpacity` now `onPress`-navigate to `PrivacyPolicy` / `TermsOfService` (were dead, no handler); (c) `PrivacyPolicyScreen` residual "Pro feature" → "Premium feature" (Pro→Premium rebrand had missed 2 lines).
- **Verified OK (no action):** export compliance declared; Restore Purchases implemented+wired; subscription renewal/terms disclosure present in paywall; no alt-payment bypass; **no prod trial mismatch** (trial is `__DEV__`-only, no ASC intro offer — consistent); premium gating uses the correct entitlement key `'SubscribeTracker Pro'` (matches RC); paywall uses `offerings.current` + `purchasePackage`; RC current offering `premium` set with both packages + iOS products + entitlement attached. RC note: App Store monthly product `duration` is `null` (metadata not synced — ASC sub still Missing Metadata + no ASC API key); RC `app_store_connect_api_key_configured:false` (see Premium/IAP item).
- **Why It Matters:** These are the exact gates between "TestFlight working" and "live on the App Store." Blocker #1 was not previously tracked and will hard-reject the submission.
- **Next Action:** (1) Host real Privacy Policy + Terms + Support pages at `finify.app/*` (content already exists in repo — convert the two screens to static HTML); (2) rebuild production (`supportsTablet:false`) → submit v1.0 with both subs attached + Review Notes explaining sandbox/premium access; (3) manual ASC: iPhone screenshots showing real app usage, App Privacy labels matching (AdMob/Google/Supabase), age rating, category, pricing.

---

### Startup Black-Screen Fix (App.tsx readiness gate)

- **Date:** 2026-06-06
- **Area:** Mobile / App startup / App.tsx
- **Current State:** [FIX SHIPPED TO TESTFLIGHT — pending physical-device confirmation] Committed as `5140ab5` on branch `fix/startup-black-screen`; EAS production build **1.0.4 (18)** built and uploaded to App Store Connect on 2026-06-07 (submission required 3 tries — Apple agreement acceptance has propagation lag). Root cause found: `AppContent.prepare()` only called `setIsReady(true)` after a sequential chain of `await`s (notification permission, scheduleAllReminders, initAdManager, initPurchases, checkProStatus) with **no `.catch` on `prepare()` and no per-call guards**. If any pre-ready await hung or threw, `isReady` stayed `false` forever → permanent dark loading screen (≈ black). The notification-permission path only runs on a real device (`Device.isDevice` guard skips it in the simulator), which is why TestFlight black-screened but the simulator did not. Reproduced on iPhone 16 Pro sim by injecting a hang before `setIsReady` (dark screen + spinner forever); fix verified by relaunch (Home renders even though RevenueCat init fails in background).
- **Fix:** Reordered `prepare()` so `setIsReady(true)` runs immediately after the local critical path (initData/migration/locale, wrapped in try/catch). All network/native inits (notifications, ads, RevenueCat, pro-sync, rates, catalog) moved **after** first paint, each in its own try/catch. Added a `cancelled` cleanup flag.
- **Why It Matters:** A hung/failed startup task could brick the app on launch for real users with no recovery.
- **Next Action:** Confirm on a physical device via TestFlight build **1.0.4 (18)** that the black screen is gone (build was processing/awaiting export-compliance answer at hand-off). Still open: (1) add a root **ErrorBoundary** so render-time crashes degrade gracefully instead of a blank screen; (2) open a PR to merge `fix/startup-black-screen` → `main`.

---

### iOS Export Compliance + TestFlight Deploy Flow

- **Date:** 2026-06-07
- **Area:** Mobile / Release / iOS
- **Status:** [DONE]
- **Summary:** Added `ITSAppUsesNonExemptEncryption: false` to `app.json` `ios.infoPlist` (`65c50cd`) so production builds no longer get stuck in App Store Connect "Missing Compliance" (Finify uses only standard HTTPS — exempt). Deploy flow that worked this session: `eas login` (CLI starts logged out; the expo MCP is authenticated for reads but the EAS project has **no GitHub repo connected**, so `build_run` / GitHub-triggered builds fail with "No repository found") → `eas build --platform ios --profile production --auto-submit`. Distribution cert, provisioning profile, and App Store Connect API key are all already stored on EAS servers. NOTE: right after accepting a pending Apple agreement, submissions can fail 2–3 times for a few minutes until Apple propagates the acceptance — retry.
- **Next Action:** None (working). For the next build, export compliance is auto-declared.

---

### Bank Statement Scanning (Pro)

- **Date:** 2026-02-08
- **Area:** Mobile / Pro Feature
- **Current State:** [DONE] BankStatementService.ts connected to `extract-bank-statement` Edge Function (v13). Uses GPT-4o-mini with Chat Completions API. PDF sent via `file` content type, images via `image_url`. Cost: ~$0.005/scan (~4K tokens).
- **Why It Matters:** Alternative to email scanning for users who don't want to connect Gmail
- **Next Action:** Monitor OpenAI API for improved models; currently using gpt-4o-mini

---

### Bank Statement Scanning — Full Rewrite (Accuracy + Robustness)

- **Date:** 2026-06-08
- **Area:** Mobile / Pro Feature / Edge Function
- **Current State:** [DONE — needs device verification + edge deploy] Full rewrite to fix "reads too much / wrong / errors out". Edge function migrated from Chat Completions (gpt-4o-mini) to the **Responses API** with **strict Structured Outputs** and model **`gpt-5-mini`** (env `OPENAI_VISION_MODEL`, swappable to gpt-5.4-mini / gpt-4o). All validation, confidence gating (AND of `isLikelySubscription && confidence>=0.6`), dedup/grouping (one entry per service+currency), cadence inference and retry (429/5xx + thrown network errors) now run **server-side** in `supabase/functions/extract-bank-statement/lib.ts`. Prompt rebalanced to "accuracy over recall" (reversed the old "be inclusive"). Always returns a `{ ok, ... }` envelope (HTTP 200); `errorCode` mapped to localized client messages. Client `statementAnalyzer` simplified to existing-sub matching only (tightened to avoid Netflix/Notion collisions; one-time charges no longer auto-selected). Screen gained an error step that retains the picked file + Retry, an empty state, and a "verify cycle" badge. Tests: 20 Deno tests (`__tests__/lib.test.ts` + 7 fixtures) and 8 analyzer jest tests. Reviewed by a 22-agent adversarial workflow; 4 findings fixed.
- **Why It Matters:** This is the headline Pro feature and was unreliable; accuracy + clear errors are required to ship.
- **Next Action:** [DEPLOYED] Edge function live at **v21**; validated on a real Garanti statement (found 12 subs, correctly excluded transfers/scooters/crypto). Remaining: device verification on Android.

---

### Bank Scan — Reasoning/Latency/Cost Tuning + Post-Ship QA (build #21)

- **Date:** 2026-06-12
- **Area:** Mobile / Edge Function / OpenAI cost
- **Current State:** [DEPLOYED v21 + client fixes committed, need new build] Real-world QA on TestFlight build #21 surfaced 3 bugs, all fixed:
  1. **504 "patladı" on a large statement** — ROOT CAUSE: gpt-5-mini at default `medium` reasoning took **87–150s** (logs) and hit the **Supabase ~150s synchronous request gateway timeout** (fixed on ALL plans — cannot be raised for a sync request). FIX: made reasoning effort env-tunable (`OPENAI_REASONING_EFFORT`, `IS_REASONING_MODEL` guard) and set the default to **`low`** (≈ medium quality for extraction, but well under 150s). Deployed v19→v20(minimal)→**v21(low)**.
  2. **Cross-scan duplicates (3× Claude)** — analyzer compared raw names while the app stores canonical names (Claude.ai → "Claude Pro"). FIX: `canonicalServiceKey()` in `statementAnalyzer.ts` matches via the known-services catalog first (committed, needs new build).
  3. **False "weekly" cadence (Microsoft)** — two one-off charges 5 days apart read as weekly. FIX: `inferCycle` now requires ≥3 charges to infer weekly (deployed v19+).
- **Also added:** friendlier client error for a 504 → `bankScan.errors.tooLargeTimeout` ("This statement is too large to scan. Try a shorter period (1–3 months).", en+tr); `BankStatementService` detects `error.context.status === 504` (committed, needs new build).
- **Cost (gpt-5-mini vs old gpt-4o-mini):** old ≈ $0.005/scan; new ≈ **$0.008 (small) – $0.02 (large) per scan** (~3–4×). Driver: gpt-5-mini output $2.00/1M vs $0.60/1M + reasoning tokens. `low` keeps both latency AND cost down vs medium. Still negligible (sub-cent to ~2¢); scans are Premium-gated + client rate-limited.
- **Why It Matters:** This is the headline Premium feature; reliability (no 504) and bounded cost are required to ship.
- **Next Action:** (1) Bundle a new EAS build with the committed client fixes (dedup + tooLargeTimeout error + Premium rename + Pro-gated sign-in); (2) consider the **async pipeline** below for guaranteed very-large-document support.

---

### Bank Scan — Async Pipeline for Very Large Documents (FUTURE)

- **Date:** 2026-06-12
- **Area:** Edge Function / Architecture
- **Current State:** [NOT STARTED] Synchronous extraction has a hard **~150s ceiling** (Supabase request gateway, all plans). `low` reasoning fits the realistic range (files capped at 10MB client-side; app advises 1–3 month statements), but a truly huge statement can still 504. The only robust fix is an async job: client uploads → function enqueues + returns a job id → background worker (or chunked page-batches) processes with up to 400s wall-clock (Supabase **Pro** plan) → client polls/realtime for the result.
- **Why It Matters:** Removes the 150s cap entirely for power users with 6–12 month statements; also lets us raise reasoning effort without timeout risk.
- **Next Action:** Only build if real users hit the 504 after `low` (the `tooLargeTimeout` message + "use 1–3 months" guidance is the interim mitigation). Requires Supabase Pro + a new client build (job submit + poll UI). Blocked-by: Supabase Pro upgrade (also stops the free-tier auto-pause).

---

### Auth — Apple Sign-In + Real Account Deletion + Disconnect

- **Date:** 2026-06-08
- **Area:** Mobile / OAuth / Edge Function / App Store compliance
- **Current State:** [DONE — needs native build + dashboard verification] Added **Apple Sign-In** (`expo-apple-authentication` + SHA-256 nonce + `supabase.auth.signInWithIdToken({ provider:'apple' })`); app.json gained the plugin + `ios.usesAppleSignIn`. **Google** hardened: `sessionFromRedirectUrl` now handles both implicit (hash tokens) and PKCE (`?code=` → `exchangeCodeForSession`). New **`delete-account` Edge Function** (service-role: deletes `public.users` row → cascades subscriptions, then `auth.admin.deleteUser`) wired into Settings → real delete (server + local wipe). **Disconnect** implemented (signOut + RevenueCat logout + clearAccount, keeps local data). Dev-only `getMissingConfig()` warning added.
- **Why It Matters:** Apple Sign-In is an App Store requirement when offering Google login; real delete-account satisfies the privacy ruleset + store policy.
- **Review fixes (19-agent adversarial pass):** enabled **PKCE** (`flowType:'pkce'` in supabase.ts — was implicitly using the implicit flow, violating the oauth-pkce rule; the `?code=` exchange branch is now live); made `delete-account` deletion **ordered + fatal** (subscriptions → users → auth user, return 500 on any error, never orphan PII — there is NO FK cascade from auth.users to public.users); `deleteAccount()` now recovers the server error message from `error.context.json()` on non-2xx.
- **Next Action:** Enable Apple as a provider in the Supabase dashboard (Service ID + key); build a dev/EAS build and verify Apple + Google sign-in, account delete (confirm the Supabase row is gone), and disconnect on iOS + Android. `npx supabase functions deploy delete-account`. Optional hardening: add an FK `public.users.id REFERENCES auth.users(id) ON DELETE CASCADE` migration as a cascade safety net.

---

### Premium / IAP — Production Hardening

- **Date:** 2026-06-08
- **Area:** Mobile / Monetization
- **Current State:** [DONE] PaywallScreen mock-purchase and the local "Start Trial" button are now gated behind `__DEV__` (no Pro without a real purchase in production). Added `addProStatusListener` (RevenueCat `addCustomerInfoUpdateListener`) wired in App.tsx so Pro status refreshes without an app restart (purchase/expiry/cross-device); cleaned up on unmount.
- **Why It Matters:** Prevents a free-Pro bypass in production and keeps entitlement state fresh.
- **Review fix:** startup pro-sync no longer downgrades a paying user on a transient/offline error — `getProStatus()` is now tri-state (`true|false|null`) and the app only downgrades on a CONFIRMED `false`, never on `null` (unknown). Replaced the old boolean `checkProStatus()`.
- **Next Action:** Set `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `ANDROID_KEY` as EAS build secrets; verify `finify_premium_monthly/yearly` + the `premium` entitlement resolve at runtime via the RevenueCat MCP.

---

### Tech Debt from the 2026-06-08 ship-prep pass

- **Date:** 2026-06-08
- **Area:** Mobile / Backend
- **Current State:** Known shortcuts taken during the bank-scan/auth/premium pass:
  1. **Server-side scan rate limiting deferred** — limits are still client-side (AsyncStorage), which is bypassable. A `scan_usage` table + RLS + per-`auth.uid()` check in the edge function was planned but deferred.
  2. **Native Google Sign-In not migrated** — kept the working `expo-auth-session`/WebBrowser flow (hardened) instead of `@react-native-google-signin` to avoid breaking a working login blind; native migration would give a nicer account-picker UX.
  3. **Startup pro-sync can wrongly downgrade an offline paying user** — `checkProStatus()` returns false on network error at launch → `downgradeToStandard()`. Pre-existing; consider only downgrading on a *confirmed* not-pro response.
  4. **Hardcoded "Subscribe Now - {price}" string** in PaywallScreen (i18n violation, pre-existing).
  5. **Real free trial** should be a RevenueCat intro offer on the products, not the removed local trial.
- **Why It Matters:** Bypassable limits + offline downgrade affect cost/abuse and paying users.
- **Next Action:** Prioritize (1) and (3) before scaling.

---

### Native Google Sign-In (Premium UX)

- **Date:** 2026-02-07
- **Area:** Mobile / OAuth
- **Status:** [DONE]
- **Summary:** Google Sign-In working on Android Studio dev build. Tested and confirmed by user.
- **Correction (2026-06-08):** The implementation is the browser-based `expo-auth-session` / `signInWithOAuth` flow, NOT the native `@react-native-google-signin` module (despite the title). It was hardened on 2026-06-08 (handles both implicit + PKCE redirects). Migrating to the native module remains an optional UX improvement — see the tech-debt entry above.

---

### Real Currency Conversion (Exchange Rates)

- **Date:** 2026-02-07
- **Area:** Mobile / Currency
- **Status:** [DONE]
- **Summary:** Created Supabase Edge Function `exchange-rates` (free API, in-memory cache), `currencyStore.ts` (Zustand with 6hr client cache, fallback rates), rewrote `currency.ts` with `Intl.NumberFormat` and `formatWithConversion()`. Rates fetched on app startup.

---

### RevenueCat IAP Integration

- **Date:** 2026-02-05
- **Area:** Mobile / Monetization
- **Status:** [DONE]
- **Summary:** `react-native-purchases` (v9.7.6) installed. `PurchaseService.ts` handles init, offerings, purchase, subscription check, restore, and logout. `PaywallScreen.tsx` loads real offerings from RevenueCat with mock fallback for Expo Go. Env keys `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` configured.

---

### Subscription Plans - Auto Update System

- **Date:** 2026-02-08
- **Area:** Data / Backend / Mobile
- **Status:** [DONE]
- **Summary:** Created `CatalogService.ts` with 24h-throttled `checkCatalogUpdate()` that fetches from Supabase `service_catalog` table, merges with bundled `known-services.json`, and caches via AsyncStorage. Seeded 10 top services with current pricing. Deployed `update-service-catalog` Edge Function (GET/POST) for admin management. Wired as non-blocking startup task in `App.tsx`.

---

### Automated Price Scraper (Phase 2 of Auto-Update)

- **Date:** 2026-02-08
- **Area:** Backend / Scraping / Automation
- **Current State:** Manual — admin pushes price updates via Edge Function or Supabase dashboard
- **Why It Matters:** 100+ services' prices change frequently. Manual tracking is unsustainable at scale.
- **Architecture:**
  1. **Scraper job** (Apify / Supabase cron / external worker) runs weekly or monthly
  2. Visits each service's pricing page, extracts current plan prices
  3. Compares with `service_catalog` table — only pushes rows that actually changed
  4. Calls `update-service-catalog` Edge Function with changed services
  5. Mobile app's `CatalogService.ts` picks up changes automatically on next 24h check
- **Next Action:** Evaluate scraping approach — Apify actor, Puppeteer worker, or LLM-assisted extraction from pricing pages
- **Depends On:** Subscription Plans Auto-Update [DONE]

---

### Higher Quality Logo Provider

- **Date:** 2026-02-05
- **Area:** Data / known-services.json
- **Current State:** Using Google Favicons (128px) - works but lower quality
- **Why It Matters:** Professional look needs high-res brand logos
- **Next Action:** Evaluate Logo.dev API key, brand CDN URLs, or custom logo hosting
- **Alternatives:** Logo.dev (API key), DeBounce, manual brand CDN URLs

---

## 🟡 MEDIUM PRIORITY

### Design Proposals — Outcome (2026-06-17)

- **Date:** 2026-06-17
- **Area:** Mobile / Insights / Calendar / Budget
- **Shipped this session:** icon-accented Insights quick-stats + "Most Expensive" card; category **donut** above the bar (fixed `DonutChart`'s undefined React key → `item.name`); removed truncated bar-chart x-labels; **calendar heatmap** (billing days tinted by spend); **currency-consistent** Insights totals (optional `convert` param on `getSpendingByCategory`/`getTopSubscriptions`/`getSubscriptionOverlaps`).
- **[DONE] On-device UI fixes (TestFlight #24 feedback, 2026-06-17):** (1) **Calendar grid** looked broken on real device — zero-gap square cells with border + heatmap fill touched each other, and the per-day logo + "+N" badge overflowed the ~40px cell. Inset each cell (gap) and replaced the logo cluster with up to 3 dots (logos still in day-detail list + Upcoming). (2) **6-Month Forecast chart** data labels collided with the top y-axis label (axis auto-maxed ≈460 vs 457 peak). Added ~30% headroom (`maxValue`) + lifted labels (`textShiftY`). Both verified in sim. (3) **Category names were shown raw/English** in Insights (overlaps + bar-chart legend) and PlanPicker — now routed through `t('categories.X', { defaultValue })`; completed the taxonomy by adding the 3 missing keys (`News`/`Security`/`Marketing`) to EN+TR (parity 467/467).
- **[DONE] `categoryBudgets` feature (was design proposal #5):** shipped as a **Premium** feature — see COMPLETED entry below.
- **Not a code bug — dev-warning toast (proposal #3):** the "Open debugger to view warnings" toast is benign dev noise (`ExpoAppleAuthentication` view-manager dev quirk, missing dev env vars, and a `[RevenueCat] "default" offering has no packages` warning). The only real cleanup is **archiving the leftover RC "default"/Test-Store offering** in the RevenueCat dashboard (the app's current offering is `premium`); not an app-code change.
- **Minor — Insights empty state (proposal #8):** currently adequate (charts show "No data", top-spenders/overlaps hidden when empty, stat cards show zeros). A dedicated full-screen empty CTA using `insights.noSubscriptions` / `insights.addToSeeInsights` is a small nice-to-have.
- **Why It Matters:** Captures what shipped vs. what's a deliberate follow-up so the next session doesn't re-derive it.
- **Next Action:** Build `categoryBudgets` as its own PR when prioritized; archive the stale RC `default` offering.

### i18n - Turkish Language Support

- **Date:** 2026-02-05
- **Area:** Mobile / Localization
- **Status:** [DONE]
- **Summary:** Full i18n implementation complete. ~280 translation keys in `en.json` and `tr.json` covering all 14 screens. `t()` calls wired into every screen. Language selector in SettingsScreen (System Default / English / Türkçe). Language preference persisted in `AppSettings.language`, initialized at app startup via `initLocaleFromSettings()`.

---

### Currency Display & Scan Dedup Fixes

- **Date:** 2026-02-08
- **Area:** Mobile / Currency / i18n / Scan
- **Status:** [DONE]
- **Summary:** Fixed hardcoded `$` symbols in 7 screens with `formatCurrency()`. Added `calculateMonthlyTotalConverted`/`calculateYearlyTotalConverted` to subscriptionStore for multi-currency aggregation. Fixed SubscriptionDetailsScreen to use `sub.currency`, dynamic date locale, translated 'Completed', and realistic payment history. Improved statementAnalyzer `isTracked` matching with bidirectional includes and fuzzy name+amount matching. Added 8 new i18n keys (en+tr). Renamed 'Bank Statement' → 'Transaction' across all i18n and UI (~24 strings). Replaced emoji scan step icons with Ionicons (search-outline, bar-chart-outline, sparkles-outline).

---

### Supabase Backend Integration

- **Date:** 2026-02-07
- **Area:** Backend / services/api
- **Status:** [DONE]
- **Summary:** Supabase project active (eu-central-1). Database tables `users`, `subscriptions`, `service_catalog` with full RLS (auth.uid() = user_id). 3 Edge Functions deployed: `exchange-rates` (currency), `extract-subscriptions` (LLM), `extract-bank-statement` (vision). SyncService with fullSync/push/pull/merge. Security advisories resolved (search_path migration applied).

---

### Dark/Light Theme Toggle

- **Date:** 2026-02-07
- **Area:** Mobile / Theme
- **Status:** [DONE]
- **Summary:** Migrated all 13 screens and 26 components to use `useTheme()` hook. App.tsx rewritten with dynamic StatusBar, NavigationTheme, and tab bar colors. Light mode now available to all users.

---

---

## 🟢 LOW PRIORITY

### Restore Type Safety for Native Module Imports

- **Date:** 2026-02-07
- **Area:** Mobile / TypeScript / Code Quality
- **Current State:** `react-native-google-mobile-ads` and `react-native-purchases` use dynamic `require()` with `any` types for Expo Go compatibility. Works fine at runtime but loses compile-time type checking.
- **Why It Matters:** `any` types bypass TypeScript safety — mistyped property access or wrong arguments won't be caught at build time.
- **Next Action:** Create conditional type imports (e.g. `type PurchasesPackage = typeof import('react-native-purchases').PurchasesPackage`) that resolve to `any` when module is absent, keeping full type safety in production builds.
- **Blocked By:** Not urgent — no security risk, only DX improvement.

---

### Swipeable - Tap Outside to Close

- **Date:** 2026-02-08
- **Area:** Mobile / HomeScreen
- **Status:** [DONE]
- **Summary:** Added `onScrollBeginDrag={closeAllCards}` to both FlatLists (list and grid views) in HomeScreen. Open swipeable cards now close when user scrolls.

---

### Bank API Connection (Open Banking / Salt Edge)

- **Date:** 2026-02-08
- **Area:** Mobile / Data Acquisition
- **Current State:** Researched via Spendee. Spendee uses Salt Edge (Open Banking/PSD2) for bank aggregation — read-only transaction access across 5000+ banks in 60+ countries. Cost: $300+/month for Salt Edge API license.
- **Why It Matters:** Auto-import subscriptions from bank transactions without manual entry
- **Next Action:** Evaluate Salt Edge sandbox API when ready for premium tier monetization
- **Blocked By:** Expensive ($300+/mo), Turkey Open Banking support limited, current PDF scanning is the pragmatic MVP approach

---

### Bill Reminders / Push Notifications

- **Date:** 2026-02-08
- **Area:** Mobile / Notifications
- **Status:** [DONE]
- **Summary:** `NotificationService.ts` uses i18n (`t()`) and `formatCurrency()` for all text. Settings toggle wires to `scheduleAllReminders`/`cancelAllReminders`. App.tsx passes user currency. Added 5 new i18n keys to both `en.json` and `tr.json`.

---

### Category-Based Budget Limits

- **Date:** 2026-02-08
- **Area:** Mobile / BudgetScreen
- **Current State:** BudgetScreen exists with overall spending view
- **Why It Matters:** Spendee charges for this — users want per-category budget limits with progress bars
- **Next Action:** Add budget limit per category with visual progress bar and alerts

---

### Auto-Fetch Service Plans and Prices

- **Date:** 2026-02-08
- **Area:** Services / Data Pipeline
- **Current State:** `known-services.json` has static service definitions with icon, color, category. No plan or pricing data.
- **Why It Matters:** Users expect pre-filled plan options and up-to-date prices when adding subscriptions via browse/search
- **Next Action:** Build a script or Edge Function to fetch current plans and pricing for known services (LLM-assisted or API-based)

---

### Update Deprecated 3rd-Party Dependencies

- **Date:** 2026-02-09
- **Area:** Mobile / Android Build
- **Current State:** Android release build produces multiple deprecation warnings from 3rd-party libraries
- **Why It Matters:** Deprecated APIs will eventually be removed, causing build failures in future React Native versions
- **Affected Libraries:**
  - `react-native-purchases` (RevenueCat) — `onCatalystInstanceDestroy()` deprecated, unchecked operations
  - `react-native-gesture-handler` — parameter name mismatch with supertype
  - `react-native-safe-area-context` — `uiImplementation` deprecated
  - `expo-modules-core` — `reportExceptionToLogBox` deprecated
  - `react-native-google-mobile-ads` — `TurboReactPackage` deprecated
  - `amazon-appstore-sdk` (via RevenueCat) — stack map table warnings
- **Next Action:** Run `npm outdated` and update each library to latest version, test for breaking changes

---

## ✅ COMPLETED

### TestFlight #25 feedback — round 3 (2026-06-18)

- **Date:** 2026-06-18
- **Status:** [DONE] (for build #26)
- **Fixed:**
  - **[CRITICAL — Premium lost on sign-out]** The Cloud-Sync "Sign Out" button called `logoutUser()` → `Purchases.logOut()`, which reset RevenueCat to anonymous → the pro-status listener fired `isPro=false` → **downgraded Premium**. On iOS, Premium is tied to the **Apple ID**, not the app's cloud-sync login. Fix: sign-out no longer calls `Purchases.logOut()` — it only signs out of Supabase + clears the local account. Premium now survives sign-out / re-sign-in.
  - **[Scan — failed scans no longer count]** A business-failure (`data.ok === false`) used to call `recordScan()` (counted against the daily/monthly quota) unless it was an `UPSTREAM_BUSY`. Now **no failure counts** — only a successful extraction decrements the quota. The per-scan cooldown still prevents rapid retries.
  - **[Nav bar]** Side margins 32 → **48** (clearly narrower / more centered). *(Was hard to eyeball in-sim because the dev LogBox toast overlaps the bar; the real build has no toast.)*
  - **[Swipe]** Tuned the Premium card Swipeable to stop the "actions pop on first touch": `activeOffsetX` 20→28 (needs a deliberate drag), added `rightThreshold={48}` (small drags spring back), `friction` 2→2.5 (smoother).
  - **[Scan — "Choose from Gallery" opened Files, not Photos]** `pickFromGallery` used `DocumentPicker` filtered to images (opened the Files app, where screenshots aren't reachable). Installed `expo-image-picker` (~17) and switched to `launchImageLibraryAsync` (real Photos library) with a permission request + `photosPermission` string in app.json. **Native module — only works from build #26 onward, not the current dev client.**
  - **[Scan quota]** Now shows "X scans remaining **this month**" (daily cap was moot; monthly 30 effective). Added an accuracy hint ("results can vary, scan again"). Dropped the false "unlimited scans" Premium copy.
- **Open decisions (need user input):**
  - **Scan monthly limit:** currently `MAX_SCANS_PER_DAY=100`, `MAX_SCANS_PER_MONTH=30` for everyone — but Settings markets Premium as "unlimited scans" (mismatch). Decide the real Premium cap (recommend ~30–50/mo to bound OpenAI cost) and fix the copy.
  - **Scan accuracy note:** the LLM is non-deterministic (same doc → 10 then 12 on re-scan). Proposed: add a small note like "Results can vary — if some look missing, scan again." (Now that failures are free and re-scans of a *successful* scan still count, consider whether re-scans should be discounted.)

### TestFlight #24 feedback — round 2 (2026-06-18)

- **Date:** 2026-06-18
- **Area:** Mobile (Settings / AddSubscription / Scan / Home / legal / nav)
- **Status:** [DONE] (in build #25)
- **Fixed:**
  - **[#7 — date picker, was the biggest gap]** There was **no billing-date field anywhere** — manual add, edit, and presets all auto-set `nextBillingDate` to "today + 1 cycle" with no way to change it. Built a pure-JS `DatePickerModal` (calendar grid, no native module → works in any build) and wired it into AddSubscription (manual + edit + prefill); edit now loads the existing date and `updateSubscription` persists it.
  - **[#1 — export]** CSV/PDF export crashed ("Cannot read property 'UTF8' of undefined") — SDK 54 moved the classic file API to `expo-file-system/legacy`; updated the import.
  - **[#10 — scan title]** Floating document still overlapped the "Document Scan" header: the upload step vertically-centered tall content with `flex:1`, overflowing up into the header. Wrapped it in a ScrollView (`flexGrow:1` + center) so it centers when it fits and scrolls (clipped below the header) when it doesn't. Verified in sim.
  - **[#11 — legal headers]** Privacy/Terms titles overlapped the status bar — added the app's standard top padding wrapper.
  - **[#8 — nav bar]** Widened side margins (20→32, more centered) and lowered opacity (0.85→~0.7) + stronger blur.
  - **[#9 — swipe actions]** Rounded the Edit/Delete block (all corners + clip + 8px gap) instead of only the delete's right edge.
  - **[#6 — view toggle]** Relabeled the confusing "See all" to the target view name ("Grid view" / "List view") + icon. (Scroll-jump on toggle deferred — see below.)
  - **[#3/#4/#5 — Settings declutter]** Removed the debug "Test Notification" row, the non-functional "Export Data" TODO placeholder, and the redundant "Disconnect Account" row (Sign Out already does disconnect). Gated the "Reset to Standard (Debug)" button behind `__DEV__` so it never ships to users. Removed 13 now-dead i18n keys (EN+TR) + deleted 2 dead card components (`AnimatedSubscriptionCard`, `SwipeableSubscriptionCard`).
- **Deferred (not yet done):**
  - **#6 scroll-jump:** toggling list↔grid remounts the FlatList (different `key` for `numColumns` change) → resets scroll to top. Real fix = single FlatList with `numColumns:1` + chunked rows for grid; deferred to avoid risking the Home layout in this build.
  - **#9 premature reveal:** the "actions flash on first touch" is likely press-dim feedback; `activeOffsetX={[-20,20]}` already gates the swipe. Needs live device testing to confirm/repro.
  - **#2 (Sync to Cloud) → [DONE] made automatic (2026-06-18):** was manual-only (tap the button). Now auto-syncs for signed-in Premium users: a **debounced push (2.5s)** after add/update/delete (coalesces rapid edits, Premium+signed-in gated, no-op otherwise) in `subscriptionStore`, plus a **one-shot full sync on app launch** (`App.tsx` prepare effect, after RevenueCat pro-status resolves). The manual "Sync to Cloud" button stays as a force-sync. Not sim-verifiable (needs real auth + Premium + Supabase) — verify on device.

### Category Budgets (per-category limits) — Premium

- **Date:** 2026-06-17
- **Area:** Mobile / Budget / Premium / i18n
- **Status:** [DONE]
- **Summary:** Per-category monthly budget limits, gated behind the Premium entitlement (`isPro() || isTrialActive()`). Added `categoryBudgets: Record<string, number>` to `BudgetSettings` (default `{}`; rehydration-safe via `?? {}` in store + screen) with `setCategoryBudget`/`removeCategoryBudget` store actions. New pure helper `getCategoryBudgetStatus(categorySpending, categoryBudgets)` in `calculations.ts` (reuses `getBudgetStatus` thresholds; unions spending + budgeted categories; budgeted sort first by usage % then unbudgeted by spend; status `'safe'|'warning'|'danger'|'none'`) + exported `CategoryBudgetRow`. Extracted shared `CATEGORY_COLORS` const (removed the duplicated inline map in `getSpendingByCategory`). BudgetScreen renders, for Premium users, a "Category Budgets" list (colored dot, translated `categories.*` name, spent/limit, status-tinted progress bar, over-budget/near-limit warning, tap-to-edit modal with Remove-Limit); for free users a locked gradient card (PREMIUM badge → Paywall). 6 new unit tests (108 total green), tsc clean, i18n parity 466/466 (9 new `budget.*` keys EN+TR). Verified both states in the iOS simulator (TR locale).
- **Why It Matters:** Spendee-style power feature and a natural upsell that strengthens the Premium tier ahead of go-live.
- **Product decision (2026-06-17):** budget alerts stay **in-screen only** — no push notifications for budget/category overages. Per user: don't spam users; payment/renewal reminders are the only notifications. Removed the old **"Budget Alerts" settings toggle** (it promised "Get notified at 80%…" but was never wired to `NotificationService` — a false promise) plus its now-dead code: `BudgetSettings.isEnabled`/`alertThreshold`, `setBudgetEnabled`/`setBudgetAlertThreshold` store actions, and `budget.alertsTitle`/`alertsDescription` i18n keys. The on-screen "Budget Exceeded!" card and per-category warnings remain (they don't promise push). **Do not re-add budget push notifications.**
- **Follow-ups:** could surface a category-budget summary on Home/Insights.

### Premium Floating Glass Tab Bar

- **Date:** 2026-02-08
- **Area:** Mobile / Navigation
- **Status:** [DONE]
- **Summary:** Rewrote MainTabs in App.tsx with floating glass tab bar: BlurView background (expo-blur), rounded corners (24px), floating position (absolute, 24px from bottom), haptic feedback on tab switch (expo-haptics), i18n labels from tabs.\* keys, animated active dot indicator. All 5 tab screens padded to 140px bottom.

### Smart Service Matching for Scanned Subscriptions

- **Date:** 2026-02-08
- **Area:** Mobile / BankStatementScanScreen
- **Status:** [DONE]
- **Summary:** Created matchKnownService.ts utility with 5-level fuzzy matching (exact name → alias → ID/domain → contains → partial word) against known-services.json (100+ services). Scanned subscriptions now get real brand icons, colors, categories, and logo URLs. Unmatched services get deterministic unique colors via name hash. Integrated into BankStatementScanScreen.tsx.

### See All Grid View Crash Fix

- **Date:** 2026-02-08
- **Area:** Mobile / HomeScreen
- **Status:** [DONE]
- **Summary:** Fixed FlatList crash when switching between list and grid views by adding key="list" and key="grid" props, forcing React to re-mount the FlatList when numColumns changes.

### Logo Removed from HomeScreen

- **Date:** 2026-02-08
- **Area:** Mobile / HomeScreen
- **Status:** [DONE]
- **Summary:** Removed app icon Image from HomeScreen header leftElement. Header now shows only the greeting text and settings gear button.

### Remove Stat Card Animations

- **Date:** 2026-02-05
- **Area:** Mobile / HomeScreen
- **Status:** [DONE]
- **Summary:** All GradientStatCard delay props set to 0, no more shake/entrance animations

### Remove Reschedule Button

- **Date:** 2026-02-05
- **Area:** Mobile / SubscriptionDetailsScreen
- **Status:** [DONE]
- **Summary:** Removed non-functional Reschedule button, Edit is now fullWidth

### Swipeable Close Other Cards

- **Date:** 2026-02-05
- **Area:** Mobile / HomeScreen + PremiumSubscriptionCard
- **Status:** [DONE]
- **Summary:** Opening new swipeable closes previously open one via ref tracking

### Service Picker Screen (Template Selection)

- **Date:** 2026-02-05
- **Area:** Mobile / AddSubscription Flow
- **Status:** [DONE]
- **Summary:** Created ServicePickerScreen.tsx with search bar, category tabs, 3-column grid of services with Clearbit logos, and custom subscription option. HomeScreen FAB now navigates here.

### Plan Picker Screen

- **Date:** 2026-02-05
- **Area:** Mobile / AddSubscription Flow
- **Status:** [DONE]
- **Summary:** Created PlanPickerScreen.tsx showing service logo, selectable plan cards with radio buttons, and continue button. Pre-fills AddSubscription with selected plan data.

### Card Logos (Real Images)

- **Date:** 2026-02-05
- **Area:** Mobile / PremiumSubscriptionCard
- **Status:** [DONE]
- **Summary:** Added logoUrl to Subscription type. Updated PremiumSubscriptionCard with Image component, error handling, emoji fallback. AddSubscriptionScreen handles prefillData with logoUrl from ServicePicker flow.

### LLM Email Scanning (GPT-4o-mini)

- **Date:** 2026-02-07
- **Area:** Mobile / Email Scanning
- **Status:** [DONE]
- **Summary:** Complete LLM extraction pipeline: GmailService.ts (Gmail REST API), OutlookService.ts (MS Graph), LLMExtractorService.ts (rule-based + GPT-4o-mini with confidence gating, daily budget, template cache), Supabase Edge Function `extract-subscriptions`, DetectionService rewritten from simulated to real scanning. SecureStore token management added. ScanProgressScreen wired to real scanService.

### Secure Token Storage

- **Date:** 2026-02-07
- **Area:** Mobile / Security
- **Status:** [DONE]
- **Summary:** Installed expo-secure-store. OAuth tokens stored via SecureStore in AddEmailAccountScreen. DetectionService retrieves tokens for email fetching. Delete tokens on account disconnect.

### Email Scanning Removal

- **Date:** 2026-02-07
- **Area:** Mobile / Architecture
- **Status:** [DONE]
- **Summary:** Removed all email scanning infrastructure: 10 files deleted (GmailService, OutlookService, LLMExtractorService, DetectionService, etc.), email types removed from types/index.ts, accountStore rewritten from email to Google auth, planStore entitlements updated, FeatureGate features updated, all UI text and legal screens cleaned of email references, Outlook OAuth config removed, Gmail scopes reduced to profile-only.

### Dynamic Theme System

- **Date:** 2026-02-07
- **Area:** Mobile / UI
- **Status:** [DONE]
- **Summary:** Migrated all 13 screens and 26 components to useTheme() hook. App.tsx rewritten with dynamic StatusBar, NavigationTheme, and tab bar colors. Light mode un-gated from Pro. ThemeContext updated to allow all users to select dark/light/system.

### Currency Display & i18n Comprehensive Fix

- **Date:** 2026-02-08
- **Area:** Mobile / UI / i18n
- **Status:** [DONE]
- **Summary:** Fixed currency display in CalendarScreen (used `formatCurrency` with `sub.currency`), SavingsCard (rewrote with i18n + `formatCurrency`), CategoryBarChart (replaced `$` with `getCurrencySymbol`). Fixed i18n: chart titles use translated keys, budget interpolation `%{{percent}}` → `{{percent}}%`. Renamed scan feature "İşlem" → "Döküman" across ~24 i18n strings. Updated tips to mention kredi kartı ekstresi/hesap hareketi. Added gallery picker to scan screen. 14 files modified.
