/**
 * @file src/features/reports/services/assignment.service.ts
 * @description Assignment service.
 * Manages the intelligent routing, auto-assignment, and case transitions for municipal reports.
 */

import { ReportRepository } from "../repositories/report.repository";
import { OfficerService } from "./officer.service";
import { TimelineService } from "./timeline.service";
import { NotificationService } from "./notification.service";
import { CivicReport, MediaAsset } from "@/types";
import { doc, updateDoc, arrayUnion, collection } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";

export class AssignmentService {
  /**
   * Deterministically maps report category codes to departments.
   * PART 3
   */
  public static mapCategoryToDepartment(category: string): string {
    switch (category) {
      case "road_damage":
        return "Roads";
      case "garbage":
      case "illegal_dumping":
        return "Sanitation";
      case "street_light":
        return "Electrical";
      case "water_leakage":
      case "water_leak":
        return "Water Supply";
      case "drainage":
        return "Drainage";
      case "park_damage":
        return "Parks";
      case "traffic_signal":
        return "Traffic";
      default:
        return "Roads"; // Fallback default
    }
  }

  /**
   * Automatically assigns a verified report to the most suitable available officer.
   * PART 4
   */
  public static async autoAssignReport(reportId: string): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    // Determine target category
    const category = report.metadata.category;
    const department = this.mapCategoryToDepartment(category);
    const reportCity = report.city || (report as any).location?.city || "";

    // 1. Fetch available officers in department
    let availableOfficers = await OfficerService.getAvailableOfficers(department);

    // Filter by city to avoid cross-city assignments
    if (reportCity) {
      availableOfficers = availableOfficers.filter(
        (officer) => officer.city && officer.city.toLowerCase() === reportCity.toLowerCase()
      );
    }

    if (availableOfficers.length === 0) {
      // No officer exists - leave assignedOfficerId null and mark status as waiting_assignment
      await ReportRepository.assignOfficer(reportId, null, department, "automatic", "waiting_assignment");
      await TimelineService.logEvent(
        reportId,
        "system",
        "system",
        "Auto assignment failed. No available officers in department.",
        `Department: ${department}`
      );
      await NotificationService.notifyAdminAssignmentFailed(reportId, department);
      return;
    }

    // 2. Filter / Prefer officers in the same zone
    const reportZone = (report as CivicReport & { zone?: string }).zone || "";
    const zoneMatchOfficers = availableOfficers.filter((officer) => {
      if (!officer.zone) return false;
      if (reportZone && officer.zone.toLowerCase() === reportZone.toLowerCase()) return true;
      if (
        report.location.formattedAddress &&
        report.location.formattedAddress.toLowerCase().includes(officer.zone.toLowerCase())
      ) {
        return true;
      }
      return false;
    });

    const candidates = zoneMatchOfficers.length > 0 ? zoneMatchOfficers : availableOfficers;

    // 3. Choose officer with the lowest activeCases workload
    const selectedOfficer = candidates.reduce((prev, curr) => {
      const prevCases = prev.activeCases || 0;
      const currCases = curr.activeCases || 0;
      return prevCases <= currCases ? prev : curr;
    });

    // 4. Assign officer, increment their activeCases, and log timeline events
    const officerId = selectedOfficer.uid;
    const officerName = selectedOfficer.displayName || selectedOfficer.email;

    await OfficerService.incrementCases(officerId);
    await ReportRepository.assignOfficer(reportId, officerId, department, "automatic", "submitted");

    await TimelineService.logEvent(
      reportId,
      "system",
      "system",
      `Automatically Assigned to ${officerName} (${department})`
    );

