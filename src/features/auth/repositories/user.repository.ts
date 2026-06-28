/**
 * @file src/features/auth/repositories/user.repository.ts
 * @description Repository class for performing Firestore user profile queries.
 * Only repository classes are permitted to perform direct reads/writes with Firestore.
 */

import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, increment } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { UserProfile } from "@/types";

export interface FirestoreUserProfile extends UserProfile {
  photoURL?: string;
  isProfileComplete: boolean;

  // Officer-specific profile fields
  department?: string;
  zone?: string;
  availability?: "available" | "busy" | "offline";
  activeCases?: number;
  phone?: string;
  photo?: string;
  isActive?: boolean;
  completedCases?: number;
  bio?: string;
  emergencyContact?: string;
  employeeId?: string;
  averageResolutionTime?: number;
  citizenRating?: number;
  performanceScore?: number;
}

export class UserRepository {
  /**
   * Retrieves a user profile document from Firestore by user UID.
   * @param uid - The unique identifier of the user
   * @returns User profile document or null if not found
   */
  public static async getUserProfile(uid: string): Promise<FirestoreUserProfile | null> {
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      return await safeDb.getUserProfile(uid);
    }
    const docRef = doc(db, COLLECTIONS.USERS, uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as FirestoreUserProfile;
    }
    return null;
  }

  /**
   * Writes/Creates a user profile document in Firestore.
   * @param uid - The unique identifier of the user
   * @param profile - Complete profile payload
   */
  public static async createUserProfile(
    uid: string,
    profile: Omit<FirestoreUserProfile, "uid" | "createdAt" | "updatedAt">
  ): Promise<void> {
    const docRef = doc(db, COLLECTIONS.USERS, uid);
    const now = new Date().toISOString();
    
    const data: FirestoreUserProfile = {
      uid,
      ...profile,
      createdAt: now,
      updatedAt: now,
    };
    
    await setDoc(docRef, data);
  }

  /**
   * Updates fields of an existing user profile document.
   * @param uid - The unique identifier of the user
   * @param updates - Fields to be updated
   */
  public static async updateUserProfile(
    uid: string,
    updates: Partial<Omit<FirestoreUserProfile, "uid" | "createdAt">>
  ): Promise<void> {
    const now = new Date().toISOString();
    const data = {
      ...updates,
      updatedAt: now,
    };
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.updateUserProfile(uid, data);
      return;
    }
    const docRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(docRef, data);
  }

  /**
   * Retrieves all officers belonging to a specific department.
   * @param department - Department name
   */
  public static async getOfficerByDepartment(department: string): Promise<FirestoreUserProfile[]> {
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where("role", "==", "officer"),
      where("department", "==", department)
    );
    const snapshot = await getDocs(q);
    const officers: FirestoreUserProfile[] = [];
    snapshot.forEach((d) => {
      officers.push(d.data() as FirestoreUserProfile);
    });
    return officers;
  }

  /**
   * Retrieves all available officers in a specific department.
   * @param department - Department name
   */
  public static async getAvailableOfficers(department: string): Promise<FirestoreUserProfile[]> {
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where("role", "==", "officer"),
      where("department", "==", department),
      where("availability", "==", "available"),
      where("isActive", "==", true)
    );
    const snapshot = await getDocs(q);
    const officers: FirestoreUserProfile[] = [];
    snapshot.forEach((d) => {
      officers.push(d.data() as FirestoreUserProfile);
    });
    return officers;
  }

  /**
   * Updates an officer's availability.
   * @param uid - Officer UID
   * @param availability - New availability state
   */
  public static async updateOfficerAvailability(
    uid: string,
    availability: "available" | "busy" | "offline"
  ): Promise<void> {
    await this.updateUserProfile(uid, { availability });
  }

  /**
   * Increments the active cases count for an officer.
   * @param uid - Officer UID
   */
  public static async incrementActiveCases(uid: string): Promise<void> {
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.incrementOfficerCases(uid);
      return;
    }
    const docRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(docRef, {
      activeCases: increment(1),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Decrements the active cases count for an officer.
   * @param uid - Officer UID
   */
  public static async decrementActiveCases(uid: string): Promise<void> {
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      await safeDb.decrementOfficerCases(uid);
      return;
    }
    const docRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(docRef, {
      activeCases: increment(-1),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Increments the completed cases count for an officer.
   * @param uid - Officer UID
   */
  public static async incrementCompletedCases(uid: string): Promise<void> {
    if (typeof window === "undefined") {
      const { safeDb, adminDb, admin } = await import("@/services/firebase/admin");
      const useAdmin = await safeDb.checkAdminSupport();
      if (useAdmin && adminDb) {
        await adminDb.collection("users").doc(uid).update({
          completedCases: admin.firestore.FieldValue.increment(1),
          updatedAt: new Date().toISOString(),
        });
        return;
      }
    }
    const docRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(docRef, {
      completedCases: increment(1),
      updatedAt: new Date().toISOString(),
    });
  }


  /**
   * Retrieves all registered officers in the platform.
   */
  public static async getAllOfficers(): Promise<FirestoreUserProfile[]> {
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where("role", "==", "officer")
    );
    const snapshot = await getDocs(q);
    const officers: FirestoreUserProfile[] = [];
    snapshot.forEach((d) => {
      officers.push(d.data() as FirestoreUserProfile);
    });
    return officers;
  }

  /**
   * Retrieves all registered users in the platform.
   */
  public static async getAllUsers(): Promise<FirestoreUserProfile[]> {
    if (typeof window === "undefined") {
      const { safeDb } = await import("@/services/firebase/admin");
      return await safeDb.getAllUsers();
    }
    const q = query(collection(db, COLLECTIONS.USERS));
    const snapshot = await getDocs(q);
    const users: FirestoreUserProfile[] = [];
    snapshot.forEach((d) => {
      users.push(d.data() as FirestoreUserProfile);
    });
    return users;
  }
}
