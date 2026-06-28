/**
 * @file src/ai/agents/officer-assignment.agent.ts
 * @description Deterministic Officer Assignment Agent using the Firebase Admin SDK.
 */

import { CivicReport } from "@/types";
import { safeDb } from "@/services/firebase/admin";
import { AppError } from "@/utils/error";

export class OfficerAssignmentAgent {
  public readonly name = "Officer Assignment Agent";

  /**
   * Assigns an officer deterministically and returns assignment info.
   */
  public async execute(
    report: CivicReport,
    department: string
  ): Promise<{
    officerId: string | null;
    officerName: string;
    status: string;
  }> {
    console.info(`[${this.name}] Executing assignment for department "${department}"`);
    try {
      // 1. Fetch available officers in department
      const availableOfficers = await safeDb.getAvailableOfficers(department);

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
      }

      return {
        officerId: assignedOfficerId,
        officerName: assignedOfficerName,
        status,
      };
    } catch (error) {
      throw new AppError({
        message: `Officer assignment query failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        code: "ASSIGNMENT_QUERY_FAILED",
        statusCode: 500,
        context: { reportId: report.id, error },
      });
    }
  }
}

export default OfficerAssignmentAgent;
