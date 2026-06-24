/**
 * @file src/app/actions/officer.actions.ts
 * @description Next.js Server Actions for officer workloads, case workflows, and admin overrides.
 */

"use server";

import { OfficerService } from "@/features/reports/services/officer.service";
import { AssignmentService } from "@/features/reports/services/assignment.service";
import { FirestoreUserProfile } from "@/features/auth/repositories/user.repository";
import { MediaAsset } from "@/types";

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetches all registered users (for admin promotion).
 */
export async function fetchAllUsersAction(): Promise<ActionResponse<FirestoreUserProfile[]>> {
  try {
    const data = await OfficerService.getAllUsers();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load users." };
  }
}

/**
 * Fetches all active officers.
 */
export async function fetchAllOfficersAction(): Promise<ActionResponse<FirestoreUserProfile[]>> {
  try {
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
  uid: string,
  availability: "available" | "busy" | "offline"
): Promise<ActionResponse<void>> {
  try {
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
  reportId: string,
  officerId: string
): Promise<ActionResponse<void>> {
  try {
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
  reportId: string,
  officerId: string,
  reason: string
): Promise<ActionResponse<void>> {
  try {
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
  reportId: string,
  officerId: string
): Promise<ActionResponse<void>> {
  try {
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
  reportId: string,
  officerId: string,
  note: string
): Promise<ActionResponse<void>> {
  try {
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
  reportId: string,
  officerId: string,
  note: string
): Promise<ActionResponse<void>> {
  try {
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
  reportId: string,
  officerId: string,
  media: MediaAsset[]
): Promise<ActionResponse<void>> {
  try {
    await AssignmentService.uploadProgressMedia(reportId, officerId, media);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to upload progress media." };
  }
}

/**
 * Resolve report.
 */
export async function resolveReportAction(
  reportId: string,
  officerId: string,
  notes: string,
  media: MediaAsset[],
  category?: string,
  proofPhotoUrl?: string
): Promise<ActionResponse<void>> {
  try {
    await AssignmentService.resolveReport(reportId, officerId, notes, media, category, proofPhotoUrl);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to resolve report." };
  }
}
