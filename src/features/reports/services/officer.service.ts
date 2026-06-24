/**
 * @file src/features/reports/services/officer.service.ts
 * @description Officer service.
 * Handles business rules and updates for officer accounts.
 */

import { UserRepository, FirestoreUserProfile } from "@/features/auth/repositories/user.repository";

export class OfficerService {
  /**
   * Retrieves an officer profile by UID.
   */
  public static async getOfficerProfile(uid: string): Promise<FirestoreUserProfile | null> {
    return await UserRepository.getUserProfile(uid);
  }

  /**
   * Updates an officer's availability state.
   */
  public static async updateAvailability(
    uid: string,
    availability: "available" | "busy" | "offline"
  ): Promise<void> {
    await UserRepository.updateOfficerAvailability(uid, availability);
  }

  /**
   * Increments the active cases workload count for an officer.
   */
  public static async incrementCases(uid: string): Promise<void> {
    await UserRepository.incrementActiveCases(uid);
  }

  /**
   * Decrements the active cases workload count for an officer.
   */
  public static async decrementCases(uid: string): Promise<void> {
    await UserRepository.decrementActiveCases(uid);
  }

  /**
   * Gets all officers in a department.
   */
  public static async getOfficerByDepartment(department: string): Promise<FirestoreUserProfile[]> {
    return await UserRepository.getOfficerByDepartment(department);
  }

  /**
   * Gets available officers in a department.
   */
  public static async getAvailableOfficers(department: string): Promise<FirestoreUserProfile[]> {
    return await UserRepository.getAvailableOfficers(department);
  }

  /**
   * Gets all officers.
   */
  public static async getAllOfficers(): Promise<FirestoreUserProfile[]> {
    return await UserRepository.getAllOfficers();
  }

  /**
   * Gets all users.
   */
  public static async getAllUsers(): Promise<FirestoreUserProfile[]> {
    return await UserRepository.getAllUsers();
  }

  /**
   * Updates a user profile.
   */
  public static async updateProfile(
    uid: string,
    updates: Partial<Omit<FirestoreUserProfile, "uid" | "createdAt">>
  ): Promise<void> {
    await UserRepository.updateUserProfile(uid, updates);
  }
}
export default OfficerService;
