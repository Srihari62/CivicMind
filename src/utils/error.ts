/**
 * @file src/utils/error.ts
 * @description Centralized error handler and helper structures.
 * Defines custom error classes to distinguish between API, Authentication, and Validation errors,
 * with utility parsers for Firebase SDK and Google Gemini API errors.
 */

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

/**
 * Standard Application Error structure for unified handling.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly context?: Record<string, unknown>;

  constructor({
    message,
    code = "INTERNAL_ERROR",
    statusCode = 500,
    severity = "error",
    context,
  }: {
    message: string;
    code?: string;
    statusCode?: number;
    severity?: ErrorSeverity;
    context?: Record<string, unknown>;
  }) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Converts Firebase error codes to friendly localized messages.
 * @param error - Raw Firebase error object
 * @returns Standard User Friendly Error Message and code
 */
export function parseFirebaseError(error: unknown): { message: string; code: string } {
  const err = error as Record<string, unknown> | null | undefined;
  const code = typeof err?.code === "string" ? err.code : "auth/unknown-error";
  let message = "An unexpected database or auth error occurred. Please try again.";

  switch (code) {
    // Auth Errors
    case "auth/email-already-in-use":
      message = "This email address is already registered.";
      break;
    case "auth/invalid-email":
      message = "The email address format is invalid.";
      break;
    case "auth/user-disabled":
      message = "This user account has been disabled.";
      break;
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      message = "Invalid email or password combination.";
      break;
    case "auth/weak-password":
      message = "The password is too weak. Please use at least 6 characters.";
      break;
    case "auth/network-request-failed":
      message = "Network error. Please check your internet connection and try again.";
      break;
    case "auth/too-many-requests":
      message = "Too many login attempts. This account is temporarily locked. Please try later.";
      break;
      
    // Firestore Permissions / Rules Errors
    case "permission-denied":
      message = "You do not have permission to access or modify this resource.";
      break;
    case "unavailable":
      message = "The database service is temporarily unavailable. Please retry shortly.";
      break;
  }

  return { message, code };
}

/**
 * Parses Google Gemini AI SDK errors.
 * @param error - Raw Gemini error object
 * @returns User-friendly message and clean details
 */
export function parseGeminiError(error: unknown): { message: string; code: string } {
  const err = error as Record<string, unknown> | null | undefined;
  const errorMsg = typeof err?.message === "string" ? err.message : "";
  let message = "AI processing failed. Please clarify your input or try again.";
  let code = "GEMINI_ERROR";

  if (errorMsg.includes("API_KEY_INVALID")) {
    message = "AI service key configuration error. Please contact admin.";
    code = "GEMINI_API_KEY_INVALID";
  } else if (errorMsg.includes("SAFETY")) {
    message = "Content blocked: The prompt triggered safety filter policies.";
    code = "GEMINI_SAFETY_BLOCKED";
  } else if (errorMsg.includes("quota") || errorMsg.includes("429")) {
    message = "AI model rate limit exceeded. Please wait a moment before trying again.";
    code = "GEMINI_RATE_LIMIT";
  }

  return { message, code };
}

/**
 * Global helper to extract a clean string error message from any catch block instance.
 * @param error - Unknown thrown error
 * @returns Human readable error string
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred.";
}
