/**
 * @file src/ai/agents/classification.agent.ts
 * @description specialized AI agent that reconfirms the final category, severity, and summary of an issue report.
 */

import { BaseAgent } from "./base-agent";
import { CivicReport } from "@/types";
import { ClassificationResult } from "../types/ai.types";
import { CLASSIFICATION_PROMPTS } from "../prompts/classification.prompt";
import { PromptBuilder } from "../prompts/evidence.prompt";
import { doc, updateDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { AppError } from "@/utils/error";

import { AI_MODELS } from "@/config/ai-models";

export class ClassificationAgent extends BaseAgent<CivicReport, ClassificationResult> {
  constructor() {
    super({
      name: "Classification Agent",
      modelName: AI_MODELS.VERIFICATION,
      temperature: 0.1,
    });
  }

  /**
   * Validates that the report possesses necessary evidence.
   */
  protected validateInput(report: CivicReport): void {
    if (!report.id) {
      throw new AppError({
        message: "Invalid input: Report ID is missing.",
        code: "AGENT_INPUT_INVALID",
        statusCode: 400,
      });
    }
  }

  /**
   * Compiles the report metadata and evidence details into the prompt template.
   */
  protected buildPrompt(report: CivicReport): { systemInstruction: string; prompt: string } {
    const activePrompt = CLASSIFICATION_PROMPTS["1.0.0"];

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
      mediaList,
    });

    return {
      systemInstruction: activePrompt.systemInstruction,
      prompt: compiledPrompt,
    };
  }

  /**
   * Transforms the parsed JSON output from Gemini into the final ClassificationResult.
   */
  protected parseResponse(rawJson: string): ClassificationResult {
    try {
      const parsed = JSON.parse(rawJson);

      const finalCategory = String(parsed.finalCategory || "").toLowerCase().trim();
      const finalSeverity = String(parsed.finalSeverity || "medium").toLowerCase().trim() as "low" | "medium" | "high" | "critical";
      const summary = String(parsed.summary || "").trim();

      return {
        finalCategory,
        finalSeverity,
        summary,
      };
    } catch (error) {
      throw new AppError({
        message: "Failed to parse and map raw model response to ClassificationResult model.",
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
    return ["finalCategory", "finalSeverity", "summary"];
  }

  /**
   * Persists results to Firestore under `report.ai.verification` path.
   */
  protected async persistResult(reportId: string, result: ClassificationResult): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);

      await updateDoc(docRef, {
        "ai.verification.finalCategory": result.finalCategory,
        "ai.verification.finalSeverity": result.finalSeverity,
        "ai.verification.summary": result.summary,
      });
    } catch (error) {
      throw new AppError({
        message: `Failed to persist ClassificationAgent output: ${
          error instanceof Error ? error.message : "Database write error"
        }`,
        code: "AGENT_PERSIST_FAILED",
        statusCode: 500,
        context: { reportId, result, error },
      });
    }
  }
}
export default ClassificationAgent;
