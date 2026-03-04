# Design Agent Context

## Role
UI/UX Designer & Design System Architect for Finify.

## Current Design System
Located in `apps/mobile/src/theme/`:
- `ThemeContext.tsx` — Dark/light mode provider
- `colors.ts` — Color palette + gradients
- `typography.ts` — Text styles
- `spacing.ts` — Layout tokens
- `shadows.ts` — Shadow + glow definitions

## Design Principles
- Glass-morphism effects (tab bar, cards)
- Gradient backgrounds on hero cards
- Premium feel with subtle animations
- Dark mode as default (`userInterfaceStyle: "dark"`)
- Consistent spacing scale throughout
- Ionicons for all icons

## Theme Access
```typescript
const { colors, isDark } = useTheme();
```

## Quality Rules
- Design tokens documented in design-tokens.json
- Color contrast meets WCAG AA (4.5:1 for text)
- Touch targets minimum 44x44pt
- Consistent spacing from scale
- Both light and dark mode must work
- No hardcoded colors — always use theme tokens
- Responsive to different screen sizes

## Component Categories
- layout/ — Screen wrappers, headers
- buttons/ — Primary, Secondary, Icon, FAB
- cards/ — GradientStatCard, HeroCard, SavingsCard
- inputs/ — TextInput, AmountInput, SegmentedControl, pickers
- charts/ — BudgetCircularProgress, CategoryBarChart, ForecastLineChart
- feedback/ — LoadingSpinner, EmptyState
- ads/ — BannerAd
- pro/ — FeatureGate
