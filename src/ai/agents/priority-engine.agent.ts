/**
 * @file src/ai/agents/priority-engine.agent.ts
 * @description Agent that calculates and updates the final report priority and trust score.
 */

import { CivicReport } from "@/types";
import { doc, updateDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { PriorityEngine } from "../utils/priority-engine";
import { AppError } from "@/utils/error";

export class PriorityEngineAgent {
  public readonly name = "Priority Engine Agent";

  /**
   * Calculates priority and trust score, then persists to Firestore.
   */
  public async execute(reportId: string, report: CivicReport): Promise<{ priority: string; trustScore: number }> {
    console.info(`[${this.name}] Starting priority calculation for report ${reportId}`);
    try {
      // Extract parameters from the updated report (fetched from Firestore in orchestrator)
      const severity = report.ai?.assistant?.severity || "medium";
      const confidence = report.ai?.verification?.fakeMediaConfidence ?? 1.0;
      const fakeProbability = report.ai?.verification?.fakeMediaProbability ?? 0.0;
      const duplicateProbability = report.ai?.verification?.duplicateProbability ?? 0.0;

      const priority = PriorityEngine.calculate({
        severity,
        confidence,
        fakeProbability,
        duplicateProbability,
      });

      // Calculate final trust score: confidence penalized by fake and duplicate probabilities
      const trustScore = confidence * (1 - fakeProbability) * (1 - duplicateProbability);

      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
      await updateDoc(docRef, {
        "ai.verification.priority": priority,
        "ai.verification.trustScore": trustScore,
      });

      console.info(`[${this.name}] Priority: ${priority}, Trust Score: ${trustScore}`);
      return { priority, trustScore };
    } catch (error) {
      throw new AppError({
        message: `Priority calculation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        code: "PRIORITY_CALCULATION_FAILED",
        statusCode: 500,
        context: { reportId, error },
      });
    }
  }
}

export default PriorityEngineAgent;
