/**
 * @file src/utils/cn.ts
 * @description Tailwind CSS class merge utility.
 * Combines 'clsx' (for conditional class logic) with 'tailwind-merge' (to resolve class conflicts).
 * Crucial configuration block for shadcn/ui components.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names and resolves tailwind specificity conflicts.
 * @param inputs - List of class names, arrays, or objects representing conditional styles
 * @returns Fully merged string of CSS classes
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
