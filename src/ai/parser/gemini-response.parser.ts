/**
 * @file src/ai/parser/gemini-response.parser.ts
 * @description Parser helper to clean, decode, and validate structured JSON outputs from Gemini models.
 */

import { AppError } from "@/utils/error";

export class GeminiResponseParser {
  /**
   * Cleans model output by stripping markdown block wrappers (e.g. ```json ... ```)
   * and parses it as a JSON object of type T.
   * @param rawText - Raw string from the generative model
   * @returns Parsed JSON object
   */
  public static parseJson<T>(rawText: string): T {
    if (!rawText) {
      throw new AppError({
        message: "Gemini response text is empty.",
        code: "AI_PARSER_EMPTY_RESPONSE",
        statusCode: 422,
      });
    }

    let cleaned = rawText.trim();
    
    // Strip standard markdown blocks (e.g. ```json ... ``` or ``` ... ```)
    const markdownRegex = /^```(?:json)?\s*([\s\S]*?)\s*```$/i;
    const match = cleaned.match(markdownRegex);
    if (match) {
      cleaned = match[1].trim();
    } else {
      // Clean leading and trailing backticks if formatted incorrectly
      cleaned = cleaned.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "").trim();
    }

    try {
      return JSON.parse(cleaned) as T;
    } catch (error) {
      throw new AppError({
        message: "Failed to parse model response as structured JSON.",
        code: "AI_PARSER_INVALID_JSON",
        statusCode: 422,
        context: {
          rawText,
          cleanedResponse: cleaned,
          error: error instanceof Error ? error.message : "JSON.parse error",
        },
      });
    }
  }

  /**
   * Enforces that the parsed JSON object contains all required keys.
   * @param parsedObj - Parsed JSON object
   * @param requiredKeys - List of required keys that must be present
   */
  public static validateKeys(
    parsedObj: Record<string, unknown> | null | undefined,
    requiredKeys: string[]
  ): void {
    if (!parsedObj || typeof parsedObj !== "object") {
      throw new AppError({
        message: "Parsed response is not a valid object.",
        code: "AI_PARSER_INVALID_OBJECT",
        statusCode: 422,
      });
    }

    const missingKeys = requiredKeys.filter(
      (key) => parsedObj[key] === undefined || parsedObj[key] === null
    );

    if (missingKeys.length > 0) {
      throw new AppError({
        message: `Parsed response is missing required properties: ${missingKeys.join(", ")}`,
        code: "AI_PARSER_MISSING_PROPERTIES",
        statusCode: 422,
        context: { parsedObj, missingKeys },
      });
    }
  }
}
export default GeminiResponseParser;
