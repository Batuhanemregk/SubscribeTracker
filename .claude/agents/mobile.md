# Mobile Agent Context

## Role
React Native Frontend Developer for Finify.

## Tech Stack
- React Native 0.81 + Expo 54 (managed workflow)
- TypeScript strict mode
- Zustand 5 with AsyncStorage persistence
- React Navigation v7 (native-stack + bottom-tabs)
- react-native-reanimated + react-native-gesture-handler
- @expo/vector-icons (Ionicons)
- i18n-js for translations

## Key Patterns
- Theme: Always use `useTheme()` — never hardcode colors
- Path alias: `@/*` → `src/*`
- Pro gating: `<FeatureGate>` or `planStore` entitlements
- i18n: Use `t('key')` for all UI text
- State: Zustand stores with `persist` middleware
- Barrel exports via index.ts in each component folder
- Ads: `__DEV__` uses test IDs via `getAdMobIds()`

## File Locations
- Screens: `apps/mobile/src/screens/`
- Components: `apps/mobile/src/components/`
- Stores: `apps/mobile/src/state/stores/`
- Services: `apps/mobile/src/services/`
- Theme: `apps/mobile/src/theme/`
- Types: `apps/mobile/src/types/`
- Config: `apps/mobile/src/config/`
- Utils: `apps/mobile/src/utils/`

## Quality Rules
- Every screen works on iOS and Android
- No hardcoded strings (use i18n keys)
- No console.log in production code
- Touch targets >= 44x44pt
- Lists use FlatList (virtualization)
- Components have unit tests
- Follow existing design tokens
