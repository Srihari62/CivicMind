/**
 * @file src/features/reports/services/stats.service.ts
 * @description Centralized single source of truth gamification service for tracking user civic points, levels, and badge achievements.
 */

import { UserRepository } from "@/features/auth/repositories/user.repository";
import { ReportRepository } from "../repositories/report.repository";

export interface GamificationStats {
  points: number; // Total XP
  contributionScore: number;
  civicScore: number;
  level: number;
  contributionLevel: number;
  civicLevel: number;
  badges: string[];
  reportsSubmitted: number;
  reportsAssigned: number;
  reportsResolved: number;
  reportsDuplicate: number;
  reportsFake: number;
  reportsVerified: number; // Verification count
  streakDays: number; // Current streak
  longestStreak: number;
  likesReceived: number;
  commentsPosted: number;
  feedReputation: number;
  achievementProgress: number; // Percentage 0-100
}

export class CitizenStatsService {
  /**
   * Initializes the gamification object for a new or existing user.
   */
  public static async initGamification(uid: string): Promise<GamificationStats> {
    const stats: GamificationStats = {
      points: 0,
      contributionScore: 0,
      civicScore: 0,
      level: 1,
      contributionLevel: 1,
      civicLevel: 1,
      badges: [],
      reportsSubmitted: 0,
      reportsAssigned: 0,
      reportsResolved: 0,
      reportsDuplicate: 0,
      reportsFake: 0,
      reportsVerified: 0,
      streakDays: 0,
      longestStreak: 0,
      likesReceived: 0,
      commentsPosted: 0,
      feedReputation: 0,
      achievementProgress: 0,
    };
    await UserRepository.updateUserProfile(uid, { gamification: stats } as any);
    return stats;
  }

  /**
   * Records a point transaction and triggers a sync to ensure Single Source of Truth.
   */
  public static async awardPoints(
    uid: string,
    pointsDelta: number,
    action: "submit" | "assignment_accepted" | "resolve" | "verify" | "fake" | "duplicate"
  ): Promise<GamificationStats> {
    try {
      const { db } = await import("@/services/firebase/firestore");
      const { collection, addDoc } = await import("firebase/firestore");
      await addDoc(collection(db, "users", uid, "pointsTransactions"), {
        points: pointsDelta,
        action,
        timestamp: new Date().toISOString(),
        description: action === "resolve" 
          ? "Report Resolved (+100 Civic Score)" 
          : action === "assignment_accepted"
          ? "Report Assigned (+50 Contribution Score)"
          : action === "verify" 
          ? "Community Verification Submitted (+15 Contribution Score)" 
          : `Civic Activity Reward (+${pointsDelta} XP)`,
      });
    } catch (e) {
      console.error("Failed to log points transaction:", e);
    }

    return await this.syncStats(uid);
  }

