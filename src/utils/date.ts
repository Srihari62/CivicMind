/**
 * @file src/utils/date.ts
 * @description Date utility helper for CivicMind.
 * Provides functions for formatting timestamps, generating relative times (e.g. "2 hours ago"),
 * and validating date objects in a localized format.
 */

/**
 * Formats a Date object or ISO string into a localized, human-readable date.
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions customization
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
): string {
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "Invalid Date";
  return new Intl.DateTimeFormat("en-US", options).format(d);
}

/**
 * Returns a relative time string (e.g. "3 mins ago", "yesterday") for a past date.
 * @param date - Past Date object, ISO string, or timestamp
 * @returns Relative string relative to current time
 */
export function getRelativeTime(date: Date | string | number): string {
  const targetDate = typeof date === "object" ? date : new Date(date);
  if (isNaN(targetDate.getTime())) return "Unknown time";

  const now = new Date();
  const elapsedMs = now.getTime() - targetDate.getTime();
  const elapsedSec = Math.floor(elapsedMs / 1000);

  if (elapsedSec < 60) return "Just now";
  
  const elapsedMin = Math.floor(elapsedSec / 60);
  if (elapsedMin < 60) return `${elapsedMin}m ago`;
  
  const elapsedHour = Math.floor(elapsedMin / 60);
  if (elapsedHour < 24) return `${elapsedHour}h ago`;
  
  const elapsedDay = Math.floor(elapsedHour / 24);
  if (elapsedDay === 1) return "Yesterday";
  if (elapsedDay < 7) return `${elapsedDay}d ago`;

  // Fallback to absolute date
  return formatDate(targetDate);
}

/**
 * Formats a date into a standard ISO format string without time.
 * @param date - Date to format
 * @returns "YYYY-MM-DD"
 */
export function toISODateString(date: Date): string {
  return date.toISOString().split("T")[0];
}
