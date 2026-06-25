/**
 * @file src/app/(dashboard)/officer/reports/[reportId]/investigate/page.tsx
 * @description Officer Investigation Workspace page.
 * Full-lifecycle dashboard for managing assigned incidents, adding evidence/notes, AI summary generation, and case resolution.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase/firestore";
import { CivicReport, MediaAsset } from "@/types";
import {
  acceptAssignmentAction,
  startInvestigationAction,
  saveOfficerNotesAction,
  generateAIResolutionSummaryAction,
  resolveReportAction,
  uploadProgressMediaAction
} from "@/app/actions/officer.actions";
import { MediaService } from "@/features/media/services/media.service";
import {
  FileText, Shield, MapPin, Camera, Clock, CheckCircle, AlertCircle, Wrench, Sparkles, Loader2, ChevronLeft, Upload
} from "lucide-react";
import dynamic from "next/dynamic";

// Load Leaflet Map dynamically
const MapViewer = dynamic(() => import("@/components/maps/MapViewer"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] w-full bg-zinc-900 flex items-center justify-center border border-white/5 rounded-2xl">
      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
    </div>
  )
});

export default function OfficerInvestigationPage() {
  const { reportId } = useParams() as { reportId: string };
  const router = useRouter();
  const { profile } = useAuth();
  const [report, setReport] = useState<CivicReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Tools state
  const [notesContent, setNotesContent] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [uploadingProgress, setUploadingProgress] = useState(false);

  // Resolution state
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [selectedBeforeImg, setSelectedBeforeImg] = useState<string>("");
  const [selectedAfterImg, setSelectedAfterImg] = useState<string>("");
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [actionError, setActionError] = useState("");

  const [aiSummaryResult, setAiSummaryResult] = useState<{
    summary: string;
    workCompleted: string;
    citizenExplanation: string;
  } | null>(null);

  // 1. Subscribe to report details in real-time
  useEffect(() => {
    if (!reportId) return;

    const unsubscribe = onSnapshot(
      doc(db, "reports", reportId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as CivicReport;
          setReport({ ...data, id: docSnap.id });
          
          // Pre-populate fields
          setNotesContent(data.officerNotes?.content || "");
          setResolutionNotes(data.resolution?.notes || "");
          
          // Auto select first citizen photo as before image
          if (data.evidence?.media && data.evidence.media.length > 0) {
            setSelectedBeforeImg(data.evidence.media[0].url);
          }
          // Auto select first repair proof image if present
          if (data.resolution?.proofPhotoUrl) {
            setSelectedAfterImg(data.resolution.proofPhotoUrl);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error reading report details:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [reportId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-center p-6">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-bold text-white">Report Not Found</h2>
        <p className="text-sm text-zinc-500 max-w-xs">The incident report you are trying to access does not exist.</p>
        <Link href="/officer">
          <Button size="sm">Return to Console</Button>
        </Link>
      </div>
    );
  }

  const isAssigned = (report.status as any) === "assigned" || (report.status as any) === "requires_review";
  const isInProgress = report.status === "in_progress";
  const isResolved = report.status === "resolved";

  // Actions
  const handleAccept = async () => {
    if (!profile?.uid) return;
    try {
      setActionError("");
      const res = await acceptAssignmentAction(profile.uid, report.id, profile.uid);
      if (!res.success) setActionError(res.error || "Failed to accept.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartInvestigation = async () => {
    if (!profile?.uid) return;
    try {
      setActionError("");
      const res = await startInvestigationAction(profile.uid, report.id, profile.uid);
      if (!res.success) setActionError(res.error || "Failed to start investigation.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveNotes = async () => {
    if (!profile?.uid) return;
    setNotesSaving(true);
    try {
      setActionError("");
      const res = await saveOfficerNotesAction(profile.uid, report.id, profile.uid, notesContent);
      if (!res.success) setActionError(res.error || "Failed to save notes.");
    } catch (e) {
      console.error(e);
    } finally {
      setNotesSaving(false);
    }
  };

  const handleProgressUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile?.uid || !event.target.files || event.target.files.length === 0) return;
    const files = Array.from(event.target.files);
    
    setUploadingProgress(true);
    try {
      const assets = await MediaService.uploadFiles(files, `reports/${report.id}/progress`, profile.uid);
      if (assets.length > 0) {
        const res = await uploadProgressMediaAction(profile.uid, report.id, profile.uid, assets);
        if (!res.success) setActionError(res.error || "Failed to save progress media.");
        // Set the uploaded image as the selected after photo
        setSelectedAfterImg(assets[0].url);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploadingProgress(false);
    }
  };

  const handleGenerateAISummary = async () => {
    if (!profile?.uid) return;
    setGeneratingSummary(true);
    setActionError("");
    try {
      const beforeAsset: MediaAsset[] = selectedBeforeImg ? [{ id: "before", type: "image", url: selectedBeforeImg, storagePath: "", mimeType: "image/jpeg", size: 0, uploadedAt: "" }] : [];
      const afterAsset: MediaAsset[] = selectedAfterImg ? [{ id: "after", type: "image", url: selectedAfterImg, storagePath: "", mimeType: "image/jpeg", size: 0, uploadedAt: "" }] : [];

      const res = await generateAIResolutionSummaryAction(
        profile.uid,
        report.ai?.assistant?.title || report.metadata.title,
        report.ai?.assistant?.category || report.metadata.category,
        notesContent || "Resolved civic incident.",
        beforeAsset,
        afterAsset
      );

      if (res.success && res.data) {
        setAiSummaryResult(res.data);
        if (!resolutionNotes) {
          setResolutionNotes(res.data.summary);
        }
      } else {
        setActionError(res.error || "Failed to generate AI summary.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const handleResolve = async () => {
    if (!profile?.uid) return;
    if (!resolutionNotes.trim()) {
      setActionError("Resolution notes are required.");
      return;
    }

    setResolving(true);
    setActionError("");
    try {
      const beforeMedia: MediaAsset[] = selectedBeforeImg ? [{ id: "before", type: "image", url: selectedBeforeImg, storagePath: "", mimeType: "image/jpeg", size: 0, uploadedAt: "" }] : [];
      const afterMedia: MediaAsset[] = selectedAfterImg ? [{ id: "after", type: "image", url: selectedAfterImg, storagePath: "", mimeType: "image/jpeg", size: 0, uploadedAt: "" }] : [];

      const finalSummary = aiSummaryResult || {
        summary: resolutionNotes,
        workCompleted: "Repairs and resolution completed.",
        citizenExplanation: "The reported civic issue has been resolved."
      };

      const res = await resolveReportAction(
        profile.uid,
        report.id,
        profile.uid,
        resolutionNotes,
        { before: beforeMedia, after: afterMedia },
        4, // default duration 4 hours
        finalSummary,
        "completed"
      );

      if (res.success) {
        router.push("/officer");
      } else {
        setActionError(res.error || "Failed to resolve incident.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setResolving(false);
    }
  };

  return (
    <RouteGuard allowedRoles={["officer", "admin"]}>
      <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col">
        {/* Navigation Header */}
        <header className="border-b border-white/10 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/officer">
                <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Console
                </Button>
              </Link>
              <span className="text-zinc-600">|</span>
              <span className="font-extrabold text-sm tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                Investigation Workspace
              </span>
            </div>
            <span className="text-xs text-zinc-500 font-semibold font-mono hidden md:inline">
              Case Ref: #{report.id.substring(0, 8)}
            </span>
          </div>
        </header>

        {/* Workspace Layout */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1 & 2: Incident Details, Evidence, AI analysis, Resolution Tools */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Header / Status Banner */}
            <div className="border border-white/10 rounded-3xl p-6 bg-zinc-900/10 backdrop-blur-md relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
              <div>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Incident Title</span>
                <h1 className="text-2xl font-black text-white mt-0.5">{report.ai?.assistant?.title || report.metadata.title}</h1>
                <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
                  <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/10 uppercase tracking-wide font-bold">
                    {report.ai?.assistant?.category || report.metadata.category}
                  </span>
                  <span>Submitted {new Date(report.timestamps.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Lifecycle Actions */}
              <div className="flex items-center gap-3 self-stretch md:self-auto">
                {isAssigned && (
                  <Button onClick={handleAccept} className="bg-blue-600 hover:bg-blue-500 text-white font-bold w-full md:w-auto">
                    Accept Assignment
                  </Button>
                )}
                {report.status === "accepted" && (
                  <Button onClick={handleStartInvestigation} className="bg-purple-600 hover:bg-purple-500 text-white font-bold w-full md:w-auto">
                    Start Investigation
                  </Button>
                )}
                {isResolved && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-500/15 border border-emerald-500/25 rounded-xl text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                    <CheckCircle className="w-4 h-4" /> Resolved Case
                  </span>
                )}
                {isInProgress && (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-purple-500/15 border border-purple-500/25 rounded-xl text-purple-400 font-extrabold text-xs uppercase tracking-wider">
                    <Wrench className="w-4 h-4" /> Active Investigation
                  </span>
                )}
              </div>
            </div>

            {actionError && (
              <div className="bg-rose-950/40 border border-rose-500/20 p-4 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {actionError}
              </div>
            )}

            {/* AI Triage Analysis details */}
            <div className="border border-white/10 rounded-3xl p-6 bg-zinc-900/10 backdrop-blur-md shadow-xl flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-400" />
                AI Analysis & Triage Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-950 p-3 rounded-xl border border-white/5 flex flex-col gap-0.5">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Trust Score</span>
                  <span className="text-lg font-black text-emerald-400">{Math.round((report.ai?.verification?.trustScore || 0.5) * 100)}%</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-xl border border-white/5 flex flex-col gap-0.5">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Priority Tier</span>
                  <span className="text-lg font-black text-rose-400 capitalize">{report.ai?.verification?.priority || "medium"}</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-xl border border-white/5 flex flex-col gap-0.5">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Assigned Dept</span>
                  <span className="text-lg font-black text-blue-400 capitalize">{report.ai?.verification?.assignedDepartment || "unassigned"}</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-xl border border-white/5 flex flex-col gap-0.5">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Duplicate Reports</span>
                  <span className="text-lg font-black text-zinc-400">{report.ai?.verification?.duplicateReportIds?.length || 0}</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1 mt-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Original Description</span>
                <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-950/40 p-4 rounded-2xl border border-white/5">
                  {report.ai?.assistant?.description || report.metadata.description}
                </p>
              </div>
            </div>

            {/* Citizen Evidence Panel */}
            <div className="border border-white/10 rounded-3xl p-6 bg-zinc-900/10 backdrop-blur-md shadow-xl flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-400" />
                Evidence Portfolio
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {report.evidence?.media?.map((media, idx) => (
                  <div
                    key={media.id || idx}
                    onClick={() => {
                      if (!isResolved) setSelectedBeforeImg(media.url);
                    }}
                    className={`h-24 bg-zinc-950 rounded-xl overflow-hidden relative cursor-pointer border-2 transition ${
                      selectedBeforeImg === media.url ? "border-blue-500" : "border-white/5 hover:border-white/20"
                    }`}
                  >
                    <img src={media.url} alt="Evidence" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            {/* Notes & Progress Tools Workspace */}
            {isInProgress && (
              <div className="border border-white/10 rounded-3xl p-6 bg-zinc-900/10 backdrop-blur-md shadow-xl flex flex-col gap-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-blue-400" />
                  Investigation Tools
                </h3>

                {/* Upload Case progress photos */}
                <div className="flex flex-col gap-2 bg-zinc-950 p-4 rounded-2xl border border-white/5">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Upload Progress Media / Repair Photos</span>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold bg-zinc-900 hover:bg-zinc-850 px-4 py-2 border border-white/10 rounded-xl cursor-pointer flex items-center gap-1.5 transition text-zinc-300">
                      {uploadingProgress ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" /> Upload Files
                        </>
                      )}
                      <input type="file" multiple accept="image/*" className="hidden" onChange={handleProgressUpload} disabled={uploadingProgress} />
                    </label>
                    <span className="text-[11px] text-zinc-500">Attach field evidence photos to the incident profile.</span>
                  </div>
                </div>

                {/* Internal notes autosave */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Officer Case Notes (Autosaved history)</span>
                  <textarea
                    value={notesContent}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotesContent(e.target.value)}
                    placeholder="Enter case investigation notes, progress status, repairs detail..."
                    className="bg-zinc-950 border border-white/10 text-white min-h-[120px] text-xs leading-relaxed rounded-xl p-3 outline-none focus:border-blue-500 transition w-full"
                  />
                  <Button onClick={handleSaveNotes} disabled={notesSaving} size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 font-bold self-end text-xs px-4 h-8 mt-1">
                    {notesSaving ? "Autosaving Notes..." : "Autosave Notes"}
                  </Button>
                </div>
              </div>
            )}

            {/* Resolution Workspace Section */}
            {isInProgress && (
              <div className="border border-white/10 rounded-3xl p-6 bg-zinc-900/10 backdrop-blur-md shadow-xl flex flex-col gap-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                  Incident Resolution Workspace
                </h3>

                {/* Image Selectors (Before vs After) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Before Image (Citizen Evidence)</span>
                    <div className="h-36 bg-zinc-950 rounded-xl overflow-hidden relative border border-white/5">
                      {selectedBeforeImg ? (
                        <img src={selectedBeforeImg} alt="Before" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-650 text-xs">No image selected</div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">After Image (Repair Proof)</span>
                    <div className="h-36 bg-zinc-950 rounded-xl overflow-hidden relative border border-white/5">
                      {selectedAfterImg ? (
                        <img src={selectedAfterImg} alt="After" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-650 text-xs">No image uploaded</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Summary Generator */}
                <div className="flex flex-col gap-2.5 bg-blue-500/[0.02] border border-blue-500/10 p-5 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-400" /> AI Resolution Copilot
                    </span>
                    <Button onClick={handleGenerateAISummary} disabled={generatingSummary} size="sm" className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 h-8 font-bold">
                      {generatingSummary ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generating...
                        </>
                      ) : (
                        "Generate AI Summaries"
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Generate the final technical summaries, work reports, and explanations in the citizen's profile language.
                  </p>
                </div>

                {/* AI Generated Text Outputs */}
                {aiSummaryResult && (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Technical Summary</label>
                      <textarea value={aiSummaryResult.summary} readOnly className="bg-zinc-950/60 border border-white/5 text-zinc-300 text-xs cursor-default min-h-[70px] rounded-xl p-3 outline-none w-full" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Work Completed</label>
                      <textarea value={aiSummaryResult.workCompleted} readOnly className="bg-zinc-950/60 border border-white/5 text-zinc-300 text-xs cursor-default min-h-[70px] rounded-xl p-3 outline-none w-full" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Citizen Explanation</label>
                      <textarea value={aiSummaryResult.citizenExplanation} readOnly className="bg-zinc-950/60 border border-white/5 text-zinc-300 text-xs cursor-default min-h-[70px] rounded-xl p-3 outline-none w-full" />
                    </div>
                  </div>
                )}

                {/* Close Case details */}
                <div className="flex flex-col gap-2 mt-2">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Resolution Notes (Publicly visible to citizen)</span>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResolutionNotes(e.target.value)}
                    required
                    placeholder="Provide description of how the incident was solved..."
                    className="bg-zinc-950 border border-white/10 text-white min-h-[90px] text-xs rounded-xl p-3 outline-none focus:border-blue-500 transition w-full"
                  />
                  <Button onClick={handleResolve} disabled={resolving} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold w-fit self-end mt-2">
                    {resolving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Resolving Incident...
                      </>
                    ) : (
                      "Complete & Close Incident Case"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Column 3: Leaflet map view, case notes history, timeline logs */}
          <div className="flex flex-col gap-6">
            
            {/* Incident Geospatial Map viewer */}
            <div className="border border-white/10 rounded-3xl p-6 bg-zinc-900/10 backdrop-blur-md shadow-xl flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-400" />
                Geospatial Coordinate Marker
              </h3>
              
              <MapViewer
                latitude={report.location?.latitude || 0}
                longitude={report.location?.longitude || 0}
                title={report.ai?.assistant?.title || report.metadata.title}
                category={report.ai?.assistant?.category || report.metadata.category}
                severity={report.ai?.verification?.priority || "medium"}
                address={report.location?.formattedAddress || ""}
              />
            </div>

            {/* Case Timeline Activity Logs */}
            <div className="border border-white/10 rounded-3xl p-6 bg-zinc-900/10 backdrop-blur-md shadow-xl flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-400" />
                Incident Timeline Logs
              </h3>

              <div className="flex flex-col gap-4 max-h-[300px] overflow-y-auto pr-2">
                {report.timeline && report.timeline.length > 0 ? (
                  report.timeline.map((event, idx) => (
                    <div key={idx} className="relative pl-5 border-l border-white/10 pb-4 last:pb-0 flex flex-col gap-0.5">
                      <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-zinc-950" />
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 font-semibold font-mono">
                        <span>{new Date(event.timestamp).toLocaleString()}</span>
                        <span className="capitalize">{(event as any).actorType}</span>
                      </div>
                      <span className="font-extrabold text-xs text-zinc-200">{(event as any).event}</span>
                      <p className="text-[10px] text-zinc-400 leading-normal">{(event as any).note}</p>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500 text-center py-6">No timeline events logged.</span>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </RouteGuard>
  );
}
