/**
 * @file src/ai/orchestrator/agent-orchestrator.ts
 * @description Orchestrates multi-agent analysis for new civic reports.
 * Coordinates categorization, safety risks, urgency grading, and auto-response generation
 * in a production-ready asynchronous pipeline.
 */

import { CivicAgent } from "../agents/civic-agent";
import {
  CLASSIFICATION_SYSTEM_PROMPT,
  URGENCY_SYSTEM_PROMPT,
  buildResponderPrompt,
} from "../prompts/templates";
import { parseJSONResponse } from "../parser/response-parser";

/**
 * Structured analysis result returned by the orchestrator.
 */
export interface OrchestratorReportResult {
  category: "infrastructure" | "sanitation" | "environmental" | "utility" | "public_safety" | "other";
  confidence: number;
  tags: string[];
  summary: string;
  urgency: "critical" | "high" | "medium" | "low";
  urgencyReason: string;
  publicSafetyRisk: boolean;
  autoResponse: string;
  processedAt: string;
}

interface RawClassificationResult {
  category: OrchestratorReportResult["category"];
  confidence: number;
  tags: string[];
  summary: string;
}

interface RawUrgencyResult {
  level: OrchestratorReportResult["urgency"];
  reason: string;
  publicSafetyRisk: boolean;
}

/**
 * Coordinates tasks across various AI agents.
 */
export class AgentOrchestrator {
  private classifierAgent: CivicAgent;
  private urgencyAgent: CivicAgent;
  private responderAgent: CivicAgent;

  constructor() {
    // Classification agent: evaluates what the issue is about
    this.classifierAgent = new CivicAgent({
      name: "ClassifierAgent",
      systemPrompt: CLASSIFICATION_SYSTEM_PROMPT,
      temperature: 0.1, // Highly deterministic
    });

    // Urgency agent: determines dispatcher ranking
    this.urgencyAgent = new CivicAgent({
      name: "UrgencyAgent",
      systemPrompt: URGENCY_SYSTEM_PROMPT,
      temperature: 0.1,
    });

    // Auto-responder agent: writes custom email/SMS receipt templates
    this.responderAgent = new CivicAgent({
      name: "AutoResponderAgent",
      systemPrompt: "You are a friendly municipal assistant writing confirmations to citizens.",
      temperature: 0.7, // Higher temperature for more natural language
    });
  }

  /**
   * Processes a civic issue report through the agent pool.
   * Runs classification and urgency analysis in parallel for maximum speed.
   * @param userName - The reporting citizen's name
   * @param reportDescription - Detailed description of the reported issue
   * @returns Fully aggregated OrchestratorReportResult
   */
  public async processCivicReport(
    userName: string,
    reportDescription: string
  ): Promise<OrchestratorReportResult> {
    // Trigger classification and urgency in parallel to optimize processing duration
    const [classRaw, urgencyRaw] = await Promise.all([
      this.classifierAgent.execute(reportDescription),
      this.urgencyAgent.execute(reportDescription),
    ]);

    // Parse structured JSON outputs
    const classInfo = parseJSONResponse<RawClassificationResult>(classRaw);
    const urgencyInfo = parseJSONResponse<RawUrgencyResult>(urgencyRaw);

    // Build the dynamic receipt confirmation prompt
    const responderPrompt = buildResponderPrompt(
      userName,
      reportDescription,
      classInfo.category,
      urgencyInfo.level
    );

    // Generate automated feedback response
    const autoResponse = await this.responderAgent.execute(responderPrompt);

    return {
      category: classInfo.category,
      confidence: classInfo.confidence,
      tags: classInfo.tags,
      summary: classInfo.summary,
      urgency: urgencyInfo.level,
      urgencyReason: urgencyInfo.reason,
      publicSafetyRisk: urgencyInfo.publicSafetyRisk,
      autoResponse: autoResponse.trim(),
      processedAt: new Date().toISOString(),
    };
  }
}

// Export singleton orchestrator
export const orchestrator = new AgentOrchestrator();
