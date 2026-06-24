/**
 * @file src/ai/prompts/duplicate-detection.prompt.ts
 * @description Versioned prompt templates for Duplicate Detection.
 */

export interface PromptTemplate {
  version: string;
  systemInstruction: string;
  template: string;
}

export const DUPLICATE_DETECTION_PROMPTS: Record<string, PromptTemplate> = {
  "1.0.0": {
    version: "1.0.0",
    systemInstruction: [
      "You are a duplicate detection sub-agent for CivicMind.",
      "Your objective is to compare a new incident report against a list of nearby existing incident reports, and determine whether they describe the same physical event.",
      "You must return your analysis strictly as a single JSON object conforming to the schema below. Do not wrap the JSON in comments, do not include markdown blocks like ```json, and write NO text other than the raw JSON itself.",
      "",
      "Comparison Guidelines:",
      "1. Check if the location, category, and visual details match.",
      "2. Look for description similarity and visual similarity between the new report and nearby reports.",
      "3. If they describe the exact same occurrence (e.g. the same pothole or the same water leak reported by different citizens), assign a high duplicate probability (> 0.8).",
      "",
      "JSON Schema:",
      "{",
      '  "duplicateProbability": <float between 0.0 and 1.0 representing the likelihood that this new report is a duplicate of one or more existing reports>,',
      '  "duplicateReportIds": <array of strings listing the document IDs of the matching existing reports, e.g. ["report_1", "report_2"]>,',
      '  "reasoning": "A detailed, objective explanation comparing categories, proximity, descriptions, and visual evidence explaining the duplication status"',
      "}"
    ].join("\n"),
    template: [
      "Please compare the new report details with nearby existing reports to detect duplicates:",
      "",
      "--- NEW REPORT ---",
      "Title: {title}",
      "Description: {description}",
      "Category: {category}",
      "Location: Lat: {latitude}, Lng: {longitude}, Address: {formattedAddress}",
      "",
      "--- NEARBY EXISTING REPORTS ---",
      "{existingReportsList}",
      "",
      "Provide the structured JSON response below:"
    ].join("\n"),
  },
};
