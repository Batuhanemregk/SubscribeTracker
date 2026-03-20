/**
 * Shadow Styles
 * Platform-specific shadow definitions
 */
import { Platform, ViewStyle } from 'react-native';

// Shadow levels for iOS
const iosShadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
};

// Elevation levels for Android
const androidElevations = {
  none: 0,
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
};

// Cross-platform shadow function
export function createShadow(
  level: 'none' | 'sm' | 'md' | 'lg' | 'xl',
  color?: string
): ViewStyle {
  if (Platform.OS === 'ios') {
    const shadow = { ...iosShadows[level] };
    if (color) {
      shadow.shadowColor = color;
    }
    return shadow;
  } else {
    return {
      elevation: androidElevations[level],
    };
  }
}

// Neon glow effect (iOS only, Android uses elevation)
export function createGlow(color: string, intensity: 'sm' | 'md' | 'lg' = 'md'): ViewStyle {
  if (Platform.OS === 'ios') {
    const config = {
      sm: { offset: 4, opacity: 0.3, radius: 8 },
      md: { offset: 8, opacity: 0.4, radius: 16 },
      lg: { offset: 12, opacity: 0.5, radius: 24 },
    };
    const { offset, opacity, radius } = config[intensity];
    return {
      shadowColor: color,
      shadowOffset: { width: 0, height: offset },
      shadowOpacity: opacity,
      shadowRadius: radius,
    };
  } else {
    return {
      elevation: intensity === 'sm' ? 4 : intensity === 'md' ? 8 : 12,
    };
  }
}

// Pre-defined shadows
export const shadows = {
  none: createShadow('none'),
  sm: createShadow('sm'),
  md: createShadow('md'),
  lg: createShadow('lg'),
  xl: createShadow('xl'),
  card: createShadow('md'),
  button: createShadow('sm'),
  modal: createShadow('xl'),
} as const;

export type ShadowLevel = keyof typeof shadows;
