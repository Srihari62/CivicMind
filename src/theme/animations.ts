/**
 * @file src/theme/animations.ts
 * @description Centralized transition and animation design tokens.
 * Houses animation timing presets, easing curves, and Framer Motion spring values.
 */

export const animations = {
  durations: {
    fast: "150ms",
    normal: "300ms",
    slow: "500ms",
  },
  easings: {
    default: "cubic-bezier(0.4, 0, 0.2, 1)",
    linear: "linear",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  // Reusable spring transitions for Framer Motion UI effects
  springs: {
    default: { type: "spring", stiffness: 300, damping: 30 },
    gentle: { type: "spring", stiffness: 120, damping: 14 },
    bouncy: { type: "spring", stiffness: 400, damping: 18 },
  },
} as const;

export type ThemeAnimations = typeof animations;
export default animations;
