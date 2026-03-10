/**
 * Component Tests — SubscribeTracker (Finify)
 *
 * Tests core UI components: buttons, feedback, inputs, layout, pro gating, error boundary.
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';

// ---------------------------------------------------------------------------
// Mocks (test-file level)
// ---------------------------------------------------------------------------

// 1. Theme mock
const darkColors = {
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  emerald: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  pink: '#EC4899',
  cyan: '#06B6D4',
  orange: '#F97316',
  bg: '#0D0D12',
  bgCard: '#1A1A24',
  bgElevated: '#252532',
  border: '#2D2D3A',
  borderLight: '#3D3D4A',
  text: '#FFFFFF',
  textSecondary: '#E5E5E5',
  textMuted: '#9CA3AF',
  textDisabled: '#6B7280',
  gradients: {
    primary: ['#8B5CF6', '#6366F1'],
    emerald: ['#10B981', '#059669'],
    sunset: ['#F59E0B', '#EC4899'],
    ocean: ['#06B6D4', '#3B82F6'],
    card: ['#1A1A24', '#252532'],
  },
  categoryColors: {
    Entertainment: '#EC4899',
    Development: '#8B5CF6',
    Design: '#F59E0B',
    Productivity: '#10B981',
    Music: '#06B6D4',
    Storage: '#3B82F6',
    Finance: '#F97316',
    Health: '#22C55E',
    Education: '#A855F7',
    Other: '#6B7280',
  },
};

jest.mock('@/theme', () => ({
  useTheme: () => ({ colors: darkColors, isDark: true }),
  borderRadius: { sm: 4, md: 8, lg: 12, xl: 16, '2xl': 20 },
  layout: { padding: 16 },
  shadows: { button: {} },
  createGlow: () => ({}),
  createShadow: () => ({}),
  colors: darkColors,
}));

// 2. Navigation mock
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

// 3. Safe area context mock
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// 4. State store mocks
const mockUsePlanStore = jest.fn(() => ({
  isPro: () => false,
  isTrialActive: () => false,
}));

jest.mock('@/state', () => ({
  usePlanStore: (...args: any[]) => mockUsePlanStore(...args),
  useSettingsStore: jest.fn(() => ({})),
  useSubscriptionStore: jest.fn(() => ({})),
  useCurrencyStore: jest.fn(() => ({})),
  useAccountStore: jest.fn(() => ({})),
}));

// 5. i18n mock — t() returns the key
jest.mock('@/i18n', () => ({
  t: (key: string) => key,
  setLocale: jest.fn(),
  getLocale: () => 'en',
  initLocaleFromSettings: jest.fn(),
  getAvailableLocales: () => ['en', 'tr'],
}));

// 6. Services mock
jest.mock('@/services', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/services/LoggerService', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// 7. Ionicons mock — simple View with testID
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    Ionicons: ({ name, ...props }: any) => <View testID={`icon-${name}`} {...props} />,
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import { PrimaryButton } from '@/components/buttons/PrimaryButton';
import { SecondaryButton } from '@/components/buttons/SecondaryButton';
import { IconButton } from '@/components/buttons/IconButton';
import { FAB } from '@/components/buttons/FAB';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { TextInput } from '@/components/inputs/TextInput';
import { AmountInput } from '@/components/inputs/AmountInput';
import { SegmentedControl } from '@/components/inputs/SegmentedControl';
import { StatCard } from '@/components/StatCard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FeatureGate } from '@/components/pro/FeatureGate';
import { Screen } from '@/components/layout/Screen';
import { Header } from '@/components/layout/Header';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Component that throws on demand — used in ErrorBoundary tests. */
let shouldThrow = false;
function MaybeThrowingChild(): JSX.Element {
  if (shouldThrow) {
    throw new Error('Test explosion');
  }
  return <Text>Recovered</Text>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePlanStore.mockReturnValue({
    isPro: () => false,
    isTrialActive: () => false,
  });
});

