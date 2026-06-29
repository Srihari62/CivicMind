/**
 * @file src/types/index.ts
 * @description Centralized Type Definitions for CivicMind platform.
 * Governs the shape of database entities (User, Report, Comments, etc.)
 * and API responses to enforce compile-time correctness.
 */

/**
 * User roles inside the CivicMind ecosystem.
 */
export type UserRole = 'citizen' | 'officer' | 'admin';

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
  | 'draft'
  | 'submitted'
  | 'assigned'
  | 'accepted'
  | 'travelling'
  | 'investigating'
  | 'investigation_started'
  | 'in_progress'
  | 'repair_in_progress'
  | 'repair_completed'
  | 'pending_verification'
  | 'awaiting_verification'
  | 'requires_review'
  | 'resolved'
  | 'closed'
  | 'rejected'
  | 'waiting_assignment'
  | 'reopened';

export type AiStatus = 'pending' | 'processed' | 'failed';
export type VerificationStatus = 'pending' | 'verified' | 'flagged' | 'rejected';
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low' | 'unknown';

export interface MediaAsset {
  id: string;
  type: 'image' | 'video';
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
  placeId?: string;
  formattedAddress: string;
  locality?: string;
  subLocality?: string;
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
  | 'infrastructure'
  | 'sanitation'
  | 'environmental'
  | 'utility'
  | 'public_safety'
  | 'other';

/**
 * Priority urgency ratings.
 */
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

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
  actorRole: UserRole | 'system' | 'ai';
  action: string;
  note?: string;
  actorName?: string;
  gps?: { latitude: number; longitude: number } | null;
  media?: MediaAsset[];
}


/**
 * Principal Civic Issue Report document interface.
 */
export interface CivicReport {
  id: string;
  status: ReportStatus;
  reportedCount?: number;
  supportCount?: number;
  notFoundCount?: number;
  commentsCount?: number;

  metadata: {
    title: string;
    description: string;
    category: string;
    createdBy: string;
    editedAfterAI?: boolean;
  };

  location: ReportLocation;
  state?: string;
  city?: string;
  locality?: string;

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
      status: 'processing' | 'verified' | 'requires_review' | 'rejected' | 'failed';
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

  resolution?: ReportResolutionDetails | null;
  repair?: ReportRepairDetails | null;
  progress?: ReportProgressItem[] | null;

  repairEvidence?: {
    before: MediaAsset[];
    after: MediaAsset[];
  } | null;

  officerNotes?: OfficerNote | null;
  progressUpdates?: ProgressUpdate[] | null;

  timeline?: TimelineEvent[];

  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
}

export interface ReportProgressItem {
  title: string;
  description: string;
  media: MediaAsset[];
  createdAt: string;
  createdBy: string;
  status: ReportStatus;
}

export interface ReportRepairDetails {
  materials: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  labourCount: number;
  cost?: number;
  notes: string;
}

export interface ReportResolutionDetails {
  notes: string;
  category: string;
  proofPhotoUrl?: string;
  resolvedAt: string;
  resolvedBy?: string;
  duration?: number; // in hours or days
  repairEvidence?: {
    before: MediaAsset[];
    after: MediaAsset[];
  };
  aiSummary?: {
    summary: string;
    workCompleted: string;
    citizenExplanation: string;
  } | null;
  generatedAt?: string | null;
  model?: string | null;
  materialsUsed?: string;
  workCompleted?: string;
  // Sprint 12C additions
  technicalSummary?: string;
  citizenSummary?: string;
  adminSummary?: string;
  verifiedByAI?: boolean;
  confidence?: number;
  beforeMedia?: MediaAsset[];
  afterMedia?: MediaAsset[];
}

export interface OfficerNote {
  content: string;
  updatedAt: string;
  history: { content: string; updatedAt: string }[];
}

export interface ProgressUpdate {
  id: string;
  title: string;
  description: string;
  images: MediaAsset[];
  timestamp: string;
  officerId: string;
  officerName: string;
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
