/**
 * @file src/services/firebase/auth.ts
 * @description Client-side Firebase Authentication service.
 * Initializes and exports the Firebase Auth module instance using the shared initialized application.
 */

import { getAuth, Auth } from "firebase/auth";
import { app } from "./config";

/**
 * Shared authentication client singleton.
 * Accessible across the client-side app context for signing in, signing out,
 * and subscribing to active auth state changes.
 */
export const auth: Auth = getAuth(app);

/**
 * Setup default localization settings.
 * Can be customized based on language requirements (e.g. auth.useDeviceLanguage()).
 */
auth.useDeviceLanguage();
