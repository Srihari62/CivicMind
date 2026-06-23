/**
 * @file src/constants/index.ts
 * @description Application-wide constants registry.
 * Houses static lookup arrays, localized labels, configuration defaults,
 * and key mappings to prevent hardcoded strings.
 */

import { IssueCategory, ReportStatus, UrgencyLevel, UserRole } from "@/types";

export const APP_NAME = "CivicMind" as const;

/**
 * Predefined User Roles.
 */
export const USER_ROLES: Record<string, UserRole> = {
  CITIZEN: "citizen",
  OFFICER: "officer",
  ADMIN: "admin",
} as const;

/**
 * Issue Categories list with human-readable labels.
 */
export const ISSUE_CATEGORIES: { value: IssueCategory; label: string }[] = [
  { value: "infrastructure", label: "Infrastructure & Roads" },
  { value: "sanitation", label: "Sanitation & Trash" },
  { value: "environmental", label: "Parks & Environment" },
  { value: "utility", label: "Water, Gas & Utilities" },
  { value: "public_safety", label: "Public Safety & Hazards" },
  { value: "other", label: "Other General Issues" },
];

/**
 * Urgency levels with human-readable labels.
 */
export const URGENCY_LEVELS: { value: UrgencyLevel; label: string; color: string }[] = [
  { value: "critical", label: "Critical / Immediate threat", color: "bg-red-500 text-white" },
  { value: "high", label: "High priority", color: "bg-orange-500 text-white" },
  { value: "medium", label: "Medium / Routine", color: "bg-blue-500 text-white" },
  { value: "low", label: "Low / Aesthetic", color: "bg-gray-500 text-white" },
];

/**
 * Report Status types with human-readable labels and Tailwind color indicators.
 */
export const REPORT_STATUSES: { value: ReportStatus; label: string; badgeVariant: string }[] = [
  { value: "submitted", label: "Submitted", badgeVariant: "secondary" },
  { value: "investigating", label: "Under Investigation", badgeVariant: "warning" },
  { value: "in_progress", label: "In Progress", badgeVariant: "info" },
  { value: "resolved", label: "Resolved", badgeVariant: "success" },
  { value: "rejected", label: "Rejected/Spam", badgeVariant: "destructive" },
];

/**
 * LocalStorage keys.
 */
export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: "civicmind_auth_token",
  THEME: "civicmind_theme",
  RECENT_REPORTS: "civicmind_recent_reports",
} as const;
