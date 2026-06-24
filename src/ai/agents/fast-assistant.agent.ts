/**
 * @file src/ai/agents/fast-assistant.agent.ts
 * @description Lightweight AI agent that checks report metadata and media files for citizen assistance.
 */

import { BaseAgent } from "./base-agent";
import { CivicReport } from "@/types";
import { EvidenceAnalysisResult } from "../types/ai.types";
import { FAST_ASSISTANT_PROMPTS } from "../prompts/fast-assistant.prompt";
import { PromptBuilder } from "../prompts/evidence.prompt";
import { AppError } from "@/utils/error";
import { normalizeSeverity } from "../utils/priority";

import { AI_MODELS } from "@/config/ai-models";

export class FastAssistantAgent extends BaseAgent<CivicReport, EvidenceAnalysisResult> {
  constructor() {
    super({
      name: "Fast Assistant Agent",
      modelName: AI_MODELS.ASSISTANT,
      temperature: 0.2,
    });
  }

  /**
   * Validates input.
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
   * Compiles prompt.
   */
  protected buildPrompt(report: CivicReport): { systemInstruction: string; prompt: string } {
    const activePrompt = FAST_ASSISTANT_PROMPTS["1.0.0"];

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
   * Parses Gemini's raw JSON output.
   */
  protected parseResponse(rawJson: string): EvidenceAnalysisResult {
    try {
      const parsed = JSON.parse(rawJson);

      const severity = normalizeSeverity(parsed.severity);

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
        fakeMediaProbability: 0.0, // Not performed in Phase 1
        detectedObjects: Array.isArray(parsed.detectedObjects) ? parsed.detectedObjects : [],
        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new AppError({
        message: "Failed to parse raw response in FastAssistantAgent.",
        code: "AGENT_RESPONSE_PARSE_FAILED",
        statusCode: 500,
        context: { rawJson, error: error instanceof Error ? error.message : "JSON parse failed" },
      });
    }
  }

  /**
   * Returns media files for Gemini.
   */
  protected getMediaAssets(report: CivicReport): { url: string; mimeType: string }[] {
    const media = report.evidence?.media || [];
    return media.map((m) => ({ url: m.url, mimeType: m.mimeType }));
  }

  /**
   * Required keys.
   */
  protected getRequiredKeys(): string[] {
    return ["title", "description", "classification", "severity", "summary", "confidence"];
  }

  /**
   * Persists results. (Does nothing as Phase 1 only writes to UI state).
   */
  protected async persistResult(_reportId: string, _result: EvidenceAnalysisResult): Promise<void> {
    // Phase 1 does not persist directly to database.
  }
}

export default FastAssistantAgent;
