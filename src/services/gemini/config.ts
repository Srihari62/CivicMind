/**
 * @file src/services/gemini/config.ts
 * @description Google AI SDK (Gemini) configuration and client initialization.
 * Instantiates the GoogleGenerativeAI client using server-side environment variables.
 * Enforces server-only execution to protect API keys from exposure in client bundles.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiConfig } from "@/config/gemini";

// Ensure this code is only run server-side to protect the GEMINI_API_KEY
const apiKey = geminiConfig.apiKey;

if (!apiKey && typeof window === "undefined" && process.env.NODE_ENV === "production") {
  throw new Error("GEMINI_API_KEY environment variable is missing. AI features will not function.");
}

/**
 * Initialized GoogleGenerativeAI client singleton.
 * Note: Should only be accessed from server-side files (API routes, server actions, or server components).
 */
export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Predefined recommended Gemini models for specific tasks.
 */
export const GEMINI_MODELS = geminiConfig.models;

/**
 * Safely retrieves an initialized Gemini model instance.
 * Throws a descriptive error if the API key is not configured.
 * @param modelName - The identifier of the target model (defaults to FLASH)
 */
export function getGeminiModel(modelName: string = GEMINI_MODELS.FLASH) {
  if (typeof window !== "undefined") {
    throw new Error("Security Error: Gemini API calls must only be initiated from server environments.");
  }
  
  if (!genAI) {
    throw new Error("Configuration Error: Gemini SDK is uninitialized. Ensure GEMINI_API_KEY is defined in env.");
  }

  return genAI.getGenerativeModel({ model: modelName });
}
