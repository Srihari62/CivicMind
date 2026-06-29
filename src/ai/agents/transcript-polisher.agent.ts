/**
 * @file src/ai/agents/transcript-polisher.agent.ts
 * @description Server-side AI agent that lightly polishes raw speech-to-text transcripts
 * and moderates civic language. Runs ONLY after recording is complete.
 *
 * Responsibilities:
 * - Add punctuation, capitalization, and proper spacing
 * - Split run-on sentences
 * - Remove repeated words
 * - Preserve original language (never translate)
 * - Preserve facts: names, addresses, numbers, locations, civic terminology
 * - Sanitize profanity, abusive language, hate speech, and personal attacks
 *   while keeping the genuine civic complaint intact
 *
 * It does NOT rewrite, summarize, expand, or change the user's intent.
 */

import "server-only";

import { getGeminiModel } from "@/services/gemini/config";
import { AI_MODELS } from "@/config/ai-models";

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are an expert multilingual transcription editor for a civic issue reporting platform used by Indian citizens.

Your ONLY responsibilities are:
1. Add missing punctuation (periods, commas, question marks).
2. Fix capitalization at sentence starts and for proper nouns.
3. Fix spacing and remove extra whitespace.
4. Split overly long run-on sentences into shorter readable sentences.
5. Remove immediately repeated words or phrases.
6. Preserve ALL facts exactly: names, addresses, numbers, road names, locality names, and civic terminology.
7. Preserve the original language — NEVER translate. If the input is in Telugu, output Telugu. If Hindi, output Hindi. Same for Tamil, Kannada, Malayalam, Marathi, Gujarati, Punjabi, Bengali, Odia, Urdu, or English.
8. If the text contains profanity, abusive words, insults, hate speech, personal attacks, slurs, or threats: replace ONLY those offensive parts with respectful civic language that preserves the original complaint and frustration. Do not remove the complaint.
9. Do not add new information. Do not remove factual content. Do not rewrite the complaint. Do not summarize.

Return ONLY the corrected transcript. No explanations. No commentary. No quotes around the output. Just the cleaned text.`;

// ─── Agent ────────────────────────────────────────────────────────────────────

export class TranscriptPolisherAgent {
  private readonly modelName: string;

  constructor() {
    this.modelName = AI_MODELS.ASSISTANT; // gemini-3.1-flash-lite
  }

  /**
   * Polishes a raw transcript. Preserves original language and civic intent.
   * @param rawTranscript - The completed speech-to-text transcript
   * @param languageHint  - BCP-47 language code hint (e.g. "te-IN") for the model
   * @returns Polished, moderated transcript string
   */
  async polish(rawTranscript: string, languageHint = "en-IN"): Promise<string> {
    if (!rawTranscript || rawTranscript.trim().length < 15) {
      return rawTranscript;
    }

    const model = getGeminiModel(this.modelName);

    const langName = this.langCodeToName(languageHint);
    const userPrompt = `Language hint: ${langName} (${languageHint})

Raw transcript to polish:
"""
${rawTranscript.trim()}
"""`;

    const result = await model.generateContent({
      systemInstruction: SYSTEM_INSTRUCTION,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
        candidateCount: 1,
      },
    });

    const polished = result.response.text().trim();

    // Safety: never return empty output — fall back to original
    if (!polished || polished.length < 3) {
      return rawTranscript;
    }

    return polished;
  }

  private langCodeToName(code: string): string {
    const map: Record<string, string> = {
      "en-IN": "English",
      "hi-IN": "Hindi",
      "te-IN": "Telugu",
      "ta-IN": "Tamil",
      "kn-IN": "Kannada",
      "ml-IN": "Malayalam",
      "mr-IN": "Marathi",
      "gu-IN": "Gujarati",
      "pa-IN": "Punjabi",
      "bn-IN": "Bengali",
      "or-IN": "Odia",
      "ur-IN": "Urdu",
    };
    return map[code] ?? "Unknown";
  }
}
