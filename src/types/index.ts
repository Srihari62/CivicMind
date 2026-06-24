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
  | "draft"
  | "submitted"
  | "investigating"
  | "in_progress"
  | "resolved"
  | "rejected";

export type AiStatus = "pending" | "processed" | "failed";
export type VerificationStatus = "pending" | "verified" | "flagged" | "rejected";
export type PriorityLevel = "critical" | "high" | "medium" | "low" | "unknown";

export interface MediaAsset {
  id: string;
  type: "image" | "video";
  url: string;
  storagePath: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  thumbnailUrl?: string;
  // Extended fields for AI/media processing metadata
  width?: number;
  height?: number;
  duration?: number;
  checksum?: string;
}

export interface ReportLocation {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

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

export interface TimelineEvent {
  timestamp: string;
  actorId: string;
  actorRole: UserRole | "system" | "ai";
  action: string;
  note?: string;
}

/**
 * Principal Civic Issue Report document interface.
 */
export interface CivicReport {
  id: string;
  status: ReportStatus;
  reportedCount?: number;
  
  metadata: {
    title: string;
    description: string;
    category: string;
    createdBy: string;
    editedAfterAI?: boolean;
  };
  
  location: ReportLocation;
  
  evidence: {
    media: MediaAsset[];
  };
  
  ai: {
    assistant: {
      title: string;
      description: string;
      category: string;
      severity: string;
      confidence: number;
      summary: string;
      detectedObjects?: string[];
      model: string;
      promptVersion: string;
      analyzedAt: string;
      initialPriority: string;
    } | null;
    verification: {
      status: "processing" | "verified" | "requires_review" | "rejected" | "failed";
      fakeMediaProbability?: number | null;
      fakeMediaConfidence?: number | null;
      fakeMediaReason?: string | null;
      duplicateProbability?: number | null;
      duplicateReportIds?: string[] | null;
      duplicateReason?: string | null;
      assignedDepartment?: string | null;
      priority?: PriorityLevel | null;
      trustScore?: number | null;
      verificationModel?: string | null;
      verificationVersion?: string | null;
      summary?: string | null;
      analyzedAt?: string | null;
      failureReason?: string | null;
    };
    assignment: {
      officerId: string | null;
      department: string | null;
      assignedAt: string | null;
      assignmentMethod: string | null;
    };
  };

  resolvedBy?: string | null;
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
  resolutionMedia?: MediaAsset[] | null;
  resolution?: {
    notes: string;
    category: string;
    proofPhotoUrl?: string;
    resolvedAt: string;
  } | null;

  timeline?: TimelineEvent[];

  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
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
