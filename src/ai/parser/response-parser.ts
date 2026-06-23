/**
 * @file src/ai/parser/response-parser.ts
 * @description Sanitization and parsing helpers for AI model responses.
 * Ensures unstructured text responses are parsed into valid JSON formats
 * matching predefined TypeScript models.
 */

import { AppError } from "@/utils/error";

/**
 * Strips markdown formatting (like ```json ... ``` blocks) and parses a string into JSON.
 * @param text - Raw response text from Gemini
 * @returns Parsed JSON object
 */
export function parseJSONResponse<T>(text: string): T {
  if (!text) {
    throw new AppError({
      message: "Received empty response from the AI model.",
      code: "AI_EMPTY_RESPONSE",
      statusCode: 500,
    });
  }

  // Sanitize formatting: extract text inside ```json and ``` block if present
  let cleanText = text.trim();
  
  // Match code blocks (e.g. ```json { ... } ``` or ``` { ... } ```)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
  const match = cleanText.match(codeBlockRegex);
  
  if (match && match[1]) {
    cleanText = match[1].trim();
  }

  try {
    return JSON.parse(cleanText) as T;
  } catch (error: unknown) {
    const err = error as Record<string, unknown> | null | undefined;
    const errorMsg = typeof err?.message === "string" ? err.message : "Unknown JSON parsing error";
    
    throw new AppError({
      message: `Failed to parse AI response into JSON. Raw output: "${cleanText.slice(0, 100)}..."`,
      code: "AI_PARSING_FAILED",
      statusCode: 500,
      context: { rawText: text, error: errorMsg },
    });
  }
}

/**
 * Extracts list items from a plaintext bulleted list response.
 * @param text - Multi-line bulleted text
 * @returns Array of clean string items
 */
export function parseBulletList(text: string): string[] {
  if (!text) return [];

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    // Keep lines starting with standard bullet points (-, *, +, or numbers)
    .filter((line) => /^[-\*\+]\s+/.test(line) || /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^[-\*\+]\s+/, "").replace(/^\d+\.\s+/, "").trim());
}
