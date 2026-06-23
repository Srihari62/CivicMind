/**
 * @file src/features/reports/services/report.service.ts
 * @description Report service layer.
 * Acts as the feature service controller. Invokes ReportCreationWorkflow for new submissions
 * and delegates queries to ReportRepository.
 */

import { ReportCreationWorkflow } from "../workflows/report-creation.workflow";
import { ReportRepository } from "../repositories/report.repository";
import { CivicReport, ReportLocation } from "@/types";

export class ReportService {
  /**
   * Orchestrates the complete issue report creation workflow by invoking ReportCreationWorkflow.
   * @param reportData - Nested report details (metadata and location)
   * @param files - Associated files to upload
   * @param userId - Authenticated user ID creating the report
   * @returns The generated report ID
   */
  public static async createReport(
    reportData: {
      metadata: {
        title: string;
        description: string;
        category: string;
        createdBy: string;
      };
      location: ReportLocation;
    },
    files: File[],
    userId: string
  ): Promise<string> {
    return await ReportCreationWorkflow.execute(reportData, files, userId);
  }

  /**
   * Retrieves a report's details by ID.
   * @param id - Report ID
   * @returns The report document or null if not found
   */
  public static async getReport(id: string): Promise<CivicReport | null> {
    return await ReportRepository.getReport(id);
  }
}
export default ReportService;
