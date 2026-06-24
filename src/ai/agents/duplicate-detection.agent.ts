/**
 * @file src/ai/agents/duplicate-detection.agent.ts
 * @description specialized AI agent that checks Firestore for nearby/recent reports and detects duplicates.
 */

import { BaseAgent } from "./base-agent";
import { CivicReport } from "@/types";
import { DuplicateDetectionResult } from "../types/ai.types";
import { DUPLICATE_DETECTION_PROMPTS } from "../prompts/duplicate-detection.prompt";
import { PromptBuilder } from "../prompts/evidence.prompt";
import { doc, updateDoc, collection, getDocs, query } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { AppError } from "@/utils/error";

import { AI_MODELS } from "@/config/ai-models";

export class DuplicateDetectionAgent extends BaseAgent<CivicReport, DuplicateDetectionResult> {
  private nearbyReports: CivicReport[] = [];

  constructor() {
    super({
      name: "Duplicate Detection Agent",
      modelName: AI_MODELS.VERIFICATION,
      temperature: 0.1,
    });
  }

  public async execute(targetId: string, input: CivicReport): Promise<DuplicateDetectionResult> {
    this.nearbyReports = await this.fetchNearbyReports(input);
    return super.execute(targetId, input);
  }

  public async analyze(input: CivicReport): Promise<DuplicateDetectionResult> {
    this.nearbyReports = await this.fetchNearbyReports(input);
    return super.analyze(input);
  }

  /**
   * Validates that the report possesses necessary coordinates.
   */
  protected validateInput(report: CivicReport): void {
    if (!report.id) {
      throw new AppError({
        message: "Invalid input: Report ID is missing.",
        code: "AGENT_INPUT_INVALID",
        statusCode: 400,
      });
    }
  }

  /**
   * Compiles the report details and nearby candidate details into the prompt template.
   */
  protected buildPrompt(report: CivicReport): { systemInstruction: string; prompt: string } {
    const activePrompt = DUPLICATE_DETECTION_PROMPTS["1.0.0"];

    const existingReportsList = this.nearbyReports.length > 0
      ? this.nearbyReports.map((r, i) => {
          return `Report ${i + 1}:
ID: ${r.id}
Title: ${r.metadata?.title || "N/A"}
Description: ${r.metadata?.description || "N/A"}
Category: ${r.metadata?.category || "N/A"}
Latitude: ${r.location?.latitude || "N/A"}, Longitude: ${r.location?.longitude || "N/A"}
Address: ${r.location?.formattedAddress || "N/A"}
Created At: ${r.timestamps?.createdAt || "N/A"}`;
        }).join("\n\n")
      : "No nearby reports found in the system.";

    const compiledPrompt = PromptBuilder.compile(activePrompt.template, {
      title: report.metadata?.title || "N/A",
      description: report.metadata?.description || "N/A",
      category: report.metadata?.category || "N/A",
      latitude: report.location?.latitude !== undefined ? report.location.latitude : "N/A",
      longitude: report.location?.longitude !== undefined ? report.location.longitude : "N/A",
      formattedAddress: report.location?.formattedAddress || "N/A",
      existingReportsList,
    });

    return {
      systemInstruction: activePrompt.systemInstruction,
      prompt: compiledPrompt,
    };
  }

  /**
   * Transforms the parsed JSON output from Gemini into the final DuplicateDetectionResult.
   */
  protected parseResponse(rawJson: string): DuplicateDetectionResult {
    try {
      const parsed = JSON.parse(rawJson);

      const duplicateProbability = typeof parsed.duplicateProbability === "number" ? parsed.duplicateProbability : 0;
      const duplicateReportIds = Array.isArray(parsed.duplicateReportIds) ? parsed.duplicateReportIds.map(String) : [];
      const reasoning = String(parsed.reasoning || "").trim();

      return {
        duplicateProbability,
        duplicateReportIds,
        reasoning,
      };
    } catch (error) {
      throw new AppError({
        message: "Failed to parse and map raw model response to DuplicateDetectionResult model.",
        code: "AGENT_RESPONSE_PARSE_FAILED",
        statusCode: 500,
        context: { rawJson, error: error instanceof Error ? error.message : "JSON parse failed" },
      });
    }
  }

  /**
   * Returns empty array since duplicate detection is text-metadata based.
   */
  protected getMediaAssets(_report: CivicReport): { url: string; mimeType: string }[] {
    return [];
  }

  /**
   * Required keys in response JSON schema.
   */
  protected getRequiredKeys(): string[] {
    return ["duplicateProbability", "duplicateReportIds", "reasoning"];
  }

  protected async persistResult(reportId: string, result: DuplicateDetectionResult): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.REPORTS, reportId);

      await updateDoc(docRef, {
        "ai.verification.duplicateProbability": result.duplicateProbability,
        "ai.verification.duplicateReportIds": result.duplicateReportIds,
        "ai.verification.duplicateReason": result.reasoning,
      });
    } catch (error) {
      throw new AppError({
        message: `Failed to persist DuplicateDetectionAgent output: ${
          error instanceof Error ? error.message : "Database write error"
        }`,
        code: "AGENT_PERSIST_FAILED",
        statusCode: 500,
        context: { reportId, result, error },
      });
    }
  }

  /**
   * Local helper to calculate distance between two coordinates in kilometers (Haversine formula).
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Queries reports from Firestore to perform local proximity comparisons.
   */
  private async fetchNearbyReports(report: CivicReport): Promise<CivicReport[]> {
    try {
      const q = query(collection(db, COLLECTIONS.REPORTS));
      const snapshot = await getDocs(q);
      const reports: CivicReport[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as CivicReport;
        if (data.id === report.id) return;

        if (
          report.location?.latitude !== undefined &&
          report.location?.longitude !== undefined &&
          data.location?.latitude !== undefined &&
          data.location?.longitude !== undefined
        ) {
          const dist = this.calculateDistance(
            report.location.latitude,
            report.location.longitude,
            data.location.latitude,
            data.location.longitude
          );
          // Proximity criteria: 5.0 kilometers
          if (dist <= 5.0) {
            reports.push(data);
          }
        }
      });

      return reports;
    } catch (error) {
      console.error("Failed to fetch nearby reports for duplicate detection:", error);
      return [];
    }
  }
}
export default DuplicateDetectionAgent;
