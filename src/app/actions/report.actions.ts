/**
 * @file src/app/actions/report.actions.ts
 * @description Next.js Server Actions for report database operations.
 */

"use server";

import { ReportService } from "@/features/reports/services/report.service";
import { CivicReport } from "@/types";
import { authorizeAction } from "./auth-guard";

/**
 * Retrieves all reports from the Firestore database.
 */
export async function fetchAllReports(callerUid: string): Promise<{
  success: boolean;
  data?: CivicReport[];
  error?: string;
}> {
  try {
    await authorizeAction(callerUid, ["admin", "officer"]);
    const reports = await ReportService.getAllReports();
    return {
      success: true,
      data: reports,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to retrieve reports.",
    };
  }
}
