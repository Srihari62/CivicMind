/**
 * @file src/features/reports/repositories/report.repository.ts
 * @description Repository class for performing Firestore report reads, writes, and updates.
 * Implements the grouped schema matching production AI layouts.
 */

import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { CivicReport, MediaAsset, ReportLocation, TimelineEvent } from "@/types";
import { REPORT_STATUS } from "@/constants";

export class ReportRepository {
  /**
   * Generates a new unique Firestore document ID for a report.
   * @returns Generated report document ID
   */
  public static generateReportId(): string {
    return doc(collection(db, COLLECTIONS.REPORTS)).id;
  }

  /**
   * Creates an initial draft report in Firestore.
   * @param reportId - The pre-generated report ID
   * @param draftData - Basic details for the draft report
   * @returns The generated draft report document
   */
  public static async createDraftReport(
    reportId: string,
    draftData: {
      metadata: {
        title: string;
        description: string;
        category: string;
        createdBy: string;
        editedAfterAI?: boolean;
      };
      location: ReportLocation;
      severity?: string;
      aiAssistant?: {
        title: string;
        description: string;
        category: string;
        severity: string;
        confidence: number;
        summary: string;
        detectedObjects?: string[];
        model: string;
        promptVersion: string;
        analyzedAt: string;
        initialPriority: string;
      } | null;
    }
  ): Promise<CivicReport> {
    const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
    const now = new Date().toISOString();

    const report: CivicReport = {
      id: reportId,
      status: REPORT_STATUS.DRAFT,
      metadata: {
        ...draftData.metadata,
        editedAfterAI: draftData.metadata.editedAfterAI ?? false,
      },
      location: draftData.location,
      evidence: {
        media: [],
      },
      ai: {
        assistant: draftData.aiAssistant ?? null,
        verification: {
          status: "processing",
          fakeMediaProbability: null,
          fakeMediaConfidence: null,
          fakeMediaReason: null,
          duplicateProbability: null,
          duplicateReportIds: null,
          duplicateReason: null,
          assignedDepartment: null,
          priority: null,
          trustScore: null,
          verificationModel: null,
          verificationVersion: null,
          summary: null,
          analyzedAt: null,
          failureReason: null,
        },
        assignment: {
          officerId: null,
          department: null,
          assignedAt: null,
          assignmentMethod: null,
        },
      },
      timestamps: {
        createdAt: now,
        updatedAt: now,
      },
      timeline: [
        {
          timestamp: now,
          actorId: draftData.metadata.createdBy,
          actorRole: "citizen",
          action: "Citizen Reported",
        },
        ...(draftData.aiAssistant
          ? [
              {
                timestamp: now,
                actorId: "ai",
                actorRole: "ai" as const,
                action: "AI Assistant Completed",
              },
            ]
          : []),
      ],
    };

    await setDoc(docRef, report);
    return report;
  }

  /**
   * Updates a report to transition it from draft to submitted state with uploaded media assets.
   * @param reportId - The ID of the report to complete
   * @param media - Array of MediaAsset objects describing uploaded files
   */
  public static async submitReport(
    reportId: string,
    media: MediaAsset[]
  ): Promise<void> {
    const now = new Date().toISOString();
    const updates = {
      "evidence.media": media,
      status: REPORT_STATUS.SUBMITTED,
      "timestamps.updatedAt": now,
    };
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
      return;
    }
    const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
    await updateDoc(docRef, updates);
  }

  /**
   * Retrieves a report document from Firestore by its unique ID.
   * @param id - The report unique ID
   * @returns The report document or null if not found
   */
  public static async getReport(id: string): Promise<CivicReport | null> {
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      return await safeDb.getReport(id);
    }
    const docRef = doc(db, COLLECTIONS.REPORTS, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as CivicReport;
    }
    return null;
  }

  /**
   * Updates partial verification fields on a report.
   * @param reportId - The ID of the report
   * @param fields - The partial fields to merge into ai.verification
   */
  public static async updateVerification(
    reportId: string,
    fields: Partial<CivicReport["ai"]["verification"]>
  ): Promise<void> {
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      updates[`ai.verification.${key}`] = value;
    }
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
      return;
    }
    const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
    await updateDoc(docRef, updates);
  }

  /**
   * Retrieves all reports from Firestore.
   * @returns Array of CivicReport objects
   */
  public static async getAllReports(): Promise<CivicReport[]> {
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      return await safeDb.getAllReports();
    }
    const q = query(collection(db, COLLECTIONS.REPORTS));
    const snapshot = await getDocs(q);
    const reports: CivicReport[] = [];
    snapshot.forEach((docSnap) => {
      reports.push(docSnap.data() as CivicReport);
    });
    return reports;
  }

  /**
   * Assigns an officer to a report.
   */
  public static async assignOfficer(
    reportId: string,
    officerId: string | null,
    department: string,
    assignmentMethod: "automatic" | "manual",
    status: string
  ): Promise<void> {
    const updates = {
      "ai.assignment.officerId": officerId,
      "ai.assignment.department": department,
      "ai.assignment.assignedAt": new Date().toISOString(),
      "ai.assignment.assignmentMethod": assignmentMethod,
      status,
      "timestamps.updatedAt": new Date().toISOString(),
    };
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
      return;
    }
    const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
    await updateDoc(docRef, updates);
  }

  /**
   * Appends an immutable event to the report's timeline.
   */
  public static async appendTimelineEvent(
    reportId: string,
    event: TimelineEvent
  ): Promise<void> {
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, {}, [event]);
      return;
    }
    const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
    await updateDoc(docRef, {
      timeline: arrayUnion(event),
      "timestamps.updatedAt": new Date().toISOString(),
    });
  }

  /**
   * Updates report resolution details and sets status to resolved.
   */
  public static async updateResolution(
    reportId: string,
    payload: {
      resolvedBy: string;
      resolutionNotes: string;
      resolutionMedia: MediaAsset[];
      category?: string;
      proofPhotoUrl?: string;
    }
  ): Promise<void> {
    const resolvedAtStr = new Date().toISOString();
    const updates = {
      status: "resolved",
      resolution: {
        notes: payload.resolutionNotes,
        category: payload.category || "completed",
        proofPhotoUrl: payload.proofPhotoUrl || (payload.resolutionMedia?.[0]?.url || ""),
        resolvedAt: resolvedAtStr,
        resolvedBy: payload.resolvedBy,
        repairEvidence: {
          before: [],
          after: payload.resolutionMedia || [],
        },
      },
      "timestamps.updatedAt": resolvedAtStr,
    };
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateReport(reportId, updates);
      return;
    }
    const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
    await updateDoc(docRef, updates);
  }
}
export default ReportRepository;
