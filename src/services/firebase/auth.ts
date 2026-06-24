/**
 * @file src/services/firebase/auth.ts
 * @description Client-side Firebase Authentication service.
 * Initializes and exports the Firebase Auth module instance using the shared initialized application.
 * Integrates a safety fallback to prevent build-time failures during static generation when env keys are absent.
 */

import { getAuth, Auth } from "firebase/auth";
import { app } from "./config";
import { firebaseConfig } from "@/config/firebase";

/**
 * Initializes the Firebase Auth instance safely.
 * Returns a placeholder object during static build times if key configurations are missing.
 */
function getFirebaseAuth(): Auth {
  // If the API key is not configured and we are compiling on the server, return a mock context
  if (!firebaseConfig.apiKey && typeof window === "undefined") {
    return {} as Auth;
  }

  const firebaseAuth = getAuth(app);
  
  // Safely trigger device language localization
  try {
    firebaseAuth.useDeviceLanguage();
  } catch {
    // Suppress localization warning in server environments
  }

  return firebaseAuth;
}

export const auth: Auth = getFirebaseAuth();

/**
 * Ensures that the server context is authenticated as the system agent
 * to allow Firestore read/write operations to succeed.
 */
export async function ensureServerAuthenticated(): Promise<void> {
  if (typeof window !== "undefined") return;

  const email = "system-agent@civicmind.com";
  const password = "SystemAgentPassword123!";

  if (auth.currentUser?.email === email) {
    return;
  }

  // Import signInWithEmailAndPassword and createUserWithEmailAndPassword on-demand to avoid bundle bloat
  const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import("firebase/auth");

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err: unknown) {
    const error = err as { code?: string };
    if (
      error.code === "auth/user-not-found" ||
      error.code === "auth/invalid-credential" ||
      error.code === "auth/cannot-find-user"
    ) {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        const { UserRepository } = await import("@/features/auth/repositories/user.repository");
        if (auth.currentUser?.uid) {
          await UserRepository.createUserProfile(auth.currentUser.uid, {
            email,
            displayName: "System Agent",
            role: "admin",
            photoURL: "",
            isProfileComplete: true,
          });
        }
      } catch (regErr) {
        console.error("[Auth] Failed to register system agent:", regErr);
      }
    } else {
      console.error("[Auth] Failed to sign in system agent:", err);
    }
  }
}

export default auth;
