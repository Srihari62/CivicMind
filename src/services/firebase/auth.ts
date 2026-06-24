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
export default auth;
