/**
 * @file src/ai/orchestrator/verification-orchestrator.ts
 * @description Background verification orchestration engine for report validation.
 * Runs agents sequentially in memory, handles retries, and performs a single Firestore update.
 */

import 'server-only';

import { safeDb } from '@/services/firebase/admin';
import { VerificationAnalysisAgent } from '../agents/verification-analysis.agent';
import { DuplicateDetectionAgent } from '../agents/duplicate-detection.agent';
import { DepartmentRoutingAgent } from '../agents/department-routing.agent';
import { PriorityEngineAgent } from '../agents/priority-engine.agent';
import { OfficerAssignmentAgent } from '../agents/officer-assignment.agent';
import { NotificationService } from '@/features/reports/services/notification.service';

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

    try {
      // 1. Fetch Report details using safeDb helper
      const report = await safeDb.getReport(reportId);
      if (!report) {
        console.error(`[VerificationOrchestrator] Report "${reportId}" not found. Terminating.`);
        return;
      }

      // 2. Run VerificationAnalysisAgent (Gemini call)
      const verificationAgent = new VerificationAnalysisAgent();
      const verificationResult = await runWithRetry('Verification Analysis Agent', () =>
        verificationAgent.analyze(report)
      );

      // 3. Run DuplicateDetectionAgent (Deterministic, TypeScript)
      const duplicateAgent = new DuplicateDetectionAgent();
      const duplicateResult = await duplicateAgent.execute(reportId, report);

      // Check if duplicate is found
      const isDuplicate =
        duplicateResult.duplicateProbability >= 0.85 &&
        duplicateResult.duplicateReportIds.length > 0;

      let department: string | null = null;
      let priority: string = 'unknown';
      let trustScore = 0.5;
      let assignmentResult = {
        officerId: null as string | null,
        officerName: 'N/A',
        status: 'rejected',
      };
      let verificationStatus: 'verified' | 'rejected' | 'requires_review' = 'verified';

      if (isDuplicate) {
        verificationStatus = 'rejected';
        // Increment reportedCount on original report
        const originalReportId = duplicateResult.duplicateReportIds[0];
        const originalReport = await safeDb.getReport(originalReportId);
        if (originalReport) {
          const currentCount = originalReport.reportedCount || 1;
          await safeDb.updateReport(originalReportId, {
            reportedCount: currentCount + 1,
          });
        }
      } else {
        // 4. Run DepartmentRoutingAgent (Deterministic, TypeScript)
        const routingAgent = new DepartmentRoutingAgent();
        department = routingAgent.execute(report);

        // 5. Run PriorityEngineAgent (Deterministic, TypeScript)
        const priorityAgent = new PriorityEngineAgent();
        const prioRes = priorityAgent.execute(
          report,
          verificationResult,
          duplicateResult.duplicateProbability
        );
        priority = prioRes.priority;
        trustScore = prioRes.trustScore;

        // 6. Run OfficerAssignmentAgent (Deterministic, TypeScript)
        const assignmentAgent = new OfficerAssignmentAgent();
        const assignRes = await assignmentAgent.execute(report, department);
        assignmentResult = {
          officerId: assignRes.officerId,
          officerName: assignRes.officerName,
          status: assignRes.status,
        };

        // 7. Compute final verification status
        const fakeProb = verificationResult.fakeMediaProbability;
        const confidence = verificationResult.confidence;
        if (fakeProb >= 0.7) {
          verificationStatus = 'rejected';
        } else if (fakeProb >= 0.4 || confidence < 0.6) {
          verificationStatus = 'requires_review';
        }

        // 8. Update Officer cases count if assigned
        if (assignmentResult.officerId) {
          await safeDb.incrementOfficerCases(assignmentResult.officerId);
        }
      }

      // 9. Prepare timeline events
      const nowStr = new Date().toISOString();
      const newEvents = [
        {
          timestamp: nowStr,
          actorId: 'system',
          actorRole: 'system' as const,
          action: 'Verification Started',
        },
        {
          timestamp: nowStr,
          actorId: 'ai',
          actorRole: 'ai' as const,
          action: 'Verification Completed',
          note: verificationResult.summary,
        },
        {
          timestamp: nowStr,
          actorId: 'system',
          actorRole: 'system' as const,
          action: 'Duplicate Check Completed',
          note: isDuplicate
            ? `Duplicate of report #${duplicateResult.duplicateReportIds[0]}. Flagged as Repost.`
            : duplicateResult.reasoning,
        },
      ];

      if (!isDuplicate) {
        newEvents.push(
          {
            timestamp: nowStr,
            actorId: 'system',
            actorRole: 'system' as const,
            action: 'Department Routed',
            note: `Routed to: ${department}`,
          },
          {
            timestamp: nowStr,
            actorId: 'system',
            actorRole: 'system' as const,
            action: 'Priority Calculated',
            note: `Priority: ${priority}, Trust Score: ${trustScore.toFixed(2)}`,
          },
          ...(assignmentResult.officerId
            ? [
                {
                  timestamp: nowStr,
                  actorId: 'system',
                  actorRole: 'system' as const,
                  action: `Automatically Assigned to ${assignmentResult.officerName} (${department})`,
                },
              ]
            : [
                {
                  timestamp: nowStr,
                  actorId: 'system',
                  actorRole: 'system' as const,
                  action: 'No available officer found.',
                  note: `Department: ${department}`,
                },
              ]),
          {
            timestamp: nowStr,
            actorId: 'system',
            actorRole: 'system' as const,
            action: 'Completed',
          }
        );
      } else {
        newEvents.push(
          {
            timestamp: nowStr,
            actorId: 'system',
            actorRole: 'system' as const,
            action: 'Marked as Repost',
            note: `Linked to existing report ID: ${duplicateResult.duplicateReportIds[0]}`,
          },
          {
            timestamp: nowStr,
            actorId: 'system',
            actorRole: 'system' as const,
            action: 'Completed',
          }
        );
      }

      // 10. Persist all updates in a single Firestore Update operation
      await safeDb.updateReport(
        reportId,
        {
          status: isDuplicate ? 'rejected' : assignmentResult.status,
          'ai.verification': {
            status: verificationStatus,
            fakeMediaProbability: verificationResult.fakeMediaProbability,
            fakeMediaConfidence: verificationResult.fakeMediaConfidence,
            fakeMediaReason: verificationResult.fakeMediaReason,
            duplicateProbability: duplicateResult.duplicateProbability,
            duplicateReportIds: duplicateResult.duplicateReportIds,
            duplicateReason: isDuplicate
              ? `Duplicate of report #${duplicateResult.duplicateReportIds[0]}`
              : duplicateResult.reasoning,
            assignedDepartment: department,
            priority: isDuplicate ? 'low' : priority,
            trustScore: isDuplicate ? 0.0 : trustScore,
            verificationModel: verificationAgent.modelName,
            verificationVersion: '1.0.0',
            summary: isDuplicate
              ? `This report is a duplicate of #${duplicateResult.duplicateReportIds[0]}. It has been marked as a repost and linked.`
              : verificationResult.summary,
            analyzedAt: nowStr,
            failureReason: null,
          },
          'ai.assignment': {
            officerId: isDuplicate ? null : assignmentResult.officerId,
            department: isDuplicate ? null : department,
            assignedAt: isDuplicate ? null : nowStr,
            assignmentMethod: isDuplicate ? null : 'automatic',
          },
          'timestamps.updatedAt': nowStr,
        },
        newEvents
      );

      // 11. Trigger notifications
      if (!isDuplicate) {
        if (assignmentResult.officerId) {
          await NotificationService.notifyOfficerAssigned(assignmentResult.officerId, reportId);
        } else {
          await NotificationService.notifyAdminAssignmentFailed(reportId, department || 'N/A');
        }
      }

      console.info(
        `[VerificationOrchestrator] Pipeline Completed Successfully for report "${reportId}"`
      );
    } catch (err) {
      console.error(`[VerificationOrchestrator] Pipeline failed:`, err);
      await this.handlePipelineFailure(reportId, err);
    }
  }

  /**
   * Helper to handle pipeline errors and record failure.
   */
  private static async handlePipelineFailure(reportId: string, error: unknown): Promise<void> {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    try {
      const nowStr = new Date().toISOString();
      const failEvent = {
        timestamp: nowStr,
        actorId: 'system',
        actorRole: 'system' as const,
        action: 'AI Verification Pipeline Failed',
        note: `Error: ${errorMsg}`,
      };

      await safeDb.updateReport(
        reportId,
        {
          'ai.verification.status': 'failed',
          'ai.verification.analyzedAt': nowStr,
          'ai.verification.failureReason': errorMsg,
          'timestamps.updatedAt': nowStr,
        },
        [failEvent]
      );
    } catch (dbErr) {
      console.error(`[VerificationOrchestrator] Failed to record pipeline failure:`, dbErr);
    }
  }
}

export default VerificationOrchestrator;
