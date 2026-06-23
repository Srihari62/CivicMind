/**
 * @file src/features/reports/repositories/report.repository.ts
 * @description Repository class for performing Firestore report reads, writes, and updates.
 * Implements the grouped schema matching production AI layouts.
 */

import { collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { CivicReport, MediaAsset, ReportLocation } from "@/types";
import { REPORT_STATUS, VERIFICATION_STATUS } from "@/constants";

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
        generatedTitle: string;
        generatedDescription: string;
        generatedCategory: string;
        generatedCategoryLabel?: string | null;
        generatedSeverity: string;
        confidence: number;
        summary: string;
        detectedObjects?: string[];
        analyzedAt: string;
        model: string;
        promptVersion: string;
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
          status: "pending",
          fakeMediaProbability: null,
          duplicateProbability: null,
          priority: null,
          assignedDepartment: null,
          analyzedAt: null,
          verificationModel: null,
          verificationVersion: null,
        },
      },
      verification: {
        status: VERIFICATION_STATUS.PENDING,
        requiredVotes: 3, // Default value placeholder
        receivedVotes: 0,
      },
      timestamps: {
        createdAt: now,
        updatedAt: now,
      },
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
    const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
    const now = new Date().toISOString();

    await updateDoc(docRef, {
      "evidence.media": media,
      status: REPORT_STATUS.SUBMITTED,
      "timestamps.updatedAt": now,
    });
  }

  /**
   * Retrieves a report document from Firestore by its unique ID.
   * @param id - The report unique ID
   * @returns The report document or null if not found
   */
  public static async getReport(id: string): Promise<CivicReport | null> {
    const docRef = doc(db, COLLECTIONS.REPORTS, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as CivicReport;
    }
    return null;
  }
}
export default ReportRepository;
