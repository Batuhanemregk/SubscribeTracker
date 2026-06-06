# Finify

@.agent/rules/ruleset.md

Finify is a privacy-first subscription-tracking mobile app (iOS + Android) built with Expo / React Native and backed by Supabase. Most of the app is already built; work is incremental.

## Stack
- Expo SDK 54, React Native 0.81, React 19, TypeScript (strict)
- React Navigation 7 (bottom tabs + native stack)
- Zustand (state) with AsyncStorage persistence
- Supabase: Postgres, Auth, Edge Functions (the only backend — there is no self-hosted API)
- RevenueCat (`react-native-purchases`) for in-app purchases
- Google AdMob; i18n-js (English + Turkish)

## Where things live
- `apps/mobile/` — the Expo app (almost all work happens here)
  - `src/screens/` — screens (Home, AddSubscription, BankStatementScan, Paywall, Settings, Budget, Calendar, Insights, Onboarding, ...)
  - `src/components/` — shared UI (cards, charts, buttons, ads, feedback)
  - `src/services/` — business logic (AuthService, PurchaseService = RevenueCat, SyncService, NotificationService, BankStatementService, biometricService, AdManager)
  - `src/state/stores/` — Zustand stores (subscription, settings, plan, account, currency)
  - `src/lib/supabase.ts` — Supabase client; `src/lib/database.types.ts` — generated DB types
  - `src/theme/` — dark-first design system (colors, spacing, typography, shadows)
  - `src/config/index.ts` — Google OAuth, AdMob IDs, app identity
- `supabase/` — `schema.sql` + `functions/` (Edge Functions: extract-subscriptions, extract-bank-statement, exchange-rates)

## Commands (run from apps/mobile)
- Install: `npm install`
- Start (dev client): `npx expo start --dev-client`
- Typecheck: `npx tsc --noEmit`  (run before committing)
- Tests: `npm test`
- Regenerate Supabase types: `npx supabase gen types typescript --project-id wsymhdlrrftewkwyzzlf > src/lib/database.types.ts`
- Deploy an Edge Function: `npx supabase functions deploy <name>`
- Dev build (RevenueCat needs native code): `eas build --platform ios --profile development`
- Release to TestFlight: `eas build --platform ios --profile production` then `eas submit --platform ios --latest`

## Conventions
- TypeScript strict; functional components + hooks only (no classes); 2-space indent.
- **English only** in all code, comments, file names, and user-facing strings (this chat may be Turkish; the repo must be English).
- **Secrets:** only `EXPO_PUBLIC_*` vars are safe in client code. Supabase service-role keys and RevenueCat `sk_` secret keys live ONLY in Edge Functions / server — never in the app bundle or git. Do not read or print `.env` files.
- **Supabase:** every table has RLS enabled with at least one policy in the same migration. Regenerate `database.types.ts` after schema changes.
- **Payments:** gate premium features on the RevenueCat `premium` entitlement (via PurchaseService), never on a local flag. Products: `finify_premium_monthly`, `finify_premium_yearly`.
- **App identity (do NOT change):** bundle id / package `com.subssentry.app`, scheme `finify`. Changing these breaks RevenueCat IAP and existing TestFlight builds.
- **Mobile-first:** every flow must work on both iOS and Android.
- **No dead code:** when replacing a feature, remove old paths, unused imports, and files.

## Workflow
- At the start of work, read `future-work.md`; after a meaningful change, update it (append; mark done — do not delete).
- RevenueCat / Supabase / secure-store native modules do not run in Expo Go — use a development build.
- Three MCP servers are configured in `.mcp.json` (supabase, revenuecat, expo) — authenticate them once with `/mcp`.

## Memory
- This file (`CLAUDE.md`) is project memory: loaded every session, committed to git, shared across machines.
- Auto memory accumulates machine-local learnings; review with `/memory`.
- `future-work.md` tracks pending work and tech debt.
