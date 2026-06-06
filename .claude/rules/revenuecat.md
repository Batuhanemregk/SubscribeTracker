---
paths:
  - "apps/mobile/src/services/PurchaseService.ts"
  - "apps/mobile/src/screens/PaywallScreen.tsx"
  - "apps/mobile/src/state/stores/planStore.ts"
---
# RevenueCat rules

- Premium gating goes through the `premium` entitlement via `PurchaseService` (getCustomerInfo / checkProStatus). Never gate on a local boolean.
- Products: `finify_premium_monthly`, `finify_premium_yearly` — must match App Store Connect / Play Console and the RevenueCat dashboard.
- Client uses PUBLIC platform keys (`appl_` / `goog_`) from `EXPO_PUBLIC_REVENUECAT_*`. The `sk_` v2 secret key is for the RevenueCat MCP / REST API only — never in the app bundle.
- `react-native-purchases` is a native module: real purchases need an EAS dev/production build. It auto-mocks in Expo Go (Preview API Mode).
- After changing offerings/entitlements, verify via the RevenueCat MCP (configured in `.mcp.json`).
- Always handle `userCancelled` on purchase, and always offer Restore Purchases.
