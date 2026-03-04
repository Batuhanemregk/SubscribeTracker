/**
 * Theme Context - Dark/Light Mode Support
 * Light mode is a Pro feature
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { usePlanStore, useSettingsStore } from '../state';
import { ACCENT_COLORS, type AccentColorKey } from './colors';

// Base colors that don't change between themes (accent primary overrides these)
const baseColors = {
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  emerald: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  pink: '#EC4899',
  cyan: '#06B6D4',
  orange: '#F97316',
};

// Dark mode colors (default)
const darkColors = {
  ...baseColors,
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
    primary: ['#8B5CF6', '#6366F1'] as const,
    emerald: ['#10B981', '#059669'] as const,
    sunset: ['#F59E0B', '#EC4899'] as const,
    ocean: ['#06B6D4', '#3B82F6'] as const,
    card: ['#1A1A24', '#252532'] as const,
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
  } as Record<string, string>,
};

// Light mode colors — clean, professional fintech aesthetic
const lightColors = {
  ...baseColors,
  bg: '#F8F9FA',         // Clean near-white (not purple-tinted)
  bgCard: '#FFFFFF',       // Pure white cards
  bgElevated: '#F1F3F5',  // Subtle gray for elevated surfaces
  border: '#E9ECEF',       // Neutral gray borders
  borderLight: '#DEE2E6',  // Slightly darker for emphasis
  text: '#1A1A2E',         // Very dark navy for high readability
  textSecondary: '#495057', // Dark gray for secondary text
  textMuted: '#868E96',     // Medium gray for muted text (NOT purple!)
  textDisabled: '#ADB5BD',  // Light gray for disabled
  gradients: {
    primary: ['#8B5CF6', '#A78BFA'] as const,
    emerald: ['#10B981', '#34D399'] as const,
    sunset: ['#F59E0B', '#FBBF24'] as const,
    ocean: ['#06B6D4', '#22D3EE'] as const,
    card: ['#FFFFFF', '#F8F9FA'] as const,
  },
  categoryColors: {
    Entertainment: '#DB2777',
    Development: '#7C3AED',
    Design: '#D97706',
    Productivity: '#059669',
    Music: '#0891B2',
    Storage: '#2563EB',
    Finance: '#EA580C',
    Health: '#16A34A',
    Education: '#9333EA',
    Other: '#4B5563',
  } as Record<string, string>,
};
// Gradient type for both themes
type GradientColors = {
  primary: readonly string[];
  emerald: readonly string[];
  sunset: readonly string[];
  ocean: readonly string[];
  card: readonly string[];
};

// Base theme type
interface ThemeColorSet {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  emerald: string;
  amber: string;
  red: string;
  pink: string;
  cyan: string;
  orange: string;
  bg: string;
  bgCard: string;
  bgElevated: string;
  border: string;
  borderLight: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  gradients: GradientColors;
  categoryColors: Record<string, string>;
}

export type ThemeColors = ThemeColorSet;
export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
  mode: ThemeMode;
  canUseLight: boolean; // Pro only
  accentColor: AccentColorKey;
  amoledMode: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: darkColors,
  isDark: true,
  mode: 'dark',
  canUseLight: false,
  accentColor: 'purple',
  amoledMode: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const { app, accentColor, amoledMode } = useSettingsStore();

  const userTheme = app.theme;

  // Determine actual theme — all users can choose
  const isDark = useMemo(() => {
    if (userTheme === 'system') {
      return systemColorScheme !== 'light';
    }
    return userTheme !== 'light';
  }, [userTheme, systemColorScheme]);

  // Resolve accent primary color from user selection
  const accentKey = (accentColor as AccentColorKey) in ACCENT_COLORS
    ? (accentColor as AccentColorKey)
    : 'purple';
  const accentPrimary = ACCENT_COLORS[accentKey].primary;

  // Build the final color set: base theme + accent override + AMOLED override
  const colors = useMemo(() => {
    const base = isDark ? darkColors : lightColors;
    const withAccent = {
      ...base,
      primary: accentPrimary,
      primaryLight: accentPrimary,
      primaryDark: accentPrimary,
      gradients: {
        ...base.gradients,
        primary: [accentPrimary, accentPrimary] as const,
      },
    };
    // AMOLED: true black background only in dark mode
    if (isDark && amoledMode) {
      return {
        ...withAccent,
        bg: '#000000',
        bgCard: '#0A0A0A',
        bgElevated: '#111111',
        gradients: {
          ...withAccent.gradients,
          card: ['#0A0A0A', '#111111'] as const,
        },
      };
    }
    return withAccent;
  }, [isDark, accentPrimary, amoledMode]);

  const value: ThemeContextValue = {
    colors,
    isDark,
    mode: userTheme as ThemeMode,
    canUseLight: true,
    accentColor: accentKey,
    amoledMode: isDark && amoledMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Export default colors for static usage (backward compatibility)
export { darkColors as colors };
