/**
 * @file src/ai/utils/priority.ts
 * @description Helpers for prioritizing and normalizing severity levels.
 */

export type SeverityLevel = "low" | "medium" | "high" | "critical";

/**
 * Normalizes a raw string into a canonical severity level.
 */
export function normalizeSeverity(severity: string): SeverityLevel {
  const normalized = String(severity || "").toLowerCase().trim();
  if (
    normalized === "low" ||
    normalized === "medium" ||
    normalized === "high" ||
    normalized === "critical"
  ) {
    return normalized as SeverityLevel;
  }
  // Map typical deviations
  if (normalized.includes("crit") || normalized.includes("urg")) return "critical";
  if (normalized.includes("high") || normalized.includes("sever")) return "high";
  if (normalized.includes("mod") || normalized.includes("med")) return "medium";
  if (normalized.includes("low") || normalized.includes("minor")) return "low";

  return "medium"; // Default fallback
}

export function calculateInitialPriority(severity: string, _confidence: number): SeverityLevel {
  return normalizeSeverity(severity);
}
