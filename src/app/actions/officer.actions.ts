/**
 * @file src/app/actions/officer.actions.ts
 * @description Next.js Server Actions for officer workloads, case workflows, and admin overrides.
 */

"use server";

import { OfficerService } from "@/features/reports/services/officer.service";
import { AssignmentService } from "@/features/reports/services/assignment.service";
import { FirestoreUserProfile } from "@/features/auth/repositories/user.repository";
import { MediaAsset } from "@/types";
import { authorizeAction } from "./auth-guard";

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetches all registered users (for admin promotion).
 */
export async function fetchAllUsersAction(callerUid: string): Promise<ActionResponse<FirestoreUserProfile[]>> {
  try {
    await authorizeAction(callerUid, ["admin"]);
    const data = await OfficerService.getAllUsers();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load users." };
  }
}

/**
 * Fetches all active officers.
 */
export async function fetchAllOfficersAction(callerUid: string): Promise<ActionResponse<FirestoreUserProfile[]>> {
  try {
    await authorizeAction(callerUid, ["admin", "officer"]);
    const data = await OfficerService.getAllOfficers();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load officers." };
  }
}

/**
 * Update user/officer profile (Admin use).
 */
export async function updateOfficerProfileAdminAction(
  callerUid: string,
  uid: string,
  updates: {
    department: string;
    zone: string;
    availability: "available" | "busy" | "offline";
    role: "officer" | "citizen" | "admin";
    displayName?: string;
    phone?: string;
    photo?: string;
    isActive?: boolean;
    activeCases?: number;
  }
): Promise<ActionResponse<void>> {
  try {
    await authorizeAction(callerUid, ["admin"]);
    // Clean up fields and save
    await OfficerService.updateProfile(uid, {
      ...updates,
      photoURL: updates.photo || "",
      isProfileComplete: true,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update profile." };
  }
}

/**
 * Update officer availability.
 */
export async function updateOfficerAvailabilityAction(
  callerUid: string,
  uid: string,
  availability: "available" | "busy" | "offline"
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== uid) {
      throw new Error("Unauthorized: Officers can only update their own availability.");
    }
    await OfficerService.updateAvailability(uid, availability);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update availability." };
  }
}

/**
 * Accept assignment.
 */
export async function acceptAssignmentAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  officerName?: string,
  gps?: { latitude: number; longitude: number } | null
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    const AssignmentService = (await import("@/features/reports/services/assignment.service")).default;
    await AssignmentService.acceptAssignment(reportId, officerId, officerName, gps);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to accept assignment." };
  }
}

/**
 * Reject assignment.
 */
export async function rejectAssignmentAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  reason: string,
  officerName?: string,
  gps?: { latitude: number; longitude: number } | null
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    const AssignmentService = (await import("@/features/reports/services/assignment.service")).default;
    await AssignmentService.rejectAssignment(reportId, officerId, reason, officerName, gps);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to reject assignment." };
  }
}

/**
 * Start travelling to incident.
 */
export async function travelToIncidentAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  officerName?: string,
  gps?: { latitude: number; longitude: number } | null
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    const AssignmentService = (await import("@/features/reports/services/assignment.service")).default;
    await AssignmentService.travelToIncident(reportId, officerId, officerName, gps);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to initiate travel." };
  }
}

/**
 * Start investigation.
 */
export async function startInvestigationAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  officerName?: string,
  gps?: { latitude: number; longitude: number } | null
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    const AssignmentService = (await import("@/features/reports/services/assignment.service")).default;
    await AssignmentService.startInvestigation(reportId, officerId, officerName, gps);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to start investigation." };
  }
}

/**
 * Mark case in progress.
 */
export async function markInProgressAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  officerName?: string,
  gps?: { latitude: number; longitude: number } | null
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    const AssignmentService = (await import("@/features/reports/services/assignment.service")).default;
    await AssignmentService.markInProgress(reportId, officerId, officerName, gps);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to mark case in progress." };
  }
}

