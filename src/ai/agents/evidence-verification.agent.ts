/**
 * @file src/ai/agents/evidence-verification.agent.ts
 * @description Background agent that performs evidence verification and analysis.
 */

import { BaseAgent } from "./base-agent";
import { CivicReport } from "@/types";
import { EvidenceAnalysisResult } from "../types/ai.types";
import { EVIDENCE_ANALYSIS_PROMPTS, PromptBuilder } from "../prompts/evidence.prompt";
import { doc, updateDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { AppError } from "@/utils/error";
import { normalizeSeverity } from "../utils/priority";

import { AI_MODELS } from "@/config/ai-models";

export class EvidenceVerificationAgent extends BaseAgent<CivicReport, EvidenceAnalysisResult> {
  constructor() {
    super({
      name: "Evidence Verification Agent",
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
    const activePrompt = EVIDENCE_ANALYSIS_PROMPTS["1.0.0"];

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

  protected parseResponse(rawJson: string): EvidenceAnalysisResult {
    try {
      const parsed = JSON.parse(rawJson);
      const severity = normalizeSeverity(parsed.severity);

      return {
        title: parsed.title || "Incident Report",
        description: parsed.description || "No description provided.",
        classification: parsed.classification || "other",
        classificationLabel: parsed.classificationLabel || parsed.classification || "Other",
        severity,
        summary: parsed.summary || "No summary provided.",
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
        fakeMediaProbability: typeof parsed.fakeMediaProbability === "number" ? parsed.fakeMediaProbability : 0.0,
        detectedObjects: Array.isArray(parsed.detectedObjects) ? parsed.detectedObjects : [],
        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new AppError({
        message: "Failed to parse raw response in EvidenceVerificationAgent.",
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
    return ["title", "description", "classification", "severity", "summary", "confidence"];
  }

  /**
   * Updates only its own fields in Firestore under verification.
   */
  protected async persistResult(reportId: string, result: EvidenceAnalysisResult): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      const now = new Date().toISOString();

      await updateDoc(docRef, {
        "ai.verification.fakeMediaConfidence": result.confidence,
        "ai.verification.trustScore": result.confidence, // Initial trustScore is based on confidence
        "ai.verification.verificationModel": this.modelName,
        "ai.verification.verificationVersion": "1.0.0",
        "ai.verification.analyzedAt": now,
      });
    } catch (error) {
      throw new AppError({
        message: `Failed to persist EvidenceVerificationAgent output: ${
          error instanceof Error ? error.message : "Database write error"
        }`,
        code: "AGENT_PERSIST_FAILED",
        statusCode: 500,
        context: { reportId, result, error },
      });
    }
  }
}

export default EvidenceVerificationAgent;
