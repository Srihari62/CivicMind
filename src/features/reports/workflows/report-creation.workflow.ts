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
   * @param filesOrMedia - Files uploaded as evidence or pre-uploaded MediaAsset metadata
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
        editedAfterAI?: boolean;
      };
      location: ReportLocation;
      severity?: string;
      aiAssistant?: {
        title: string;
        description: string;
        category: string;
        severity: string;
        confidence: number;
        summary: string;
        detectedObjects?: string[];
        model: string;
        promptVersion: string;
        analyzedAt: string;
        initialPriority: string;
      } | null;
    },
    filesOrMedia: File[] | MediaAsset[],
    userId: string
  ): Promise<string> {
    // 1. Generate Report ID
    const reportId = ReportRepository.generateReportId();

    try {
      // 2. Resolve media assets (upload if raw Files, reuse if pre-uploaded assets)
      let mediaAssets: MediaAsset[] = [];
      if (filesOrMedia.length > 0) {
        const first = filesOrMedia[0];
        if (typeof window !== "undefined" ? first instanceof File : (first.constructor && first.constructor.name === "File") || first instanceof File) {
          const storageFolderPath = `reports/${reportId}/evidence`;
          mediaAssets = await MediaService.uploadFiles(filesOrMedia as File[], storageFolderPath, userId);
        } else {
          mediaAssets = filesOrMedia as MediaAsset[];
        }
      }

      // 3. Create Draft Report in database
      await ReportRepository.createDraftReport(reportId, reportData);

      // 4. Submit Report (link media and update status to submitted)
      await ReportRepository.submitReport(reportId, mediaAssets);

      // 5. Verification Orchestrator is triggered via Server Action asynchronously after submission

      // 6. Return Report ID
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
