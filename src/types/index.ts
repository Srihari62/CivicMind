/**
 * @file src/types/index.ts
 * @description Centralized Type Definitions for CivicMind platform.
 * Governs the shape of database entities (User, Report, Comments, etc.)
 * and API responses to enforce compile-time correctness.
 */

/**
 * User roles inside the CivicMind ecosystem.
 */
export type UserRole = "citizen" | "officer" | "admin";

/**
 * Citizen or official user account structure.
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phoneNumber?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Status phases of a reported civic issue.
 */
export type ReportStatus =
  | "submitted"       // Initial state upon submission
  | "investigating"   // Assigned to department, undergoing verification
  | "in_progress"     // Work team dispatched, actively resolving
  | "resolved"        // Issue successfully addressed
  | "rejected";       // Out of scope, duplicate, or spam

/**
 * Categories matching the classifier system options.
 */
export type IssueCategory =
  | "infrastructure"
  | "sanitation"
  | "environmental"
  | "utility"
  | "public_safety"
  | "other";

/**
 * Priority urgency ratings.
 */
export type UrgencyLevel = "critical" | "high" | "medium" | "low";

/**
 * Location data matching Google Maps structures.
 */
export interface LocationCoordinates {
  lat: number;
  lng: number;
  address?: string;
}

/**
 * Principal Civic Issue Report document interface.
 */
export interface CivicReport {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  urgency: UrgencyLevel;
  location: LocationCoordinates;
  status: ReportStatus;
  imageUrl?: string;
  videoUrl?: string;
  
  // Reporter association (null if submitted anonymously)
  reporterId: string | null;
  reporterName: string;
  
  // Municipal routing fields
  assignedDepartment?: string;
  assignedOfficerId?: string;
  resolutionNotes?: string;
  
  // AI analysis metadata (cache of orchestrator results)
  aiClassificationConfidence?: number;
  aiUrgencyReason?: string;
  aiTags?: string[];
  publicSafetyRisk?: boolean;

  createdAt: string;
  updatedAt: string;
}

/**
 * Threaded comments/updates on reports.
 */
export interface ReportComment {
  id: string;
  reportId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string;
  isOfficialResponse: boolean;
  createdAt: string;
}

/**
 * Auditor logging details for operations security.
 */
export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string; // e.g. "STATUS_CHANGE", "DISPATCH_OFFICER"
  targetId: string; // ID of the modified entity
  details: string;
  timestamp: string;
}
