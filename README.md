# Finify (SubscribeTracker)

A privacy-first subscription tracking app for iOS and Android. Users can add subscriptions manually or scan bank statements (Pro feature, powered by GPT-4o-mini). Built with React Native + Expo, backed by Supabase.

## Privacy Principles

- **Never** store raw email content or bank statement data
- **Only** derived metadata: merchant name, amount, cadence, dates
- User controls: Delete Account (forget me)
- Supabase RLS ensures users can only access their own data

## Project Structure

```
apps/mobile/          # React Native + Expo mobile app
supabase/
  schema.sql          # PostgreSQL schema
  functions/          # Edge Functions (bank statement extraction, exchange rates)
  migrations/         # SQL migrations
```

## Tech Stack

- **Mobile:** React Native 0.81, Expo 54, TypeScript (strict)
- **State:** Zustand 5 + AsyncStorage (offline-first)
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions)
- **Purchases:** RevenueCat
- **Ads:** Google AdMob
- **i18n:** English + Turkish

## Quick Start

### Prerequisites

- Node.js 20+
- Supabase project (for cloud features)
- RevenueCat account (for IAP)

### Local Development

```bash
cd apps/mobile
npm install
cp .env.example .env   # Fill in Supabase & RevenueCat keys
npm start              # Expo dev server
```

### Build

```bash
npm run android        # Build & run Android
npm run ios            # Build & run iOS
```

## Testing

```bash
cd apps/mobile && npm test
```

## Environment Variables

See `apps/mobile/.env.example` for required keys:
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
- `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` (OAuth)

## License

Private - All rights reserved
