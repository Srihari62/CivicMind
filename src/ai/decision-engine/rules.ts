/**
 * @file src/ai/decision-engine/rules.ts
 * @description Rules-based decision engine to process civic issue metadata.
 * Automates assignment to government departments, flags priority cases,
 * and overrides LLM classification for critical safety issues.
 */

import { OrchestratorReportResult } from "../orchestrator/agent-orchestrator";

export type DepartmentName =
  | "Department of Public Works"
  | "Department of Sanitation"
  | "Department of Parks & Recreation"
  | "Public Utility Commission"
  | "Emergency Management Services"
  | "General Municipal Administration";

/**
 * Standard department routing mapping.
 */
export const DEPARTMENT_ROUTING_MAP: Record<OrchestratorReportResult["category"], DepartmentName> = {
  infrastructure: "Department of Public Works",
  sanitation: "Department of Sanitation",
  environmental: "Department of Parks & Recreation",
  utility: "Public Utility Commission",
  public_safety: "Emergency Management Services",
  other: "General Municipal Administration",
};

export interface DispatchDecision {
  assignedDepartment: DepartmentName;
  requiresImmediateAlert: boolean;
  alertChannels: ("email" | "sms" | "pager" | "dashboard")[];
  dispatchAction: string;
  reasons: string[];
}

/**
 * RulesEngine evaluates AI output against hard municipal guidelines.
 */
export class DecisionEngine {
  /**
   * Evaluates AI-extracted report metadata to determine routing and escalation protocols.
   * @param aiAnalysis - Output analysis from the AgentOrchestrator
   * @returns DispatchDecision structured data
   */
  public static evaluateReport(aiAnalysis: Omit<OrchestratorReportResult, "autoResponse">): DispatchDecision {
    const reasons: string[] = [];
    let assignedDepartment = DEPARTMENT_ROUTING_MAP[aiAnalysis.category];
    let requiresImmediateAlert = false;
    const alertChannels: DispatchDecision["alertChannels"] = ["dashboard"];
    let dispatchAction = "Standard ticket queue assignment.";

    // Rule 1: Override standard department for critical/safety hazards to emergency services
    if (aiAnalysis.urgency === "critical") {
      requiresImmediateAlert = true;
      assignedDepartment = "Emergency Management Services";
      alertChannels.push("sms", "pager");
      dispatchAction = "IMMEDIATE DISPATCH REQUIRED: Dispatch field responders immediately.";
      reasons.push("Urgency graded as 'critical'.");
    }

    // Rule 2: Escalation based on public safety risk
    if (aiAnalysis.publicSafetyRisk && aiAnalysis.urgency !== "critical") {
      requiresImmediateAlert = true;
      alertChannels.push("email");
      dispatchAction = "PRIORITY DISPATCH: Queue ticket for priority department review.";
      reasons.push("AI classified public safety threat.");
    }

    // Rule 3: Category-specific overrides
    // E.g., gas leaks or water main bursts (utility) with high severity should bypass standard queues
    if (aiAnalysis.category === "utility" && aiAnalysis.urgency === "high") {
      requiresImmediateAlert = true;
      alertChannels.push("email", "sms");
      dispatchAction = "PRIORITY DISPATCH: Direct dispatch to utility emergency technician.";
      reasons.push("High priority utility threat detected.");
    }

    // Rule 4: Handle low confidence AI classifications by routing to general administration for manual triage
    if (aiAnalysis.confidence < 0.6) {
      assignedDepartment = "General Municipal Administration";
      dispatchAction = "MANUAL REVIEW REQUIRED: Low AI classification confidence.";
      reasons.push(`AI confidence score is too low (${Math.round(aiAnalysis.confidence * 100)}%).`);
    } else {
      reasons.push(`Routed automatically to [${assignedDepartment}] based on category [${aiAnalysis.category}].`);
    }

    return {
      assignedDepartment,
      requiresImmediateAlert,
      alertChannels,
      dispatchAction,
      reasons,
    };
  }
}