/**
 * Submit case for citizen/supervisor verification.
 */
export async function submitForVerificationAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  note?: string,
  media?: MediaAsset[],
  officerName?: string,
  gps?: { latitude: number; longitude: number } | null
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    const AssignmentService = (await import("@/features/reports/services/assignment.service")).default;
    await AssignmentService.submitForVerification(reportId, officerId, note, media, officerName, gps);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to submit for verification." };
  }
}


/**
 * Request more evidence.
 */
export async function requestMoreEvidenceAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  note: string
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    await AssignmentService.requestMoreEvidence(reportId, officerId, note);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to request evidence." };
  }
}

/**
 * Add internal notes.
 */
export async function addInternalNotesAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  note: string
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    await AssignmentService.addInternalNotes(reportId, officerId, note);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to add notes." };
  }
}

/**
 * Upload progress media.
 */
export async function uploadProgressMediaAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  media: MediaAsset[]
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    await AssignmentService.uploadProgressMedia(reportId, officerId, media);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to upload progress media." };
  }
}

/**
 * Save officer notes.
 */
export async function saveOfficerNotesAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  content: string
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    const AssignmentService = (await import("@/features/reports/services/assignment.service")).default;
    await AssignmentService.saveOfficerNotes(reportId, officerId, content);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save officer notes." };
  }
}

/**
 * Generate AI resolution summary.
 */
export async function generateAIResolutionSummaryAction(
  callerUid: string,
  title: string,
  category: string,
  notes: string,
  beforeEvidence?: MediaAsset[],
  afterEvidence?: MediaAsset[],
  reportId?: string,
  officerName?: string
): Promise<ActionResponse<{ summary: string; workCompleted: string; citizenExplanation: string }>> {
  try {
    await authorizeAction(callerUid, ["officer", "admin"]);
    const { AIResolutionAgent } = await import("@/ai/agents/ai-resolution.agent");
    const agent = new AIResolutionAgent();
    const result = await agent.analyze({
      title,
      category,
      notes,
      beforeEvidence,
      afterEvidence,
    });

    if (reportId) {
      const TimelineService = (await import("@/features/reports/services/timeline.service")).TimelineService;
      await TimelineService.logEvent(
        reportId,
        callerUid,
        "officer",
        "AI summary generated",
        "AI resolution summary generated.",
        officerName
      );
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate AI resolution summary." };
  }
}

/**
 * Save repair evidence, materials used, and work completed draft details.
 */
export async function saveRepairEvidenceAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  repairEvidence: { before: MediaAsset[]; after: MediaAsset[] },
  materialsUsed: string,
  workCompleted: string,
  officerName?: string,
  gps?: { latitude: number; longitude: number } | null
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    const AssignmentService = (await import("@/features/reports/services/assignment.service")).default;
    await AssignmentService.saveRepairEvidence(
      reportId,
      officerId,
      repairEvidence,
      materialsUsed,
      workCompleted,
      officerName,
      gps
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save repair evidence." };
  }
}

/**
 * Save a resolution draft details.
 */
export async function saveResolutionDraftAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  draft: {
    notes?: string;
    materialsUsed?: string;
    workCompleted?: string;
    aiSummary?: {
      summary: string;
      workCompleted: string;
      citizenExplanation: string;
    } | null;
    repairEvidence?: {
      before: MediaAsset[];
      after: MediaAsset[];
    };
    status?: string;
  },
  officerName?: string,
  gps?: { latitude: number; longitude: number } | null
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    const AssignmentService = (await import("@/features/reports/services/assignment.service")).default;
    await AssignmentService.saveResolutionDraft(
      reportId,
      officerId,
      draft,
      officerName,
      gps
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save resolution draft." };
  }
}

/**
 * Resolve report.
 */
