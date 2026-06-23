/**
 * @file src/app/actions/ai.actions.ts
 * @description Next.js Server Actions for AI operations.
 * Executes on the server to protect API keys and call generative models.
 */

"use server";

import { EvidenceAnalysisAgent } from "@/ai/agents/evidence-analysis.agent";
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
    const agent = new EvidenceAnalysisAgent();

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
          status: "pending",
          fakeMediaProbability: null,
          duplicateProbability: null,
          priority: null,
          assignedDepartment: null,
          analyzedAt: null,
        },
      },
      verification: {
        status: "pending",
        requiredVotes: 3,
        receivedVotes: 0,
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
