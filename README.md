# Finify

A privacy-first subscription tracking app that helps users discover, organize, and budget their recurring subscriptions. Built with Expo / React Native, backed by Supabase.

## 🔒 Privacy Principles

- **Never** store raw email or document content (subject, body, attachments)
- **Only** derived data: merchant, amount, cadence, dates, confidence
- User controls: Disconnect & Delete Account (forget me)
- Explainable: review queue shows "why" without exposing PII

## 📁 Project Structure

```
apps/mobile/          # React Native + Expo mobile app (iOS / Android)
supabase/             # Supabase backend
  ├── schema.sql      # Database schema
  └── functions/      # Edge Functions (extract-subscriptions, extract-bank-statement, exchange-rates)
```

## 🧱 Tech Stack

- **App:** Expo SDK 54, React Native 0.81, React 19, TypeScript (strict)
- **Navigation:** React Navigation 7
- **State:** Zustand (+ AsyncStorage persistence)
- **Backend:** Supabase (Postgres, Auth, Edge Functions)
- **Payments:** RevenueCat (in-app purchases)
- **Ads:** Google AdMob
- **i18n:** i18n-js (English / Turkish)

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Expo / EAS CLI (`npm install -g eas-cli`)
- An iOS dev build (RevenueCat needs native modules — Expo Go cannot run real purchases)

### Run the app

```bash
cd apps/mobile
npm install
npx expo start --dev-client
```

### Environment

Create `apps/mobile/.env` from the template at the repo root:

```bash
cp .env.example apps/mobile/.env
# Fill in:
# EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
# EXPO_PUBLIC_REVENUECAT_IOS_KEY, EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
```

Only `EXPO_PUBLIC_*` variables are exposed to client code. Service-role keys and secrets live **only** in Supabase Edge Functions / server, never in the app bundle.

## 🗄️ Supabase

```bash
# Regenerate typed client after schema changes
npx supabase gen types typescript --project-id <PROJECT_REF> > apps/mobile/src/lib/database.types.ts

# Deploy an Edge Function
npx supabase functions deploy <function-name>
```

All tables must have Row Level Security (RLS) enabled with at least one policy.

## 📦 Build & Release (EAS)

```bash
cd apps/mobile
eas build --platform ios --profile development   # dev client (RevenueCat works here)
eas build --platform ios --profile production    # TestFlight / App Store
eas submit --platform ios --latest               # upload to TestFlight
```

## 🧪 Testing

```bash
cd apps/mobile
npx tsc --noEmit   # typecheck
npm test           # unit tests
```

## 📄 License

Private — All rights reserved.
