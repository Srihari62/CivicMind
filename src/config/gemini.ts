/**
 * @file src/config/gemini.ts
 * @description Google AI Gemini SDK configuration options.
 * Defines supported models, default settings, and retrieves the API key securely.
 */

import { env } from "./env";

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
  defaultModel: "gemini-2.5-flash",
  models: {
    FLASH: "gemini-2.5-flash",
    PRO: "gemini-2.5-pro",
  },
} as const;

export default geminiConfig;
