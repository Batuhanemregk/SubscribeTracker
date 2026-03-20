# CLAUDE.md — Finify (SubscribeTracker)

## Project Overview

Finify is a privacy-first subscription tracking mobile app for Android (iOS planned). Users add subscriptions manually or scan bank statements (Pro feature, GPT-4o-mini via Supabase Edge Function). Monetized via RevenueCat IAP and AdMob ads for free-tier users. Backend is entirely Supabase.

- **Product name:** Finify
- **Bundle ID:** `com.subssentry.app`
- **Version:** 1.0.1 (versionCode 2)
- **Expo managed workflow** — no ejected native iOS directory; Android has a native build directory.

## Current Product Scope

- **Core:** Add, edit, delete, view subscriptions (manual entry)
- **Bank statement scan (Pro):** PDF/image → GPT-4o-mini extraction → review & add
- **Insights:** Monthly/yearly totals, category breakdown, 6-month forecast, potential savings
- **Budget:** Monthly spending limit with progress ring and alerts
- **Calendar:** Billing dates projected per subscription cycle onto a month view
- **Cloud sync (Pro):** Bidirectional Supabase sync, offline-first, last-write-wins
- **Export (Pro):** CSV and PDF
- **Biometric lock (Pro):** Face ID / Fingerprint via `expo-local-authentication`
- **Ads:** Interstitial (3-min cooldown, max 3/day) + banner for free users
- **Purchases:** RevenueCat monthly/yearly subscriptions (`finify_premium_monthly`, `finify_premium_yearly`)

Broader budgeting or personal finance features are **future scope**, not current core.

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native 0.81 + Expo 54, TypeScript 5.9 (strict) |
| Navigation | React Navigation 7 (native-stack + bottom-tabs) |
| State | Zustand 5 + AsyncStorage persistence |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| Purchases | RevenueCat (`react-native-purchases` 9.7) |
| Ads | `react-native-google-mobile-ads` 16 |
| i18n | i18n-js 4.5 — English + Turkish (~480 string entries across 26 namespaces) |
| Charts | `react-native-gifted-charts` (BarChart, PieChart, LineChart) |
| Calendar | `react-native-calendars` |
| Styling | Custom ThemeContext + `StyleSheet.create()` — no CSS framework |
| Animation | `react-native-reanimated` 4.1 |

## Repository Structure

```
apps/mobile/
  android/                      # Native Android build files
  assets/                       # App icons, splash, design references
  App.tsx                       # Entry point — navigation, init, biometric gate
  app.json                      # Expo config (plugins, AdMob IDs, bundle IDs)
  package.json
  src/
    components/                 # ~30 component files + barrel index files
      ads/                      #   BannerAd
      buttons/                  #   PrimaryButton, SecondaryButton, FAB, IconButton
      cards/                    #   GradientStatCard, GradientHeroCard, SavingsCard
      charts/                   #   BudgetCircularProgress, CategoryBarChart, ForecastLineChart
      feedback/                 #   LoadingSpinner, EmptyState
      inputs/                   #   TextInput, AmountInput, SegmentedControl, IconGrid, ColorGrid
      layout/                   #   Screen, Header
      pro/                      #   FeatureGate (also exports FeatureGateInline)
      (root)                    #   DonutChart, GradientCard, StatCard, AnimatedTabScreen,
                                #   SwipeableSubscriptionCard, AnimatedSubscriptionCard,
                                #   CompactSubscriptionCard, PremiumSubscriptionCard,
                                #   AddMethodSheet, ScanBanner
    screens/                    # 14 screens
    services/                   # 10 service files + barrel index
    state/stores/               # 5 Zustand stores
    types/index.ts              # All shared TypeScript types
    theme/                      # ThemeContext, colors, typography, spacing, shadows
    i18n/                       # Setup + locales/ (en.json, tr.json)
    data/                       # seed.ts, known-services.json (~175 plan entries),
                                # calculations.ts, repository.ts (legacy, mostly no-op)
    config/index.ts             # AdMob IDs (hardcoded), Google OAuth (env vars)
    lib/                        # supabase.ts client, database.types.ts
    utils/                      # calculations, currency, matchKnownService, statementAnalyzer
supabase/
  schema.sql                    # Full schema (users, subscriptions, service_catalog + RLS + triggers)
  functions/
    extract-bank-statement/     # GPT-4o-mini: PDF/image → subscription list
    extract-subscriptions/      # Email-based extraction (usage unclear from mobile app)
    exchange-rates/             # Currency rates API with in-memory cache
```

