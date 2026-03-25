# Future Work & Known Gaps

> This file tracks upcoming features, known limitations, and technical debt.
> Mark items as `[DONE]` when completed, do not delete them.

---

## 🔴 HIGH PRIORITY

### Bank Statement Scanning (Pro)

- **Date:** 2026-02-08
- **Area:** Mobile / Pro Feature
- **Current State:** [DONE] BankStatementService.ts connected to `extract-bank-statement` Edge Function (v13). Uses GPT-4o-mini with Chat Completions API. PDF sent via `file` content type, images via `image_url`. Cost: ~$0.005/scan (~4K tokens).
- **Why It Matters:** Alternative to email scanning for users who don't want to connect Gmail
- **Next Action:** Monitor OpenAI API for improved models; currently using gpt-4o-mini

---

### Native Google Sign-In (Premium UX)

- **Date:** 2026-02-07
- **Area:** Mobile / OAuth
- **Status:** [DONE]
- **Summary:** Google Sign-In working on Android Studio dev build. Tested and confirmed by user.

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
