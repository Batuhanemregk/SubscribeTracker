# Repo Reality Check

> Generated: 2026-03-03 | Validated against actual codebase

## Stack

| Component | Actual State |
|-----------|-------------|
| **Mobile** | React Native 0.81 + Expo 54 (managed workflow, no native dirs) |
| **Backend** | Supabase (Auth, PostgreSQL, Edge Functions) — **NO .NET backend** |
| **Database** | Supabase-hosted PostgreSQL (EU-Central-1) with RLS |
| **Auth** | Supabase Auth + Google OAuth (profile-only scopes) |
| **State** | Zustand 5.0.10 with AsyncStorage persistence (no React Query) |
| **IAP** | RevenueCat (react-native-purchases v9.7.6) |
| **Ads** | Google AdMob (react-native-google-mobile-ads v16.0.1) |
| **AI** | OpenAI GPT-4o-mini via Supabase Edge Functions |
| **i18n** | i18n-js (English + Turkish) |
| **Navigation** | React Navigation v7 (native-stack + bottom-tabs) |

## Existing Features (Working)

| Feature | Status | Files |
|---------|--------|-------|
| Manual subscription CRUD | Working | subscriptionStore.ts, AddSubscriptionScreen, SubscriptionDetailsScreen |
| Home dashboard | Working | HomeScreen.tsx (427 lines) |
| Insights & charts | Working | InsightsScreen.tsx (216 lines) |
| Budget tracking | Working | BudgetScreen.tsx (509 lines) |
| Billing calendar | Working | CalendarScreen.tsx (446 lines) |
| Settings | Working | SettingsScreen.tsx (884 lines) |
| Bank statement scanning (Pro) | Working | BankStatementService.ts, BankStatementScanScreen.tsx |
| Cloud sync (Pro) | Working | syncService.ts, subscriptionStore cloud methods |
| RevenueCat IAP | Working | PurchaseService.ts, PaywallScreen.tsx |
| Google AdMob | Working | AdManager.ts, AdMobService.ts, BannerAd component |
| Dark/Light theme | Working | ThemeContext.tsx, colors.ts |
| i18n (EN/TR) | Working | i18n/locales/en.json, tr.json |
| Local notifications | Working | NotificationService.ts |
| Biometric auth (Pro) | Working | biometricService.ts |
| Data export CSV/PDF (Pro) | Working | ExportService.ts |
| Service catalog | Working | CatalogService.ts, known-services.json |
| Multi-currency conversion | Working | currencyStore.ts, exchange-rates Edge Function |
| Onboarding | Working | OnboardingScreen.tsx |
| Service picker | Working | ServicePickerScreen.tsx |

## Broken / Needs Fixing

| Issue | Details |
|-------|---------|
| No test files | Zero test files exist in the entire project |
| No CI/CD pipeline | No GitHub Actions, no eas.json |
| No EAS config | Cannot build via EAS without eas.json |
| Legacy scaffolding | `services/api/` (.NET) and `services/worker/` (Python) are unused |

## Missing Features (from master prompt spec)

| Feature | Status | Notes |
|---------|--------|-------|
| Email scanning (Gmail/Outlook) | Deliberately removed | Replaced by bank statement scanning |
| .NET backend API | Not applicable | Backend is Supabase, not .NET |
| Background jobs (Hangfire/Quartz) | Not applicable | Edge Functions handle async work |
| Automated price scraper | Not started | Manual admin updates only |
| Higher quality logos | Not started | Using Google Favicons 128px |
| Bank API connection | Researched, too expensive | Salt Edge $300+/month |
| Unit/Integration tests | Not started | Zero test infrastructure |
| CI/CD pipeline | Not started | No GitHub Actions |

## Code Quality

| Metric | Status |
|--------|--------|
| TypeScript strict | Enabled in tsconfig.json |
| ESLint | Not configured (no .eslintrc) |
| Test coverage | 0% (no tests) |
| Bundle analysis | Not configured |
| Accessibility audit | Not done |

## Architecture

```
apps/mobile/src/
├── components/    22 files (buttons, cards, charts, inputs, layout, ads, pro)
├── screens/       14 screens
├── state/stores/  5 Zustand stores
├── services/      11 business logic services
├── theme/         5 design token files
├── types/         1 main type file
├── config/        1 config file
├── utils/         5 utility files
├── i18n/          3 files + 2 locale JSONs
├── lib/           2 files (Supabase client)
└── data/          4 files (known-services, seed, repo)
```

## Dependencies — Key Concerns

| Package | Version | Notes |
|---------|---------|-------|
| react-native | 0.81.5 | Current |
| expo | 54.0.31 | Current |
| zustand | 5.0.10 | Current |
| @supabase/supabase-js | 2.95.2 | Current |
| react-native-purchases | 9.7.6 | Current |
| react-native-chart-kit | 6.12.0 | Older, consider react-native-gifted-charts (also installed) |
| react-native-shadow-2 | 7.1.2 | May have Android issues |

## Immediate Action Items

1. Set up test infrastructure (Jest + React Native Testing Library)
2. Add ESLint configuration
3. Create eas.json for EAS builds
4. Remove or archive unused `services/api/` and `services/worker/` directories
5. Add GitHub Actions CI pipeline
