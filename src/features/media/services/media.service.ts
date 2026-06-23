/**
 * @file src/features/media/services/media.service.ts
 * @description Shared media operations service.
 * Interacts with Cloudinary REST API to upload media files using client-side unsigned presets
 * and produces structured MediaAsset metadata records.
 */

import { MediaAsset } from "@/types";
import { AppError } from "@/utils/error";
import { env } from "@/config/env";

export class MediaService {
  /**
   * Uploads multiple media files to Cloudinary using direct client-side uploads.
   * @param files - Array of files to upload (images or videos)
   * @param _storageFolderPath - Kept in the signature for compatibility with the report creation workflow
   * @param _userId - Active user ID initiating the upload
   * @returns Array of uploaded MediaAsset metadata records
   */
  public static async uploadFiles(
    files: File[],
    _storageFolderPath: string,
    _userId: string
  ): Promise<MediaAsset[]> {
    const cloudName = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new AppError({
        message: "Cloudinary is not configured. Please define NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your .env.local file.",
        code: "storage/cloudinary-not-configured",
        statusCode: 400,
      });
    }

    try {
      const uploadPromises = files.map(async (file, index) => {
        const assetId = typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `asset_${Date.now()}_${index}`;

        const isVideo = file.type.startsWith("video/");
        const resourceType = isVideo ? "video" : "image";
        
        // Construct the native REST upload FormData payload
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);
        formData.append("public_id", assetId);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP error ${response.status}`);
        }

        const data = await response.json();
        const type: "image" | "video" = isVideo ? "video" : "image";

        const mediaAsset: MediaAsset = {
          id: assetId,
          type,
          url: data.secure_url,
          storagePath: data.public_id,
          mimeType: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        };

        if (data.width) mediaAsset.width = data.width;
        if (data.height) mediaAsset.height = data.height;
        if (data.duration) mediaAsset.duration = data.duration;

        return mediaAsset;
      });

      return await Promise.all(uploadPromises);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown upload error";
      throw new AppError({
        message: `Failed to upload media files: ${msg}`,
        code: "storage/upload-failed",
        statusCode: 500,
      });
    }
  }
}
export default MediaService;