## Commands

```bash
cd apps/mobile
npm install             # Install dependencies
npm start               # Expo dev server
npm run android         # Build & run Android
npm run ios             # Build & run iOS (requires iOS setup)
npm test                # Jest tests (utils/__tests__/)
npx tsc --noEmit        # Type check without emitting
```

## Environment

Mobile env vars in `apps/mobile/.env` (template: `.env.example`):

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_REVENUECAT_IOS_KEY
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
```

- `EXPO_PUBLIC_*` prefix = accessible in client code at build time
- AdMob IDs remain hardcoded in `src/config/index.ts`; test ads used when `__DEV__` is true
- Supabase client silently disables cloud sync if env vars are missing

## Architecture

- **Offline-first.** AsyncStorage is the source of truth. Supabase cloud sync is optional.
- **5 Zustand stores** (all persisted via AsyncStorage):
  - `subscriptionStore` — CRUD, payment history, cloud sync state
  - `settingsStore` — theme, language, currency, budget, onboarding flags
  - `planStore` — tier (standard/pro), entitlement booleans
  - `currencyStore` — exchange rates with 6hr client cache + fallback rates
  - `accountStore` — Supabase auth session
- **Navigation:** Root Stack → MainTabs (5 bottom tabs) + 8 modal/push screens
- **Theme:** `ThemeContext` provides colors, `isDark`, `mode`. Dark is default. Light theme is currently available to all users (code comment: "all users can choose").
- **Pro gating:** `FeatureGate` component + `usePlanStore().isPro()`. Entitlements: `bankStatementScan`, `cloudSync`, `dataExport`, `biometricLock`, `noAds`.
- **Ad lifecycle:** `AdManager.ts` tracks cooldown + daily count in AsyncStorage. `AdMobService.ts` loads/shows ads.
- **Bank scan pipeline:** File validation (size, MIME, magic bytes) → Base64 → Supabase Edge Function → GPT-4o-mini → `statementAnalyzer.ts` deduplication → user review screen.
- **Service matching:** `matchKnownService.ts` fuzzy-matches merchant names against `known-services.json` (~175 plan entries) for auto-fill of icon, color, category.
- **Cloud sync:** Last-Write-Wins on `updated_at`. Supabase RLS isolates per-user data. `syncService.ts` handles push/pull/full sync.

## Coding Conventions

- TypeScript strict mode. Path alias `@/*` → `src/*`.
- English only for code, comments, identifiers, and UI strings.
- Functional components with hooks. No class components.
- Barrel exports via `index.ts` in each subdirectory.
- File naming: PascalCase for components/screens/services, camelCase for stores/utils.
- Styling via `StyleSheet.create()` or inline objects. No CSS libraries.
- Platform differences: `Platform.select()` or `Platform.OS` checks.
- i18n: All user-facing text via `t('namespace.key')`. Both `en.json` and `tr.json` must be updated together.

## UI / Design Rules

- Primary: `#8B5CF6` (violet). Dark bg: `#0D0D12`. Dark card: `#1A1A24`.
- Light bg: `#F8F9FA`. Light card: `#FFFFFF`.
- Tab bar: Floating, 64px tall, 24px radius, BlurView on iOS, elevation on Android.
- Haptics on tab press and key interactions (`expo-haptics`).
- Transitions: 250ms, `slide_from_bottom` for modals, `slide_from_right` for push, `fade` for tabs.
- Icons: Ionicons via `@expo/vector-icons`.
- Follow Figma closely when design specs are provided.

## Platform Rules

- Primary target: Android (native build directory exists).
- iOS: Supported via Expo managed workflow (no native `ios/` directory yet).
- `Platform.select()` for shadow (iOS) vs elevation (Android).
- Safe areas: `react-native-safe-area-context`.
- AdMob and RevenueCat have separate per-platform IDs/keys.

## Security Rules

- Never store raw email content or bank statement data — only derived metadata.
- `.env` is in `.gitignore`. Do not commit secrets.
- Supabase RLS enforces row-level access per user.
- Client-side keys in `src/config/` are public by design (AdMob). Sensitive keys go in env vars.
- Bank statement files are discarded after Edge Function extraction.
- File upload validation: MIME type + magic bytes before sending.
- Bank scan rate limits: 100/day, 30/month per user, 30s cooldown.

## Workflow Rules for Claude

1. **Read before writing.** Open the relevant file and understand the existing pattern before making changes.
2. **Reuse before creating.** Check `src/components/`, `src/utils/`, and `src/services/` for existing solutions. Do not duplicate.
3. **No new dependencies** without explicit user approval. Justify why the existing stack can't do it.
4. **Explain major refactors** before executing. Get confirmation on the approach.
5. **Follow existing architecture.** Zustand for state, services for business logic, components organized by type. Don't introduce new patterns.
6. **Run `npx tsc --noEmit`** after TypeScript changes to verify types compile.
7. **Run `npm test`** after modifying utility functions to verify tests pass.
8. **Maintain i18n parity.** Every new user-facing string needs a key in both `en.json` and `tr.json`.
9. **Preserve product scope.** This is a subscription tracker. Do not add unrelated features.
10. **Gate Pro features.** New premium features must use `FeatureGate` or `usePlanStore().isPro()` with paywall fallback.
11. **Don't break the init sequence.** `App.tsx` has a specific startup order (data init → locale → notifications → ads → RevenueCat → rates → biometric). Respect it.
12. **Match the store pattern.** New state goes in existing stores or a new Zustand store with `persist` middleware. Do not use React context for app state.
13. **Keep barrel exports updated.** If you add a new component/service/util, export it from the directory's `index.ts`.

## What to Avoid

- Do not add a separate backend. Backend is Supabase.
- Do not add Redux, MobX, or other state libraries.
- Do not add styled-components, NativeWind, or other CSS-in-JS.
- Do not hardcode user-facing strings. Use `t()`.
- Do not store secrets in AsyncStorage. Use `expo-secure-store`.
- Do not bypass ad cooldown/daily limit logic in `AdManager.ts`.
- Do not use `any` types. Strict mode is enforced.
- Do not modify AdMob app IDs or RevenueCat product IDs without instruction.
- Do not create new top-level directories under `src/`. Use existing structure.
- Do not put component logic in screens. Extract to components or services.
- Do not use `data/repository.ts` for new code — it's legacy. Use Zustand stores.

## Needs Verification

- **Light theme gating:** `ThemeContext.tsx` currently sets `canUseLight: true` for all users. CLAUDE.md historically claimed it's Pro-only. If it should be Pro-gated, the ThemeProvider needs a `planStore.isPro()` check.
- **`extract-subscriptions` Edge Function:** Exists in `supabase/functions/` but no mobile app code calls it. May be unused or backend-only.
- **`supabase/migrations/`:** Directory exists but is empty. Schema is managed via `schema.sql` only.
- **`react-native-guide.md`:** 25KB file at repo root. May be outdated or generic reference material.
- **Root `.env`:** Exists on disk (leftover from deleted legacy backend). Not tracked by git, but should be deleted if no longer needed.
- **iOS native setup:** No `ios/` directory exists. iOS builds rely on Expo managed workflow. Native modules requiring `pod install` may need an ejected iOS directory.
