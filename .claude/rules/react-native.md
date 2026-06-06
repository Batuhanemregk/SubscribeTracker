---
paths:
  - "apps/mobile/src/**/*.tsx"
  - "apps/mobile/src/**/*.ts"
---
# React Native / Expo rules

- Functional components + hooks only; no class components. TypeScript strict.
- Both iOS and Android must work; gate platform-specific code with `Platform.select` / `Platform.OS`.
- Use the theme system in `src/theme/` (colors, spacing, typography, shadows); the app is dark-first. Do not hardcode colors.
- Lists: provide a stable `keyExtractor`, memoize `renderItem`, avoid inline functions in hot paths.
- Use `expo-secure-store` for sensitive values, AsyncStorage for non-sensitive persisted state.
- All user-facing strings go through i18n (`i18n-js`); support English + Turkish. No raw Turkish literals in code.
- Native modules (RevenueCat, AdMob, secure-store, local-authentication) require a dev build; they no-op or mock in Expo Go.
- Run `npx tsc --noEmit` before committing.
