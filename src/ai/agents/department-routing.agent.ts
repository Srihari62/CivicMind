/**
 * @file src/ai/agents/department-routing.agent.ts
 * @description Agent responsible for routing reports to correct municipal departments.
 */

import { CivicReport } from "@/types";
import { doc, updateDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { AssignmentService } from "@/features/reports/services/assignment.service";
import { AppError } from "@/utils/error";

export class DepartmentRoutingAgent {
  public readonly name = "Department Routing Agent";

  /**
   * Runs routing for the report and updates Firestore.
   */
  public async execute(reportId: string, report: CivicReport): Promise<string> {
    console.info(`[${this.name}] Starting routing for report ${reportId}`);
    try {
      const category = report.metadata?.category || "other";
      const department = AssignmentService.mapCategoryToDepartment(category);

      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, {
        "ai.verification.assignedDepartment": department,
        "ai.assignment.department": department,
      });

      console.info(`[${this.name}] Routed to: ${department}`);
      return department;
    } catch (error) {
      throw new AppError({
        message: `Routing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        code: "ROUTING_FAILED",
        statusCode: 500,
        context: { reportId, error },
      });
    }
  }
}

export default DepartmentRoutingAgent;
