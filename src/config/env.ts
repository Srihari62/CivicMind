/**
 * @file src/config/env.ts
 * @description Environment variable schema validation.
 * Utilizes Zod to parse and validate client-side and server-side keys.
 * Performs safe checks to avoid build-time errors when server-side variables are hidden from the client.
 */

import { z } from "zod";

// Flag to identify if code is executing in a server context
const isServer = typeof window === "undefined";

// Client-side environment schema (required in both client and server contexts)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, "NEXT_PUBLIC_FIREBASE_API_KEY is missing"),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is missing"),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, "NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing"),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1, "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is missing"),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is missing"),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, "NEXT_PUBLIC_FIREBASE_APP_ID is missing"),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1, "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing"),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: z.string().optional(),
});

// Server-side environment schema (extends client-side, adding server-only keys)
const serverEnvSchema = clientEnvSchema.extend({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is missing on the server side"),
});

/**
 * Validate process.env using the appropriate schema depending on context.
 */
const envSchema = isServer ? serverEnvSchema : clientEnvSchema;

const envParseResult = envSchema.safeParse({
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  // Only bind the server-only key in server execution contexts to avoid compiler warnings
  ...(isServer ? { GEMINI_API_KEY: process.env.GEMINI_API_KEY } : {}),
});

if (!envParseResult.success) {
  const errors = envParseResult.error.flatten().fieldErrors;
  const formattedErrors = Object.entries(errors)
    .map(([key, val]) => ` - ${key}: ${val?.join(", ")}`)
    .join("\n");

  const contextMessage = isServer ? "[Server Context]" : "[Client Context]";
  
  // Log configuration errors but avoid crashing builds if keys are missing in placeholder dev setups
  console.error(
    `❌ Env Validation Failure ${contextMessage}:\n${formattedErrors}\nEnsure your .env.local file is configured.`
  );
}

// Export the parsed environment variable values, falling back to process.env if parse fails
export const env = envParseResult.success
  ? envParseResult.data
  : (process.env as unknown as z.infer<typeof serverEnvSchema>);
export default env;
