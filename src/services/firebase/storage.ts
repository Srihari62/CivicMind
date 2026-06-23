/**
 * @file src/services/firebase/storage.ts
 * @description Firebase Cloud Storage initialization and storage services.
 * Exports the Storage client instance and defines path configurations for media uploads.
 */

import { getStorage, FirebaseStorage } from "firebase/storage";
import { app } from "./config";

/**
 * Shared Cloud Storage client singleton.
 * Used for uploading media files like incident photos and user profile avatars.
 */
export const storage: FirebaseStorage = getStorage(app);

/**
 * Storage folder structure configuration.
 * Defines standard folder pathways inside the storage bucket for proper data isolation.
 */
export const STORAGE_PATHS = {
  PROFILE_AVATARS: "profiles",
  REPORT_IMAGES: "reports/images",
  REPORT_VIDEOS: "reports/videos",
  COMMUNITY_ASSETS: "communities/assets",
} as const;
