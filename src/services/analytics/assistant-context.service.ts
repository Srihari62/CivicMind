/**
 * @file src/services/analytics/assistant-context.service.ts
 * @description In-memory server-side context service for caching municipal analytics and building AI prompts.
 */

import { ReportRepository } from "@/features/reports/repositories/report.repository";
import { UserRepository, FirestoreUserProfile } from "@/features/auth/repositories/user.repository";
import { AnalyticsService, MunicipalAnalyticsSummary } from "./analytics.service";
import { CivicReport } from "@/types";

interface ContextCache {
  lastFetched: number;
  analytics: MunicipalAnalyticsSummary | null;
  rawReports: CivicReport[];
  rawUsers: FirestoreUserProfile[];
}

export class AssistantContextService {
  private static cache: ContextCache = {
    lastFetched: 0,
    analytics: null,
    rawReports: [],
    rawUsers: [],
  };

  private static CACHE_TTL_MS = 45 * 1000; // 45 seconds cache TTL

  /**
   * Fetches latest data, computes analytics, and caches the result.
   * Can force refresh if needed (e.g., when the user clicks 'Sync Command Center').
   */
  public static async getMunicipalContext(forceRefresh = false): Promise<MunicipalAnalyticsSummary> {
    const now = Date.now();
    const isCacheExpired = now - this.cache.lastFetched > this.CACHE_TTL_MS;

    if (!this.cache.analytics || isCacheExpired || forceRefresh) {
      console.info(`[AssistantContextService] Fetching fresh datasets from Firestore (forceRefresh=${forceRefresh})`);
      
      // Fetch both reports and users from repositories (safe for server-side environments)
      const [reports, users] = await Promise.all([
        ReportRepository.getAllReports(),
        UserRepository.getAllUsers()
      ]);

      const analytics = AnalyticsService.calculateAnalytics(reports, users);

      this.cache = {
        lastFetched: now,
        analytics,
        rawReports: reports,
        rawUsers: users,
      };
    } else {
      console.info("[AssistantContextService] Serving cached municipal context (TTL remaining)");
    }

    return this.cache.analytics!;
  }

  /**
   * Clear the cache.
   */
  public static clearCache(): void {
    this.cache = {
      lastFetched: 0,
      analytics: null,
      rawReports: [],
      rawUsers: [],
    };
  }

  /**
   * Transforms the rich analytics summary into a high-density, compact summary
   * to avoid exceeding Gemini token limits while maintaining full truthfulness.
   */
  public static buildCompactContext(analytics: MunicipalAnalyticsSummary): string {
    if (!analytics || analytics.totalReports === 0) {
      return JSON.stringify({
        status: "Insufficient data available.",
        totalReports: 0,
      });
    }

    // Build department scorecards summary
    const deptScorecards = Object.values(analytics.departments).map(d => ({
      dept: d.name,
      pending: d.pendingReports,
      resolved: d.resolvedReports,
      backlog: d.backlogSize,
      workload: d.workload,
      avgResHours: d.averageResolutionTime,
      avgTrust: d.trustScoreAverage
    }));

    // Top 5 hotspots
    const topHotspots = analytics.hotspots.slice(0, 5).map(h => ({
      locality: h.locality,
      lat: h.latitude,
      lng: h.longitude,
      count: h.count,
      categories: h.categories
    }));

    // Officer workloads & performance
    const officerWorkloads = analytics.officers.map(o => ({
      name: o.name,
      dept: o.department,
      assigned: o.assignedCount,
      resolved: o.resolvedCount,
      activeCases: o.activeCases,
      avgResHours: o.averageResolutionTime,
      availability: o.availability
    }));

    // Category breakdown
    const categories = analytics.categoryAnalytics;

    // Compile compact object
    const compact = {
      summary: {
        totalReports: analytics.totalReports,
        pendingReports: analytics.pendingReports,
        resolvedReports: analytics.resolvedReports,
        activeReports: analytics.activeReports,
        rejectedReports: analytics.rejectedReports,
        averageTrustScore: analytics.trustScoreInsights.averageTrustScore,
        lowTrustCount: analytics.trustScoreInsights.lowTrustCount,
        overallAvgResolutionHours: analytics.resolutionEfficiency.overallAverageHours
      },
      departments: deptScorecards,
      topHotspots,
      officers: officerWorkloads,
      duplicates: {
        potentialDuplicatesCount: analytics.duplicates.potentialDuplicatesCount,
        averageDuplicateProbability: analytics.duplicates.averageDuplicateProbability
      },
      fakeMedia: {
        potentialFakeMediaCount: analytics.fakeMedia.potentialFakeMediaCount,
        averageFakeMediaProbability: analytics.fakeMedia.averageFakeMediaProbability
      },
      categoryCounts: categories,
      resolutionHoursByCategory: analytics.resolutionEfficiency.byCategory
    };

    return JSON.stringify(compact, null, 2);
  }
}
