/**
 * @file src/ai/agents/priority-engine.agent.ts
 * @description Deterministic Priority Engine Agent.
 */

import { CivicReport, PriorityLevel } from "@/types";
import { PriorityEngine } from "../utils/priority-engine";

export class PriorityEngineAgent {
  public readonly name = "Priority Engine Agent";

  /**
   * Executes priority calculation deterministically in memory.
   */
  public execute(
    report: CivicReport,
    verificationResult: {
      suggestedSeverity: string;
      confidence: number;
      fakeMediaProbability: number;
    },
    duplicateProbability: number
  ): { priority: PriorityLevel; trustScore: number } {
    const severity = verificationResult.suggestedSeverity;
    const confidence = verificationResult.confidence;
    const fakeProbability = verificationResult.fakeMediaProbability;

    const priority = PriorityEngine.calculate({
      severity,
      confidence,
      fakeProbability,
      duplicateProbability,
    });

    // Calculate final trust score: confidence penalized by fake and duplicate probabilities
    const trustScore = confidence * (1 - fakeProbability) * (1 - duplicateProbability);

    console.info(`[${this.name}] Calculated priority: ${priority}, trust score: ${trustScore}`);
    return { priority, trustScore };
  }
}

export default PriorityEngineAgent;