  /**
   * Recalculates and updates gamification stats based on actual reports database state.
   * Single Source of Truth implementation.
   */
  public static async syncStats(uid: string): Promise<GamificationStats> {
    const profile = await UserRepository.getUserProfile(uid);
    if (!profile) {
      throw new Error("User profile not found for stats sync.");
    }

    const currentStats: GamificationStats = (profile as any).gamification || {
      points: 0,
      contributionScore: 0,
      civicScore: 0,
      level: 1,
      badges: [],
      reportsSubmitted: 0,
      reportsAssigned: 0,
      reportsResolved: 0,
      reportsDuplicate: 0,
      reportsFake: 0,
      reportsVerified: 0,
      streakDays: 0,
      longestStreak: 0,
      likesReceived: 0,
      commentsPosted: 0,
      feedReputation: 0,
      achievementProgress: 0,
    };

    // Get all user reports
    const allReports = await ReportRepository.getAllReports();
    const isOfficer = profile.role === "officer";
    const userReports = isOfficer
      ? allReports.filter(r => r.ai?.assignment?.officerId === uid)
      : allReports.filter(r => r.metadata.createdBy === uid);
    
    // Lifecycle computations
    const reportsSubmitted = isOfficer ? 0 : userReports.length;
    
    const validAssignedStatuses = [
      "accepted", "travelling", "investigating", "repair_in_progress", "awaiting_verification", "resolved"
    ];
    const reportsAssigned = userReports.filter(r => validAssignedStatuses.includes(r.status)).length;
    const reportsResolved = userReports.filter(r => r.status === "resolved").length;

    // Duplicate Reports
    const reportsDuplicate = isOfficer ? 0 : userReports.filter(
      r => r.ai?.verification?.duplicateReportIds && r.ai.verification.duplicateReportIds.length > 0
    ).length;

    // Fake Reports
    const reportsFake = isOfficer ? 0 : userReports.filter(
      r => r.ai?.verification?.fakeMediaProbability && r.ai.verification.fakeMediaProbability > 0.5
    ).length;

    // Likes Received: Sum of supportCount of user's reports
    const likesReceived = isOfficer ? 0 : userReports.reduce((sum, r) => sum + (r.supportCount || 0), 0);

    // Query community verifications and comments count in real-time with safeguards
    let reportsVerified = currentStats.reportsVerified || 0;
    let commentsPosted = currentStats.commentsPosted || 0;

    try {
      if (typeof window === "undefined") {
        const { adminDb } = await import("@/services/firebase/admin");
        if (adminDb) {
          const verificationsSnap = await adminDb.collectionGroup("reportVerifications").where("verifiedBy", "==", uid).get();
          reportsVerified = verificationsSnap.size;

          const commentsSnap = await adminDb.collectionGroup("comments").where("userId", "==", uid).get();
          commentsPosted = commentsSnap.size;
        }
      } else {
        const { getDocs, query, collectionGroup, where } = await import("firebase/firestore");
        const { db } = await import("@/services/firebase/firestore");
        
        const verificationsSnap = await getDocs(query(collectionGroup(db, "reportVerifications"), where("verifiedBy", "==", uid)));
        reportsVerified = verificationsSnap.size;

        const commentsSnap = await getDocs(query(collectionGroup(db, "comments"), where("userId", "==", uid)));
        commentsPosted = commentsSnap.size;
      }
    } catch (err) {
      console.warn("Failed to fetch collectionGroup statistics, falling back to cached values:", err);
    }

    // Streak Calculations (Current and Longest)
    let streakDays = 0;
    let longestStreak = 0;
    
    const dates = userReports
      .map((r) => r.timestamps?.createdAt ? new Date(r.timestamps.createdAt) : null)
      .filter((d): d is Date => d !== null);

    if (dates.length > 0) {
      const uniqueDays = Array.from(
        new Set(
          dates.map((d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
          })
        )
      ).sort((a, b) => b.localeCompare(a)); // Newest first

      if (uniqueDays.length > 0) {
        const todayStr = new Date().toISOString().split("T")[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        
        const latestDay = uniqueDays[0];
        
        if (latestDay === todayStr || latestDay === yesterdayStr) {
          streakDays = 1;
          let tempStreak = 1;
          let lastDate = new Date(latestDay);
          
          for (let i = 1; i < uniqueDays.length; i++) {
            const nextDate = new Date(uniqueDays[i]);
            const diffTime = lastDate.getTime() - nextDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              tempStreak++;
              lastDate = nextDate;
            } else {
              break;
            }
          }
          streakDays = tempStreak;
        }

        // Longest Streak
        let maxStreak = 1;
        let tempStreak = 1;
        let lastDate = new Date(uniqueDays[0]);
        
        for (let i = 1; i < uniqueDays.length; i++) {
          const nextDate = new Date(uniqueDays[i]);
          const diffTime = lastDate.getTime() - nextDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            tempStreak++;
            maxStreak = Math.max(maxStreak, tempStreak);
          } else {
            tempStreak = 1;
          }
          lastDate = nextDate;
        }
        longestStreak = maxStreak;
      }
    }

    // Contribution Score: 50 per assigned report + 15 per verification
    const contributionScore = isOfficer ? 0 : (reportsAssigned * 50) + (reportsVerified * 15);
    
    // Civic Score: 100 per resolved report
    const civicScore = (reportsResolved * 100);

    // Total XP
    const points = isOfficer ? civicScore : contributionScore + civicScore;

    // Recalculate level based on points (unified overall level)
    let level = 1;
    if (points >= 1000) level = 5;
    else if (points >= 500) level = 4;
    else if (points >= 250) level = 3;
    else if (points >= 100) level = 2;

    // Recalculate contribution level separately
    let contributionLevel = 1;
    if (contributionScore >= 1000) contributionLevel = 5;
    else if (contributionScore >= 500) contributionLevel = 4;
    else if (contributionScore >= 250) contributionLevel = 3;
    else if (contributionScore >= 100) contributionLevel = 2;

    // Recalculate civic level separately
    let civicLevel = 1;
    if (civicScore >= 1000) civicLevel = 5;
    else if (civicScore >= 500) civicLevel = 4;
    else if (civicScore >= 250) civicLevel = 3;
    else if (civicScore >= 100) civicLevel = 2;

    // Recalculate badges dynamically (Civic badges use civicScore, not points)
    const badges: string[] = [];
    if (reportsSubmitted >= 1) badges.push("First Report");
    if (reportsVerified >= 5) badges.push("Community Helper");
    if (civicScore >= 250) badges.push("Trusted Citizen");
    if (civicScore >= 1000) badges.push("Civic Champion");

    if (reportsResolved >= 5) badges.push("Bronze Resolver");
    if (reportsResolved >= 15) badges.push("Silver Resolver");
    if (reportsResolved >= 30) badges.push("Gold Resolver");

    const achievementProgress = Math.round((badges.length / 7) * 100);

    // Feed Reputation
    const feedReputation = (likesReceived * 10) + (commentsPosted * 5);

    const updatedStats: GamificationStats = {
      points,
      contributionScore,
      civicScore,
      level,
      contributionLevel,
      civicLevel,
      badges,
      reportsSubmitted,
      reportsAssigned,
      reportsResolved,
      reportsDuplicate,
      reportsFake,
      reportsVerified,
      streakDays,
      longestStreak,
      likesReceived,
      commentsPosted,
      feedReputation,
      achievementProgress,
    };

    await UserRepository.updateUserProfile(uid, { gamification: updatedStats } as any);
    return updatedStats;
  }
}
export default CitizenStatsService;
