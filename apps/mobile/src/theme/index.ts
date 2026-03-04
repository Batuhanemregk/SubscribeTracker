/**
 * Theme - Central export for all design tokens
 */

export * from './colors';
export { typography, textStyles } from './typography';
export { spacing, borderRadius, layout } from './spacing';
export { shadows, createShadow, createGlow } from './shadows';
export { ThemeProvider, useTheme } from './ThemeContext';
export type { ThemeColors, ThemeMode } from './ThemeContext';
export type { AccentColorKey } from './colors';

// Re-export colors object for convenience
import { colors, gradients, categoryColors } from './colors';
export { colors, gradients, categoryColors };

