# SubscribeTracker (Finify)

Privacy-first subscription tracking mobile app. Users add subscriptions manually or scan bank statements via AI. Offline-first with optional Supabase cloud sync for Pro users.

## Tech Stack

- **Mobile**: React Native 0.81 + Expo 54, TypeScript, Zustand 5
- **Backend**: Supabase (Auth, PostgreSQL, Edge Functions, Storage)
- **Monetization**: RevenueCat (IAP), Google AdMob (banner + interstitial)
- **AI**: OpenAI GPT-4o-mini (bank statement extraction via Edge Functions)
- **i18n**: i18n-js (English + Turkish)

> **No .NET backend.** The `services/api/` and `services/worker/` directories are legacy/unused scaffolding. All backend logic runs through Supabase.

## Project Structure

```
apps/mobile/                  # React Native + Expo mobile app (main codebase)
  src/
    components/               # Reusable UI (buttons/, cards/, charts/, inputs/, layout/, ads/, pro/)
    screens/                  # 13 screens (Home, Insights, Budget, Calendar, Settings, etc.)
    state/stores/             # Zustand stores (subscription, settings, plan, currency, account)
    services/                 # Business logic (Auth, Purchase, Sync, Ads, Notifications, etc.)
    theme/                    # Design tokens (colors, typography, spacing, shadows)
    types/                    # TypeScript type definitions
    config/                   # API keys, AdMob IDs, Google OAuth config
    utils/                    # Calculations, currency formatting, statement analysis
    i18n/locales/             # en.json, tr.json
    lib/                      # supabase.ts client, database.types.ts
    data/                     # known-services.json, seed data, repository
supabase/
  schema.sql                  # Users, subscriptions, service_catalog tables + RLS
  functions/
    extract-subscriptions/    # AI subscription detection from email snippets
    extract-bank-statement/   # AI bank statement parsing (Pro)
    exchange-rates/           # Currency exchange rate API
packages/shared/              # OpenAPI spec + type generation (reference only)
services/api/                 # UNUSED — legacy .NET scaffolding
services/worker/              # UNUSED — legacy Python scaffolding
```

## Commands

```bash
# Mobile app
cd apps/mobile && npm start          # Start Expo dev server
cd apps/mobile && npm run android    # Run on Android
cd apps/mobile && npm run ios        # Run on iOS

# Supabase (local development)
supabase start                       # Start local Supabase
supabase functions serve             # Serve Edge Functions locally
supabase db push                     # Push schema changes

# Shared types
cd packages/shared && npm run generate:types   # Generate TS types from OpenAPI
cd packages/shared && npm run lint:openapi     # Validate OpenAPI spec
```

## App Identity

- **Display Name**: Finify
- **Slug**: finify
- **Scheme**: finify
- **Bundle ID (iOS)**: com.subssentry.app
- **Package (Android)**: com.subssentry.app
- **Version**: 1.0.1 (versionCode 2)

## Architecture

### Navigation (Stack + Tab)
```
Stack.Navigator
├── Onboarding (first launch)
├── MainTabs (bottom tabs)
│   ├── Home         — Dashboard, subscription list
│   ├── Insights     — Analytics, charts
│   ├── Budget       — Budget tracking
│   ├── Calendar     — Billing calendar
│   └── Settings     — Preferences
├── AddSubscription (modal)
├── SubscriptionDetails (modal)
├── Paywall (modal)
├── ServicePicker (modal)
├── PlanPicker
├── BankStatementScan (modal)
├── PrivacyPolicy
└── TermsOfService
```

### State Management (Zustand + AsyncStorage persistence)
| Store | Purpose |
|-------|---------|
| `subscriptionStore` | Subscriptions CRUD, payment history, cloud sync |
| `settingsStore` | Theme, currency, language, notifications, budget, biometric |
| `planStore` | Pro/Standard tier, entitlements, trial status |
| `currencyStore` | Exchange rates (6hr cache, Supabase Edge Function) |
| `accountStore` | User account info |

### Services
| Service | Purpose |
|---------|---------|
| `AuthService` | Google OAuth via Supabase |
| `PurchaseService` | RevenueCat IAP (Pro upgrade, restore, offerings) |
| `syncService` | Supabase cloud sync (Pro only, last-write-wins) |
| `NotificationService` | Local push notifications for billing reminders |
| `AdManager` | Interstitial ad strategy (3min cooldown, max 3/day) |
| `AdMobService` | Google Mobile Ads SDK integration |
| `BankStatementService` | PDF/image parsing via Edge Function (Pro) |
| `CatalogService` | Service catalog updates from Supabase (24hr throttle) |
| `ExportService` | CSV/PDF export |
| `biometricService` | Face/Touch ID authentication |

### Pro vs Standard Entitlements
| Feature | Standard | Pro |
|---------|----------|-----|
| Manual subscription tracking | Yes | Yes |
| Bank statement scanning | No | Yes |
| Cloud sync | No | Yes |
| Data export (CSV/PDF) | No | Yes |
| Biometric lock | No | Yes |
| Ad-free | No | Yes |

### Supabase Tables
- **users** — id, email, country, currency, is_pro, pro_expires_at
- **subscriptions** — user_id (FK), name, amount, currency, cycle, next_billing_date, category, status, source
- **service_catalog** — id, name, domain, logo_url, category, prices (JSONB), plans (JSONB)
- All tables have RLS policies (users see only their own data)

## Code Conventions

