/**
 * @file src/theme/shadows.ts
 * @description Centralized box shadow design tokens.
 * Houses elevation depth values and custom glassmorphic glow parameters.
 */

export const shadows = {
  none: "none",
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)",
  // Specialized glass elevation
  glass: "0 8px 32px 0 rgba(31, 38, 135, 0.07)",
} as const;

export type ThemeShadows = typeof shadows;
export default shadows;
