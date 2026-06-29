/**
 * @file src/features/reports/services/notification.service.ts
 * @description Real-time database-backed notification service.
 * Manages notification persistence in Firestore and provides triggers for citizen, officer, and admin alerts.
 */

import { collection, doc, setDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/services/firebase/firestore";
import { auth } from "@/services/firebase/auth";
import { CivicReport } from "@/types";

export interface DbNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  reportId: string;
  read: boolean;
  createdAt: string;
}

export class NotificationService {
  /**
   * Helper to write a notification to Firestore.
   */
  public static async createNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    reportId: string
  ): Promise<void> {
    const now = new Date().toISOString();

    // Deduplication check: if there is an unread notification of same type/report/user, update it instead of creating a duplicate
    if (typeof window === "undefined") {
      const { adminDb, safeDb } = await import("@/services/firebase/admin");
      const useAdmin = await safeDb.checkAdminSupport();
      if (useAdmin && adminDb) {
        const existing = await adminDb.collection("notifications")
          .where("userId", "==", userId)
          .where("reportId", "==", reportId)
          .where("type", "==", type)
          .where("read", "==", false)
          .get();
        if (!existing.empty) {
          const existingId = existing.docs[0].id;
          await adminDb.collection("notifications").doc(existingId).update({
            createdAt: now,
            message: message
          });
          return;
        }
      }
    } else {
      const currentUid = auth.currentUser?.uid;
      if (currentUid === userId) {
        try {
          const { getDocs, query, where, collection, updateDoc } = await import("firebase/firestore");
          const q = query(
            collection(db, "notifications"),
            where("userId", "==", userId),
            where("reportId", "==", reportId),
            where("type", "==", type),
            where("read", "==", false)
          );
          const existing = await getDocs(q);
          if (!existing.empty) {
            const existingDoc = existing.docs[0];
            await updateDoc(doc(db, "notifications", existingDoc.id), {
              createdAt: now,
              message: message
            });
            return;
          }
        } catch (err) {
          console.warn("Deduplication notification check skipped or failed:", err);
        }
      }
    }

    const notificationId = doc(collection(db, "notifications")).id;
    const notificationData: DbNotification = {
      id: notificationId,
      userId,
      title,
      message,
      type,
      reportId,
      read: false,
      createdAt: now,
    };

    if (typeof window === "undefined") {
      const { adminDb, safeDb } = await import("@/services/firebase/admin");
      const useAdmin = await safeDb.checkAdminSupport();
      if (useAdmin && adminDb) {
        await adminDb.collection("notifications").doc(notificationId).set(notificationData);
        return;
      }
    }
    const docRef = doc(db, "notifications", notificationId);
    await setDoc(docRef, notificationData);
  }

  /**
   * Cleans up (deletes) irrelevant notifications for a report.
   * e.g., when a report's status moves past assignment/triage, or when resolved.
   */
  public static async cleanupNotifications(reportId: string, typesToClean: string[]): Promise<void> {
    if (typeof window === "undefined") {
      const { adminDb, safeDb } = await import("@/services/firebase/admin");
      const useAdmin = await safeDb.checkAdminSupport();
      if (useAdmin && adminDb) {
        const snap = await adminDb.collection("notifications")
          .where("reportId", "==", reportId)
          .where("type", "in", typesToClean)
          .get();
        const batch = adminDb.batch();
        snap.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
        return;
      }
    }

    const { getDocs, query, where, collection, writeBatch } = await import("firebase/firestore");
    const q = query(
      collection(db, "notifications"),
      where("reportId", "==", reportId),
      where("type", "in", typesToClean)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }

  /**
   * Helper to fetch all Admin user IDs.
   */
  private static async getAdminUserIds(): Promise<string[]> {
    const admins: string[] = [];
    if (typeof window === "undefined") {
      const { adminDb, safeDb } = await import("@/services/firebase/admin");
      const useAdmin = await safeDb.checkAdminSupport();
      if (useAdmin && adminDb) {
        const snap = await adminDb.collection("users").where("role", "==", "admin").get();
        snap.forEach((d) => admins.push(d.id));
        return admins;
      }
    }
    const q = query(collection(db, "users"), where("role", "==", "admin"));
    const snap = await getDocs(q);
    snap.forEach((d) => admins.push(d.id));
    return admins;
  }

  /**
   * Helper to resolve Report data safely.
   */
  private static async getReportData(reportId: string): Promise<CivicReport | null> {
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      return await safeDb.getReport(reportId);
    }
    const { ReportRepository } = await import("../repositories/report.repository");
    return await ReportRepository.getReport(reportId);
  }

  /**
   * Notify citizen when a report is submitted.
   */
  public static async notifyReportSubmitted(reportId: string): Promise<void> {
    const report = await this.getReportData(reportId);
    if (!report) return;
    const citizenId = report.metadata.createdBy;
    const title = report.ai?.assistant?.title || report.metadata.title || "Report";
    await this.createNotification(
      citizenId,
      "Report Submitted",
      `Your report for "${title}" has been submitted successfully.`,
      "report_submitted",
      reportId
    );
  }

  /**
   * Notify citizen when AI verification is complete.
   */
  public static async notifyVerificationCompleted(reportId: string): Promise<void> {
    const report = await this.getReportData(reportId);
    if (!report) return;
    const citizenId = report.metadata.createdBy;
    const title = report.ai?.assistant?.title || report.metadata.title || "Report";
    await this.createNotification(
      citizenId,
      "AI Verification Complete",
      `AI Triage has completed analysis for "${title}".`,
      "verification_completed",
      reportId
    );
  }

  /**
   * Notify citizen when status of their report has changed.
   */
  public static async notifyCitizenStatusChanged(
    citizenId: string,
    reportId: string,
    status: string
  ): Promise<void> {
    const report = await this.getReportData(reportId);
    if (!report) return;
    const title = report.ai?.assistant?.title || report.metadata.title || "Report";
    await this.createNotification(
      citizenId,
      `Report Status Updated`,
      `Your report for "${title}" has been updated to "${status}".`,
      "status_changed",
      reportId
    );
  }

  /**
   * Notify officer of a new assignment and notify citizen that an officer has been assigned.
   */
  public static async notifyOfficerAssigned(
    officerId: string,
    reportId: string
  ): Promise<void> {
    const report = await this.getReportData(reportId);
    if (!report) return;
    const title = report.ai?.assistant?.title || report.metadata.title || "Report";
    
    // Notify Officer
    await this.createNotification(
      officerId,
      "New Incident Assignment",
      `New incident assignment: "${title}".`,
      "new_assignment",
      reportId
    );

    // Notify Citizen
    const citizenId = report.metadata.createdBy;
    await this.createNotification(
      citizenId,
      "Officer Dispatched",
      `A field officer was dispatched to investigate "${title}".`,
      "assigned_to_officer",
      reportId
    );

    // Clean up department backlog/assignment failed notifications for this report since it's now assigned
    await this.cleanupNotifications(reportId, ["department_backlog", "assignment_failed"]);
  }

  /**
   * Notify officer of a high priority assignment.
   */
  public static async notifyHighPriorityReport(
    officerId: string,
    reportId: string
  ): Promise<void> {
    const report = await this.getReportData(reportId);
    if (!report) return;
    const title = report.ai?.assistant?.title || report.metadata.title || "Report";
    await this.createNotification(
      officerId,
      "High Priority Incident",
      `High priority incident assigned: "${title}". Please review immediately.`,
      "high_priority_report",
      reportId
    );
  }

  /**
   * Notify administrators that an automatic assignment failed.
   */
  public static async notifyAdminAssignmentFailed(
    reportId: string,
    department: string
  ): Promise<void> {
    const report = await this.getReportData(reportId);
    const title = report?.ai?.assistant?.title || report?.metadata?.title || "Report";
    const admins = await this.getAdminUserIds();
    for (const adminId of admins) {
      await this.createNotification(
        adminId,
        "Assignment Failed",
        `Automatic assignment failed for "${title}" in Department: ${department}.`,
        "department_backlog",
        reportId
      );
    }
  }

  /**
   * Notify admins of high fake media probability.
   */
  public static async notifyHighFakeMedia(
    reportId: string,
    probability: number
  ): Promise<void> {
    const report = await this.getReportData(reportId);
    const title = report?.ai?.assistant?.title || report?.metadata?.title || "Report";
    const admins = await this.getAdminUserIds();
    for (const adminId of admins) {
      await this.createNotification(
        adminId,
        "High Fake Media Probability Alert",
        `High fake media probability (${Math.round(probability * 100)}%) detected on "${title}".`,
        "high_fake_media",
        reportId
      );
    }
  }

  /**
   * Notify citizen when active investigation has commenced.
   */
  public static async notifyInvestigationStarted(reportId: string): Promise<void> {
    const report = await this.getReportData(reportId);
    if (!report) return;
    const citizenId = report.metadata.createdBy;
    const title = report.ai?.assistant?.title || report.metadata.title || "Report";
    await this.createNotification(
      citizenId,
      "Investigation Commenced",
      `Active investigation has started for your report "${title}".`,
      "investigation_started",
      reportId
    );

    // Clean up assignment notifications since officer has started the investigation
    await this.cleanupNotifications(reportId, ["new_assignment", "high_priority_report"]);
  }

  /**
   * Notify officer when citizen adds supporting evidence.
   */
  public static async notifyCitizenAddedEvidence(reportId: string): Promise<void> {
    const report = await this.getReportData(reportId);
    if (!report) return;
    const officerId = report.ai?.assignment?.officerId;
    if (!officerId) return;
    const title = report.ai?.assistant?.title || report.metadata.title || "Report";
    await this.createNotification(
      officerId,
      "Supporting Evidence Added",
      `A citizen has added supporting evidence for "${title}".`,
      "citizen_added_evidence",
      reportId
    );
  }

  /**
   * Notify citizen when report is resolved.
   */
  public static async notifyResolved(reportId: string): Promise<void> {
    const report = await this.getReportData(reportId);
    if (!report) return;
    const citizenId = report.metadata.createdBy;
    const title = report.ai?.assistant?.title || report.metadata.title || "Report";
    await this.createNotification(
      citizenId,
      "Incident Resolved",
      `Your report for "${title}" has been successfully resolved!`,
      "resolved",
      reportId
    );

    // Clean up SLA risk, assignment, and priority notifications since report is resolved
    await this.cleanupNotifications(reportId, ["sla_risk", "new_assignment", "high_priority_report"]);
  }

  /**
   * Notify admins when report is resolved.
   */
  public static async notifyAdminResolved(reportId: string, officerName?: string): Promise<void> {
    const report = await this.getReportData(reportId);
    if (!report) return;
    const title = report.ai?.assistant?.title || report.metadata.title || "Report";
    const admins = await this.getAdminUserIds();
    for (const adminId of admins) {
      await this.createNotification(
        adminId,
        "Incident Resolved Alert",
        `Incident "${title}" has been successfully resolved by ${officerName || "an officer"}.`,
        "resolved_admin",
        reportId
      );
    }
  }

  /**
   * Notify admins of SLA risks.
   */
  public static async notifySlaRisk(reportId: string): Promise<void> {
    const report = await this.getReportData(reportId);
    const title = report?.ai?.assistant?.title || report?.metadata?.title || "Report";
    const admins = await this.getAdminUserIds();
    for (const adminId of admins) {
      await this.createNotification(
        adminId,
        "SLA Expiry Risk Warning",
        `Report "${title}" has exceeded standard response times and is at SLA risk.`,
        "sla_risk",
        reportId
      );
    }
  }

  /**
   * General backlog notifier for admins.
   */
  public static async notifyDepartmentBacklog(
    department: string,
    backlogCount: number
  ): Promise<void> {
    const admins = await this.getAdminUserIds();
    for (const adminId of admins) {
      await this.createNotification(
        adminId,
        "Department Backlog Alert",
        `Department "${department}" has a high backlog of ${backlogCount} reports.`,
        "department_backlog",
        ""
      );
    }
  }
}

export default NotificationService;
