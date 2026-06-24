/**
 * @file src/ai/agents/officer-assignment.agent.ts
 * @description Background agent that routes and assigns reports to available officers.
 */

import { CivicReport } from "@/types";
import { doc, updateDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { OfficerService } from "@/features/reports/services/officer.service";
import { TimelineService } from "@/features/reports/services/timeline.service";
import { NotificationService } from "@/features/reports/services/notification.service";
import { AppError } from "@/utils/error";

export class OfficerAssignmentAgent {
  public readonly name = "Officer Assignment Agent";

  /**
   * Assigns an officer to the report and computes final verification status.
   */
  public async execute(reportId: string, report: CivicReport): Promise<string | null> {
    console.info(`[${this.name}] Starting officer assignment for report ${reportId}`);
    try {
      // 1. Determine department (already computed and saved by DepartmentRoutingAgent)
      const department = report.ai?.assignment?.department || "Roads";

      // 2. Fetch available officers in department
      const availableOfficers = await OfficerService.getAvailableOfficers(department);
      const now = new Date().toISOString();

      let assignedOfficerId: string | null = null;
      let assignedOfficerName = "";
      let status = "waiting_assignment";

      if (availableOfficers.length > 0) {
        // Filter / Prefer officers in the same zone
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

        // Choose officer with the lowest activeCases workload
        const selectedOfficer = candidates.reduce((prev, curr) => {
          const prevCases = prev.activeCases || 0;
          const currCases = curr.activeCases || 0;
          return prevCases <= currCases ? prev : curr;
        });

        assignedOfficerId = selectedOfficer.uid;
        assignedOfficerName = selectedOfficer.displayName || selectedOfficer.email;
        status = "submitted";

        // Increment officer workload
        await OfficerService.incrementCases(assignedOfficerId);
      }

      // 3. Compute final verification status
      const fakeProb = report.ai?.verification?.fakeMediaProbability ?? 0.0;
      const dupProb = report.ai?.verification?.duplicateProbability ?? 0.0;
      const confidence = report.ai?.verification?.fakeMediaConfidence ?? 1.0;

      let verificationStatus: "verified" | "rejected" | "requires_review" = "verified";

      if (fakeProb >= 0.7 || dupProb >= 0.85) {
        verificationStatus = "rejected";
      } else if (fakeProb >= 0.4 || dupProb >= 0.5 || confidence < 0.6) {
        verificationStatus = "requires_review";
      }

      // 4. Update Firestore incremental fields
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, {
        "status": status,
        "ai.verification.status": verificationStatus,
        "timestamps.updatedAt": now,
        "ai.assignment": {
          officerId: assignedOfficerId,
          department: department,
          assignedAt: now,
          assignmentMethod: "automatic",
        },
      });

      // 5. Post-assignment hooks (timeline log, notifications)
      if (assignedOfficerId) {
        await TimelineService.logEvent(
          reportId,
          "system",
          "system",
          `Automatically Assigned to ${assignedOfficerName} (${department})`
        );
        await NotificationService.notifyOfficerAssigned(assignedOfficerId, reportId);
      } else {
        await TimelineService.logEvent(
          reportId,
          "system",
          "system",
          "Auto assignment failed. No available officers in department.",
          `Department: ${department}`
        );
        await NotificationService.notifyAdminAssignmentFailed(reportId, department);
      }

      console.info(`[${this.name}] Completed. Officer: ${assignedOfficerId}, Status: ${status}, Verification: ${verificationStatus}`);
      return assignedOfficerId;
    } catch (error) {
      throw new AppError({
        message: `Officer assignment failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        code: "OFFICER_ASSIGNMENT_FAILED",
        statusCode: 500,
        context: { reportId, error },
      });
    }
  }
}

export default OfficerAssignmentAgent;
