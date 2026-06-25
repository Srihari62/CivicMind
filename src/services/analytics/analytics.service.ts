/**
 * @file src/services/analytics/analytics.service.ts
 * @description Core analytics service that processes reports and user records deterministically.
 */

import { CivicReport } from "@/types";
import { FirestoreUserProfile } from "@/features/auth/repositories/user.repository";

export interface DepartmentScorecard {
  name: string;
  pendingReports: number;
  resolvedReports: number;
  backlogSize: number; // submitted, investigating, in_progress
  workload: number; // reports currently assigned to department which are not resolved/rejected
  averageResolutionTime: number; // in hours
  trustScoreAverage: number;
  totalCount: number;
}

export interface OfficerAnalytics {
  uid: string;
  name: string;
  email: string;
  department: string;
  assignedCount: number;
  resolvedCount: number;
  activeCases: number;
  averageResolutionTime: number; // in hours
  availability: "available" | "busy" | "offline" | "unknown";
}

export interface HotspotItem {
  locality: string;
  latitude: number;
  longitude: number;
  count: number;
  categories: Record<string, number>;
}

export interface DuplicateTrend {
  potentialDuplicatesCount: number;
  averageDuplicateProbability: number;
}

export interface FakeMediaTrend {
  potentialFakeMediaCount: number;
  averageFakeMediaProbability: number;
}

export interface ResolutionEfficiency {
  overallAverageHours: number;
  byCategory: Record<string, number>;
}

export interface MunicipalAnalyticsSummary {
  totalReports: number;
  pendingReports: number; // submitted
  resolvedReports: number;
  activeReports: number; // investigating + in_progress
  rejectedReports: number;
  departments: Record<string, DepartmentScorecard>;
  officers: OfficerAnalytics[];
  hotspots: HotspotItem[];
  duplicates: DuplicateTrend;
  fakeMedia: FakeMediaTrend;
  resolutionEfficiency: ResolutionEfficiency;
  categoryAnalytics: Record<string, number>;
  trustScoreInsights: {
    averageTrustScore: number;
    lowTrustCount: number; // trustScore < 50
  };
}

