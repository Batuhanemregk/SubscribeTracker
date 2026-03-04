# Mobile App (Finify)

React Native 0.81 + Expo 54 mobile app. Offline-first subscription tracker with optional Supabase cloud sync.

## Quick Reference

```bash
npm start        # Expo dev server
npm run ios      # Run on iOS
npm run android  # Run on Android
```

## Patterns

- **State**: Zustand 5 with `persist` middleware → AsyncStorage
- **Navigation**: @react-navigation v7 (native-stack + bottom-tabs)
- **Theme**: `useTheme()` returns `{ colors, isDark }` — never hardcode colors
- **Path alias**: `@/*` → `src/*`
- **Pro features**: Check `planStore` entitlements or wrap with `<FeatureGate>`
- **i18n**: Use `t('key')` from `src/i18n` — all user-facing text must be translatable
- **Ads**: `__DEV__` uses test ad IDs automatically via `getAdMobIds()`

## Adding a New Screen

1. Create `src/screens/MyScreen.tsx`
2. Export from `src/screens/index.ts`
3. Add to Stack.Navigator in `App.tsx`
4. Add navigation type to types if needed

## Adding a New Service

1. Create `src/services/MyService.ts`
2. Export from `src/services/index.ts`
3. Initialize in `App.tsx` if needed at startup

## Adding a New Store

1. Create `src/state/stores/myStore.ts`
2. Use `create(persist(...))` pattern from existing stores
3. Export from `src/state/index.ts`

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@supabase/supabase-js` | Backend (auth, DB, edge functions) |
| `react-native-purchases` | RevenueCat IAP |
| `react-native-google-mobile-ads` | AdMob ads |
| `expo-notifications` | Local push notifications |
| `react-native-reanimated` | Animations |
| `react-native-calendars` | Calendar view |
| `react-native-gifted-charts` | Charts |
| `i18n-js` | Internationalization |
| `expo-secure-store` | Secure credential storage |