    await NotificationService.notifyOfficerAssigned(officerId, reportId);
  }

  /**
   * Workflow Action: Officer accepts assignment.
   */
  public static async acceptAssignment(
    reportId: string,
    officerId: string,
    officerName?: string,
    gps?: { latitude: number; longitude: number } | null
  ): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    if (report.status !== "submitted" && report.status !== "assigned") {
      throw new Error(`Invalid transition: Cannot accept assignment from status "${report.status}".`);
    }

    // Transition status to accepted
    const updates = {
      status: "accepted",
      "timestamps.updatedAt": new Date().toISOString(),
    };
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, updates);
    }

    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Accepted",
      "Officer accepted the case workload.",
      officerName,
      gps
    );
    await NotificationService.notifyCitizenStatusChanged(
      report.metadata.createdBy,
      reportId,
      "accepted"
    );

    try {
      const { CitizenStatsService } = await import("./stats.service");
      await CitizenStatsService.syncStats(report.metadata.createdBy);
    } catch (e) {
      console.error("Failed to sync citizen stats on assignment acceptance:", e);
    }
  }

  /**
   * Workflow Action: Officer rejects assignment (Unable to Accept flow).
   */
  public static async rejectAssignment(
    reportId: string,
    officerId: string,
    reason: string,
    officerName?: string,
    gps?: { latitude: number; longitude: number } | null
  ): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    if (report.status !== "submitted" && report.status !== "assigned" && report.status !== "accepted") {
      throw new Error(`Invalid transition: Cannot reject assignment from status "${report.status}".`);
    }

    // Decrement workload
    await OfficerService.decrementCases(officerId);

    // Append timeline entry
    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Unable to Accept",
      `Officer unable to accept. Reason: ${reason}`,
      officerName,
      gps
    );

    // Determine department
    const category = report.metadata.category;
    const department = this.mapCategoryToDepartment(category);

    // Run assignment engine again to find another officer (excluding the current officer)
    const availableOfficers = await OfficerService.getAvailableOfficers(department);
    const otherOfficers = availableOfficers.filter((o) => o.uid !== officerId);

    if (otherOfficers.length === 0) {
      // No replacement officer exists - mark status as waiting_assignment, notify admin
      await ReportRepository.assignOfficer(reportId, null, department, "automatic", "waiting_assignment");
      await TimelineService.logEvent(
        reportId,
        "system",
        "system",
        "Auto assignment failed. No available officers in department.",
        `Department: ${department}`
      );
      await NotificationService.notifyAdminAssignmentFailed(reportId, department);
      return;
    }

    // Filter/Prefer officers in the same zone
    const reportZone = (report as any).zone || "";
    const zoneMatchOfficers = otherOfficers.filter((officer) => {
      if (!officer.zone) return false;
      if (reportZone && officer.zone.toLowerCase() === reportZone.toLowerCase()) return true;
      if (
        report.location.formattedAddress &&
        report.location.formattedAddress.toLowerCase().includes(officer.zone.toLowerCase())
      ) {
        return true;
      }
      return false;
    });

    const candidates = zoneMatchOfficers.length > 0 ? zoneMatchOfficers : otherOfficers;

    // Pick officer with lowest activeCases workload
    const selectedOfficer = candidates.reduce((prev, curr) => {
      const prevCases = prev.activeCases || 0;
      const currCases = curr.activeCases || 0;
      return prevCases <= currCases ? prev : curr;
    });

    const newOfficerId = selectedOfficer.uid;
    const newOfficerName = selectedOfficer.displayName || selectedOfficer.email;

    // Increment new officer's workload and assign
    await OfficerService.incrementCases(newOfficerId);
    await ReportRepository.assignOfficer(reportId, newOfficerId, department, "automatic", "submitted");

    await TimelineService.logEvent(
      reportId,
      "system",
      "system",
      `Automatically Assigned to ${newOfficerName} (${department})`
    );

    await NotificationService.notifyOfficerAssigned(newOfficerId, reportId);
  }

  /**
   * Workflow Action: Officer starts travelling to incident site.
   */
  public static async travelToIncident(
    reportId: string,
    officerId: string,
    officerName?: string,
    gps?: { latitude: number; longitude: number } | null
  ): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    if (report.status !== "accepted") {
      throw new Error(`Invalid transition: Cannot travel from status "${report.status}".`);
    }

    const updates = {
      status: "travelling",
      "timestamps.updatedAt": new Date().toISOString(),
    };
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, updates);
    }

    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Officer Travelling",
      "Officer is travelling to the incident site.",
      officerName,
      gps
    );
    await NotificationService.notifyCitizenStatusChanged(
      report.metadata.createdBy,
      reportId,
      "travelling"
    );
  }

  /**
   * Workflow Action: Officer arrives and starts field investigation.
   */
  public static async startInvestigation(
    reportId: string,
    officerId: string,
    officerName?: string,
    gps?: { latitude: number; longitude: number } | null
  ): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    if (report.status !== "travelling" && report.status !== "accepted") {
      throw new Error(`Invalid transition: Cannot start investigation from status "${report.status}".`);
    }

    const updates = {
      status: "investigation_started",
      "timestamps.updatedAt": new Date().toISOString(),
    };
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, updates);
    }

    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Investigation Started",
      "Officer arrived and started field investigation.",
      officerName,
      gps
    );
    try {
      await NotificationService.notifyInvestigationStarted(reportId);
    } catch (e) {
      console.error("Failed to notify investigation started:", e);
    }
  }

  /**
   * Workflow Action: Officer marks the investigation as in progress.
   */
  public static async markInProgress(
    reportId: string,
    officerId: string,
    officerName?: string,
    gps?: { latitude: number; longitude: number } | null
  ): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    if (report.status !== "investigation_started") {
      throw new Error(`Invalid transition: Cannot mark in progress from status "${report.status}".`);
    }

    const updates = {
      status: "in_progress",
      "timestamps.updatedAt": new Date().toISOString(),
    };
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, updates);
    }

    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "In Progress",
      "Incident status marked as active/in progress.",
      officerName,
      gps
    );
    await NotificationService.notifyCitizenStatusChanged(
      report.metadata.createdBy,
      reportId,
      "in_progress"
    );
  }

  /**
   * Workflow Action: Officer submits report for supervisor/citizen verification.
   */
  public static async submitForVerification(
    reportId: string,
    officerId: string,
    note?: string,
    media?: MediaAsset[],
    officerName?: string,
    gps?: { latitude: number; longitude: number } | null
  ): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    if (report.status !== "in_progress") {
      throw new Error(`Invalid transition: Cannot submit for verification from status "${report.status}".`);
    }

    const updates = {
      status: "pending_verification",
      "timestamps.updatedAt": new Date().toISOString(),
    };
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, updates);
    }

    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Pending Verification",
      note || "Officer submitted case resolution for verification.",
      officerName,
      gps,
      media
    );
    await NotificationService.notifyCitizenStatusChanged(
      report.metadata.createdBy,
      reportId,
      "pending_verification"
    );
  }

  /**
   * Workflow Action: Officer requests more evidence from citizen.
   */
  public static async requestMoreEvidence(
    reportId: string,
    officerId: string,
    note: string
  ): Promise<void> {
    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Request More Evidence",
      note
    );
  }

  /**
   * Workflow Action: Officer appends internal case progress notes.
   */
  public static async addInternalNotes(
    reportId: string,
    officerId: string,
    note: string
  ): Promise<void> {
    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Add Internal Notes",
      note
    );
  }

  /**
   * Workflow Action: Officer saves case internal notes with history and autosave.
   */
  public static async saveOfficerNotes(
    reportId: string,
    officerId: string,
    content: string
  ): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    const currentNotes = report.officerNotes || { content: "", updatedAt: new Date().toISOString(), history: [] };
    const history = [...(currentNotes.history || [])];

    if (currentNotes.content && currentNotes.content !== content) {
      history.push({
        content: currentNotes.content,
        updatedAt: currentNotes.updatedAt,
      });
    }

    const updatedNotes = {
      content,
      updatedAt: new Date().toISOString(),
      history,
    };

    const updates = {
      officerNotes: updatedNotes,
      "timestamps.updatedAt": new Date().toISOString(),
    };
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, updates);
    }

    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Notes Updated",
      `Internal notes updated (${content.length} characters)`
    );
  }

  /**
   * Workflow Action: Officer uploads progress media assets.
   */
  public static async uploadProgressMedia(
    reportId: string,
    officerId: string,
    media: MediaAsset[]
  ): Promise<void> {
    if (typeof window === "undefined") {
      const { safeDb, adminDb, admin } = await import("@/services/firebase/admin");
      const useAdmin = await safeDb.checkAdminSupport();
      if (useAdmin && adminDb) {
        await adminDb.collection("reports").doc(reportId).update({
          "evidence.media": admin.firestore.FieldValue.arrayUnion(...media),
          "timestamps.updatedAt": new Date().toISOString(),
        });
      } else {
        const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
        await updateDoc(docRef, {
          "evidence.media": arrayUnion(...media),
          "timestamps.updatedAt": new Date().toISOString(),
        });
      }
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, {
        "evidence.media": arrayUnion(...media),
        "timestamps.updatedAt": new Date().toISOString(),
      });
    }

    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Progress Media Uploaded",
      `${media.length} progress media file(s) attached`
    );
  }

  /**
   * Workflow Action: Save repair evidence, materials used, work completed.
   */
  public static async saveRepairEvidence(
    reportId: string,
    officerId: string,
    repairEvidence: { before: MediaAsset[]; after: MediaAsset[] },
    materialsUsed: string,
    workCompleted: string,
    officerName?: string,
    gps?: { latitude: number; longitude: number } | null
  ): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    const updates = {
      status: "repair_completed",
      "resolution.repairEvidence": repairEvidence,
      "resolution.materialsUsed": materialsUsed,
      "resolution.workCompleted": workCompleted,
      "timestamps.updatedAt": new Date().toISOString(),
    };

    if (typeof window === "undefined") {
      const { safeDb, adminDb } = await import("@/services/firebase/admin");
      const useAdmin = await safeDb.checkAdminSupport();
      if (useAdmin && adminDb) {
        await adminDb.collection("reports").doc(reportId).update(updates);
      } else {
        const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
        await updateDoc(docRef, updates);
      }
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, updates);
    }

    const note = `Repair evidence uploaded.\n${repairEvidence.after.length} photos attached.\nOfficer: ${officerName || "Unknown"}`;
    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Repair Evidence Uploaded",
      note,
      officerName,
      gps
    );
  }

  /**
   * Workflow Action: Save draft updates of a report resolution.
   */
  public static async saveResolutionDraft(
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
  ): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    const updates: Record<string, any> = {
      "timestamps.updatedAt": new Date().toISOString(),
    };

    if (draft.notes !== undefined) updates["resolution.notes"] = draft.notes;
    if (draft.materialsUsed !== undefined) updates["resolution.materialsUsed"] = draft.materialsUsed;
    if (draft.workCompleted !== undefined) updates["resolution.workCompleted"] = draft.workCompleted;
    if (draft.aiSummary !== undefined) updates["resolution.aiSummary"] = draft.aiSummary;
    if (draft.repairEvidence !== undefined) updates["resolution.repairEvidence"] = draft.repairEvidence;
    if (draft.status !== undefined) updates.status = draft.status;

    if (typeof window === "undefined") {
      const { safeDb, adminDb } = await import("@/services/firebase/admin");
      const useAdmin = await safeDb.checkAdminSupport();
      if (useAdmin && adminDb) {
        await adminDb.collection("reports").doc(reportId).update(updates);
      } else {
        const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
        await updateDoc(docRef, updates);
      }
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, updates);
    }
  }

  /**
   * Workflow Action: Officer marks report as resolved with validation constraints.
   */
  public static async resolveReport(
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
  ): Promise<void> {
    if (!notes || notes.trim().length === 0) {
      throw new Error("Resolution Notes must be provided to close this incident.");
    }

    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    if (
      report.status !== "pending_verification" &&
      report.status !== "in_progress" &&
      report.status !== "repair_completed" &&
      report.status !== "awaiting_verification"
    ) {
      throw new Error(`Invalid transition: Cannot resolve report from status "${report.status}".`);
    }

    // Decrement workload cases, and increment completed cases
    await OfficerService.decrementCases(officerId);
    await OfficerService.incrementCompletedCases(officerId);

    const resolvedAtStr = new Date().toISOString();
    const updates = {
      status: "resolved",
      resolution: {
        notes,
        category: category || "completed",
        proofPhotoUrl: repairEvidence.after?.[0]?.url || "",
        resolvedAt: resolvedAtStr,
        resolvedBy: officerId,
        duration,
        repairEvidence,
        aiSummary,
        generatedAt: resolvedAtStr,
        model: "gemini-3.1-flash-lite",
        workCompleted: workCompleted || aiSummary.workCompleted || "",
        materialsUsed: materialsUsed || "",
      },
      "timestamps.updatedAt": resolvedAtStr,
    };
    if (typeof window === "undefined") {
      const { safeDb, adminDb } = await import("@/services/firebase/admin");
      const useAdmin = await safeDb.checkAdminSupport();
      if (useAdmin && adminDb) {
        await adminDb.collection("reports").doc(reportId).update(updates);
      } else {
        const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
        await updateDoc(docRef, updates);
      }
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, updates);
    }

    const timelineNote = `Case resolved.\nOfficer: ${officerName || "Unknown"}\nDepartment: ${report.ai?.assignment?.department || "Unknown"}\nResolved at: ${resolvedAtStr}`;
    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Resolved",
      timelineNote,
      officerName,
      gps
    );
    
    // Award citizen contribution points (only after successful resolution)
    try {
      const { CitizenStatsService } = await import("./stats.service");
      // Original submitter gets +100 XP
      await CitizenStatsService.awardPoints(report.metadata.createdBy, 100, "resolve");

      // Resolving officer gets +100 Solver/Performance Points
      if (officerId) {
        await CitizenStatsService.awardPoints(officerId, 100, "resolve");
      }

      // Award helper points to verifying citizens
      const verificationsList: any[] = [];
      if (typeof window === "undefined") {
        const { adminDb } = await import("@/services/firebase/admin");
        if (adminDb) {
          const snapshot = await adminDb.collection("reports").doc(reportId).collection("reportVerifications").get();
          snapshot.forEach((d) => verificationsList.push(d.data()));
        }
      } else {
        const { getDocs, collection } = await import("firebase/firestore");
        const snapshot = await getDocs(collection(db, "reports", reportId, "reportVerifications"));
        snapshot.forEach((d) => verificationsList.push(d.data()));
      }

      for (const verification of verificationsList) {
        const helperUid = verification.verifiedBy || verification.userId;
        if (helperUid && helperUid !== report.metadata.createdBy) {
          let points = 20; // +20 XP for helper
          if (verification.verificationPhoto || verification.imageUrl) {
            points += 30; // +30 XP if verification photo is attached
          }
          await CitizenStatsService.awardPoints(helperUid, points, "verify");
        }
      }
    } catch (e) {
      console.error("Failed to award points to citizen helpers:", e);
    }

    // Award officer performance metrics
    try {
      const { UserRepository } = await import("@/features/auth/repositories/user.repository");
      const officerProfile = await UserRepository.getUserProfile(officerId);
      if (officerProfile) {
        const currentScore = officerProfile.performanceScore || 0;
        await UserRepository.updateUserProfile(officerId, {
          performanceScore: currentScore + 10,
        });
      }
    } catch (e) {
      console.error("Failed to award performance metrics to officer:", e);
    }

    // Trigger citizen notification
    try {
      await NotificationService.notifyResolved(reportId);
    } catch (e) {
      console.error("Failed to notify citizen of resolution:", e);
    }

    // Trigger admin notification
    try {
      await NotificationService.notifyAdminResolved(reportId, officerName);
    } catch (e) {
      console.error("Failed to notify admin of resolution:", e);
    }
  }

  /**
   * Workflow Action: Close report.
   */
  public static async closeReport(
    reportId: string,
    actorId: string,
    actorRole: "citizen" | "officer" | "admin" | "system" | "ai",
    actorName?: string,
    gps?: { latitude: number; longitude: number } | null
  ): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    if (report.status !== "resolved") {
      throw new Error(`Invalid transition: Cannot close report from status "${report.status}".`);
    }

    const updates = {
      status: "closed",
      "timestamps.updatedAt": new Date().toISOString(),
    };
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, updates);
    }

    await TimelineService.logEvent(
      reportId,
      actorId,
      actorRole,
      "Closed",
      "Case has been verified and closed.",
      actorName,
      gps
    );
  }

  /**
   * Workflow Action: Officer adds a progress update for the citizen to view.
   */
  public static async addProgressUpdate(
    reportId: string,
    officerId: string,
    officerName: string,
    title: string,
    description: string,
    images: MediaAsset[]
  ): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    const progressUpdate = {
      id: doc(collection(db, COLLECTIONS.REPORTS)).id,
      title,
      description,
      images,
      timestamp: new Date().toISOString(),
      officerId,
      officerName,
    };

    if (typeof window === "undefined") {
      const { safeDb, adminDb, admin } = await import("@/services/firebase/admin");
      const useAdmin = await safeDb.checkAdminSupport();
      if (useAdmin && adminDb) {
        await adminDb.collection("reports").doc(reportId).update({
          progressUpdates: admin.firestore.FieldValue.arrayUnion(progressUpdate),
          "timestamps.updatedAt": new Date().toISOString(),
        });
      } else {
        const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
        await updateDoc(docRef, {
          progressUpdates: arrayUnion(progressUpdate),
          "timestamps.updatedAt": new Date().toISOString(),
        });
      }
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, {
        progressUpdates: arrayUnion(progressUpdate),
        "timestamps.updatedAt": new Date().toISOString(),
      });
    }

    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Progress Update Added",
      `Progress Update: "${title}" - ${description}`,
      officerName,
      null,
      images
    );
  }

  /**
   * Workflow Action: Save field investigation findings and photos.
   */
  public static async saveInvestigationDetails(
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
  ): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    const progressUpdate = {
      title: "Field Investigation Findings",
      description: `Observed Severity: ${payload.observedSeverity}. Safety Risk: ${payload.safetyRisk}. Material Requirements: ${payload.materialRequirement}. Findings: ${payload.notes}`,
      media: payload.photos,
      createdAt: new Date().toISOString(),
      createdBy: officerId,
      status: "investigating" as const,
    };

    const oldProgress = {
      id: doc(collection(db, COLLECTIONS.REPORTS)).id,
      title: "Field Investigation Findings",
      description: `Observed Severity: ${payload.observedSeverity}. Safety Risk: ${payload.safetyRisk}. Findings: ${payload.notes}`,
      images: payload.photos,
      timestamp: new Date().toISOString(),
      officerId,
      officerName: officerName || "Officer",
    };

    if (typeof window === "undefined") {
      const { safeDb, adminDb, admin } = await import("@/services/firebase/admin");
      const useAdmin = await safeDb.checkAdminSupport();
      if (useAdmin && adminDb) {
        await adminDb.collection("reports").doc(reportId).update({
          status: "investigating",
          progress: admin.firestore.FieldValue.arrayUnion(progressUpdate),
          progressUpdates: admin.firestore.FieldValue.arrayUnion(oldProgress),
          "timestamps.updatedAt": new Date().toISOString(),
        });
      } else {
        const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
        await updateDoc(docRef, {
          status: "investigating",
          progress: arrayUnion(progressUpdate),
          progressUpdates: arrayUnion(oldProgress),
          "timestamps.updatedAt": new Date().toISOString(),
        });
      }
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, {
        status: "investigating",
        progress: arrayUnion(progressUpdate),
        progressUpdates: arrayUnion(oldProgress),
        "timestamps.updatedAt": new Date().toISOString(),
      });
    }

    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Investigation Notes Updated",
      `Severity: ${payload.observedSeverity}. Risk: ${payload.safetyRisk}. Findings: ${payload.notes}`,
      officerName,
      gps
    );
  }

  /**
   * Workflow Action: Officer transitions status to repair_in_progress.
   */
  public static async startRepairWork(
    reportId: string,
    officerId: string,
    officerName?: string,
    gps?: { latitude: number; longitude: number } | null
  ): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    const updates = {
      status: "repair_in_progress",
      "repair.startedAt": new Date().toISOString(),
      "timestamps.updatedAt": new Date().toISOString(),
    };

    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, updates);
    }

    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Repair Started",
      "Officer started repair work on the incident.",
      officerName,
      gps
    );

    await NotificationService.notifyCitizenStatusChanged(
      report.metadata.createdBy,
      reportId,
      "repair_in_progress"
    );
  }

  /**
   * Workflow Action: Officer saves progress updates (images, videos, description) during repair.
   */
  public static async saveRepairProgress(
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
  ): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    const progressUpdate = {
      title: "Repair Progress Update",
      description: `Work Performed: ${payload.workPerformed}. Materials: ${payload.materialsUsed}. Labour: ${payload.labourCount}. Cost: ${payload.cost || 0}`,
      media: [...payload.photos, ...payload.videos],
      createdAt: new Date().toISOString(),
      createdBy: officerId,
      status: "repair_in_progress" as const,
    };

    const oldProgress = {
      id: doc(collection(db, COLLECTIONS.REPORTS)).id,
      title: "Repair Progress Update",
      description: payload.workPerformed,
      images: payload.photos,
      timestamp: new Date().toISOString(),
      officerId,
      officerName: officerName || "Officer",
    };

    if (typeof window === "undefined") {
      const { safeDb, adminDb, admin } = await import("@/services/firebase/admin");
      const useAdmin = await safeDb.checkAdminSupport();
      if (useAdmin && adminDb) {
        await adminDb.collection("reports").doc(reportId).update({
          progress: admin.firestore.FieldValue.arrayUnion(progressUpdate),
          progressUpdates: admin.firestore.FieldValue.arrayUnion(oldProgress),
          "timestamps.updatedAt": new Date().toISOString(),
        });
      } else {
        const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
        await updateDoc(docRef, {
          progress: arrayUnion(progressUpdate),
          progressUpdates: arrayUnion(oldProgress),
          "timestamps.updatedAt": new Date().toISOString(),
        });
      }
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, {
        progress: arrayUnion(progressUpdate),
        progressUpdates: arrayUnion(oldProgress),
        "timestamps.updatedAt": new Date().toISOString(),
      });
    }

    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Repair Progress Updated",
      payload.workPerformed,
      officerName,
      gps,
      payload.photos
    );
  }

  /**
   * Workflow Action: Officer completes repair, transitions to awaiting_verification.
   */
  public static async completeRepair(
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
  ): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    const startedAt = report.repair?.startedAt || new Date().toISOString();
    const completedAt = new Date().toISOString();
    const duration = Math.max(1, Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000));

    const updates = {
      status: "awaiting_verification",
      "repair.materials": payload.materials,
      "repair.startedAt": startedAt,
      "repair.completedAt": completedAt,
      "repair.duration": duration,
      "repair.labourCount": payload.labourCount,
      "repair.cost": payload.cost || 0,
      "repair.notes": payload.notes,
      "repair.checklist": payload.checklist,
      "resolution.repairEvidence.before": report.evidence?.media || [],
      "resolution.repairEvidence.after": payload.afterMedia,
      "resolution.proofPhotoUrl": payload.afterMedia[0]?.url || "",
      "resolution.materialsUsed": payload.materials,
      "resolution.workCompleted": payload.notes,
      "timestamps.updatedAt": new Date().toISOString(),
    };

    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, updates);
    }

    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Repair Completed",
      "Repair completed. Awaiting AI verification.",
      officerName,
      gps
    );

    await NotificationService.notifyCitizenStatusChanged(
      report.metadata.createdBy,
      reportId,
      "awaiting_verification"
    );
  }

  /**
   * Workflow Action: Runs Gemini AI to verify repair and generate summaries.
   */
  public static async runAiVerification(
    reportId: string,
    officerId: string,
    repairNotes: string,
    beforeMedia: MediaAsset[],
    afterMedia: MediaAsset[],
    officerName?: string
  ): Promise<{
    technicalSummary: string;
    citizenSummary: string;
    adminSummary: string;
    verifiedByAI: boolean;
    confidence: number;
    repairCompleteness: number;
    matchesReportedIssue: boolean;
  }> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    const GeminiService = (await import("@/ai/services/gemini.service")).default;

    const systemInstruction = `You are a professional municipal engineering verification assistant.
You will analyze the original civic report, before images, after images, and repair notes.
Analyze if the repair successfully resolved the issue.
You must return your response in a valid JSON object matching the following structure:
{
  "matchesReportedIssue": boolean,
  "appearsFixed": boolean,
  "confidence": number,
  "repairCompleteness": number,
  "technicalSummary": "string",
  "citizenSummary": "string",
  "adminSummary": "string"
}`;

    const prompt = `Original Report Category: ${report.metadata.category}
Original Report Title: ${report.metadata.title}
Original Report Description: ${report.metadata.description}

Repair Notes: ${repairNotes}

Analyze the images to compare the "before" and "after" state of the repair and answer the verification details.`;

    const mediaList = [
      ...beforeMedia.map(m => ({ url: m.url, mimeType: m.mimeType || "image/jpeg" })),
      ...afterMedia.map(m => ({ url: m.url, mimeType: m.mimeType || "image/jpeg" }))
    ];

    const result = await GeminiService.generateJson<{
      matchesReportedIssue: boolean;
      appearsFixed: boolean;
      confidence: number;
      repairCompleteness: number;
      technicalSummary: string;
      citizenSummary: string;
      adminSummary: string;
    }>(
      systemInstruction,
      prompt,
      mediaList,
      ["matchesReportedIssue", "appearsFixed", "confidence", "repairCompleteness", "technicalSummary", "citizenSummary", "adminSummary"]
    );

    // Save AI verification details to resolution
    const updates = {
      "resolution.technicalSummary": result.technicalSummary,
      "resolution.citizenSummary": result.citizenSummary,
      "resolution.adminSummary": result.adminSummary,
      "resolution.verifiedByAI": result.appearsFixed,
      "resolution.confidence": result.confidence,
      "resolution.beforeMedia": beforeMedia,
      "resolution.afterMedia": afterMedia,
      "timestamps.updatedAt": new Date().toISOString(),
    };

    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
    } else {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, updates);
    }

    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "AI Verification Run",
      `AI verified repair: Appears Fixed: ${result.appearsFixed}. Confidence: ${result.confidence}`,
      officerName
    );

    return {
      technicalSummary: result.technicalSummary,
      citizenSummary: result.citizenSummary,
      adminSummary: result.adminSummary,
      verifiedByAI: result.appearsFixed,
      confidence: result.confidence,
      repairCompleteness: result.repairCompleteness,
      matchesReportedIssue: result.matchesReportedIssue,
    };
  }

}
export default AssignmentService;

