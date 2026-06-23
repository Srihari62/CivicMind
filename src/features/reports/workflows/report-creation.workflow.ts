/**
 * @file src/features/reports/workflows/report-creation.workflow.ts
 * @description Report creation workflow orchestrator.
 * Encapsulates the multi-step transaction process to create drafts, upload media,
 * and finalize submissions without direct Firebase SDK dependencies.
 */

import { ReportRepository } from "../repositories/report.repository";
import { MediaService } from "@/features/media/services/media.service";
import { ReportLocation, MediaAsset } from "@/types";
import { AppError } from "@/utils/error";

export class ReportCreationWorkflow {
  /**
   * Executes the transaction flow to create and submit a report.
   * Flow: Generate Report ID -> Create Draft Report -> Upload Evidence -> Collect Metadata -> Submit Report -> Return ID
   * @param reportData - Nested report details (metadata and location)
   * @param files - Files uploaded as evidence
   * @param userId - Active user ID
   * @returns Generated report ID
   */
  public static async execute(
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
    // 1. Generate Report ID
    const reportId = ReportRepository.generateReportId();

    try {
      // 2. Upload Evidence first (no database write yet)
      let mediaAssets: MediaAsset[] = [];
      if (files.length > 0) {
        const storageFolderPath = `reports/${reportId}/evidence`;
        mediaAssets = await MediaService.uploadFiles(files, storageFolderPath, userId);
      }

      // 3. Create Draft Report in database
      await ReportRepository.createDraftReport(reportId, reportData);

      // 4. Submit Report (link media and update status to submitted)
      await ReportRepository.submitReport(reportId, mediaAssets);

      // 5. Return Report ID
      return reportId;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError({
        message: error instanceof Error ? error.message : "Failed to execute report creation workflow.",
        code: "WORKFLOW_EXECUTION_FAILED",
        statusCode: 500,
      });
    }
  }
}
export default ReportCreationWorkflow;
