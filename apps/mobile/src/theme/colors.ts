/**
 * Color Palette - Dark Mode First
 * Based on approved design system
 */

// Accent color options for user personalization
export const ACCENT_COLORS = {
  purple: { primary: '#A855F6', name: 'Purple' },
  blue: { primary: '#3B82F6', name: 'Blue' },
  green: { primary: '#10B981', name: 'Green' },
  orange: { primary: '#F97316', name: 'Orange' },
  pink: { primary: '#EC4899', name: 'Pink' },
  red: { primary: '#EF4444', name: 'Red' },
  teal: { primary: '#14B8A6', name: 'Teal' },
  yellow: { primary: '#EAB308', name: 'Yellow' },
} as const;

export type AccentColorKey = keyof typeof ACCENT_COLORS;

// Primary brand color
export const primary = '#8B5CF6';      // Violet
export const primaryLight = '#A78BFA';
export const primaryDark = '#7C3AED';

// Accent colors
export const emerald = '#10B981';       // Success, positive
export const amber = '#F59E0B';         // Warning, urgent
export const red = '#EF4444';           // Error, destructive
export const pink = '#EC4899';          // Secondary accent
export const cyan = '#06B6D4';          // Info
export const orange = '#F97316';        // Highlight

// Neutral - Dark mode
export const bg = '#0D0D12';            // Main background
export const bgCard = '#1A1A24';        // Card background
export const bgElevated = '#252532';    // Elevated surfaces
export const border = '#2D2D3A';        // Borders, dividers
export const borderLight = '#3D3D4A';   // Lighter borders

// Text
export const text = '#FFFFFF';          // Primary text
export const textSecondary = '#E5E5E5'; // Secondary text
export const textMuted = '#9CA3AF';     // Muted/placeholder
export const textDisabled = '#6B7280';  // Disabled text

// Gradients (defined as arrays for LinearGradient)
export const gradients = {
  primary: ['#8B5CF6', '#6366F1'],
  emerald: ['#10B981', '#059669'],
  sunset: ['#F59E0B', '#EC4899'],
  ocean: ['#06B6D4', '#3B82F6'],
  card: ['#1A1A24', '#252532'],
} as const;

// Category colors
export const categoryColors: Record<string, string> = {
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
};

// Export all as colors object
export const colors = {
  primary,
  primaryLight,
  primaryDark,
  emerald,
  amber,
  red,
  pink,
  cyan,
  orange,
  bg,
  bgCard,
  bgElevated,
  border,
  borderLight,
  text,
  textSecondary,
  textMuted,
  textDisabled,
  gradients,
  categoryColors,
} as const;

export type ColorKey = keyof typeof colors;
