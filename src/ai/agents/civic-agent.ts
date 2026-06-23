/**
 * @file src/ai/agents/civic-agent.ts
 * @description Base class and interface for CivicMind specialized AI agents.
 * Wraps Gemini API invocation, manages system instructions, controls model parameters,
 * and standardizes the execution pathway.
 */

import { getGeminiModel, GEMINI_MODELS } from "@/services/gemini/config";
import { AppError, parseGeminiError } from "@/utils/error";

export interface AgentConfig {
  name: string;
  systemPrompt: string;
  modelName?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Base class representing a specialized LLM agent.
 */
export class CivicAgent {
  public readonly name: string;
  private readonly systemPrompt: string;
  private readonly modelName: string;
  private readonly temperature: number;
  private readonly maxOutputTokens?: number;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.systemPrompt = config.systemPrompt;
    this.modelName = config.modelName || GEMINI_MODELS.FLASH;
    this.temperature = config.temperature ?? 0.2; // Default low temperature for deterministic responses
    this.maxOutputTokens = config.maxOutputTokens;
  }

  /**
   * Executes a task using this agent's configuration and returns the raw string output.
   * @param promptContent - Input instructions or user report
   * @returns Raw text output from the model
   */
  public async execute(promptContent: string): Promise<string> {
    try {
      // Get the model instance (server-side only, will throw if run client-side)
      const model = getGeminiModel(this.modelName);

      // Call the generative API
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: promptContent }] }],
        generationConfig: {
          temperature: this.temperature,
          maxOutputTokens: this.maxOutputTokens,
        },
        // In the Google AI SDK, systemInstruction provides role alignment
        systemInstruction: this.systemPrompt,
      });

      const response = result.response;
      const responseText = response.text();

      if (!responseText) {
        throw new AppError({
          message: `Agent [${this.name}] returned an empty response.`,
          code: "AGENT_EMPTY_RESPONSE",
          statusCode: 502,
        });
      }

      return responseText;
    } catch (error: unknown) {
      // Catch and wrap standard errors to keep them clean
      const parsed = parseGeminiError(error);
      const err = error as Record<string, unknown> | null | undefined;
      const originalMessage = typeof err?.message === "string" ? err.message : "Unknown error";
      
      throw new AppError({
        message: `Agent [${this.name}] execution failed: ${parsed.message}`,
        code: parsed.code,
        statusCode: 502,
        context: { agent: this.name, originalError: originalMessage },
      });
    }
  }
}
