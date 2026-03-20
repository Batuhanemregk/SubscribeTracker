/**
 * Spacing Scale
 * Consistent spacing throughout the app (8px base unit)
 */

export const spacing = {
  // Base spacing (multiples of 4/8)
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

// Border radius
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

// Common layout values
export const layout = {
  // Screen padding
  screenPadding: spacing[4],         // 16px
  screenPaddingLarge: spacing[6],    // 24px
  
  // Card padding
  cardPadding: spacing[4],           // 16px
  cardPaddingLarge: spacing[5],      // 20px
  
  // Card border radius
  cardRadius: borderRadius['2xl'],   // 20px
  chipRadius: borderRadius.lg,       // 12px
  buttonRadius: borderRadius.lg,     // 12px
  
  // List item spacing
  listItemGap: spacing[3],           // 12px
  
  // Section spacing
  sectionGap: spacing[6],            // 24px
  
  // Icon sizes
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  iconXl: 32,
  
  // Avatar sizes
  avatarSm: 32,
  avatarMd: 44,
  avatarLg: 56,
  
  // Tab bar height
  tabBarHeight: 80,
  
  // Header height
  headerHeight: 56,
} as const;

export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;
