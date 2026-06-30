/**
 * @file src/features/auth/services/auth.service.ts
 * @description Authentication service layer.
 * Coordinates between Firebase Auth API and the UserRepository layer to ensure
 * transaction integrity and consistent session states.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/services/firebase/auth";
import { UserRepository, FirestoreUserProfile } from "../repositories/user.repository";
import { AppError, parseFirebaseError } from "@/utils/error";
import { LoginInput, RegisterInput, CompleteProfileInput } from "../schemas/auth.schema";

export class AuthService {
  /**
   * Registers a user account using email and password.
   * Creates a draft user profile document in Firestore database.
   * @param input - Registration payload (email and password)
   * @returns Firebase User credential info
   */
  public static async register(input: RegisterInput): Promise<FirebaseUser> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        input.email,
        input.password
      );
      
      const firebaseUser = userCredential.user;

      // Initialize base user profile in Firestore database (profile incomplete status)
      await UserRepository.createUserProfile(firebaseUser.uid, {
        email: firebaseUser.email || input.email,
        displayName: firebaseUser.displayName || "",
        role: "citizen", // Default role assigned at registration
        photoURL: firebaseUser.photoURL || "",
        isProfileComplete: false,
      });

      return firebaseUser;
    } catch (error) {
      const parsed = parseFirebaseError(error);
      throw new AppError({
        message: parsed.message,
        code: parsed.code,
        statusCode: 400,
      });
    }
  }

  /**
   * Logs into an existing account with email and password.
   * @param input - Login credentials
   * @returns Authorized Firebase User details
   */
  public static async login(input: LoginInput): Promise<FirebaseUser> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        input.email,
        input.password
      );
      return userCredential.user;
    } catch (error) {
      const parsed = parseFirebaseError(error);
      throw new AppError({
        message: parsed.message,
        code: parsed.code,
        statusCode: 401,
      });
    }
  }

  /**
   * Terminates the active user session.
   */
  public static async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      const parsed = parseFirebaseError(error);
      throw new AppError({
        message: `Failed to log out: ${parsed.message}`,
        code: parsed.code,
        statusCode: 500,
      });
    }
  }

  /**
   * Updates user details to transition their account to "profile complete" state.
   * @param uid - The authenticated user's unique identifier
   * @param input - Profile details payload
   */
  public static async completeProfile(
    uid: string,
    input: CompleteProfileInput
  ): Promise<void> {
    try {
      await UserRepository.updateUserProfile(uid, {
        displayName: input.displayName,
        phoneNumber: input.phoneNumber,
        preferredLanguage: input.preferredLanguage,
        homeLocation: input.homeLocation,
        isProfileComplete: true,
        state: input.state || input.homeLocation?.state || "",
        city: input.city || input.homeLocation?.city || "",
        locality: input.homeLocation?.locality || "",
        department: input.department || "",
      });
    } catch (error) {
      const parsed = parseFirebaseError(error);
      throw new AppError({
        message: `Failed to complete profile: ${parsed.message}`,
        code: parsed.code,
        statusCode: 400,
      });
    }
  }

  /**
   * Retrieves the current profile state for a user.
   * @param uid - The user identifier
   */
  public static async getProfile(uid: string): Promise<FirestoreUserProfile | null> {
    try {
      return await UserRepository.getUserProfile(uid);
    } catch (error) {
      const parsed = parseFirebaseError(error);
      throw new AppError({
        message: `Failed to retrieve profile: ${parsed.message}`,
        code: parsed.code,
        statusCode: 500,
      });
    }
  }
}
