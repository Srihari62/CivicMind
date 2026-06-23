/**
 * @file src/features/auth/repositories/user.repository.ts
 * @description Repository class for performing Firestore user profile queries.
 * Only repository classes are permitted to perform direct reads/writes with Firestore.
 */

import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { UserProfile } from "@/types";

export interface FirestoreUserProfile extends UserProfile {
  photoURL?: string;
  isProfileComplete: boolean;
}

export class UserRepository {
  /**
   * Retrieves a user profile document from Firestore by user UID.
   * @param uid - The unique identifier of the user
   * @returns User profile document or null if not found
   */
  public static async getUserProfile(uid: string): Promise<FirestoreUserProfile | null> {
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
    const docRef = doc(db, COLLECTIONS.USERS, uid);
    const now = new Date().toISOString();
    
    const data = {
      ...updates,
      updatedAt: now,
    };
    
    await updateDoc(docRef, data);
  }
}
