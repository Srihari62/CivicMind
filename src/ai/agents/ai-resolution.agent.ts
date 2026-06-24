/**
 * @file src/ai/agents/ai-resolution.agent.ts
 * @description AI agent for generating case resolution summaries.
 */

import { BaseAgent } from "./base-agent";
import { MediaAsset } from "@/types";
import { AppError } from "@/utils/error";
import { AI_MODELS } from "@/config/ai-models";

export interface AIResolutionInput {
  title: string;
  category: string;
  notes: string;
  beforeEvidence?: MediaAsset[];
  afterEvidence?: MediaAsset[];
}

export interface AIResolutionResult {
  summary: string;
  workCompleted: string;
  citizenExplanation: string;
}

export class AIResolutionAgent extends BaseAgent<AIResolutionInput, AIResolutionResult> {
  constructor() {
    super({
      name: "AI Resolution Agent",
      modelName: AI_MODELS.VERIFICATION,
      temperature: 0.1,
    });
  }

  protected validateInput(input: AIResolutionInput): void {
    if (!input.notes || input.notes.trim().length === 0) {
      throw new AppError({
        message: "Invalid input: Officer notes are required for resolution audit.",
        code: "AGENT_INPUT_INVALID",
        statusCode: 400,
      });
    }
  }

  protected buildPrompt(input: AIResolutionInput): { systemInstruction: string; prompt: string } {
    const systemInstruction = `You are a professional city municipal audit assistant.
Analyze the resolution notes and evidence uploaded by a field officer.
Generate a structured JSON output with the following keys:
- "summary": A concise technical summary of the resolution process (1-2 sentences).
- "workCompleted": A detailed description of the physical actions/repairs completed.
- "citizenExplanation": A citizen-friendly, polite, and clear explanation of the fix and why the incident is resolved.

Your output must be strict JSON matching this structure.`;

    const beforeInfo =
      input.beforeEvidence && input.beforeEvidence.length > 0
        ? input.beforeEvidence.map((m, i) => `Before Image ${i + 1}: ${m.url}`).join("\n")
        : "No before images uploaded.";

    const afterInfo =
      input.afterEvidence && input.afterEvidence.length > 0
        ? input.afterEvidence.map((m, i) => `After Image ${i + 1}: ${m.url}`).join("\n")
        : "No after images uploaded.";

    const prompt = `Incident Details:
Title: ${input.title}
Category: ${input.category}

Officer Notes:
"${input.notes}"

Before Evidence:
${beforeInfo}

After Evidence:
${afterInfo}`;

    return {
      systemInstruction,
      prompt,
    };
  }

  protected parseResponse(rawJson: string): AIResolutionResult {
    try {
      const parsed = JSON.parse(rawJson);
      return {
        summary: parsed.summary || "The issue has been resolved.",
        workCompleted: parsed.workCompleted || "Repairs have been completed by the municipal team.",
        citizenExplanation: parsed.citizenExplanation || "We have fixed the issue. Thank you for reporting!",
      };
    } catch (error) {
      throw new AppError({
        message: "Failed to parse raw response in AIResolutionAgent.",
        code: "AGENT_RESPONSE_PARSE_FAILED",
        statusCode: 500,
        context: { rawJson, error: error instanceof Error ? error.message : "JSON parse failed" },
      });
    }
  }

  protected async persistResult(_targetId: string, _result: AIResolutionResult): Promise<void> {
    // No persistence needed inside the agent itself. Persistence is handled by the AssignmentService.
  }

  protected getRequiredKeys(): string[] {
    return ["summary", "workCompleted", "citizenExplanation"];
  }
}
