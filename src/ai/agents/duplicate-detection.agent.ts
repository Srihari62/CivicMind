/**
 * @file src/ai/agents/duplicate-detection.agent.ts
 * @description Specialized deterministic agent that checks Firestore for nearby/recent reports in the same category to detect duplicates.
 */

import { CivicReport } from "@/types";
import { DuplicateDetectionResult } from "../types/ai.types";
import { safeDb } from "@/services/firebase/admin";
import { AppError } from "@/utils/error";

export class DuplicateDetectionAgent {
  public readonly name = "Duplicate Detection Agent";

  // Configurable parameters
  private readonly radiusKm: number;
  private readonly timeWindowMs: number;

  constructor(radiusKm = 0.5, timeWindowHours = 24) {
    this.radiusKm = radiusKm;
    this.timeWindowMs = timeWindowHours * 60 * 60 * 1000;
  }

  /**
   * Executes deterministic duplicate detection.
   */
  public async execute(reportId: string, report: CivicReport): Promise<DuplicateDetectionResult> {
    console.info(`[${this.name}] Starting duplicate detection for report ${reportId}`);
    try {
      const category = report.metadata?.category;
      if (!category) {
        return {
          duplicateProbability: 0.0,
          duplicateReportIds: [],
          reasoning: "No category provided for duplicate checking.",
        };
      }

      const reports = await safeDb.getReportsByCategory(category);

      const duplicateReportIds: string[] = [];
      const reportTime = new Date(report.timestamps.createdAt).getTime();

      reports.forEach((data) => {
        if (data.id === reportId) return;

        // Check time window
        const docTime = new Date(data.timestamps.createdAt).getTime();
        const timeDiff = Math.abs(reportTime - docTime);
        if (timeDiff > this.timeWindowMs) return;

        // Check proximity
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
          if (dist <= this.radiusKm) {
            duplicateReportIds.push(data.id);
          }
        }
      });

      const duplicateProbability = duplicateReportIds.length > 0 ? 0.95 : 0.0;
      const reasoning = duplicateReportIds.length > 0
        ? `Detected ${duplicateReportIds.length} duplicate report(s) of the same category within ${this.radiusKm}km and a ${this.timeWindowMs / 3600000}-hour window.`
        : "No duplicate reports detected within the specified radius and time window.";

      return {
        duplicateProbability,
        duplicateReportIds,
        reasoning,
      };
    } catch (error) {
      throw new AppError({
        message: `Duplicate detection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        code: "DUPLICATE_DETECTION_FAILED",
        statusCode: 500,
        context: { reportId, error },
      });
    }
  }

  /**
   * Helper to calculate distance between two coordinates in kilometers (Haversine formula).
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
}

export default DuplicateDetectionAgent;
