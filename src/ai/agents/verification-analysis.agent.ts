/**
 * @file src/ai/agents/verification-analysis.agent.ts
 * @description Consolidated single-stage AI Verification Analysis Agent.
 */

import { BaseAgent } from "./base-agent";
import { CivicReport } from "@/types";
import { VerificationAnalysisResult } from "../types/ai.types";
import { VERIFICATION_ANALYSIS_PROMPTS, PromptBuilder } from "../prompts/verification-analysis.prompt";
import { safeDb } from "@/services/firebase/admin";
import { AppError } from "@/utils/error";
import { AI_MODELS } from "@/config/ai-models";

export class VerificationAnalysisAgent extends BaseAgent<CivicReport, VerificationAnalysisResult> {
  constructor() {
    super({
      name: "Verification Analysis Agent",
      modelName: AI_MODELS.VERIFICATION,
      temperature: 0.1,
    });
  }

  protected validateInput(report: CivicReport): void {
    if (!report.id) {
      throw new AppError({
        message: "Invalid input: Report ID is missing.",
        code: "AGENT_INPUT_INVALID",
        statusCode: 400,
      });
    }
  }

  protected buildPrompt(report: CivicReport): { systemInstruction: string; prompt: string } {
    const activePrompt = VERIFICATION_ANALYSIS_PROMPTS["1.0.0"];

    const mediaList =
      report.evidence?.media && report.evidence.media.length > 0
        ? report.evidence.media
            .map(
              (m, i) =>
                `File ${i + 1}: URL="${m.url}" (MimeType: ${m.mimeType}, Size: ${m.size} bytes)`
            )
            .join("\n")
        : "No evidence files provided.";

    const compiledPrompt = PromptBuilder.compile(activePrompt.template, {
      title: report.metadata?.title || "N/A",
      description: report.metadata?.description || "N/A",
      category: report.metadata?.category || "N/A",
      latitude: report.location?.latitude !== undefined ? report.location.latitude : "N/A",
      longitude: report.location?.longitude !== undefined ? report.location.longitude : "N/A",
      formattedAddress: report.location?.formattedAddress || "N/A",
      mediaList,
    });

    return {
      systemInstruction: activePrompt.systemInstruction,
      prompt: compiledPrompt,
    };
  }

  protected parseResponse(rawJson: string): VerificationAnalysisResult {
    try {
      const parsed = JSON.parse(rawJson);

      let suggestedSeverity = parsed.suggestedSeverity;
      if (!["low", "medium", "high", "critical"].includes(suggestedSeverity)) {
        suggestedSeverity = "low";
      }

      return {
        fakeMediaProbability: typeof parsed.fakeMediaProbability === "number" ? parsed.fakeMediaProbability : 0.0,
        fakeMediaConfidence: typeof parsed.fakeMediaConfidence === "number" ? parsed.fakeMediaConfidence : 0.0,
        fakeMediaReason: parsed.fakeMediaReason || "No media analysis reason provided.",
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
        summary: parsed.summary || "No summary provided.",
        suggestedSeverity: suggestedSeverity as "low" | "medium" | "high" | "critical",
        trustScore: typeof parsed.trustScore === "number" ? parsed.trustScore : 0.5,
        verificationNotes: parsed.verificationNotes || "No verification notes provided.",
      };
    } catch (error) {
      throw new AppError({
        message: "Failed to parse raw response in VerificationAnalysisAgent.",
        code: "AGENT_RESPONSE_PARSE_FAILED",
        statusCode: 500,
        context: { rawJson, error: error instanceof Error ? error.message : "JSON parse failed" },
      });
    }
  }

  protected getMediaAssets(report: CivicReport): { url: string; mimeType: string }[] {
    const media = report.evidence?.media || [];
    return media.map((m) => ({ url: m.url, mimeType: m.mimeType }));
  }

  protected getRequiredKeys(): string[] {
    return [
      "fakeMediaProbability",
      "fakeMediaConfidence",
      "fakeMediaReason",
      "confidence",
      "summary",
      "suggestedSeverity",
      "trustScore",
      "verificationNotes",
    ];
  }

  protected async persistResult(reportId: string, result: VerificationAnalysisResult): Promise<void> {
    try {
      const now = new Date().toISOString();
      await safeDb.updateReport(reportId, {
        "ai.verification.status": "verified",
        "ai.verification.fakeMediaProbability": result.fakeMediaProbability,
        "ai.verification.fakeMediaConfidence": result.fakeMediaConfidence,
        "ai.verification.fakeMediaReason": result.fakeMediaReason,
        "ai.verification.confidence": result.confidence,
        "ai.verification.summary": result.summary,
        "ai.verification.trustScore": result.trustScore,
        "ai.verification.verificationModel": this.modelName,
        "ai.verification.verificationVersion": "1.0.0",
        "ai.verification.analyzedAt": now,
        "timestamps.updatedAt": now,
      });
    } catch (error) {
      throw new AppError({
        message: `Failed to persist VerificationAnalysisAgent output: ${
          error instanceof Error ? error.message : "Database write error"
        }`,
        code: "AGENT_PERSIST_FAILED",
        statusCode: 500,
        context: { reportId, result, error },
      });
    }
  }
}

export default VerificationAnalysisAgent;
