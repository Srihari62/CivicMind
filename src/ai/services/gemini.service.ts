/**
 * @file src/ai/services/gemini.service.ts
 * @description Gemini LLM integration service.
 * Handles api communication, multi-modal downloads, retry policies, and schema parsing.
 */

import "server-only";

import { getGeminiModel } from "@/services/gemini/config";
import { AI_MODELS } from "@/config/ai-models";
import { AppError } from "@/utils/error";
import { GeminiResponseParser } from "../parser/gemini-response.parser";

export class GeminiService {
  /**
   * Sends a request to Gemini, maps media assets inline, handles retries, and returns parsed JSON.
   * @param systemInstruction - Alignment prompts for the agent role
   * @param prompt - Main user execution prompt
   * @param media - Optional list of Cloudinary asset URLs and mimeTypes
   * @param requiredKeys - Expected JSON schema keys to validate
   * @param modelName - Targets specific Gemini engine models
   * @param temperature - Controls determinism and creativity
   * @param maxRetries - Maximum retry attempts on API failure
   * @returns Parsed and validated JSON response conforming to type T
   */
  public static async generateJson<T>(
    systemInstruction: string,
    prompt: string,
    media: { url: string; mimeType: string }[] = [],
    requiredKeys: string[] = [],
    modelName: string = AI_MODELS.VERIFICATION,
    temperature = 0.1,
    maxRetries = 3,
    maxOutputTokens?: number
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const model = getGeminiModel(modelName);

        // Fetch media URLs on the server and map them to inline Parts for multi-modal input
        const mediaParts = await Promise.all(
          media.map(async (item) => {
            const res = await fetch(item.url);
            if (!res.ok) {
              throw new Error(`Failed to fetch media asset from URL: ${item.url}`);
            }
            const buffer = await res.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            return {
              inlineData: {
                data: base64,
                mimeType: item.mimeType,
              },
            };
          })
        );

        const parts = [{ text: prompt }, ...mediaParts];

        // Call the generative API enforcing JSON mode
        const result = await model.generateContent({
          contents: [{ role: "user", parts }],
          generationConfig: {
            temperature,
            responseMimeType: "application/json",
            maxOutputTokens,
          },
          systemInstruction,
        });

        const responseText = result.response.text();
        if (!responseText) {
          throw new Error("Generative model returned an empty response string.");
        }

        // Clean, parse, and validate the output response
        const parsed = GeminiResponseParser.parseJson<T>(responseText);
        if (requiredKeys.length > 0) {
          GeminiResponseParser.validateKeys(parsed as Record<string, unknown>, requiredKeys);
        }

        return parsed;
      } catch (error) {
        lastError = error;
        // Wait using a simple linear backoff before retrying
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
    }

    const errorMsg = lastError instanceof Error ? lastError.message : "Unknown Gemini API error";
    throw new AppError({
      message: `Gemini service failed to produce valid response after ${maxRetries} attempts: ${errorMsg}`,
      code: "AI_SERVICE_EXECUTION_FAILED",
      statusCode: 502,
      context: { lastError },
    });
  }
}
export default GeminiService;
