/**
 * @file src/app/actions/auth-guard.ts
 * @description Centralized server-side authorization check for all Next.js Server Actions.
 */

import { safeDb } from "@/services/firebase/admin";
import { FirestoreUserProfile } from "@/features/auth/repositories/user.repository";

export async function authorizeAction(
  callerUid: string | undefined,
  allowedRoles: ("admin" | "officer" | "citizen")[]
): Promise<FirestoreUserProfile> {
  if (!callerUid) {
    throw new Error("Unauthorized: Missing user authentication credentials.");
  }

  const profile = await safeDb.getUserProfile(callerUid);
  if (!profile) {
    throw new Error("Unauthorized: User profile does not exist in the database.");
  }

  // Allow citizens to be checked without isActive. Other roles must be active.
  if (profile.role !== "citizen" && profile.isActive === false) {
    throw new Error("Unauthorized: User account is inactive.");
  }

  if (!allowedRoles.includes(profile.role)) {
    throw new Error(`Unauthorized: User role '${profile.role}' is not authorized to perform this operation.`);
  }

  return profile;
}
