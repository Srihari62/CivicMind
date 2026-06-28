/**
 * @file src/features/reports/services/stats.service.ts
 * @description Gamification service for tracking user civic points, levels, and badge achievements.
 */

import { UserRepository } from "@/features/auth/repositories/user.repository";

export interface GamificationStats {
  points: number;
  level: number;
  badges: string[];
  reportsSubmitted: number;
  reportsResolved: number;
  reportsVerified: number;
  streakDays: number;
}

export class CitizenStatsService {
  /**
   * Initializes the gamification object for a new or existing user.
   */
  public static async initGamification(uid: string): Promise<GamificationStats> {
    const stats: GamificationStats = {
      points: 0,
      level: 1,
      badges: [],
      reportsSubmitted: 0,
      reportsResolved: 0,
      reportsVerified: 0,
      streakDays: 0,
    };
    await UserRepository.updateUserProfile(uid, { gamification: stats } as any);
    return stats;
  }

  /**
   * Adjusts civic points and recalculates levels and badges.
   */
  public static async awardPoints(
    uid: string,
    pointsDelta: number,
    action: "submit" | "resolve" | "verify" | "fake" | "duplicate"
  ): Promise<GamificationStats> {
    const profile = await UserRepository.getUserProfile(uid);
    if (!profile) {
      throw new Error("User profile not found for points award.");
    }

    const currentStats: GamificationStats = (profile as any).gamification || {
      points: 0,
      level: 1,
      badges: [],
      reportsSubmitted: 0,
      reportsResolved: 0,
      reportsVerified: 0,
      streakDays: 0,
    };

    let points = currentStats.points + pointsDelta;
    if (points < 0) points = 0; // Prevent negative points

    let reportsSubmitted = currentStats.reportsSubmitted || 0;
    let reportsResolved = currentStats.reportsResolved || 0;
    let reportsVerified = currentStats.reportsVerified || 0;

    if (action === "submit") reportsSubmitted += 1;
    if (action === "resolve") reportsResolved += 1;
    if (action === "verify") reportsVerified += 1;

    // Level Thresholds
    // Level 1: 0, Level 2: 100, Level 3: 250, Level 4: 500, Level 5: 1000
    let level = 1;
    if (points >= 1000) level = 5;
    else if (points >= 500) level = 4;
    else if (points >= 250) level = 3;
    else if (points >= 100) level = 2;

    // Badges Calculation
    const badges = [...(currentStats.badges || [])];
    const addBadgeIfMissing = (badge: string) => {
      if (!badges.includes(badge)) {
        badges.push(badge);
      }
    };

    if (reportsSubmitted >= 1) addBadgeIfMissing("First Report");
    if (reportsVerified >= 5) addBadgeIfMissing("Community Helper");
    if (points >= 250) addBadgeIfMissing("Trusted Citizen");
    if (points >= 1000) addBadgeIfMissing("Civic Champion");

    // Dynamic milestones based on total count of resolved reports
    if (reportsResolved >= 5) addBadgeIfMissing("Bronze Resolver");
    if (reportsResolved >= 15) addBadgeIfMissing("Silver Resolver");
    if (reportsResolved >= 30) addBadgeIfMissing("Gold Resolver");

    const updatedStats: GamificationStats = {
      ...currentStats,
      points,
      level,
      badges,
      reportsSubmitted,
      reportsResolved,
      reportsVerified,
    };

    await UserRepository.updateUserProfile(uid, { gamification: updatedStats } as any);
    return updatedStats;
  }
}
export default CitizenStatsService;
