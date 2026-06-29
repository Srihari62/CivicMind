/**
 * @file src/app/actions/admin.actions.ts
 * @description Next.js Server Actions for Admin workspace capabilities, including user management, report updates, and overrides.
 */

"use server";

import { admin } from "@/services/firebase/admin";
import { authorizeAction } from "./auth-guard";
import { UserRepository } from "@/features/auth/repositories/user.repository";
import { ReportRepository } from "@/features/reports/repositories/report.repository";

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Creates a new user in Firebase Auth and builds their Firestore user profile document.
 * Enforces admin authorization.
 */
export async function createNewUserAction(
  callerUid: string,
  input: {
    email: string;
    password?: string;
    displayName: string;
    role: "citizen" | "officer" | "admin";
    department?: string;
    zone?: string;
    phoneNumber?: string;
    photoURL?: string;
    isActive: boolean;
    state?: string;
    city?: string;
    preferredLanguage?: string;
  }
): Promise<ActionResponse<string>> {
  try {
    // 1. Authorize calling user (must be admin)
    await authorizeAction(callerUid, ["admin"]);

    if (!admin) {
      throw new Error("Firebase Admin SDK is not initialized.");
    }

    // 2. Create authentication credential in Firebase Auth using Admin SDK
    const userRecord = await admin.auth().createUser({
      email: input.email,
      password: input.password || "TempPass123!",
      displayName: input.displayName,
      phoneNumber: input.phoneNumber || undefined,
      photoURL: input.photoURL || undefined,
    });

    // 3. Create user profile in Firestore
    await UserRepository.createUserProfile(userRecord.uid, {
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      photoURL: input.photoURL || "",
      isProfileComplete: true,
      department: input.role === "officer" ? input.department : "",
      zone: input.role === "officer" ? input.zone : "",
      availability: input.role === "officer" ? "available" : undefined,
      activeCases: input.role === "officer" ? 0 : undefined,
      phone: input.phoneNumber || "",
      isActive: input.isActive,
      state: input.state || "",
      city: input.city || "",
      preferredLanguage: input.preferredLanguage || "en",
    });

    return { success: true, data: userRecord.uid };
  } catch (error: any) {
    console.error("Error creating user:", error);
    return { success: false, error: error?.message || "Failed to create user account." };
  }
}

/**
 * Updates user password using Firebase Admin SDK (bypasses recent login check).
 */
export async function updatePasswordAction(
  callerUid: string,
  targetUid: string,
  newPassword: string
): Promise<ActionResponse<void>> {
  try {
    await authorizeAction(callerUid, ["admin"]);
    if (!admin) {
      throw new Error("Firebase Admin SDK is not initialized.");
    }

    await admin.auth().updateUser(targetUid, {
      password: newPassword,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating user password:", error);
    return { success: false, error: error?.message || "Failed to update password." };
  }
}

/**
 * Assigns an officer to a report (Admin override).
 */
export async function adminAssignOfficerAction(
  callerUid: string,
  reportId: string,
  officerId: string | null,
  department: string
): Promise<ActionResponse<void>> {
  try {
    await authorizeAction(callerUid, ["admin"]);

    await ReportRepository.assignOfficer(
      reportId,
      officerId,
      department,
      "manual",
      officerId ? "accepted" : "submitted"
    );

    // Append timeline event
    const now = new Date().toISOString();
    await ReportRepository.appendTimelineEvent(reportId, {
      timestamp: now,
      actorId: callerUid,
      actorRole: "admin",
      action: officerId ? `Officer Assigned (Manual Admin)` : `Officer Unassigned (Manual Admin)`,
      note: officerId ? `Assigned to Officer ID: ${officerId}` : undefined,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error assigning officer:", error);
    return { success: false, error: error?.message || "Failed to assign officer." };
  }
}

/**
 * Changes the assigned department of a report (Admin override).
 */
export async function adminChangeDepartmentAction(
  callerUid: string,
  reportId: string,
  department: string
): Promise<ActionResponse<void>> {
  try {
    await authorizeAction(callerUid, ["admin"]);

    const updates = {
      "ai.assignment.department": department,
      "ai.verification.assignedDepartment": department,
      "timestamps.updatedAt": new Date().toISOString(),
    };

    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
    } else {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db, COLLECTIONS } = await import("@/services/firebase/firestore");
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, updates);
    }

    // Append timeline event
    await ReportRepository.appendTimelineEvent(reportId, {
      timestamp: new Date().toISOString(),
      actorId: callerUid,
      actorRole: "admin",
      action: "Department Reassigned",
      note: `Reassigned to department: ${department}`,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error changing department:", error);
    return { success: false, error: error?.message || "Failed to change department." };
  }
}

/**
 * Marks/Changes the priority level of a report (Admin override).
 */
export async function adminMarkPriorityAction(
  callerUid: string,
  reportId: string,
  priority: "critical" | "high" | "medium" | "low" | "unknown"
): Promise<ActionResponse<void>> {
  try {
    await authorizeAction(callerUid, ["admin"]);

    await ReportRepository.updateVerification(reportId, {
      priority: priority as any,
    });

    // Append timeline event
    await ReportRepository.appendTimelineEvent(reportId, {
      timestamp: new Date().toISOString(),
      actorId: callerUid,
      actorRole: "admin",
      action: "Priority Urgency Marked",
      note: `Priority level updated to: ${priority}`,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating priority:", error);
    return { success: false, error: error?.message || "Failed to update priority." };
  }
}

/**
 * Rejects a report (Admin override).
 */
export async function adminRejectReportAction(
  callerUid: string,
  reportId: string,
  reason: string
): Promise<ActionResponse<void>> {
  try {
    await authorizeAction(callerUid, ["admin"]);

    const updates = {
      status: "rejected" as const,
      "timestamps.updatedAt": new Date().toISOString(),
    };

    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
    } else {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db, COLLECTIONS } = await import("@/services/firebase/firestore");
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, updates);
    }

    // Append timeline event
    await ReportRepository.appendTimelineEvent(reportId, {
      timestamp: new Date().toISOString(),
      actorId: callerUid,
      actorRole: "admin",
      action: "Report Rejected",
      note: reason || "Rejected by Administrator override.",
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error rejecting report:", error);
    return { success: false, error: error?.message || "Failed to reject report." };
  }
}

/**
 * Approves a report (Admin override).
 */
export async function adminApproveReportAction(
  callerUid: string,
  reportId: string
): Promise<ActionResponse<void>> {
  try {
    await authorizeAction(callerUid, ["admin"]);

    const updates = {
      status: "accepted" as const,
      "timestamps.updatedAt": new Date().toISOString(),
    };

    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
    } else {
      const { doc, updateDoc } = await import("firebase/firestore");
      const { db, COLLECTIONS } = await import("@/services/firebase/firestore");
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, updates);
    }

    // Append timeline event
    await ReportRepository.appendTimelineEvent(reportId, {
      timestamp: new Date().toISOString(),
      actorId: callerUid,
      actorRole: "admin",
      action: "Report Approved",
      note: "Approved by Administrator override.",
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error approving report:", error);
    return { success: false, error: error?.message || "Failed to approve report." };
  }
}
