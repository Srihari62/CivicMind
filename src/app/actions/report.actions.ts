/**
 * @file src/app/actions/report.actions.ts
 * @description Next.js Server Actions for report database operations.
 */

"use server";

import { ReportService } from "@/features/reports/services/report.service";
import { CivicReport } from "@/types";
import { authorizeAction } from "./auth-guard";
import { UserRepository } from "@/features/auth/repositories/user.repository";
import { ReportRepository } from "@/features/reports/repositories/report.repository";

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
    const userProfile = await UserRepository.getUserProfile(callerUid);
    if (!userProfile) {
      throw new Error("Unauthorized: User profile not found.");
    }

    let reports: CivicReport[] = [];
    if (userProfile.role === "admin") {
      const state = userProfile.state;
      if (!state) {
        throw new Error("Admin jurisdiction state is not set.");
      }
      reports = await ReportRepository.getReportsByState(state);
    } else if (userProfile.role === "officer") {
      const city = userProfile.city;
      if (!city) {
        throw new Error("Officer jurisdiction city is not set.");
      }
      reports = await ReportRepository.getReportsByCity(city);
    } else {
      reports = await ReportService.getAllReports();
    }

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
