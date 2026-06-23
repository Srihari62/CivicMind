/**
 * @file src/ai/types/ai.types.ts
 * @description Type definitions for the CivicMind AI agent execution framework.
 */

export interface AgentConfig {
  name: string;
  modelName?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface EvidenceAnalysisResult {
  title: string;
  description: string;
  classification: string;
  classificationLabel?: string;
  severity: "low" | "medium" | "high" | "critical";
  summary: string;
  confidence: number;
  fakeMediaProbability: number;
  detectedObjects?: string[];
  analyzedAt: string;
}
