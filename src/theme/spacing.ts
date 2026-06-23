/**
 * @file src/theme/spacing.ts
 * @description Centralized spacing design tokens.
 * Declares rem-based scale rules for margins, paddings, and responsive container sizes.
 */

export const spacing = {
  none: "0px",
  xs: "0.25rem",    // 4px
  sm: "0.5rem",     // 8px
  md: "1rem",       // 16px
  lg: "1.5rem",     // 24px
  xl: "2rem",       // 32px
  xxl: "3rem",      // 48px
  xxxl: "4rem",     // 64px
  
  // Layout containers
  container: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    xxl: "1536px",
  },
} as const;

export type ThemeSpacing = typeof spacing;
export default spacing;
