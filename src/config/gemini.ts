/**
 * @file src/config/gemini.ts
 * @description Google AI Gemini SDK configuration options.
 * Defines supported models, default settings, and retrieves the API key securely.
 */

import { env } from "./env";
import { AI_MODELS } from "./ai-models";

// Safely read server-only key
const getApiKey = (): string | undefined => {
  if (typeof window === "undefined") {
    const serverEnv = env as Record<string, unknown>;
    return typeof serverEnv.GEMINI_API_KEY === "string" ? serverEnv.GEMINI_API_KEY : undefined;
  }
  return undefined;
};

export const geminiConfig = {
  apiKey: getApiKey(),
  defaultModel: AI_MODELS.ASSISTANT,
  models: {
    FLASH: AI_MODELS.VERIFICATION,
    PRO: "gemini-3.5-pro",
  },
} as const;

export default geminiConfig;