- **Language**: All code, comments, variable names, UI text, API responses, error messages, and logs MUST be English only
- **Path alias**: `@/*` maps to `src/*` (tsconfig paths)
- **Theme**: Always use `useTheme()` hook for colors — never hardcode colors
- **Components**: Barrel exports via `index.ts` in each folder
- **State**: Zustand stores with `persist` middleware for AsyncStorage
- **Icons**: `@expo/vector-icons` (Ionicons)
- **Animations**: `react-native-reanimated` + `react-native-gesture-handler`
- **Pro gating**: Use `<FeatureGate>` component or `planStore` entitlements
- **Ads**: Test IDs in `__DEV__`, production IDs in release builds
- **Privacy**: Never store raw email content — derived data only

## Environment Variables (Mobile)

```
EXPO_PUBLIC_SUPABASE_URL=         # Supabase project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon key
EXPO_PUBLIC_REVENUECAT_IOS_KEY=   # RevenueCat iOS API key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY= # RevenueCat Android API key
```

## Key Files

- `apps/mobile/App.tsx` — Root component, initialization, navigation setup
- `apps/mobile/src/state/stores/subscriptionStore.ts` — Core subscription logic + sync
- `apps/mobile/src/state/stores/settingsStore.ts` — All app settings
- `apps/mobile/src/state/stores/planStore.ts` — Pro/Standard plan management
- `apps/mobile/src/services/PurchaseService.ts` — RevenueCat integration
- `apps/mobile/src/services/syncService.ts` — Supabase cloud sync
- `apps/mobile/src/config/index.ts` — OAuth, AdMob, app identity config
- `apps/mobile/src/lib/supabase.ts` — Supabase client initialization
- `apps/mobile/src/theme/colors.ts` — Color palette (dark/light)
- `apps/mobile/src/data/known-services.json` — Predefined service catalog
- `apps/mobile/src/i18n/locales/en.json` — English translations
- `apps/mobile/src/i18n/locales/tr.json` — Turkish translations
- `supabase/schema.sql` — Database schema with RLS
- `future-work.md` — Tracked future features and tech debt

## Installed Skills & Commands

### Skills (`.agents/skills/` + `.claude/skills/`)
Auto-applied by Claude based on context. 28 skills installed:

**Expo (Official)**: building-native-ui, expo-api-routes, expo-dev-client, expo-tailwind-setup, native-data-fetching, use-dom, upgrading-expo, expo-cicd-workflows, expo-deployment

**Supabase (Official)**: supabase-postgres-best-practices

**Callstack RN**: react-native-best-practices, upgrading-react-native, github, validate-skills

**gigs-slc (130+ rules)**: react-native, building-ui, data-fetching, dev-client, api-routes, tailwind-setup, vercel-react-best-practices, vercel-composition-patterns

**zaferayan**: zafer-skills (RevenueCat, AdMob, i18n, paywall)

**Nice-Wolf Supabase**: supabase-auth, supabase-database, supabase-edge-functions, supabase-realtime, supabase-storage

### Slash Commands (`.claude/commands/`)
77 commands available. Key ones:
- `/feature-development` — End-to-end feature implementation
- `/full-review` — Multi-perspective code review
- `/smart-fix` — Intelligent problem resolution
- `/tdd-cycle` — Test-driven development
- `/security-scan` — OWASP vulnerability scan
- `/test-harness` — Test suite generation
- `/deploy-checklist` — Pre-deployment checks
- `/deps-audit` — Dependency vulnerability analysis
- `/performance-optimization` — Performance workflow
- `/feature` `/review` `/test` — RN Expo agent commands

### Agents (`.claude/agents/`)

**Project Team (Custom):**
- **pm.md** — Product Manager: competitive analysis, feature backlog, user stories, market research
- **tech-lead.md** — Orchestrator: PLAN.md, decisions, autonomous work loop
- **mobile.md** — RN frontend: screens, state, navigation, UI
- **supabase.md** — Backend: DB, RLS, Edge Functions, auth
- **design.md** — UI/UX: theme tokens, WCAG, accessibility
- **qa.md** — Testing: infrastructure, coverage, security audit

**Installed Agents:**
- **Tier 1 Daily**: design-token-guardian, test-generator, performance-enforcer, a11y-enforcer
- **Tier 2 Power**: security-specialist, performance-prophet
- **Tier S Meta**: grand-architect
- **Command Suite**: mobile-developer, typescript-pro, react-pro, ui-designer, ux-designer, security-auditor, test-engineer, database-optimizer, release-manager, dependency-analyzer, frontend-developer, postgresql-pglite-pro

### Agent System Files (`.claude/`)
- `PLAN.md` — Sprint plan with tasks, priorities, dependencies
- `DECISIONS.md` — Architecture Decision Records
- `ASSUMPTIONS.md` — Verified/unverified assumptions
- `CHANGELOG.md` — Version history
- `COMPETITIVE_ANALYSIS.md` — Competitor profiles, feature gaps, market trends
- `FEATURE_BACKLOG.md` — Prioritized feature ideas with ICE scoring

### Autonomous Work Loop
```
1. PM Agent → Research competitors, propose features, prioritize backlog
2. Tech Lead → Pick highest priority task from PLAN.md
3. Design Agent → Define tokens/specs for the feature
4. Mobile/Supabase Agent → Implement the feature
5. QA Agent → Write tests, verify quality
6. Tech Lead → Review, document, commit
7. PM Agent → Evaluate impact, adjust priorities
→ Repeat
```

## Strategic Direction

**Positioning**: "Find your subscriptions without giving up your bank account."

**NOT Building**: Bank account connections (Plaid/Salt Edge), bill negotiation, full budgeting suite.

**Key Differentiators vs Competitors**:
1. Smart detection from documents/screenshots WITHOUT bank access
2. Cross-platform (iOS + Android) — Bobby is iOS-only, Orbit is iOS-only
3. Visual delight (unique views beyond lists)
4. Free trial tracking with aggressive reminders
5. Lifetime purchase option ("no subscription to track subscriptions")
6. Family/household sharing (blue ocean — nobody does this well)