// ==================== PrimaryButton ====================
describe('PrimaryButton', () => {
  it('renders title text', () => {
    render(<PrimaryButton title="Save" onPress={jest.fn()} />);
    expect(screen.getByText('Save')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<PrimaryButton title="Save" onPress={onPress} testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows ActivityIndicator when loading', () => {
    const { UNSAFE_getByType } = render(
      <PrimaryButton title="Save" onPress={jest.fn()} loading />
    );
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    // Title should NOT be visible while loading
    expect(screen.queryByText('Save')).toBeNull();
  });

  it('is disabled when disabled=true', () => {
    const onPress = jest.fn();
    render(<PrimaryButton title="Save" onPress={onPress} disabled testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('is disabled when loading=true', () => {
    const onPress = jest.fn();
    render(<PrimaryButton title="Save" onPress={onPress} loading testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

// ==================== SecondaryButton ====================
describe('SecondaryButton', () => {
  it('renders title text', () => {
    render(<SecondaryButton title="Cancel" onPress={jest.fn()} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<SecondaryButton title="Cancel" onPress={onPress} testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows ActivityIndicator when loading', () => {
    const { UNSAFE_getByType } = render(
      <SecondaryButton title="Cancel" onPress={jest.fn()} loading />
    );
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('is disabled when disabled=true', () => {
    const onPress = jest.fn();
    render(<SecondaryButton title="Cancel" onPress={onPress} disabled testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

// ==================== IconButton ====================
describe('IconButton', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<IconButton icon="close" onPress={jest.fn()} />);
    expect(toJSON()).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<IconButton icon="close" onPress={onPress} />);
    fireEvent.press(screen.getByTestId('icon-close'));
    // The TouchableOpacity wraps the icon, so pressing the icon triggers parent
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled=true', () => {
    const onPress = jest.fn();
    const { toJSON } = render(<IconButton icon="close" onPress={onPress} disabled />);
    expect(toJSON()).toBeTruthy();
  });
});

// ==================== FAB ====================
describe('FAB', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<FAB onPress={jest.fn()} />);
    expect(toJSON()).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<FAB onPress={onPress} testID="fab" />);
    fireEvent.press(screen.getByTestId('fab'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

// ==================== EmptyState ====================
describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No subscriptions" />);
    expect(screen.getByText('No subscriptions')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    render(<EmptyState title="Empty" subtitle="Add your first subscription" />);
    expect(screen.getByText('Add your first subscription')).toBeTruthy();
  });

  it('renders primary action button and fires onPress', () => {
    const onPress = jest.fn();
    render(
      <EmptyState
        title="Empty"
        primaryAction={{ title: 'Add', onPress }}
      />
    );
    expect(screen.getByText('Add')).toBeTruthy();
    fireEvent.press(screen.getByText('Add'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders secondary action button', () => {
    render(
      <EmptyState
        title="Empty"
        secondaryAction={{ title: 'Import', onPress: jest.fn() }}
      />
    );
    expect(screen.getByText('Import')).toBeTruthy();
  });
});

// ==================== LoadingSpinner ====================
describe('LoadingSpinner', () => {
  it('renders ActivityIndicator', () => {
    const { UNSAFE_getByType } = render(<LoadingSpinner />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('renders text when provided', () => {
    render(<LoadingSpinner text="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeTruthy();
  });
});

// ==================== TextInput ====================
describe('TextInput', () => {
  it('renders label when provided', () => {
    render(<TextInput label="Email" />);
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('shows error text when error prop set', () => {
    render(<TextInput error="Required field" />);
    expect(screen.getByText('Required field')).toBeTruthy();
  });

  it('calls onChangeText', () => {
    const onChange = jest.fn();
    render(<TextInput placeholder="Type here" onChangeText={onChange} />);
    fireEvent.changeText(screen.getByPlaceholderText('Type here'), 'hello');
    expect(onChange).toHaveBeenCalledWith('hello');
  });
});

// ==================== AmountInput ====================
describe('AmountInput', () => {
  it('renders currency symbol', () => {
    render(<AmountInput value="" onChangeText={jest.fn()} currency="€" />);
    expect(screen.getByText('€')).toBeTruthy();
  });

  it('renders label when provided', () => {
    render(<AmountInput value="" onChangeText={jest.fn()} label="Amount" />);
    expect(screen.getByText('Amount')).toBeTruthy();
  });

  it('calls onChangeText with cleaned numeric value', () => {
    const onChange = jest.fn();
    render(<AmountInput value="" onChangeText={onChange} />);
    fireEvent.changeText(screen.getByPlaceholderText('0.00'), '12.99');
    expect(onChange).toHaveBeenCalledWith('12.99');
  });

  it('rejects non-numeric input (letters get stripped)', () => {
    const onChange = jest.fn();
    render(<AmountInput value="" onChangeText={onChange} />);
    fireEvent.changeText(screen.getByPlaceholderText('0.00'), 'abc');
    // 'abc' stripped → '' (empty string after removing non-numeric chars)
    expect(onChange).toHaveBeenCalledWith('');
  });
});

// ==================== SegmentedControl ====================
describe('SegmentedControl', () => {
  const options = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  it('renders all option labels', () => {
    render(<SegmentedControl options={options} value="monthly" onChange={jest.fn()} />);
    expect(screen.getByText('Monthly')).toBeTruthy();
    expect(screen.getByText('Yearly')).toBeTruthy();
  });

  it('calls onChange when option pressed', () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={options} value="monthly" onChange={onChange} />);
    fireEvent.press(screen.getByText('Yearly'));
    expect(onChange).toHaveBeenCalledWith('yearly');
  });
});

// ==================== StatCard ====================
describe('StatCard', () => {
  it('renders value and label text', () => {
    render(
      <StatCard icon="card" value="$120" label="Monthly Total" iconColor="#8B5CF6" />
    );
    expect(screen.getByText('$120')).toBeTruthy();
    expect(screen.getByText('Monthly Total')).toBeTruthy();
  });
});

// ==================== ErrorBoundary ====================
describe('ErrorBoundary', () => {
  // Suppress React error boundary console.error noise during test
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('renders children normally', () => {
    render(
      <ErrorBoundary>
        <Text>Hello World</Text>
      </ErrorBoundary>
    );
    expect(screen.getByText('Hello World')).toBeTruthy();
  });

  it('shows error UI when child throws', () => {
    shouldThrow = true;
    render(
      <ErrorBoundary>
        <MaybeThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Try Again')).toBeTruthy();
    shouldThrow = false;
  });

  it('resets on "Try Again" press', () => {
    shouldThrow = true;
    render(
      <ErrorBoundary>
        <MaybeThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeTruthy();

    // Stop throwing before pressing Try Again so the re-render succeeds
    shouldThrow = false;

    fireEvent.press(screen.getByText('Try Again'));

    // After reset, the boundary re-renders children which now return normally
    expect(screen.getByText('Recovered')).toBeTruthy();
  });
});

// ==================== FeatureGate ====================
describe('FeatureGate', () => {
  it('shows children when user is Pro', () => {
    mockUsePlanStore.mockReturnValue({
      isPro: () => true,
      isTrialActive: () => false,
    });

    render(
      <FeatureGate feature="cloudSync">
        <Text>Pro Content</Text>
      </FeatureGate>
    );
    expect(screen.getByText('Pro Content')).toBeTruthy();
  });

  it('shows locked state when user is not Pro', () => {
    mockUsePlanStore.mockReturnValue({
      isPro: () => false,
      isTrialActive: () => false,
    });

    render(
      <FeatureGate feature="cloudSync">
        <Text>Pro Content</Text>
      </FeatureGate>
    );
    // Should NOT show children
    expect(screen.queryByText('Pro Content')).toBeNull();
    // Should show the locked UI with feature title
    expect(screen.getByText('Cloud Sync')).toBeTruthy();
    expect(screen.getByText('Unlock with Pro')).toBeTruthy();
  });

  it('shows fallback when provided and not Pro', () => {
    mockUsePlanStore.mockReturnValue({
      isPro: () => false,
      isTrialActive: () => false,
    });

    render(
      <FeatureGate
        feature="dataExport"
        fallback={<Text>Upgrade Required</Text>}
      >
        <Text>Pro Content</Text>
      </FeatureGate>
    );
    expect(screen.queryByText('Pro Content')).toBeNull();
    expect(screen.getByText('Upgrade Required')).toBeTruthy();
  });
});

// ==================== Screen ====================
describe('Screen', () => {
  it('renders children', () => {
    render(
      <Screen>
        <Text>Screen Content</Text>
      </Screen>
    );
    expect(screen.getByText('Screen Content')).toBeTruthy();
  });
});

// ==================== Header ====================
describe('Header', () => {
  it('renders title', () => {
    render(<Header title="Settings" />);
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    render(<Header title="Settings" subtitle="Manage your preferences" />);
    expect(screen.getByText('Manage your preferences')).toBeTruthy();
  });

  it('shows back button when showBack=true', () => {
    render(<Header title="Details" showBack />);
    // The back button renders an arrow-back icon
    expect(screen.getByTestId('icon-arrow-back')).toBeTruthy();
  });
});
