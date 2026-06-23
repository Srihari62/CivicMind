/**
 * @file src/theme/typography.ts
 * @description Centralized typography design tokens.
 * Houses font families, responsive sizes, weights, and line heights.
 */

export const typography = {
  fonts: {
    sans: "var(--font-sans, Inter, sans-serif)",
    mono: "var(--font-mono, monospace)",
  },
  sizes: {
    xs: "0.75rem",     // 12px
    sm: "0.875rem",    // 14px
    base: "1rem",      // 16px
    lg: "1.125rem",    // 18px
    xl: "1.25rem",     // 20px
    xxl: "1.5rem",     // 24px
    xxxl: "1.875rem",  // 30px
    display: "2.25rem",// 36px
  },
  weights: {
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeights: {
    none: "1",
    tight: "1.25",
    snug: "1.375",
    normal: "1.5",
    relaxed: "1.625",
    loose: "2",
  },
} as const;

export type ThemeTypography = typeof typography;
export default typography;
