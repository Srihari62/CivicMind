/**
 * @file src/features/reports/components/report-form.tsx
 * @description Citizen Issue Reporting Form.
 * Integrates React Hook Form, Zod schema validation, browser GPS retrieval,
 * and multi-media evidence upload management (supporting images and videos).
 */

"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { reportFormSchema, ReportFormInput } from "../schemas/report.schema";
import { ReportService } from "../services/report.service";
import { LocationService } from "@/services/maps/location.service";
import {
  ISSUE_CATEGORIES,
  MAX_MEDIA_COUNT,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
} from "@/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ReportForm() {
  const router = useRouter();
  const { profile } = useAuth();

  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ReportFormInput>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      location: "",
      latitude: 0,
      longitude: 0,
    },
  });

  /**
   * Fetches GPS coordinates and sets form fields.
   */
  const handleGetLocation = async () => {
    setIsLocating(true);
    setGlobalError(null);
    try {
      const coords = await LocationService.getCurrentLocation();
      setValue("latitude", coords.latitude);
      setValue("longitude", coords.longitude);
      if (coords.address) {
        setValue("location", coords.address);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to retrieve GPS location.";
      setGlobalError(msg);
    } finally {
      setIsLocating(false);
    }
  };

  /**
   * Validates and appends chosen files.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMediaError(null);
    const files = e.target.files;
    if (!files) return;

    const fileList = Array.from(files);

    // Validate maximum count
    if (mediaFiles.length + fileList.length > MAX_MEDIA_COUNT) {
      setMediaError(`You can upload a maximum of ${MAX_MEDIA_COUNT} evidence files.`);
      return;
    }

    // Validate size and types
    for (const file of fileList) {
      const isImg = (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(file.type);
      const isVid = (SUPPORTED_VIDEO_TYPES as readonly string[]).includes(file.type);

      if (!isImg && !isVid) {
        setMediaError(`Unsupported file format: ${file.name}. Only standard images and videos are allowed.`);
        return;
      }

      if (isImg && file.size > MAX_IMAGE_SIZE) {
        setMediaError(`Image too large: ${file.name}. Maximum size limit is 5MB.`);
        return;
      }

      if (isVid && file.size > MAX_VIDEO_SIZE) {
        setMediaError(`Video too large: ${file.name}. Maximum size limit is 25MB.`);
        return;
      }
    }

    setMediaFiles((prev) => [...prev, ...fileList]);
  };

  /**
   * Removes a file from the upload queue.
   */
  const handleRemoveMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, idx) => idx !== index));
    setMediaError(null);
  };

  /**
   * Form submission orchestrator.
   */
  const onSubmit = async (data: ReportFormInput) => {
    if (!profile) {
      setGlobalError("You must be logged in to submit reports.");
      return;
    }

    setIsSubmitting(true);
    setGlobalError(null);

    try {
      const payload = {
        metadata: {
          title: data.title,
          description: data.description,
          category: data.category,
          createdBy: profile.uid,
        },
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          formattedAddress: data.location,
        },
      };

      const reportId = await ReportService.createReport(payload, mediaFiles, profile.uid);
      
      // Redirect to specific details view indicating success flag
      router.push(`/reports/${reportId}?success=true`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit issue report.";
      setGlobalError(msg);
      setIsSubmitting(false);
    }
  };

  const allowedExtensions = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES].join(",");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 w-full max-w-xl bg-card border border-border p-6 rounded-lg shadow-sm">
      <div className="flex flex-col gap-1 border-b border-border pb-3">
        <h2 className="text-xl font-bold tracking-tight">Report a New Issue</h2>
        <p className="text-xs text-muted-foreground">
          Provide accurate description, location coordinates, and photo/video evidence to notify teams.
        </p>
      </div>

      {globalError && (
        <div className="p-3.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md font-medium" role="alert">
          {globalError}
        </div>
      )}

      {/* Title */}
      <Input
        label="Issue Title"
        placeholder="e.g. Large pothole on main road"
        error={errors.title?.message}
        {...register("title")}
      />

      {/* Description */}
      <div className="flex flex-col gap-1.5 w-full">
        <label className="text-xs font-medium text-muted-foreground select-none">
          Detailed Description
        </label>
        <textarea
          placeholder="Please describe the issue in detail so dispatchers understand the urgency..."
          rows={4}
          {...register("description")}
          className="w-full px-3.5 py-2.5 bg-background border border-border text-sm rounded-md transition-all duration-200 outline-none placeholder:text-muted-foreground/60 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {errors.description && (
          <span className="text-xs text-destructive font-medium mt-0.5" role="alert">
            {errors.description.message}
          </span>
        )}
      </div>

      {/* Category Dropdown */}
      <div className="flex flex-col gap-1.5 w-full">
        <label className="text-xs font-medium text-muted-foreground select-none">
          Issue Category
        </label>
        <select
          {...register("category")}
          className="w-full px-3.5 py-2.5 bg-background border border-border text-sm rounded-md transition-all duration-200 outline-none text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">Select category...</option>
          {ISSUE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {errors.category && (
          <span className="text-xs text-destructive font-medium mt-0.5" role="alert">
            {errors.category.message}
          </span>
        )}
      </div>

      {/* Location GPS Retrieval */}
      <div className="flex flex-col gap-3 p-4 border border-border bg-muted/20 rounded-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">Location Information</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetLocation}
            isLoading={isLocating}
          >
            Auto-Detect GPS
          </Button>
        </div>

        <Input
          label="Location/Address Description"
          placeholder="e.g. Near intersection of 5th Ave and Elm St"
          error={errors.location?.message}
          {...register("location")}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Latitude"
            type="number"
            step="any"
            error={errors.latitude?.message}
            {...register("latitude", { valueAsNumber: true })}
          />
          <Input
            label="Longitude"
            type="number"
            step="any"
            error={errors.longitude?.message}
            {...register("longitude", { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Evidence Upload and Previews */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-medium text-muted-foreground select-none">
          Evidence Upload (Max {MAX_MEDIA_COUNT} photos/videos)
        </label>

        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <span className="text-xs text-muted-foreground font-medium">
                Click to browse evidence files
              </span>
              <span className="text-[10px] text-muted-foreground/60 mt-0.5">
                Images (up to 5MB) or Videos (up to 25MB)
              </span>
            </div>
            <input
              type="file"
              className="hidden"
              multiple
              accept={allowedExtensions}
              onChange={handleFileChange}
            />
          </label>
        </div>

        {mediaError && (
          <span className="text-xs text-destructive font-medium" role="alert">
            {mediaError}
          </span>
        )}

        {/* Thumbnail Preview Area */}
        {mediaFiles.length > 0 && (
          <div className="grid grid-cols-5 gap-2 mt-2">
            {mediaFiles.map((file, idx) => {
              const previewUrl = URL.createObjectURL(file);
              const isVideo = file.type.startsWith("video/");
              return (
                <div key={idx} className="relative group aspect-square border border-border rounded-md overflow-hidden bg-muted">
                  {isVideo ? (
                    <video
                      src={previewUrl}
                      className="object-cover w-full h-full"
                      muted
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={`Preview ${idx}`}
                      className="object-cover w-full h-full"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(idx)}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-black/90 text-white rounded-full p-1 transition-colors"
                    aria-label="Remove asset"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  {isVideo && (
                    <div className="absolute bottom-1 left-1 bg-black/60 text-[8px] text-white px-1 py-0.5 rounded font-mono">
                      VIDEO
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Submission */}
      <Button
        type="submit"
        isLoading={isSubmitting}
        className="w-full mt-2"
      >
        Submit Issue Report
      </Button>
    </form>
  );
}
export default ReportForm;
