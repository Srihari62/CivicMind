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
import { MediaService } from "@/features/media/services/media.service";
import { analyzeReportEvidence, startReportVerification } from "@/app/actions/ai.actions";
import { MediaAsset } from "@/types";
import { EvidenceAnalysisResult } from "@/ai/types/ai.types";
import { calculateInitialPriority } from "@/ai/utils/priority";
import { AI_MODELS } from "@/config/ai-models";
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
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("@/components/maps/MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[360px] bg-slate-950/45 animate-pulse rounded-2xl flex items-center justify-center border border-slate-800">
      <span className="text-xs text-slate-500">Initializing mapping engine...</span>
    </div>
  ),
});
import { ReportLocation } from "@/types";

export function ReportForm() {
  const router = useRouter();
  const { profile } = useAuth();

  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploadedAssets, setUploadedAssets] = useState<MediaAsset[]>([]);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // AI Assistant States
  const [aiSuggested, setAiSuggested] = useState<boolean>(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<EvidenceAnalysisResult | null>(null);
  const [resolvedLocation, setResolvedLocation] = useState<ReportLocation | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ReportFormInput>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      severity: "",
      location: "",
      latitude: 0,
      longitude: 0,
    },
  });

  /**
   * Validates, uploads, and triggers AI analysis immediately.
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMediaError(null);
    setGlobalError(null);
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
        setMediaError(
          `Unsupported file format: ${file.name}. Only standard images and videos are allowed.`
        );
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

    // Update locally managed file list for layout preview
    setMediaFiles((prev) => [...prev, ...fileList]);
    setIsAnalyzing(true);
    setAiMessage(null);
    setAiSuggested(false);
    setAiAnalysisResult(null);

    try {
      if (!profile) {
        throw new Error("You must be logged in to analyze evidence.");
      }

      // 1. Upload temporarily to Cloudinary via MediaService
      const newAssets = await MediaService.uploadFiles(fileList, "temp", profile.uid);
      const updatedAssets = [...uploadedAssets, ...newAssets];
      setUploadedAssets(updatedAssets);

      // 2. Capture coordinates if user previously detected them
      const formValues = getValues();
      const locationPayload =
        formValues.latitude && formValues.longitude
          ? {
              latitude: formValues.latitude,
              longitude: formValues.longitude,
              formattedAddress: formValues.location || "",
            }
          : undefined;

      // 3. Invoke Server Action to execute the AI agent pipeline without Firestore write
      const response = await analyzeReportEvidence({
        media: newAssets, // Only analyze newly uploaded media assets
        location: locationPayload,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || "AI evidence analysis failed.");
      }

      const aiData = response.data;
      setAiConfidence(aiData.confidence);
      setAiAnalysisResult(aiData);

      if (aiData.confidence < 0.6) {
        setAiMessage(
          "We couldn't confidently understand this evidence. Please fill the report manually."
        );
      } else {
        setAiSuggested(true);
        // Pre-fill the form inputs
        setValue("title", aiData.title);
        setValue("description", aiData.description);
        setValue("category", aiData.classification);
        setValue("severity", aiData.severity);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze evidence media.";
      setMediaError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Removes a file and its Cloudinary metadata from the upload queue.
   */
  const handleRemoveMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, idx) => idx !== index));
    setUploadedAssets((prev) => prev.filter((_, idx) => idx !== index));
    setMediaError(null);
    if (mediaFiles.length <= 1) {
      setAiSuggested(false);
      setAiMessage(null);
      setAiAnalysisResult(null);
    }
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
      let editedAfterAI = false;
      let aiAssistantPayload = null;

      if (aiSuggested && aiAnalysisResult) {
        const titleChanged = data.title.trim() !== aiAnalysisResult.title.trim();
        const descChanged = data.description.trim() !== aiAnalysisResult.description.trim();
        const categoryChanged = data.category !== aiAnalysisResult.classification;
        const severityChanged = data.severity !== aiAnalysisResult.severity;

        if (titleChanged || descChanged || categoryChanged || severityChanged) {
          editedAfterAI = true;
        }

        const initialPriority = calculateInitialPriority(aiAnalysisResult.severity, aiAnalysisResult.confidence);

        aiAssistantPayload = {
          title: aiAnalysisResult.title,
          description: aiAnalysisResult.description,
          category: aiAnalysisResult.classification,
          severity: aiAnalysisResult.severity,
          confidence: aiAnalysisResult.confidence,
          summary: aiAnalysisResult.summary,
          detectedObjects: aiAnalysisResult.detectedObjects || [],
          model: AI_MODELS.ASSISTANT,
          promptVersion: "1.0.0",
          analyzedAt: aiAnalysisResult.analyzedAt,
          initialPriority,
        };
      }

      const payload = {
        metadata: {
          title: data.title,
          description: data.description,
          category: data.category,
          createdBy: profile.uid,
          editedAfterAI,
        },
        location: {
          latitude: data.latitude,
          longitude: data.longitude,
          formattedAddress: data.location,
          placeId: resolvedLocation?.placeId || "",
          locality: resolvedLocation?.locality || "",
          subLocality: resolvedLocation?.subLocality || "",
          city: resolvedLocation?.city || "",
          district: resolvedLocation?.district || "",
          state: resolvedLocation?.state || "",
          country: resolvedLocation?.country || "",
          postalCode: resolvedLocation?.postalCode || "",
        },
        severity: data.severity,
        aiAssistant: aiAssistantPayload,
      };

      // Pass pre-uploaded Cloudinary assets directly to createReport
      const reportId = await ReportService.createReport(payload, uploadedAssets, profile.uid);

      // Trigger server action (fire-and-forget)
      startReportVerification(reportId).catch((err) => {
        console.error("Failed to start verification:", err);
      });

      // Redirect to success route
      router.push(`/reports/${reportId}?success=true`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit issue report.";
      setGlobalError(msg);
      setIsSubmitting(false);
    }
  };

  const allowedExtensions = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES].join(",");

  const isFormDisabled = isAnalyzing || isSubmitting;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 w-full max-w-xl bg-card border border-border p-6 rounded-lg shadow-sm"
    >
      <div className="flex flex-col gap-1 border-b border-border pb-3">
        <h2 className="text-xl font-bold tracking-tight">Report a New Issue</h2>
        <p className="text-xs text-muted-foreground">
          Upload photo or video evidence. Our AI assistant will automatically parse it and pre-fill
          the details for you.
        </p>
      </div>

      {globalError && (
        <div
          className="p-3.5 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md font-medium"
          role="alert"
        >
          {globalError}
        </div>
      )}

      {/* 1. Evidence Upload Area (MOVED TO TOP FOR FLUID USER EXPERIENCE) */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-semibold text-foreground select-none">
          1. Upload Evidence (Max {MAX_MEDIA_COUNT} photos/videos)
        </label>

        <div className="flex items-center justify-center w-full">
          <label
            className={`flex flex-col items-center justify-center w-full h-24 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted/30 transition-colors ${
              isFormDisabled ? "opacity-50 pointer-events-none" : ""
            }`}
          >
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
              disabled={isFormDisabled}
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
                <div
                  key={idx}
                  className="relative group aspect-square border border-border rounded-md overflow-hidden bg-muted"
                >
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
                    disabled={isFormDisabled}
                    className="absolute top-1 right-1 bg-black/60 hover:bg-black/90 text-white rounded-full p-1 transition-colors disabled:opacity-50"
                    aria-label="Remove asset"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
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

      {/* 2. AI Analysis Loading / Results Stages */}
      {isAnalyzing && (
        <div className="flex flex-col items-center justify-center gap-3 p-6 border border-primary/10 bg-primary/5 rounded-md animate-pulse">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-primary">Analyzing evidence...</span>
        </div>
      )}

      {aiSuggested && (
        <div className="p-4 border border-primary/20 bg-primary/5 rounded-md flex flex-col gap-1 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-primary">✨ AI Suggested Report</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Confidence: {Math.round(aiConfidence! * 100)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            We have pre-filled the form based on your uploaded evidence. Feel free to review and
            adjust any field below before submitting.
          </p>
          <p className="text-[10px] text-muted-foreground/60 italic mt-1 font-medium">
            Generated by CivicMind AI
          </p>
        </div>
      )}

      {aiMessage && (
        <div className="p-4 border border-yellow-500/20 bg-yellow-500/5 rounded-md text-xs text-yellow-600 font-medium">
          ⚠️ {aiMessage}
        </div>
      )}

      {/* 3. Location Leaflet Map Picker */}
      <div className="flex flex-col gap-3 p-4 border border-border bg-muted/20 rounded-md">
        <span className="text-xs font-semibold text-foreground">2. Location Information</span>
        <MapPicker
          initialLatitude={getValues("latitude") || 12.9716}
          initialLongitude={getValues("longitude") || 77.5946}
          initialLocation={resolvedLocation}
          onLocationChange={(loc) => {
            setValue("latitude", loc.latitude);
            setValue("longitude", loc.longitude);
            setValue("location", loc.formattedAddress);
            setResolvedLocation(loc);
          }}
        />
        {errors.location && (
          <span className="text-xs text-destructive font-medium mt-0.5" role="alert">
            {errors.location.message}
          </span>
        )}
      </div>

      {/* 4. Pre-fill & Metadata Fields */}
      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <span className="text-xs font-semibold text-foreground">3. Issue Details</span>

        {/* Title */}
        <Input
          label="Issue Title"
          placeholder="e.g. Large pothole on main road"
          error={errors.title?.message}
          disabled={isFormDisabled}
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
            disabled={isFormDisabled}
            {...register("description")}
            className="w-full px-3.5 py-2.5 bg-background border border-border text-sm rounded-md transition-all duration-200 outline-none placeholder:text-muted-foreground/60 text-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
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
            disabled={isFormDisabled}
            className="w-full px-3.5 py-2.5 bg-background border border-border text-sm rounded-md transition-all duration-200 outline-none text-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
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

        {/* Severity Dropdown */}
        <div className="flex flex-col gap-1.5 w-full">
          <label className="text-xs font-medium text-muted-foreground select-none">
            Severity / Urgency Level
          </label>
          <select
            {...register("severity")}
            disabled={isFormDisabled}
            className="w-full px-3.5 py-2.5 bg-background border border-border text-sm rounded-md transition-all duration-200 outline-none text-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            <option value="">Select severity...</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          {errors.severity && (
            <span className="text-xs text-destructive font-medium mt-0.5" role="alert">
              {errors.severity.message}
            </span>
          )}
        </div>
      </div>

      {/* Form Submission */}
      <Button
        type="submit"
        isLoading={isSubmitting}
        disabled={isFormDisabled}
        className="w-full mt-2"
      >
        Submit Issue Report
      </Button>
    </form>
  );
}
export default ReportForm;
