/**
 * @file src/ai/agents/fake-media.agent.ts
 * @description specialized AI agent that checks report metadata and media files to detect fake or manipulated evidence.
 */

import { BaseAgent } from "./base-agent";
import { CivicReport } from "@/types";
import { FakeMediaResult } from "../types/ai.types";
import { FAKE_MEDIA_PROMPTS } from "../prompts/fake-media.prompt";
import { PromptBuilder } from "../prompts/evidence.prompt";
import { doc, updateDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { AppError } from "@/utils/error";

import { AI_MODELS } from "@/config/ai-models";

export class FakeMediaAgent extends BaseAgent<CivicReport, FakeMediaResult> {
  constructor() {
    super({
      name: "Fake Media Agent",
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
    const activePrompt = FAKE_MEDIA_PROMPTS["1.0.0"];

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
      mediaList,
    });

    return {
      systemInstruction: activePrompt.systemInstruction,
      prompt: compiledPrompt,
    };
  }

  /**
   * Transforms the parsed JSON output from Gemini into the final FakeMediaResult.
   */
  protected parseResponse(rawJson: string): FakeMediaResult {
    try {
      const parsed = JSON.parse(rawJson);

      const fakeMediaProbability = typeof parsed.fakeMediaProbability === "number" ? parsed.fakeMediaProbability : 0;
      const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;
      const reasoning = String(parsed.reasoning || "").trim();
      const recommendation = String(parsed.recommendation || "flag_for_review").trim();

      return {
        fakeMediaProbability,
        confidence,
        reasoning,
        recommendation,
      };
    } catch (error) {
      throw new AppError({
        message: "Failed to parse and map raw model response to FakeMediaResult model.",
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
    return ["fakeMediaProbability", "confidence", "reasoning", "recommendation"];
  }

  protected async persistResult(reportId: string, result: FakeMediaResult): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);

      await updateDoc(docRef, {
        "ai.verification.fakeMediaProbability": result.fakeMediaProbability,
        "ai.verification.fakeMediaConfidence": result.confidence,
        "ai.verification.fakeMediaReason": result.reasoning,
      });
    } catch (error) {
      throw new AppError({
        message: `Failed to persist FakeMediaAgent output: ${
          error instanceof Error ? error.message : "Database write error"
        }`,
        code: "AGENT_PERSIST_FAILED",
        statusCode: 500,
        context: { reportId, result, error },
      });
    }
  }
}
export default FakeMediaAgent;
