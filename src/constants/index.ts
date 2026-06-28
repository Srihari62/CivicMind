/**
 * @file src/constants/index.ts
 * @description Application-wide constants registry.
 * Houses static lookup arrays, localized labels, configuration defaults,
 * and key mappings to prevent hardcoded strings.
 */

import { UserRole } from "@/types";

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
 * Human-readable Issue Categories.
 */
export const ISSUE_CATEGORIES = [
  { value: "road_damage", label: "Road Damage" },
  { value: "garbage", label: "Garbage" },
  { value: "water_leakage", label: "Water Leakage" },
  { value: "street_light", label: "Street Light" },
  { value: "drainage", label: "Drainage" },
  { value: "illegal_dumping", label: "Illegal Dumping" },
  { value: "traffic_signal", label: "Traffic Signal" },
  { value: "public_safety", label: "Public Safety" },
  { value: "other", label: "Other" },
] as const;

/**
 * Media uploads configuration parameters.
 */
export const MAX_MEDIA_COUNT = 5;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_SIZE = 25 * 1024 * 1024; // 25MB
export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const SUPPORTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;

/**
 * Centralized report status and routing states.
 */
export const REPORT_STATUS = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
  ASSIGNED: "assigned",
  ACCEPTED: "accepted",
  TRAVELLING: "travelling",
  INVESTIGATING: "investigating",
  REPAIR_IN_PROGRESS: "repair_in_progress",
  REPAIR_COMPLETED: "repair_completed",
  AWAITING_VERIFICATION: "awaiting_verification",
  RESOLVED: "resolved",
  CLOSED: "closed",
  REJECTED: "rejected",
} as const;

export const AI_STATUS = {
  PENDING: "pending",
  PROCESSED: "processed",
  FAILED: "failed",
} as const;

export const VERIFICATION_STATUS = {
  PENDING: "pending",
  VERIFIED: "verified",
  FLAGGED: "flagged",
  REJECTED: "rejected",
} as const;

export const PRIORITY = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  UNKNOWN: "unknown",
} as const;

/**
 * Urgency levels with human-readable labels.
 */
export const URGENCY_LEVELS = [
  { value: "critical", label: "Critical / Immediate threat", color: "bg-red-500 text-white" },
  { value: "high", label: "High priority", color: "bg-orange-500 text-white" },
  { value: "medium", label: "Medium / Routine", color: "bg-blue-500 text-white" },
  { value: "low", label: "Low / Aesthetic", color: "bg-gray-500 text-white" },
] as const;

/**
 * Report Status types with human-readable labels and Tailwind color indicators.
 */
export const REPORT_STATUSES = [
  { value: "draft", label: "Draft", badgeVariant: "secondary" },
  { value: "submitted", label: "Submitted", badgeVariant: "secondary" },
  { value: "assigned", label: "Assigned", badgeVariant: "secondary" },
  { value: "accepted", label: "Accepted", badgeVariant: "secondary" },
  { value: "travelling", label: "Travelling to Location", badgeVariant: "info" },
  { value: "investigating", label: "Under Investigation", badgeVariant: "warning" },
  { value: "repair_in_progress", label: "Repair In Progress", badgeVariant: "info" },
  { value: "repair_completed", label: "Repair Completed", badgeVariant: "info" },
  { value: "awaiting_verification", label: "Awaiting Verification", badgeVariant: "warning" },
  { value: "resolved", label: "Resolved", badgeVariant: "success" },
  { value: "closed", label: "Closed", badgeVariant: "success" },
  { value: "rejected", label: "Rejected/Spam", badgeVariant: "destructive" },
] as const;

/**
 * LocalStorage keys.
 */
export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: "civicmind_auth_token",
  THEME: "civicmind_theme",
  RECENT_REPORTS: "civicmind_recent_reports",
} as const;
