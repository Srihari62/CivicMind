/**
 * @file src/app/actions/ai.actions.ts
 * @description Next.js Server Actions for AI operations.
 * Executes on the server to protect API keys and call generative models.
 */

"use server";

import { FastAssistantAgent } from "@/ai/agents/fast-assistant.agent";
import { VerificationOrchestrator } from "@/ai/orchestrator/verification-orchestrator";
import { CivicReport, MediaAsset } from "@/types";
import { EvidenceAnalysisResult } from "@/ai/types/ai.types";

export interface AIAnalysisPayload {
  media: MediaAsset[];
  location?: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
  };
}

export interface AIAnalysisResponse {
  success: boolean;
  data?: EvidenceAnalysisResult;
  error?: string;
}

/**
 * Analyzes uploaded media evidence immediately after file upload.
 * Does not write or create any records in the Firestore database.
 * @param payload - Includes uploaded Cloudinary assets and optional GPS coordinates
 */
export async function analyzeReportEvidence(
  payload: AIAnalysisPayload
): Promise<AIAnalysisResponse> {
  try {
    const agent = new FastAssistantAgent();

    // Construct a temporary report mock conforming to the CivicReport schema
    const mockReport: CivicReport = {
      id: "temp-pre-fill-analysis",
      status: "draft",
      metadata: {
        title: "",
        description: "",
        category: "",
        createdBy: "assistant",
      },
      location: {
        latitude: payload.location?.latitude ?? 0,
        longitude: payload.location?.longitude ?? 0,
        formattedAddress: payload.location?.formattedAddress || "",
      },
      evidence: {
        media: payload.media,
      },
      ai: {
        assistant: null,
        verification: {
          status: "processing",
          fakeMediaProbability: null,
          fakeMediaConfidence: null,
          fakeMediaReason: null,
          duplicateProbability: null,
          duplicateReportIds: null,
          duplicateReason: null,
          assignedDepartment: null,
          priority: null,
          trustScore: null,
          verificationModel: null,
          verificationVersion: null,
          summary: null,
          analyzedAt: null,
          failureReason: null,
        },
        assignment: {
          officerId: null,
          department: null,
          assignedAt: null,
          assignmentMethod: null,
        },
      },
      timestamps: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    // Invoke the dry-run analysis pipeline (no persistence)
    const result = await agent.analyze(mockReport);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: msg,
    };
  }
}

import { ensureServerAuthenticated } from "@/services/firebase/auth";

/**
 * Starts the asynchronous AI verification pipeline for a submitted report on the server.
 * This is a fire-and-forget background execution, so it does not block the client.
 * @param reportId - ID of the report to verify
 */
export async function startReportVerification(reportId: string): Promise<void> {
  // Execute the verification orchestrator in the background on the server
  (async () => {
    await ensureServerAuthenticated();
    await VerificationOrchestrator.verifyReport(reportId);
  })().catch((err) => {
    console.error(`[ai.actions] Background verification orchestrator failed for report ${reportId}:`, err);
  });
}