export class AnalyticsService {
  /**
   * Performs deterministic aggregation on the reports and users data.
   */
  public static calculateAnalytics(
    reports: CivicReport[],
    users: FirestoreUserProfile[]
  ): MunicipalAnalyticsSummary {
    const totalReports = reports.length;
    
    // Status Counts
    const pendingReports = reports.filter(r => r.status === "submitted").length;
    const resolvedReports = reports.filter(r => r.status === "resolved").length;
    const activeReports = reports.filter(
      r => r.status === "investigating" || r.status === "in_progress"
    ).length;
    const rejectedReports = reports.filter(r => r.status === "rejected").length;

    // 1. Department Scorecards
    const departments: Record<string, DepartmentScorecard> = {};
    const departmentNames = ["Roads", "Sanitation", "Electrical", "Water Supply", "Drainage", "Parks", "Traffic"];

    // Initialize with defaults
    for (const name of departmentNames) {
      departments[name] = {
        name,
        pendingReports: 0,
        resolvedReports: 0,
        backlogSize: 0,
        workload: 0,
        averageResolutionTime: 0,
        trustScoreAverage: 0,
        totalCount: 0,
      };
    }

    // Temporary storage for resolution times and trust scores by department
    const deptResolutionTimes: Record<string, number[]> = {};
    const deptTrustScores: Record<string, number[]> = {};

    for (const r of reports) {
      // Find assigned department
      const dept = r.ai?.assignment?.department || r.ai?.verification?.assignedDepartment || "Roads";
      if (!departments[dept]) {
        departments[dept] = {
          name: dept,
          pendingReports: 0,
          resolvedReports: 0,
          backlogSize: 0,
          workload: 0,
          averageResolutionTime: 0,
          trustScoreAverage: 0,
          totalCount: 0,
        };
      }

      const scorecard = departments[dept];
      scorecard.totalCount += 1;

      // Pending
      if (r.status === "submitted") {
        scorecard.pendingReports += 1;
      }

      // Backlog (submitted, investigating, in_progress)
      if (["submitted", "investigating", "in_progress"].includes(r.status)) {
        scorecard.backlogSize += 1;
      }

      // Workload (active, non-final)
      if (!["resolved", "rejected", "draft"].includes(r.status)) {
        scorecard.workload += 1;
      }

      // Resolved
      if (r.status === "resolved") {
        scorecard.resolvedReports += 1;
        
        const createdAt = new Date(r.timestamps.createdAt).getTime();
        const resolvedAt = r.resolution?.resolvedAt 
          ? new Date(r.resolution.resolvedAt).getTime() 
          : new Date(r.timestamps.updatedAt).getTime();
        
        const diffMs = resolvedAt - createdAt;
        if (diffMs > 0) {
          const diffHours = diffMs / (1000 * 60 * 60);
          if (!deptResolutionTimes[dept]) deptResolutionTimes[dept] = [];
          deptResolutionTimes[dept].push(diffHours);
        }
      }

      // Trust Score
      const trustScore = r.ai?.verification?.trustScore;
      if (typeof trustScore === "number") {
        if (!deptTrustScores[dept]) deptTrustScores[dept] = [];
        deptTrustScores[dept].push(trustScore);
      }
    }

    // Finalize departments averages
    for (const name in departments) {
      const scorecard = departments[name];
      const resTimes = deptResolutionTimes[name] || [];
      if (resTimes.length > 0) {
        scorecard.averageResolutionTime = Number(
          (resTimes.reduce((a, b) => a + b, 0) / resTimes.length).toFixed(1)
        );
      }
      const scores = deptTrustScores[name] || [];
      if (scores.length > 0) {
        scorecard.trustScoreAverage = Number(
          (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        );
      }
    }

    // 2. Officer Analytics
    const officerMap: Record<string, OfficerAnalytics> = {};
    const officersList = users.filter(u => u.role === "officer");
    
    for (const off of officersList) {
      officerMap[off.uid] = {
        uid: off.uid,
        name: off.displayName || "Officer " + off.email.split("@")[0],
        email: off.email,
        department: off.department || "Unassigned",
        assignedCount: 0,
        resolvedCount: 0,
        activeCases: off.activeCases || 0,
        averageResolutionTime: 0,
        availability: off.availability || "offline",
      };
    }

    const officerResTimes: Record<string, number[]> = {};

    for (const r of reports) {
      const officerId = r.ai?.assignment?.officerId;
      if (officerId && officerMap[officerId]) {
        const offMetrics = officerMap[officerId];
        offMetrics.assignedCount += 1;

        if (r.status === "resolved") {
          offMetrics.resolvedCount += 1;

          const createdAt = new Date(r.timestamps.createdAt).getTime();
          const resolvedAt = r.resolution?.resolvedAt 
            ? new Date(r.resolution.resolvedAt).getTime() 
            : new Date(r.timestamps.updatedAt).getTime();
          
          const diffMs = resolvedAt - createdAt;
          if (diffMs > 0) {
            const diffHours = diffMs / (1000 * 60 * 60);
            if (!officerResTimes[officerId]) officerResTimes[officerId] = [];
            officerResTimes[officerId].push(diffHours);
          }
        }
      }
    }

    // Finalize officer averages
    for (const uid in officerMap) {
      const offMetrics = officerMap[uid];
      const resTimes = officerResTimes[uid] || [];
      if (resTimes.length > 0) {
        offMetrics.averageResolutionTime = Number(
          (resTimes.reduce((a, b) => a + b, 0) / resTimes.length).toFixed(1)
        );
      }
    }

    const officers = Object.values(officerMap);

    // 3. Hotspot Intelligence (group by locality, subLocality or rounded coords)
    const hotspotGroups: Record<string, {
      locality: string;
      latSum: number;
      lngSum: number;
      count: number;
      categories: Record<string, number>;
    }> = {};

    for (const r of reports) {
      // Use locality or address prefix as key
      const locality = r.location.locality || r.location.subLocality || r.location.formattedAddress.split(",")[0] || "Unknown Locality";
      const key = locality.trim().toLowerCase();
      
      if (!hotspotGroups[key]) {
        hotspotGroups[key] = {
          locality,
          latSum: 0,
          lngSum: 0,
          count: 0,
          categories: {},
        };
      }

      const grp = hotspotGroups[key];
      grp.count += 1;
      grp.latSum += r.location.latitude;
      grp.lngSum += r.location.longitude;

      const cat = r.metadata.category;
      grp.categories[cat] = (grp.categories[cat] || 0) + 1;
    }

    const hotspots: HotspotItem[] = Object.values(hotspotGroups)
      .map(g => ({
        locality: g.locality,
        latitude: g.count > 0 ? Number((g.latSum / g.count).toFixed(6)) : 0,
        longitude: g.count > 0 ? Number((g.lngSum / g.count).toFixed(6)) : 0,
        count: g.count,
        categories: g.categories,
      }))
      .sort((a, b) => b.count - a.count); // sort descending by complaint count

    // 4. Duplicate Trends
    let potentialDuplicatesCount = 0;
    let dupProbSum = 0;
    let dupCount = 0;

    for (const r of reports) {
      const prob = r.ai?.verification?.duplicateProbability;
      if (typeof prob === "number") {
        dupProbSum += prob;
        dupCount += 1;
        if (prob > 0.5) {
          potentialDuplicatesCount += 1;
        }
      }
    }

    const duplicates: DuplicateTrend = {
      potentialDuplicatesCount,
      averageDuplicateProbability: dupCount > 0 ? Number((dupProbSum / dupCount).toFixed(2)) : 0,
    };

    // 5. Fake Media Trends
    let potentialFakeMediaCount = 0;
    let fakeMediaProbSum = 0;
    let fakeCount = 0;

    for (const r of reports) {
      const prob = r.ai?.verification?.fakeMediaProbability;
      if (typeof prob === "number") {
        fakeMediaProbSum += prob;
        fakeCount += 1;
        if (prob > 0.5) {
          potentialFakeMediaCount += 1;
        }
      }
    }

    const fakeMedia: FakeMediaTrend = {
      potentialFakeMediaCount,
      averageFakeMediaProbability: fakeCount > 0 ? Number((fakeMediaProbSum / fakeCount).toFixed(2)) : 0,
    };

    // 6. Resolution Efficiency & Category Analytics
    const categoryAnalytics: Record<string, number> = {};
    const categoryResTimes: Record<string, number[]> = {};
    const allResolutionTimes: number[] = [];

    for (const r of reports) {
      const cat = r.metadata.category;
      categoryAnalytics[cat] = (categoryAnalytics[cat] || 0) + 1;

      if (r.status === "resolved") {
        const createdAt = new Date(r.timestamps.createdAt).getTime();
        const resolvedAt = r.resolution?.resolvedAt 
          ? new Date(r.resolution.resolvedAt).getTime() 
          : new Date(r.timestamps.updatedAt).getTime();
        
        const diffMs = resolvedAt - createdAt;
        if (diffMs > 0) {
          const diffHours = diffMs / (1000 * 60 * 60);
          allResolutionTimes.push(diffHours);
          if (!categoryResTimes[cat]) categoryResTimes[cat] = [];
          categoryResTimes[cat].push(diffHours);
        }
      }
    }

    const overallAverageHours = allResolutionTimes.length > 0
      ? Number((allResolutionTimes.reduce((a, b) => a + b, 0) / allResolutionTimes.length).toFixed(1))
      : 0;

    const byCategory: Record<string, number> = {};
    for (const cat in categoryResTimes) {
      const times = categoryResTimes[cat];
      byCategory[cat] = Number((times.reduce((a, b) => a + b, 0) / times.length).toFixed(1));
    }

    const resolutionEfficiency: ResolutionEfficiency = {
      overallAverageHours,
      byCategory,
    };

    // 7. Trust Score Insights
    let trustScoreSum = 0;
    let trustCount = 0;
    let lowTrustCount = 0;

    for (const r of reports) {
      const score = r.ai?.verification?.trustScore;
      if (typeof score === "number") {
        trustScoreSum += score;
        trustCount += 1;
        if (score < 50) {
          lowTrustCount += 1;
        }
      }
    }

    const averageTrustScore = trustCount > 0 ? Number((trustScoreSum / trustCount).toFixed(1)) : 0;

    return {
      totalReports,
      pendingReports,
      resolvedReports,
      activeReports,
      rejectedReports,
      departments,
      officers,
      hotspots,
      duplicates,
      fakeMedia,
      resolutionEfficiency,
      categoryAnalytics,
      trustScoreInsights: {
        averageTrustScore,
        lowTrustCount,
      },
    };
  }
}
