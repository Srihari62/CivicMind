/**
 * @file src/theme/radius.ts
 * @description Centralized border-radius design tokens.
 * Maps scale factors for corners matching standard shadcn/ui layouts.
 */

export const radius = {
  none: "0px",
  sm: "calc(var(--radius, 0.5rem) - 4px)",  // ~4px (inner elements)
  md: "calc(var(--radius, 0.5rem) - 2px)",  // ~6px (cards, buttons)
  lg: "var(--radius, 0.5rem)",              // ~8px (containers, dialogs)
  xl: "0.75rem",                            // 12px
  full: "9999px",                           // Fully circular pill
} as const;

export type ThemeRadius = typeof radius;
export default radius;
