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
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
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

    // 1. Fetch available officers in department
    const availableOfficers = await OfficerService.getAvailableOfficers(department);

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
  public static async acceptAssignment(reportId: string, officerId: string): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    // Transition status to investigating
    const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
    await updateDoc(docRef, {
      status: "investigating",
      "timestamps.updatedAt": new Date().toISOString(),
    });

    await TimelineService.logEvent(reportId, officerId, "officer", "Officer Accepted");
    await NotificationService.notifyCitizenStatusChanged(
      report.metadata.createdBy,
      reportId,
      "investigating"
    );
  }

  /**
   * Workflow Action: Officer rejects assignment.
   */
  public static async rejectAssignment(
    reportId: string,
    officerId: string,
    reason: string
  ): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    // Decrement workload
    await OfficerService.decrementCases(officerId);

    // Reset assignment and status to waiting_assignment
    await ReportRepository.assignOfficer(
      reportId,
      null,
      report.ai?.assignment?.department || "Roads",
      "automatic",
      "waiting_assignment"
    );

    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Reject Assignment",
      reason
    );
  }

  /**
   * Workflow Action: Officer starts active investigation.
   */
  public static async startInvestigation(reportId: string, officerId: string): Promise<void> {
    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    // Transition status to in_progress
    const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
    await updateDoc(docRef, {
      status: "in_progress",
      "timestamps.updatedAt": new Date().toISOString(),
    });

    await TimelineService.logEvent(reportId, officerId, "officer", "Investigation Started");
    await NotificationService.notifyCitizenStatusChanged(
      report.metadata.createdBy,
      reportId,
      "in_progress"
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
   * Workflow Action: Officer uploads progress media assets.
   */
  public static async uploadProgressMedia(
    reportId: string,
    officerId: string,
    media: MediaAsset[]
  ): Promise<void> {
    const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
    await updateDoc(docRef, {
      "evidence.media": arrayUnion(...media),
      "timestamps.updatedAt": new Date().toISOString(),
    });

    await TimelineService.logEvent(
      reportId,
      officerId,
      "officer",
      "Progress Uploaded",
      `${media.length} progress media file(s) attached`
    );
  }

  /**
   * Workflow Action: Officer marks report as resolved with validation constraints.
   */
  public static async resolveReport(
    reportId: string,
    officerId: string,
    notes: string,
    media: MediaAsset[],
    category?: string,
    proofPhotoUrl?: string
  ): Promise<void> {
    if (!notes || notes.trim().length === 0) {
      throw new Error("Resolution Notes must be provided to close this incident.");
    }

    const report = await ReportRepository.getReport(reportId);
    if (!report) throw new Error("Report not found");

    // Decrement workload
    await OfficerService.decrementCases(officerId);

    // Save resolution payload
    await ReportRepository.updateResolution(reportId, {
      resolvedBy: officerId,
      resolutionNotes: notes,
      resolutionMedia: media || [],
      category,
      proofPhotoUrl,
    });

    await TimelineService.logEvent(reportId, officerId, "officer", "Resolved", notes);
    await NotificationService.notifyCitizenStatusChanged(
      report.metadata.createdBy,
      reportId,
      "resolved"
    );
  }
}
export default AssignmentService;
