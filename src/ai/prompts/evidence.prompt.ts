/**
 * @file src/ai/prompts/evidence.prompt.ts
 * @description Versioned prompt templates and compilation utilities for Evidence Analysis.
 */

export interface PromptTemplate {
  version: string;
  systemInstruction: string;
  template: string;
}

export const EVIDENCE_ANALYSIS_PROMPTS: Record<string, PromptTemplate> = {
  "1.0.0": {
    version: "1.0.0",
    systemInstruction: [
      "You are a specialized AI civic intelligence agent for CivicMind.",
      "Your task is to analyze a municipal incident report and its associated media evidence (images or videos) to perform triage.",
      "You must return your analysis strictly as a single JSON object conforming to the schema below. Do not wrap the JSON in comments, do not include markdown blocks like ```json, and write NO text other than the raw JSON itself.",
      "",
      "CRITICAL ENUM & CATEGORY RULES:",
      "1. You MUST use ONLY the exact canonical string values specified for 'classification' and 'severity'. Never invent, guess, or modify these casing/values.",
      "2. For 'confidence', if the evidence is unclear, ambiguous, or irrelevant, honestly output a low confidence score (< 0.6) instead of guessing.",
      "",
      "SEVERITY ASSESSMENT GUIDELINES:",
      "Choose severity based on the following criteria:",
      "- 'critical': Immediate hazard to public health/safety, hazardous waste, or complete blockage of streets/transit.",
      "- 'high': High impact or large volume/scale (e.g. large piles of garbage/waste blocking sidewalk or road, active major water leak/pipe burst, multiple streetlights out on a main road).",
      "- 'medium': Moderate impact or medium volume (e.g. regular pothole, single streetlight out, moderate garbage pile on side of road not blocking path).",
      "- 'low': Minor impact, low volume, or cosmetic issues (e.g. small litter, small pavement cracks, minor surface wear).",
      "",
      "JSON Schema:",
      "{",
      '  "title": "A short, descriptive headline for the report (max 10 words, e.g., \'Large Pothole on Elm Street\')",',
      '  "description": "A detailed, objective description of the incident visible in the media, describing the problem and surrounding conditions (at least 2 sentences)",',
      '  "classification": "MUST be exactly one of: \'road_damage\', \'garbage\', \'water_leakage\', \'street_light\', \'drainage\', \'illegal_dumping\', \'traffic_signal\', \'public_safety\', \'other\'",',
      '  "classificationLabel": "A user-friendly short label for the specific issue identified (e.g., \'Pothole\', \'Overflowing Bin\', \'Water Leak\')",',
      '  "severity": "MUST be exactly one of: \'low\', \'medium\', \'high\', \'critical\'",',
      '  "summary": "A concise, objective summary of the visual evidence and incident details (max 2 sentences)",',
      '  "confidence": <float between 0.0 and 1.0 representing your classification certainty>,',
      '  "fakeMediaProbability": <float between 0.0 and 1.0 representing the likelihood that the uploaded image or video is manipulated, AI-generated, or fake>,',
      '  "detectedObjects": <array of strings listing physical items, hazards, or signs identified in the media, e.g. ["pothole", "asphalt", "cracked road"]>',
      "}"
    ].join("\n"),
    template: [
      "Please analyze the following incident submission and determine its classification, severity, and authenticity:",
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
   * @param template - The raw prompt template string
   * @param variables - Key-value map of parameters to inject
   * @returns Compiled prompt string
   */
  public static compile(template: string, variables: Record<string, string | number>): string {
    let result = template;
    for (const [key, val] of Object.entries(variables)) {
      result = result.replaceAll(`{${key}}`, String(val));
    }
    return result;
  }
}
export default PromptBuilder;
