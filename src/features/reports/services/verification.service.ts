/**
 * @file src/features/reports/services/verification.service.ts
 * @description Report Verification Service.
 * Manages community verification votes, received votes counters, thresholds, and gamification points.
 */

import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/services/firebase/firestore";
import { CitizenStatsService } from "./stats.service";
import { NotificationService } from "./notification.service";

export class ReportVerificationService {
  /**
   * Performs community verification on a report, logging the vote, incrementing vote counts,
   * checking thresholds, and awarding points to the verifying user.
   */
  public static async verifyReport(
    reportId: string,
    userId: string,
    vote: "verify" | "inaccurate",
    imageUrl?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    
    // 1. Create subcollection document
    const docRef = doc(db, "reports", reportId, "reportVerifications", userId);
    await setDoc(docRef, {
      userId,
      reportId,
      vote,
      imageUrl: imageUrl || null,
      createdAt: now,
    });

    // 2. Fetch the report document
    const reportRef = doc(db, "reports", reportId);
    const reportSnap = await getDoc(reportRef);
    if (!reportSnap.exists()) return;
    const reportData = reportSnap.data();

    // 3. Update vote counts and check threshold
    const currentVotes = (reportData.ai?.verification?.receivedVotes || 0) + 1;
    const threshold = 3; // Threshold for community verification status
    const communityVerified = currentVotes >= threshold;

    const updates: Record<string, any> = {
      "ai.verification.receivedVotes": currentVotes,
      "timestamps.updatedAt": now,
    };

    if (communityVerified) {
      updates["ai.verification.communityVerified"] = true;
      updates["ai.verification.status"] = "verified";
    }

    await updateDoc(reportRef, updates);

    // 5. Notify the owner of the report
    const reportOwnerId = reportData.metadata?.createdBy;
    if (reportOwnerId && reportOwnerId !== userId) {
      await NotificationService.createNotification(
        reportOwnerId,
        "Report Verified",
        `Another citizen has verified your report "${reportData.metadata?.title || 'Incident'}".`,
        "verification_completed",
        reportId
      );
    }
  }
}

export default ReportVerificationService;
