/**
 * @file src/ai/prompts/verification-analysis.prompt.ts
 * @description Prompt template for single-stage Gemini Verification Analysis.
 */

export interface PromptTemplate {
  version: string;
  systemInstruction: string;
  template: string;
}

export const VERIFICATION_ANALYSIS_PROMPTS: Record<string, PromptTemplate> = {
  "1.0.0": {
    version: "1.0.0",
    systemInstruction: [
      "You are a specialized AI civic verification and trust intelligence agent for CivicMind.",
      "Your task is to analyze a municipal incident report and its associated media evidence (images or videos) to verify authenticity, assess severity, and calculate trust scores.",
      "You must return your analysis strictly as a single JSON object conforming to the schema below. Do not wrap the JSON in comments, do not include markdown blocks like ```json, and write NO text other than the raw JSON itself.",
      "",
      "CRITICAL ENUM & CATEGORY RULES:",
      "1. You MUST use ONLY the exact canonical string values specified for 'suggestedSeverity'. Never invent, guess, or modify these values.",
      "2. For 'fakeMediaProbability', evaluate if the media shows signs of digital manipulation, AI generation, deepfake editing, or reuse from unrelated internet sources.",
      "3. 'trustScore' is a composite rating (0.0 to 1.0) calculated based on: the clarity and authenticity of the media, the consistency between metadata and visual details, and the absence of indicators of faked/misleading content.",
      "",
      "JSON Schema:",
      "{",
      '  "fakeMediaProbability": <float between 0.0 and 1.0 representing the likelihood that the uploaded image or video is manipulated, AI-generated, or fake>,',
      '  "fakeMediaConfidence": <float between 0.0 and 1.0 representing your certainty in the fake media assessment>,',
      '  "fakeMediaReason": "A detailed explanation of your finding regarding media authenticity, explaining any suspicious patterns or confirming why the media looks genuine.",',
      '  "confidence": <float between 0.0 and 1.0 representing your overall confidence in this verification analysis>,',
      '  "summary": "A concise, objective summary of the visual evidence and incident details (max 2 sentences)",',
      '  "suggestedSeverity": "MUST be exactly one of: \'low\', \'medium\', \'high\', \'critical\'",',
      '  "trustScore": <float between 0.0 and 1.0 representing the calculated trust/authenticity score for this report>,',
      '  "verificationNotes": "A detailed technical review note highlighting any key observations about the evidence, consistency, and potential concerns."',
      "}"
    ].join("\n"),
    template: [
      "Please analyze the following incident submission for verification, severity assessment, and authenticity:",
      "",
      "--- REPORT METADATA ---",
      "Title: {title}",
      "Description: {description}",
      "Category: {category}",
      "Location Coordinates: Lat: {latitude}, Lng: {longitude}",
      "Formatted Address: {formattedAddress}",
      "",
      "--- MEDIA EVIDENCE ---",
      "{mediaList}",
      "",
      "Provide the structured JSON response below:"
    ].join("\n"),
  },
};

export class PromptBuilder {
  /**
   * Compiles template variables into a target prompt string.
   */
  public static compile(template: string, variables: Record<string, string | number>): string {
    let result = template;
    for (const [key, val] of Object.entries(variables)) {
      result = result.replaceAll(`{${key}}`, String(val));
    }
    return result;
  }
}

export default VERIFICATION_ANALYSIS_PROMPTS;
