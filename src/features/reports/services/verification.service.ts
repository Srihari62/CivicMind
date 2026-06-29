/**
 * @file src/features/reports/services/verification.service.ts
 * @description Report Verification Service.
 * Manages community verification votes, received votes counters, thresholds, and gamification points.
 */

import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "@/services/firebase/firestore";
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
    // Keep compatibility for any old calls by mapping to submitVerification
    const decision = vote === "verify" ? "support" : "not_found";
    return this.submitVerification(reportId, userId, decision, undefined, imageUrl);
  }

  /**
   * Submits a civic verification with comment and photo, dynamically updating support/notFound counts.
   */
  public static async submitVerification(
    reportId: string,
    userId: string,
    decision: "support" | "not_found",
    comment?: string,
    photoUrl?: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const verificationRef = doc(db, "reports", reportId, "reportVerifications", userId);
    const reportRef = doc(db, "reports", reportId);

    await runTransaction(db, async (transaction) => {
      const verificationSnap = await transaction.get(verificationRef);
      const reportSnap = await transaction.get(reportRef);

      if (!reportSnap.exists()) {
        throw new Error("Report does not exist.");
      }

      const reportData = reportSnap.data();
      const currentSupport = reportData.supportCount || 0;
      const currentNotFound = reportData.notFoundCount || 0;

      let newSupport = currentSupport;
      let newNotFound = currentNotFound;

      if (verificationSnap.exists()) {
        const oldData = verificationSnap.data();
        const oldDecision = oldData.verificationDecision;

        if (oldDecision !== decision) {
          if (oldDecision === "support") {
            newSupport = Math.max(0, newSupport - 1);
            newNotFound += 1;
          } else if (oldDecision === "not_found") {
            newNotFound = Math.max(0, newNotFound - 1);
            newSupport += 1;
          }
        }
      } else {
        if (decision === "support") {
          newSupport += 1;
        } else {
          newNotFound += 1;
        }
      }

      transaction.set(verificationRef, {
        verifiedAt: now,
        verifiedBy: userId,
        verificationPhoto: photoUrl || null,
        verificationComment: comment || null,
        verificationDecision: decision,
      });

      const updates: Record<string, any> = {
        supportCount: newSupport,
        notFoundCount: newNotFound,
        "timestamps.updatedAt": now,
      };

      // Set verification status on the report object
      const threshold = 3;
      const totalVerifications = newSupport;
      if (totalVerifications >= threshold && !reportData.ai?.verification?.communityVerified) {
        updates["ai.verification.communityVerified"] = true;
        updates["ai.verification.status"] = "verified";
      }

      transaction.update(reportRef, updates);
    });

    // Send notifications to the report owner
    try {
      const reportSnap = await getDoc(reportRef);
      if (reportSnap.exists()) {
        const reportData = reportSnap.data();
        const reportOwnerId = reportData.metadata?.createdBy;
        if (reportOwnerId && reportOwnerId !== userId) {
          await NotificationService.createNotification(
            reportOwnerId,
            "Report Verified",
            `Another citizen has verified your report "${reportData.metadata?.title || 'Incident'}" as ${decision === "support" ? "Support" : "Issue Not Found"}.`,
            "verification_completed",
            reportId
          );
        }
      }
    } catch (err) {
      console.error("Failed to create verification notification:", err);
    }
  }
}

export default ReportVerificationService;
