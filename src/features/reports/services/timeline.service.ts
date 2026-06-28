/**
 * @file src/features/reports/services/timeline.service.ts
 * @description Timeline service.
 * Manages the generation and appending of immutable report timeline events.
 */

import { ReportRepository } from "../repositories/report.repository";
import { TimelineEvent, UserRole, MediaAsset } from "@/types";

export class TimelineService {
  /**
   * Appends an immutable chronological event to a report's lifecycle timeline.
   */
  public static async logEvent(
    reportId: string,
    actorId: string,
    actorRole: UserRole | "system" | "ai",
    action: string,
    note?: string,
    actorName?: string,
    gps?: { latitude: number; longitude: number } | null,
    media?: MediaAsset[]
  ): Promise<void> {
    const event: any = {
      timestamp: new Date().toISOString(),
      actorId,
      actorRole,
      action,
    };

    if (note !== undefined) event.note = note;
    if (actorName !== undefined) event.actorName = actorName;
    if (gps !== undefined) event.gps = gps;
    if (media !== undefined) event.media = media;

    await ReportRepository.appendTimelineEvent(reportId, event);
  }

}
export default TimelineService;
