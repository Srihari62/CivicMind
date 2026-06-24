/**
 * @file src/ai/orchestrator/verification-orchestrator.ts
 * @description Background verification orchestration engine for report validation.
 * Runs agents sequentially, handles retries, logs failures, and updates Firestore incrementally.
 */

import "server-only";

import { ReportRepository } from "@/features/reports/repositories/report.repository";
import { EvidenceVerificationAgent } from "../agents/evidence-verification.agent";
import { FakeMediaAgent } from "../agents/fake-media.agent";
import { DuplicateDetectionAgent } from "../agents/duplicate-detection.agent";
import { DepartmentRoutingAgent } from "../agents/department-routing.agent";
import { PriorityEngineAgent } from "../agents/priority-engine.agent";
import { OfficerAssignmentAgent } from "../agents/officer-assignment.agent";
import { TimelineService } from "@/features/reports/services/timeline.service";

/**
 * Retries a promise-returning function with exponential backoff.
 */
async function runWithRetry<T>(
  taskName: string,
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      console.warn(`[VerificationOrchestrator] ${taskName} attempt ${attempt} failed:`, error);
      if (attempt >= retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
}

export class VerificationOrchestrator {
  /**
   * Orchestrates the verification pipeline for a report in the background.
   * @param reportId - ID of the report to verify
   */
  public static async verifyReport(reportId: string): Promise<void> {
    console.info(`[VerificationOrchestrator] Started pipeline for report "${reportId}"`);

    // 1. Fetch Report details
    let report = await ReportRepository.getReport(reportId);
    if (!report) {
      console.error(`[VerificationOrchestrator] Report "${reportId}" not found. Terminating.`);
      return;
    }

    // Step 1: Evidence Verification Agent
    try {
      const agent = new EvidenceVerificationAgent();
      await runWithRetry("Evidence Verification Agent", () => agent.execute(reportId, report!));
    } catch (err) {
      console.error(`[VerificationOrchestrator] Evidence Verification Agent failed:`, err);
      await this.handlePipelineFailure(reportId, "Evidence Verification Agent", err);
      return;
    }

    // Refresh report state
    report = await ReportRepository.getReport(reportId);
    if (!report) return;

    // Step 2: Fake Media Detection Agent
    try {
      const agent = new FakeMediaAgent();
      await runWithRetry("Fake Media Detection Agent", () => agent.execute(reportId, report!));
    } catch (err) {
      console.error(`[VerificationOrchestrator] Fake Media Detection Agent failed:`, err);
      await this.handlePipelineFailure(reportId, "Fake Media Detection Agent", err);
      return;
    }

    // Refresh report state
    report = await ReportRepository.getReport(reportId);
    if (!report) return;

    // Step 3: Duplicate Detection Agent
    try {
      const agent = new DuplicateDetectionAgent();
      await runWithRetry("Duplicate Detection Agent", () => agent.execute(reportId, report!));
    } catch (err) {
      console.error(`[VerificationOrchestrator] Duplicate Detection Agent failed:`, err);
      await this.handlePipelineFailure(reportId, "Duplicate Detection Agent", err);
      return;
    }

    // Refresh report state
    report = await ReportRepository.getReport(reportId);
    if (!report) return;

    // Step 4: Department Routing Agent
    try {
      const agent = new DepartmentRoutingAgent();
      await runWithRetry("Department Routing Agent", () => agent.execute(reportId, report!));
    } catch (err) {
      console.error(`[VerificationOrchestrator] Department Routing Agent failed:`, err);
      await this.handlePipelineFailure(reportId, "Department Routing Agent", err);
      return;
    }

    // Refresh report state
    report = await ReportRepository.getReport(reportId);
    if (!report) return;

    // Step 5: Priority Engine Agent
    try {
      const agent = new PriorityEngineAgent();
      await runWithRetry("Priority Engine Agent", () => agent.execute(reportId, report!));
    } catch (err) {
      console.error(`[VerificationOrchestrator] Priority Engine Agent failed:`, err);
      await this.handlePipelineFailure(reportId, "Priority Engine Agent", err);
      return;
    }

    // Refresh report state
    report = await ReportRepository.getReport(reportId);
    if (!report) return;

    // Step 6: Officer Assignment Agent
    try {
      const agent = new OfficerAssignmentAgent();
      await runWithRetry("Officer Assignment Agent", () => agent.execute(reportId, report!));
    } catch (err) {
      console.error(`[VerificationOrchestrator] Officer Assignment Agent failed:`, err);
      await this.handlePipelineFailure(reportId, "Officer Assignment Agent", err);
      return;
    }

    console.info(`[VerificationOrchestrator] Pipeline Completed Successfully for report "${reportId}"`);
  }

  /**
   * Helper to handle pipeline agent errors and record failure.
   */
  private static async handlePipelineFailure(reportId: string, agentName: string, error: unknown): Promise<void> {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    try {
      await ReportRepository.updateVerification(reportId, {
        status: "failed",
        analyzedAt: new Date().toISOString(),
        failureReason: errorMsg,
      });
      await TimelineService.logEvent(
        reportId,
        "system",
        "system",
        `AI Verification Pipeline Failed during: ${agentName}`,
        `Error: ${errorMsg}`
      );
    } catch (dbErr) {
      console.error(`[VerificationOrchestrator] Failed to record pipeline failure:`, dbErr);
    }
  }
}

export default VerificationOrchestrator;
