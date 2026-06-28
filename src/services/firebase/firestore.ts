/**
 * @file src/services/firebase/firestore.ts
 * @description Firestore database initialization and database services.
 * Initializes the Firestore instance and defines standard collection path helper structures
 * for database isolation and structured data fetching.
 */

import { getFirestore, Firestore } from "firebase/firestore";
import { app } from "./config";

/**
 * Shared Firestore database client singleton.
 * Used for querying and writing documents to collections.
 */
export const db: Firestore = getFirestore(app);

/**
 * Centralized Firestore collection name constants.
 * Ensures string references to collections are type-safe and consistent across features.
 */
export const COLLECTIONS = {
  USERS: "users",
  REPORTS: "reports",
  AUDIT_LOGS: "audit_logs",
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];
