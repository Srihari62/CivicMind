/**
 * @file src/features/reports/services/notification.service.ts
 * @description Real-time database-backed notification service.
 * Manages notification persistence in Firestore and provides triggers for citizen, officer, and admin alerts.
 */

import { collection, doc, setDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/services/firebase/firestore";
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
