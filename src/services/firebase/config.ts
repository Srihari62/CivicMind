/**
 * @file src/services/firebase/config.ts
 * @description Main client-side Firebase initialization file.
 * Safely initializes the Firebase application by checking if an app instance already exists,
 * preventing multi-initialization runtime exceptions during Next.js Hot Module Replacement (HMR).
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { firebaseConfig } from "@/config/firebase";

/**
 * Initializes and caches the Firebase App instance.
 * @returns The initialized FirebaseApp instance
 */
function getFirebaseApp(): FirebaseApp {
  // If an app instance is already initialized, reuse it
  if (getApps().length > 0) {
    return getApp();
  }

  // Validate configuration keys in development environment (warning only, prevents hard crashes)
  if (process.env.NODE_ENV !== "production") {
    const missingKeys = Object.entries(firebaseConfig)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingKeys.length > 0) {
      console.warn(
        `Firebase warning: The following keys are missing in your environment configuration: ${missingKeys.join(
          ", "
        )}. Some Firebase operations might fail.`
      );
    }
  }

  return initializeApp(firebaseConfig);
}

// Export the singleton application instance
export const app = getFirebaseApp();
