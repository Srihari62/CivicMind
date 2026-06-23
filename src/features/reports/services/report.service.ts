/**
 * @file src/features/reports/services/report.service.ts
 * @description Report service layer.
 * Acts as the feature service controller. Invokes ReportCreationWorkflow for new submissions
 * and delegates queries to ReportRepository.
 */

import { ReportCreationWorkflow } from "../workflows/report-creation.workflow";
import { ReportRepository } from "../repositories/report.repository";
import { CivicReport, ReportLocation, MediaAsset } from "@/types";

export class ReportService {
  /**
   * Orchestrates the complete issue report creation workflow by invoking ReportCreationWorkflow.
   * @param reportData - Nested report details (metadata and location)
   * @param filesOrMedia - Associated files to upload or pre-uploaded MediaAsset metadata
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
        editedAfterAI?: boolean;
      };
      location: ReportLocation;
      severity?: string;
      aiAssistant?: {
        generatedTitle: string;
        generatedDescription: string;
        generatedCategory: string;
        generatedCategoryLabel?: string | null;
        generatedSeverity: string;
        confidence: number;
        summary: string;
        detectedObjects?: string[];
        analyzedAt: string;
        model: string;
        promptVersion: string;
        initialPriority: string;
      } | null;
    },
    filesOrMedia: File[] | MediaAsset[],
    userId: string
  ): Promise<string> {
    return await ReportCreationWorkflow.execute(reportData, filesOrMedia, userId);
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
