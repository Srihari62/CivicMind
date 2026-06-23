/**
 * @file src/utils/format.ts
 * @description Standard formatting utilities for text, numbers, and currencies.
 * Ensures structural representation of statistics and content layout constraints.
 */

/**
 * Truncates text to a specified length and appends ellipses if it exceeds the limit.
 * @param text - Text string to truncate
 * @param maxLength - Character limit
 * @returns Truncated string
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

/**
 * Formats a number to a currency string (USD by default).
 * @param value - Numerical value to format
 * @param currency - Currency code (default USD)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

/**
 * Formats large numbers into clean abbreviations (e.g. 1500 -> 1.5K, 2300000 -> 2.3M).
 * @param num - Input number
 * @returns Formatted number string
 */
export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
  }).format(num);
}

/**
 * Capitalizes the first letter of each word in a string.
 * @param str - Input string
 * @returns Capitalized string
 */
export function capitalizeWords(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Converts a string to a standard URL slug.
 * @param str - Input text
 * @returns URL-friendly slug
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
