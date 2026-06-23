/**
 * @file src/ai/agents/base-agent.ts
 * @description Abstract base class defining the AI Agent lifecycle and execution pipeline.
 */

import { AgentConfig } from "../types/ai.types";
import { GeminiService } from "../services/gemini.service";

export abstract class BaseAgent<TInput, TOutput> {
  public readonly name: string;
  protected readonly modelName: string;
  protected readonly temperature: number;
  protected readonly maxOutputTokens?: number;

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.modelName = config.modelName || "gemini-3.5-flash";
    this.temperature = config.temperature ?? 0.1;
    this.maxOutputTokens = config.maxOutputTokens;
  }

  /**
   * Validates the input payload before invoking the generative model.
   * Throws errors if validation criteria are not met.
   */
  protected abstract validateInput(input: TInput): void;

  /**
   * Compiles prompt templates and system instructions.
   */
  protected abstract buildPrompt(input: TInput): {
    systemInstruction: string;
    prompt: string;
  };

  /**
   * Transforms or validates the model's parsed JSON output into the final strongly-typed output.
   */
  protected abstract parseResponse(rawText: string): TOutput;

  /**
   * Persists the agent execution result to Firestore (or other stores).
   */
  protected abstract persistResult(targetId: string, result: TOutput): Promise<void>;

  /**
   * Extracts media assets (if any) from the input to supply to Gemini.
   */
  protected getMediaAssets(_input: TInput): { url: string; mimeType: string }[] {
    return [];
  }

  /**
   * Returns a list of required JSON schema keys to enforce.
   */
  protected getRequiredKeys(): string[] {
    return [];
  }

  /**
   * Executes the standardized agent pipeline:
   * Validate -> Compile Prompts -> Invoke LLM -> Parse Response -> Save Result
   * @param targetId - Database document ID (e.g. reportId) to persist results against
   * @param input - The structured input data for the task
   */
  public async execute(targetId: string, input: TInput): Promise<TOutput> {
    // 1. Validate Input
    this.validateInput(input);

    // 2. Build Prompts
    const { systemInstruction, prompt } = this.buildPrompt(input);

    // 3. Extract media files
    const media = this.getMediaAssets(input);
    const requiredKeys = this.getRequiredKeys();

    // 4. Run LLM request through GeminiService
    const resultObj = await GeminiService.generateJson<Record<string, unknown>>(
      systemInstruction,
      prompt,
      media,
      requiredKeys,
      this.modelName,
      this.temperature,
      3,
      this.maxOutputTokens
    );

    // 5. Parse and finalize typed output
    const finalResult = this.parseResponse(JSON.stringify(resultObj));

    // 6. Persist to Firestore
    await this.persistResult(targetId, finalResult);

    return finalResult;
  }

  /**
   * Executes the AI pipeline (Validate -> Prompt -> Invoke LLM -> Parse Response)
   * WITHOUT persisting any results to the database.
   * @param input - The structured input data for the task
   */
  public async analyze(input: TInput): Promise<TOutput> {
    // 1. Validate Input
    this.validateInput(input);

    // 2. Build Prompts
    const { systemInstruction, prompt } = this.buildPrompt(input);

    // 3. Extract media files
    const media = this.getMediaAssets(input);
    const requiredKeys = this.getRequiredKeys();

    // 4. Run LLM request through GeminiService
    const resultObj = await GeminiService.generateJson<Record<string, unknown>>(
      systemInstruction,
      prompt,
      media,
      requiredKeys,
      this.modelName,
      this.temperature,
      3,
      this.maxOutputTokens
    );

    // 5. Parse and finalize typed output
    return this.parseResponse(JSON.stringify(resultObj));
  }
}
export default BaseAgent;
