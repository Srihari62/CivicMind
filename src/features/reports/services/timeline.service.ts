/**
 * @file src/features/reports/services/timeline.service.ts
 * @description Timeline service.
 * Manages the generation and appending of immutable report timeline events.
 */

import { ReportRepository } from "../repositories/report.repository";
import { TimelineEvent, UserRole } from "@/types";

export class TimelineService {
  /**
   * Appends an immutable chronological event to a report's lifecycle timeline.
   */
  public static async logEvent(
    reportId: string,
    actorId: string,
    actorRole: UserRole | "system" | "ai",
    action: string,
    note?: string
  ): Promise<void> {
    const event: TimelineEvent = {
      timestamp: new Date().toISOString(),
      actorId,
      actorRole,
      action,
      note,
    };
    await ReportRepository.appendTimelineEvent(reportId, event);
  }
}
export default TimelineService;
