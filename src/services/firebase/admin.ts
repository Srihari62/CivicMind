import "server-only";
import * as admin from "firebase-admin";
import { db as clientDb } from "./firestore";
import {
  doc as cDoc,
  getDoc as cGetDoc,
  updateDoc as cUpdateDoc,
  collection as cCollection,
  query as cQuery,
  where as cWhere,
  getDocs as cGetDocs,
  increment as cIncrement,
} from "firebase/firestore";
import { CivicReport } from "@/types";
import { FirestoreUserProfile } from "@/features/auth/repositories/user.repository";

let hasAdminCredentials = false;

if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      hasAdminCredentials = true;
      console.info("[FirebaseAdmin] Initialized with Service Account Key.");
    } catch (e) {
      console.error("[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY env var:", e);
    }
  }

  if (!hasAdminCredentials) {
    try {
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "civicmind-dev",
      });
      hasAdminCredentials = true;
      console.info("[FirebaseAdmin] Initialized with default credentials.");
    } catch (e) {
      console.warn("[FirebaseAdmin] Failed to initialize default credentials, falling back to Web SDK:", e);
      hasAdminCredentials = false;
    }
  }
} else {
  hasAdminCredentials = true;
}

export const adminDb = hasAdminCredentials ? admin.firestore() : null;
export { admin };

export const safeDb = {
  privateCachedAdminSupport: null as boolean | null,

  async checkAdminSupport(): Promise<boolean> {
    if (this.privateCachedAdminSupport !== null) {
      return this.privateCachedAdminSupport;
    }
    if (!hasAdminCredentials || !adminDb) {
      this.privateCachedAdminSupport = false;
      return false;
    }
    try {
      // Lightweight test query
      await adminDb.collection("reports").limit(1).get();
      this.privateCachedAdminSupport = true;
      return true;
    } catch {
      console.warn(`
================================================================================
[FirebaseAdmin] WARNING: Firebase Admin SDK is unauthenticated.
To run the server-side AI Verification Pipeline locally:
1. Go to Firebase Console > Project Settings > Service Accounts.
2. Click "Generate new private key".
3. Add the JSON key content to your .env.local file:
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type": "service_account", ...}'
4. Restart your development server.
================================================================================
`);
      this.privateCachedAdminSupport = false;
      return false;
    }
  },

  async getReport(reportId: string): Promise<CivicReport | null> {
    const useAdmin = await this.checkAdminSupport();
    if (useAdmin && adminDb) {
      const docSnap = await adminDb.collection("reports").doc(reportId).get();
      return docSnap.exists ? (docSnap.data() as CivicReport) : null;
    } else {
      const docRef = cDoc(clientDb, "reports", reportId);
      const docSnap = await cGetDoc(docRef);
      return docSnap.exists() ? (docSnap.data() as CivicReport) : null;
    }
  },

  async updateReport(
    reportId: string,
    updates: Record<string, unknown>,
    newTimelineEvents?: unknown[]
  ): Promise<void> {
    const useAdmin = await this.checkAdminSupport();
    if (useAdmin && adminDb) {
      const finalUpdates = { ...updates };
      if (newTimelineEvents && newTimelineEvents.length > 0) {
        finalUpdates.timeline = admin.firestore.FieldValue.arrayUnion(...newTimelineEvents);
      }
      await adminDb.collection("reports").doc(reportId).update(finalUpdates);
    } else {
      const docRef = cDoc(clientDb, "reports", reportId);
      const finalUpdates = { ...updates };
      if (newTimelineEvents && newTimelineEvents.length > 0) {
        const { arrayUnion } = await import("firebase/firestore");
        finalUpdates.timeline = arrayUnion(...newTimelineEvents);
      }
      await cUpdateDoc(docRef, finalUpdates);
    }
  },

  async getReportsByCategory(category: string): Promise<CivicReport[]> {
    const useAdmin = await this.checkAdminSupport();
    if (useAdmin && adminDb) {
      const snapshot = await adminDb.collection("reports")
        .where("metadata.category", "==", category)
        .get();
      const reports: CivicReport[] = [];
      snapshot.forEach((doc) => reports.push(doc.data() as CivicReport));
      return reports;
    } else {
      const q = cQuery(cCollection(clientDb, "reports"), cWhere("metadata.category", "==", category));
      const snapshot = await cGetDocs(q);
      const reports: CivicReport[] = [];
      snapshot.forEach((doc) => reports.push(doc.data() as CivicReport));
      return reports;
    }
  },

  async getAvailableOfficers(department: string): Promise<FirestoreUserProfile[]> {
    const useAdmin = await this.checkAdminSupport();
    if (useAdmin && adminDb) {
      const snapshot = await adminDb.collection("users")
        .where("role", "==", "officer")
        .where("department", "==", department)
        .where("availability", "==", "available")
        .get();
      const officers: FirestoreUserProfile[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as FirestoreUserProfile;
        if (data.isActive !== false) {
          officers.push(data);
        }
      });
      return officers;
    } else {
      const q = cQuery(
        cCollection(clientDb, "users"),
        cWhere("role", "==", "officer"),
        cWhere("department", "==", department),
        cWhere("availability", "==", "available")
      );
      const snapshot = await cGetDocs(q);
      const officers: FirestoreUserProfile[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as FirestoreUserProfile;
        if (data.isActive !== false) {
          officers.push(data);
        }
      });
      return officers;
    }
  },

  async incrementOfficerCases(officerId: string): Promise<void> {
    const useAdmin = await this.checkAdminSupport();
    if (useAdmin && adminDb) {
      await adminDb.collection("users").doc(officerId).update({
        activeCases: admin.firestore.FieldValue.increment(1),
      });
    } else {
      const docRef = cDoc(clientDb, "users", officerId);
      await cUpdateDoc(docRef, {
        activeCases: cIncrement(1),
      });
    }
  },
};
