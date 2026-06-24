/**
 * @file src/ai/utils/priority-engine.ts
 * @description Deterministic rule engine for calculating report priority without calling LLMs.
 */

import { PriorityLevel } from "@/types";

interface PriorityParameters {
  severity: string;
  confidence: number;
  duplicateProbability: number;
  fakeProbability: number;
}

export class PriorityEngine {
  /**
   * Calculates the final report priority level based on severity, confidence, duplication, and fake probability.
   * @param params - Input parameters for verification
   * @returns Calculated PriorityLevel
   */
  public static calculate(params: PriorityParameters): PriorityLevel {
    const fake = params.fakeProbability ?? 0;
    const duplicate = params.duplicateProbability ?? 0;
    const confidence = params.confidence ?? 1.0;
    const severity = String(params.severity || "medium").toLowerCase().trim();

    // 1. High probability of fake media or duplication triggers automated lower priority
    if (fake > 0.75 || duplicate > 0.85) {
      return "low";
    }

    // 2. Map severity to priority adjusted by the agent's confidence score
    if (severity === "critical") {
      return "critical";
    }

    if (severity === "high") {
      return confidence >= 0.8 ? "high" : "medium";
    }

    if (severity === "medium") {
      return confidence >= 0.8 ? "medium" : "low";
    }

    if (severity === "low") {
      return "low";
    }

    return "medium"; // Fallback default
  }
}

export default PriorityEngine;
