/**
 * @file src/ai/agents/evidence-analysis.agent.ts
 * @description specialized AI agent that checks report metadata and media files to triage civic issues.
 */

import { BaseAgent } from "./base-agent";
import { CivicReport } from "@/types";
import { EvidenceAnalysisResult } from "../types/ai.types";
import { EVIDENCE_ANALYSIS_PROMPTS, PromptBuilder } from "../prompts/evidence.prompt";
import { doc, updateDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { AppError } from "@/utils/error";
import { normalizeSeverity } from "../utils/priority";

export class EvidenceAnalysisAgent extends BaseAgent<CivicReport, EvidenceAnalysisResult> {
  constructor() {
    super({
      name: "Evidence Analysis Agent",
      modelName: "gemini-3.5-flash",
      temperature: 0.1,
    });
  }

  /**
   * Validates that the report possesses necessary triaging evidence.
   */
  protected validateInput(report: CivicReport): void {
    if (!report.id) {
      throw new AppError({
        message: "Invalid input: Report ID is missing.",
        code: "AGENT_INPUT_INVALID",
        statusCode: 400,
      });
    }
    if (!report.evidence?.media || report.evidence.media.length === 0) {
      throw new AppError({
        message: "Invalid input: At least one evidence file is required for analysis.",
        code: "AGENT_INPUT_INVALID",
        statusCode: 400,
      });
    }
  }

  /**
   * Compiles the report metadata and evidence details into the prompt template.
   */
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
      title: report.metadata?.title || "N/A (Pre-fill Stage)",
      description: report.metadata?.description || "N/A (Pre-fill Stage)",
      category: report.metadata?.category || "N/A (Pre-fill Stage)",
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

  /**
   * Transforms the parsed JSON output from Gemini into the final EvidenceAnalysisResult.
   */
  protected parseResponse(rawJson: string): EvidenceAnalysisResult {
    try {
      const parsed = JSON.parse(rawJson);

      // Normalize severity
      const severity = normalizeSeverity(parsed.severity);

      // Normalize classification (category)
      const validCategories = [
        "road_damage",
        "garbage",
        "water_leakage",
        "street_light",
        "drainage",
        "illegal_dumping",
        "traffic_signal",
        "public_safety",
        "other",
      ];
      let classification = String(parsed.classification || "").toLowerCase().trim();
      if (!validCategories.includes(classification)) {
        // Map common synonyms if necessary, or default to other
        if (
          classification.includes("pothole") ||
          classification.includes("road") ||
          classification.includes("damage") ||
          classification.includes("pavement")
        ) {
          classification = "road_damage";
        } else if (
          classification.includes("trash") ||
          classification.includes("waste") ||
          classification.includes("debris") ||
          classification.includes("litter") ||
          classification.includes("garbage")
        ) {
          classification = "garbage";
        } else if (
          classification.includes("water") ||
          classification.includes("leak") ||
          classification.includes("pipe") ||
          classification.includes("burst")
        ) {
          classification = "water_leakage";
        } else if (
          classification.includes("light") ||
          classification.includes("lamp") ||
          classification.includes("street")
        ) {
          classification = "street_light";
        } else if (
          classification.includes("drain") ||
          classification.includes("sewer") ||
          classification.includes("flood")
        ) {
          classification = "drainage";
        } else if (
          classification.includes("dump") ||
          classification.includes("illegal")
        ) {
          classification = "illegal_dumping";
        } else if (
          classification.includes("traffic") ||
          classification.includes("signal") ||
          classification.includes("sign")
        ) {
          classification = "traffic_signal";
        } else if (
          classification.includes("safety") ||
          classification.includes("danger") ||
          classification.includes("hazard")
        ) {
          classification = "public_safety";
        } else {
          classification = "other";
        }
      }

      return {
        title: parsed.title || "Incident Report",
        description: parsed.description || "No description provided.",
        classification,
        classificationLabel: parsed.classificationLabel || parsed.classification || "Other",
        severity,
        summary: parsed.summary || "No summary provided.",
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
        fakeMediaProbability:
          typeof parsed.fakeMediaProbability === "number" ? parsed.fakeMediaProbability : 0.0,
        detectedObjects: Array.isArray(parsed.detectedObjects) ? parsed.detectedObjects : [],
        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new AppError({
        message: "Failed to parse and map raw model response to EvidenceAnalysisResult model.",
        code: "AGENT_RESPONSE_PARSE_FAILED",
        statusCode: 500,
        context: { rawJson, error: error instanceof Error ? error.message : "JSON parse failed" },
      });
    }
  }

  /**
   * Returns media files for multimodal submission to Gemini.
   */
  protected getMediaAssets(report: CivicReport): { url: string; mimeType: string }[] {
    const media = report.evidence?.media || [];
    return media.map((m) => ({ url: m.url, mimeType: m.mimeType }));
  }

  /**
   * Required keys in response JSON schema.
   */
  protected getRequiredKeys(): string[] {
    return ["title", "description", "classification", "severity", "summary", "confidence", "fakeMediaProbability"];
  }

  /**
   * Persists results to Firestore under `report.ai` path.
   */
  protected async persistResult(reportId: string, result: EvidenceAnalysisResult): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);

      // Perform partial update to secure isolation guidelines
      await updateDoc(docRef, {
        "ai.verification.status": "processed",
        "ai.verification.priority": result.severity,
        "ai.verification.fakeMediaProbability": result.fakeMediaProbability,
        "ai.verification.analyzedAt": result.analyzedAt,
        "ai.verification.duplicateProbability": 0, // Mock/placeholder
        "ai.verification.verificationModel": "gemini-3.5-flash",
        "ai.verification.verificationVersion": "1.0.0",
      });
    } catch (error) {
      throw new AppError({
        message: `Failed to persist AI report triaging output: ${
          error instanceof Error ? error.message : "Database write error"
        }`,
        code: "AGENT_PERSIST_FAILED",
        statusCode: 500,
        context: { reportId, result, error },
      });
    }
  }
}
export default EvidenceAnalysisAgent;
