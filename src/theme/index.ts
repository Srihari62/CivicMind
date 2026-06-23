/**
 * @file src/theme/index.ts
 * @description Master design system aggregator.
 * Combines and re-exports color, spacing, typography, radius, shadow,
 * and animation tokens as a single source of truth.
 */

import { colors } from "./colors";
import { spacing } from "./spacing";
import { typography } from "./typography";
import { radius } from "./radius";
import { shadows } from "./shadows";
import { animations } from "./animations";

export const theme = {
  colors,
  spacing,
  typography,
  radius,
  shadows,
  animations,
} as const;

export type Theme = typeof theme;
export default theme;

export * from "./colors";
export * from "./spacing";
export * from "./typography";
export * from "./radius";
export * from "./shadows";
export * from "./animations";
