/**
 * Main Components Barrel Export
 * Central export for all reusable components
 */

// Layout
export { Screen, Header } from './layout';

// Buttons
export { PrimaryButton, SecondaryButton, IconButton, FAB } from './buttons';

// Feedback
export { LoadingSpinner, EmptyState } from './feedback';

// Cards
export { GradientStatCard, GradientHeroCard, SavingsCard } from './cards';

// Inputs
export { TextInput, AmountInput, SegmentedControl, IconGrid, ColorGrid } from './inputs';

// Charts
export { CategoryBarChart, ForecastLineChart, BudgetCircularProgress } from './charts';

// Pro / Feature Gating
export { FeatureGate, FeatureGateInline } from './pro';

// Ads
export { BannerAd } from './ads';

// Existing components (to be migrated to proper structure)
export { PremiumSubscriptionCard } from './PremiumSubscriptionCard';
export { DonutChart } from './DonutChart';
export { GradientCard } from './GradientCard';
export { StatCard } from './StatCard';
export { SwipeableSubscriptionCard } from './SwipeableSubscriptionCard';
export { CompactSubscriptionCard } from './CompactSubscriptionCard';
export { AnimatedTabScreen } from './AnimatedTabScreen';
export { AddMethodSheet } from './AddMethodSheet';
export { ScanBanner, markScanCompleted } from './ScanBanner';