export async function resolveReportAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  notes: string,
  repairEvidence: { before: MediaAsset[]; after: MediaAsset[] },
  duration: number,
  aiSummary: { summary: string; workCompleted: string; citizenExplanation: string },
  category?: string,
  officerName?: string,
  gps?: { latitude: number; longitude: number } | null,
  workCompleted?: string,
  materialsUsed?: string
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    const AssignmentService = (await import("@/features/reports/services/assignment.service")).default;
    await AssignmentService.resolveReport(
      reportId,
      officerId,
      notes,
      repairEvidence,
      duration,
      aiSummary,
      category,
      officerName,
      gps,
      workCompleted,
      materialsUsed
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to resolve report." };
  }
}

/**
 * Close report.
 */
export async function closeReportAction(
  callerUid: string,
  reportId: string,
  actorId: string,
  actorRole: "citizen" | "officer" | "admin" | "system" | "ai",
  actorName?: string,
  gps?: { latitude: number; longitude: number } | null
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["citizen", "officer", "admin"]);
    const AssignmentService = (await import("@/features/reports/services/assignment.service")).default;
    await AssignmentService.closeReport(reportId, actorId, actorRole, actorName, gps);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to close report." };
  }
}

/**
 * Save field investigation details.
 */
export async function saveInvestigationDetailsAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  payload: {
    notes: string;
    observedSeverity: string;
    materialRequirement: string;
    safetyRisk: string;
    photos: MediaAsset[];
  },
  officerName?: string,
  gps?: { latitude: number; longitude: number } | null
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    const AssignmentService = (await import("@/features/reports/services/assignment.service")).default;
    await AssignmentService.saveInvestigationDetails(reportId, officerId, payload, officerName, gps);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save investigation details." };
  }
}

/**
 * Start repair work.
 */
export async function startRepairWorkAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  officerName?: string,
  gps?: { latitude: number; longitude: number } | null
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    const AssignmentService = (await import("@/features/reports/services/assignment.service")).default;
    await AssignmentService.startRepairWork(reportId, officerId, officerName, gps);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to start repair work." };
  }
}

/**
 * Save repair progress.
 */
export async function saveRepairProgressAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  payload: {
    workPerformed: string;
    materialsUsed: string;
    labourCount: number;
    cost?: number;
    photos: MediaAsset[];
    videos: MediaAsset[];
  },
  officerName?: string,
  gps?: { latitude: number; longitude: number } | null
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    const AssignmentService = (await import("@/features/reports/services/assignment.service")).default;
    await AssignmentService.saveRepairProgress(reportId, officerId, payload, officerName, gps);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save repair progress." };
  }
}

/**
 * Complete repair work.
 */
export async function completeRepairAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  payload: {
    materials: string;
    labourCount: number;
    cost?: number;
    notes: string;
    afterMedia: MediaAsset[];
    checklist: Record<string, boolean>;
  },
  officerName?: string,
  gps?: { latitude: number; longitude: number } | null
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    const AssignmentService = (await import("@/features/reports/services/assignment.service")).default;
    await AssignmentService.completeRepair(reportId, officerId, payload, officerName, gps);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to complete repair." };
  }
}

/**
 * Run AI Verification.
 */
export async function runAiVerificationAction(
  callerUid: string,
  reportId: string,
  officerId: string,
  repairNotes: string,
  beforeMedia: MediaAsset[],
  afterMedia: MediaAsset[],
  officerName?: string
): Promise<ActionResponse<{
  technicalSummary: string;
  citizenSummary: string;
  adminSummary: string;
  verifiedByAI: boolean;
  confidence: number;
  repairCompleteness: number;
  matchesReportedIssue: boolean;
}>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    const AssignmentService = (await import("@/features/reports/services/assignment.service")).default;
    const result = await AssignmentService.runAiVerification(
      reportId,
      officerId,
      repairNotes,
      beforeMedia,
      afterMedia,
      officerName
    );
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to run AI verification." };
  }
}

