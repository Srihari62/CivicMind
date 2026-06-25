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
  officerId: string
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    await AssignmentService.acceptAssignment(reportId, officerId);
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
  reason: string
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    await AssignmentService.rejectAssignment(reportId, officerId, reason);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to reject assignment." };
  }
}

/**
 * Start investigation.
 */
export async function startInvestigationAction(
  callerUid: string,
  reportId: string,
  officerId: string
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    await AssignmentService.startInvestigation(reportId, officerId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to start investigation." };
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
  afterEvidence?: MediaAsset[]
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
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to generate AI resolution summary." };
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
  category?: string
): Promise<ActionResponse<void>> {
  try {
    const caller = await authorizeAction(callerUid, ["officer", "admin"]);
    if (caller.role === "officer" && caller.uid !== officerId) {
      throw new Error("Unauthorized: Insufficient permissions.");
    }
    await AssignmentService.resolveReport(
      reportId,
      officerId,
      notes,
      repairEvidence,
      duration,
      aiSummary,
      category
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to resolve report." };
  }
}
