/**
 * @file src/app/(dashboard)/officer/reports/[reportId]/page.tsx
 * @description Sprint 8: Production-grade Officer Incidents Workspace and Resolution Console.
 */

"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { useAuth } from "@/providers/auth-provider";
import { ReportService } from "@/features/reports/services/report.service";
import { CivicReport, MediaAsset } from "@/types";
import { Button } from "@/components/ui/button";
import {
  acceptAssignmentAction,
  rejectAssignmentAction,
  startInvestigationAction,
  resolveReportAction,
  saveOfficerNotesAction,
  generateAIResolutionSummaryAction,
} from "@/app/actions/officer.actions";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle,
  Activity,
  Loader2,
  Calendar,
  User,
  Building,
  Clock,
  Sparkles,
  Trash2,
  History,
  Lock,
} from "lucide-react";

// Dynamically import Leaflet Map to avoid SSR errors
const LeafletMap = dynamic(() => import("@/components/ui/leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] bg-slate-950/45 animate-pulse rounded-2xl flex items-center justify-center border border-slate-800">
      <span className="text-xs text-slate-500">Initializing mapping engine...</span>
    </div>
  ),
});

export default function OfficerReportDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const reportId = params?.reportId as string;

  const [report, setReport] = useState<CivicReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Workflow states
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Officer Notes states
  const [noteContent, setNoteContent] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error" | null>(null);
  const hasLoadedNotesRef = useRef(false);
  const notesTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fullscreen media modal
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);

  // Resolution states
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resCategory, setResCategory] = useState("completed");
  const [resDuration, setResDuration] = useState<number>(4); // default 4 hours
  const [resNotes, setResNotes] = useState("");
  const [beforeMedia, setBeforeMedia] = useState<MediaAsset[]>([]);
  const [afterMedia, setAfterMedia] = useState<MediaAsset[]>([]);
  
  // Custom media input helper states
  const [mediaType, setMediaType] = useState<"before" | "after">("before");
  const [mediaUrlInput, setMediaUrlInput] = useState("");

  // AI Summary states
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState<{
    summary: string;
    workCompleted: string;
    citizenExplanation: string;
  } | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    setUnauthorized(false);
    try {
      const data = await ReportService.getReport(reportId);
      if (!data) {
        setError("The requested incident report could not be found.");
        return;
      }

      // Check access control: report must be assigned to this officer
      if (profile && data.ai?.assignment?.officerId !== profile.uid) {
        setUnauthorized(true);
        return;
      }

      setReport(data);
      
      // Initialize notes content once on load
      if (!hasLoadedNotesRef.current && data.officerNotes) {
        setNoteContent(data.officerNotes.content || "");
        hasLoadedNotesRef.current = true;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load report details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportId && profile) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, profile]);

  // Notes Autosave trigger
  useEffect(() => {
    if (!report || !profile) return;
    // Skip saving on initial empty or initial load matching
    if (!hasLoadedNotesRef.current) return;

    if (notesTimerRef.current) {
      clearTimeout(notesTimerRef.current);
    }

    setSaveStatus("saving");
    notesTimerRef.current = setTimeout(async () => {
      try {
        const res = await saveOfficerNotesAction(report.id, profile.uid, noteContent);
        if (res.success) {
          setSaveStatus("saved");
          // Refresh report background data to load history without blocking
          const updated = await ReportService.getReport(reportId);
          if (updated) setReport(updated);
        } else {
          setSaveStatus("error");
        }
      } catch (err) {
        console.error("Notes autosave error:", err);
        setSaveStatus("error");
      }
    }, 1500);

    return () => {
      if (notesTimerRef.current) {
        clearTimeout(notesTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteContent]);

  const handleAccept = async () => {
    if (!report || !profile?.uid) return;
    setSubmitting(true);
    try {
      const res = await acceptAssignmentAction(report.id, profile.uid);
      if (res.success) {
        await fetchReport();
      } else {
        alert(res.error || "Failed to accept assignment.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!report || !profile?.uid || !rejectReason.trim()) return;
    setSubmitting(true);
    try {
      const res = await rejectAssignmentAction(report.id, profile.uid, rejectReason);
      if (res.success) {
        router.push("/officer");
      } else {
        alert(res.error || "Failed to reject assignment.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
      setShowRejectForm(false);
      setRejectReason("");
    }
  };

  const handleStartInvestigation = async () => {
    if (!report || !profile?.uid) return;
    setSubmitting(true);
    try {
      const res = await startInvestigationAction(report.id, profile.uid);
      if (res.success) {
        await fetchReport();
      } else {
        alert(res.error || "Failed to start active investigation.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to add media assets to lists
  const handleAddMediaLink = () => {
    if (!mediaUrlInput.trim()) return;
    const isVideo = mediaUrlInput.toLowerCase().endsWith(".mp4") || mediaUrlInput.includes("video");
    const newAsset: MediaAsset = {
      id: "media_link_" + Date.now(),
      url: mediaUrlInput,
      type: isVideo ? "video" : "image",
      storagePath: `resolutions/links/${Date.now()}`,
      mimeType: isVideo ? "video/mp4" : "image/jpeg",
      size: 0,
      uploadedAt: new Date().toISOString(),
    };

    if (mediaType === "before") {
      setBeforeMedia(prev => [...prev, newAsset]);
    } else {
      setAfterMedia(prev => [...prev, newAsset]);
    }
    setMediaUrlInput("");
  };

  const handleAddMediaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const newAsset: MediaAsset = {
      id: "media_file_" + Date.now(),
      url: objectUrl,
      type: file.type.startsWith("video/") ? "video" : "image",
      storagePath: `resolutions/files/${file.name}`,
      mimeType: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    if (mediaType === "before") {
      setBeforeMedia(prev => [...prev, newAsset]);
    } else {
      setAfterMedia(prev => [...prev, newAsset]);
    }
    e.target.value = "";
  };

  const handleRemoveMedia = (listType: "before" | "after", id: string) => {
    if (listType === "before") {
      setBeforeMedia(prev => prev.filter(m => m.id !== id));
    } else {
      setAfterMedia(prev => prev.filter(m => m.id !== id));
    }
  };

  // Generate AI Resolution summary using Gemini
  const handleGenerateAISummary = async () => {
    if (!resNotes.trim()) {
      alert("Please fill out the Action Taken Notes first to audit and generate the summary.");
      return;
    }
    setIsGeneratingAI(true);
    try {
      const res = await generateAIResolutionSummaryAction(
        report?.metadata.title || "Incident",
        report?.metadata.category || "General",
        resNotes,
        beforeMedia,
        afterMedia
      );
      if (res.success && res.data) {
        setAiSummary(res.data);
      } else {
        alert(res.error || "Failed to generate AI summary.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !profile?.uid || !aiSummary) return;
    setSubmitting(true);
    try {
      const repairEvidence = {
        before: beforeMedia,
        after: afterMedia,
      };
      const res = await resolveReportAction(
        report.id,
        profile.uid,
        resNotes,
        repairEvidence,
        resDuration,
        aiSummary,
        resCategory
      );
      if (res.success) {
        setShowResolveForm(false);
        setResNotes("");
        setBeforeMedia([]);
        setAfterMedia([]);
        setAiSummary(null);
        await fetchReport();
      } else {
        alert(res.error || "Failed to resolve incident.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const maskUid = (uid?: string) => {
    if (!uid) return "Anonymous";
    if (uid.length <= 8) return uid;
    return `${uid.substring(0, 4)}...${uid.substring(uid.length - 4)}`;
  };

  const getPriorityBadge = (priority?: string | null) => {
    const val = (priority || "medium").toLowerCase();
    switch (val) {
      case "critical":
        return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Critical</span>;
      case "high":
        return <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">High</span>;
      case "medium":
        return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Medium</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">{val}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Resolved</span>;
      case "in_progress":
        return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">In Progress</span>;
      case "accepted":
      case "investigating":
        return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Accepted</span>;
      case "submitted":
        return <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Assigned</span>;
      case "rejected":
        return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Rejected</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <RouteGuard allowedRoles={["officer"]}>
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-950 via-black to-slate-900 text-slate-100 pb-20">
        {/* Top Header */}
        <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link
              href="/officer"
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-400 transition-colors font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Command Center
            </Link>
            <div className="flex items-center gap-3">
              <span className="font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 text-sm">
                CIVICMIND
              </span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-500/30">
                Staff Console
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8">
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <span className="text-sm text-slate-400">Synchronizing incident workspace console...</span>
            </div>
          ) : error ? (
            <div className="py-24 text-center border border-slate-800 rounded-2xl bg-slate-950/40 p-8 max-w-xl mx-auto">
              <p className="text-rose-400 font-bold mb-4">{error}</p>
              <Link href="/officer">
                <Button variant="outline" className="border-slate-800 text-slate-350 hover:bg-slate-900">
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          ) : unauthorized ? (
            <div className="py-24 text-center border border-rose-950/45 rounded-2xl bg-slate-950/60 p-8 max-w-lg mx-auto flex flex-col items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/25">
                <Lock className="h-6 w-6 text-rose-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-200">Unauthorized Access</h2>
              <p className="text-sm text-slate-450 leading-relaxed max-w-sm">
                This report is not assigned to your staff profile. Direct access to unassigned incident workspaces is prohibited under municipal protocol.
              </p>
              <Link href="/officer" className="w-full">
                <Button className="w-full bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white">
                  Back to Dashboard
                </Button>
              </Link>
            </div>
          ) : report ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN (7/12) */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                
                {/* Incident Overview Card */}
                <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-6 backdrop-blur-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 h-[100px] w-[100px] bg-indigo-500/5 blur-2xl rounded-full" />
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <span className="text-xs font-mono text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      ID: #{report.id.substring(0, 10)}
                    </span>
                    <div className="flex gap-2">
                      {getPriorityBadge(report.ai?.verification?.priority)}
                      {getStatusBadge(report.status)}
                    </div>
                  </div>
                  
                  <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight mb-3">
                    {report.metadata.title}
                  </h1>
                  
                  <p className="text-sm text-slate-300 bg-slate-950/40 p-4 rounded-xl border border-slate-900 leading-relaxed whitespace-pre-wrap mb-6">
                    {report.metadata.description}
                  </p>

                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Metadata Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-800/60 p-4 rounded-xl bg-slate-900/10 text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Reported Date</span>
                        <strong className="text-slate-300">{new Date(report.timestamps.createdAt).toLocaleString()}</strong>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-500 shrink-0" />
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Reporter UID</span>
                        <strong className="text-slate-300 font-mono">{maskUid(report.metadata.createdBy)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-slate-500 shrink-0" />
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Assigned Department</span>
                        <strong className="text-slate-300">{report.ai?.assignment?.department || "N/A"}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500 shrink-0" />
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Verification Status</span>
                        <strong className="text-slate-300 capitalize">{report.ai?.verification?.status || "Processing"}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Auditing & Analysis Panel */}
                <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-6 backdrop-blur-sm">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
                    <ShieldCheck className="h-5 w-5 text-indigo-400 font-bold" />
                    AI Triage Analytics
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="border border-slate-850 rounded-xl bg-slate-900/30 p-4 flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">AI Trust Score</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full"
                            style={{ width: `${(report.ai?.verification?.trustScore || 0) * 100}%` }}
                          />
                        </div>
                        <strong className="text-slate-200 text-sm font-mono shrink-0">
                          {Math.round((report.ai?.verification?.trustScore || 0) * 100)}%
                        </strong>
                      </div>
                    </div>

                    <div className="border border-slate-850 rounded-xl bg-slate-900/30 p-4 flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Duplicate Probability</span>
                      <strong className="text-slate-200 text-base font-extrabold mt-1 font-mono">
                        {Math.round((report.ai?.verification?.duplicateProbability || 0) * 100)}%
                      </strong>
                    </div>

                    <div className="border border-slate-850 rounded-xl bg-slate-900/30 p-4 flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Fake Media Risk</span>
                      <strong className={`text-base font-extrabold mt-1 font-mono ${
                        (report.ai?.verification?.fakeMediaProbability || 0) > 0.6
                          ? "text-red-400"
                          : (report.ai?.verification?.fakeMediaProbability || 0) > 0.3
                            ? "text-amber-400"
                            : "text-emerald-400"
                      }`}>
                        {Math.round((report.ai?.verification?.fakeMediaProbability || 0) * 100)}%
                      </strong>
                    </div>
                  </div>

                  {report.ai?.verification?.fakeMediaReason && (
                    <div className="border border-slate-850 rounded-xl bg-slate-900/20 p-4 mb-4">
                      <span className="text-[10px] uppercase font-bold text-slate-450 block mb-1">Media Integrity Assessment</span>
                      <p className="text-xs text-slate-450 italic leading-relaxed">
                        &ldquo;{report.ai.verification.fakeMediaReason}&rdquo;
                      </p>
                    </div>
                  )}

                  {report.ai?.assistant?.detectedObjects && report.ai.assistant.detectedObjects.length > 0 && (
                    <div className="mb-4">
                      <span className="text-[10px] uppercase font-bold text-slate-450 block mb-2">Detected Objects / Assets</span>
                      <div className="flex flex-wrap gap-1.5">
                        {report.ai.assistant.detectedObjects.map((obj, i) => (
                          <span key={i} className="bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded text-[10px] font-mono">
                            {obj}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.ai?.verification?.summary && (
                    <div className="flex flex-col gap-2 text-xs border-t border-slate-850 pt-4">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Verification Agent Summary</span>
                      <p className="text-slate-350 leading-relaxed bg-slate-950/45 p-3 rounded-lg border border-slate-900">
                        {report.ai.verification.summary}
                      </p>
                    </div>
                  )}
                </div>

                {/* Case History / Timeline Feed */}
                <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-6 backdrop-blur-sm">
                  <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider pb-3 border-b border-slate-850 mb-6">
                    Incident Case History / Timeline
                  </h3>
                  <div className="flex flex-col gap-6">
                    {report.timeline && report.timeline.length > 0 ? (
                      report.timeline.map((event, idx) => (
                        <div key={idx} className="flex gap-4 text-xs relative">
                          {idx !== (report.timeline?.length || 0) - 1 && (
                            <div className="absolute left-[9px] top-6 bottom-0 w-0.5 bg-slate-850" />
                          )}
                          <div className="h-5 w-5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-indigo-400 font-mono text-[9px] relative z-10">
                            {idx + 1}
                          </div>
                          <div className="flex-1 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-3">
                              <strong className="text-slate-200 text-sm font-semibold">{event.action}</strong>
                              <span className="text-[10px] text-slate-500 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-850">
                                {event.actorRole.toUpperCase()}
                              </span>
                            </div>
                            {event.note && (
                              <p className="text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-900 leading-relaxed font-sans select-all">
                                {event.note}
                              </p>
                            )}
                            <span className="text-[10px] text-slate-500">
                              Logged: {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">No timeline entries recorded for this incident file.</span>
                    )}
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN (5/12) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                
                {/* Map panel */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-slate-405 uppercase tracking-wider">
                    Geospatial Location
                  </h3>
                  <LeafletMap
                    latitude={report.location.latitude}
                    longitude={report.location.longitude}
                    title={report.metadata.title}
                    category={report.metadata.category}
                  />
                  <div className="text-xs text-slate-500 px-1 select-all">
                    Address: {report.location.formattedAddress}
                  </div>
                </div>

                {/* Workflow Actions panel */}
                <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-6 backdrop-blur-sm flex flex-col gap-4">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Activity className="h-5 w-5 text-indigo-400" />
                    Incident Case Actions
                  </h2>

                  {/* Accept assignment action */}
                  {report.status === "submitted" && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-slate-400">Accept this incident case workload to transition its status to Accepted.</p>
                      <Button
                        onClick={handleAccept}
                        disabled={submitting}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Accept Case Workload
                      </Button>
                      
                      <Button
                        onClick={() => setShowRejectForm(!showRejectForm)}
                        variant="ghost"
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs py-1"
                      >
                        {showRejectForm ? "Cancel Reject" : "Reject Assignment"}
                      </Button>

                      {showRejectForm && (
                        <div className="flex flex-col gap-2 border border-slate-800 p-3 rounded-xl bg-slate-950/60 mt-2">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block">Rejection Reason</label>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="State reason for rejecting case assignment..."
                            className="w-full h-20 p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500 resize-none"
                          />
                          <Button
                            onClick={handleReject}
                            disabled={submitting || !rejectReason.trim()}
                            className="bg-rose-600 hover:bg-rose-500 text-white text-xs py-1.5"
                          >
                            Submit Rejection
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Start Active Investigation */}
                  {(report.status === "accepted" || report.status === "investigating") && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-slate-400">Initiate active investigation to mark status as In Progress.</p>
                      <Button
                        onClick={handleStartInvestigation}
                        disabled={submitting}
                        className="w-full bg-blue-650 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                        Start Active Investigation
                      </Button>
                    </div>
                  )}

                  {/* In Progress actions */}
                  {report.status === "in_progress" && (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs text-slate-400">This incident is actively in progress. Complete work and report findings to resolve.</p>
                      
                      <Button
                        onClick={() => {
                          setShowResolveForm(true);
                          // Reset form states
                          setResNotes("");
                          setBeforeMedia([]);
                          setAfterMedia([]);
                          setAiSummary(null);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Resolve Incident Case
                      </Button>
                    </div>
                  )}

                  {/* Resolved Summary State */}
                  {report.status === "resolved" && (
                    <div className="border border-emerald-500/20 rounded-xl bg-emerald-500/5 p-4 flex flex-col gap-3">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4" />
                        Case Resolved
                      </span>
                      {report.resolution ? (
                        <div className="flex flex-col gap-3 text-xs">
                          <div>
                            <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Resolution Reason</span>
                            <strong className="text-slate-200 capitalize font-medium">{report.resolution.category}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Repair Duration</span>
                            <strong className="text-slate-200">{report.resolution.duration || 0} Hours</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Officer Action Log</span>
                            <p className="text-slate-300 italic bg-slate-900/30 p-2.5 rounded-lg border border-slate-850 mt-1">{report.resolution.notes}</p>
                          </div>

                          {report.resolution.aiSummary && (
                            <div className="border-t border-slate-850 pt-3 flex flex-col gap-2 bg-slate-950/30 p-2.5 rounded-lg">
                              <span className="text-indigo-400 font-bold text-[10px] flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                AI RESOLUTION AUDIT
                              </span>
                              <div>
                                <span className="text-slate-500 block font-semibold text-[9px]">Summary</span>
                                <p className="text-slate-300 text-[11px]">{report.resolution.aiSummary.summary}</p>
                              </div>
                              <div>
                                <span className="text-slate-500 block font-semibold text-[9px]">Work Completed</span>
                                <p className="text-slate-300 text-[11px]">{report.resolution.aiSummary.workCompleted}</p>
                              </div>
                              <div>
                                <span className="text-slate-500 block font-semibold text-[9px]">Citizen Friendly Explanation</span>
                                <p className="text-slate-300 text-[11px]">{report.resolution.aiSummary.citizenExplanation}</p>
                              </div>
                            </div>
                          )}

                          {report.resolution.repairEvidence?.before && report.resolution.repairEvidence.before.length > 0 && (
                            <div>
                              <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-2">Before Repair Evidence</span>
                              <div className="grid grid-cols-3 gap-2">
                                {report.resolution.repairEvidence.before.map((asset, i) => (
                                  <div key={i} className="aspect-square border border-slate-850 rounded-lg overflow-hidden relative cursor-pointer" onClick={() => setFullscreenUrl(asset.url)}>
                                    {asset.type === "video" ? (
                                      <video src={asset.url} className="w-full h-full object-cover" />
                                    ) : (
                                      <img src={asset.url} alt="Before" className="w-full h-full object-cover" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {report.resolution.repairEvidence?.after && report.resolution.repairEvidence.after.length > 0 && (
                            <div>
                              <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider mb-2">After Repair Evidence</span>
                              <div className="grid grid-cols-3 gap-2">
                                {report.resolution.repairEvidence.after.map((asset, i) => (
                                  <div key={i} className="aspect-square border border-slate-850 rounded-lg overflow-hidden relative cursor-pointer" onClick={() => setFullscreenUrl(asset.url)}>
                                    {asset.type === "video" ? (
                                      <video src={asset.url} className="w-full h-full object-cover" />
                                    ) : (
                                      <img src={asset.url} alt="After" className="w-full h-full object-cover" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <span className="text-[9px] text-slate-550 border-t border-slate-850 pt-2 block">
                            Resolved by ID {maskUid(report.resolution.resolvedBy)} on {new Date(report.resolution.resolvedAt).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No resolution payload data available on file.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Officer Notes Auto-Save Console */}
                <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-6 backdrop-blur-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                      <History className="h-4 w-4 text-indigo-400" />
                      Officer Notebook
                    </h3>
                    {saveStatus === "saving" && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                        <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                      </span>
                    )}
                    {saveStatus === "saved" && (
                      <span className="text-[10px] text-emerald-400 font-mono">Changes Saved</span>
                    )}
                    {saveStatus === "error" && (
                      <span className="text-[10px] text-rose-400 font-mono">Save Error</span>
                    )}
                  </div>

                  <div className="relative">
                    <textarea
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Type internal workspace notes here... (Changes are automatically saved to Firestore)"
                      maxLength={1500}
                      disabled={report.status === "resolved"}
                      className="w-full h-44 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-indigo-500 resize-none font-sans leading-relaxed"
                    />
                    <div className="absolute bottom-2.5 right-3 text-[10px] font-mono text-slate-500">
                      {noteContent.length} / 1500 chars
                    </div>
                  </div>

                  {/* Revision history collapsible */}
                  {report.officerNotes?.history && report.officerNotes.history.length > 0 && (
                    <details className="group border border-slate-850 rounded-xl overflow-hidden text-xs">
                      <summary className="flex items-center justify-between p-3 bg-slate-900/30 cursor-pointer hover:bg-slate-900/60 select-none">
                        <span className="font-semibold text-slate-350 flex items-center gap-1">
                          View Notebook History ({report.officerNotes.history.length})
                        </span>
                      </summary>
                      <div className="p-3 border-t border-slate-850 flex flex-col gap-3 max-h-48 overflow-y-auto bg-slate-950/20">
                        {report.officerNotes.history.map((rev, i) => (
                          <div key={i} className="border-b border-slate-900 pb-2 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
                              <span>Revision {report.officerNotes!.history.length - i}</span>
                              <span>{new Date(rev.updatedAt).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-400 font-mono whitespace-pre-wrap leading-tight text-[11px] bg-slate-900/20 p-2 rounded">
                              {rev.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>

                {/* Evidence Media Gallery */}
                <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-6 backdrop-blur-sm">
                  <h3 className="text-xs font-bold text-slate-455 uppercase tracking-wider mb-4">Citizen Evidence Gallery</h3>
                  {report.evidence.media && report.evidence.media.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {report.evidence.media.map((asset) => {
                        const isVid = asset.type === "video";
                        return (
                          <div
                            key={asset.id}
                            className="aspect-video border border-slate-800 rounded-xl overflow-hidden bg-slate-950 relative group transition-transform hover:scale-[1.01]"
                          >
                            {isVid ? (
                              <video src={asset.url} className="object-cover w-full h-full" controls preload="metadata" />
                            ) : (
                              <img
                                src={asset.url}
                                alt="Evidence"
                                className="object-cover w-full h-full cursor-zoom-in"
                                onClick={() => setFullscreenUrl(asset.url)}
                              />
                            )}
                            <div className="absolute bottom-2 left-2 bg-slate-950/95 text-[9px] font-mono text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                              Uploaded: {new Date(asset.uploadedAt).toLocaleDateString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No citizen evidence attachments available on record.
                    </div>
                  )}
                </div>

              </div>

            </div>
          ) : null}
        </main>

        {/* Resolution Form Overlay */}
        {showResolveForm && report && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-6 overflow-y-auto">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl my-8">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-850 mb-4">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                Incident Resolution & AI Summary Engine
              </h3>

              <form onSubmit={handleConfirmResolve} className="flex flex-col gap-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Resolution Classification</label>
                    <select
                      value={resCategory}
                      onChange={(e) => setResCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="completed">Completed / Work Done</option>
                      <option value="duplicate">Duplicate Report</option>
                      <option value="false_alarm">False Alarm / Invalid</option>
                      <option value="referred">Referred to Third Party</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Repair Duration (Hours)</label>
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={resDuration}
                      onChange={(e) => setResDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Official Actions Taken / Closure Notes</label>
                  <textarea
                    value={resNotes}
                    onChange={(e) => setResNotes(e.target.value)}
                    placeholder="Provide professional details of actions taken to fix the issue..."
                    className="w-full h-24 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                    required
                  />
                </div>

                {/* Repair Evidence Upload section */}
                <div className="border border-slate-900 rounded-xl p-4 bg-slate-950/40">
                  <span className="text-xs font-bold text-slate-350 block mb-2">Repair Verification Media (Before/After)</span>
                  <div className="flex gap-4 items-center mb-3">
                    <label className="flex items-center gap-1.5 text-xs text-slate-400">
                      <input
                        type="radio"
                        name="mediaType"
                        checked={mediaType === "before"}
                        onChange={() => setMediaType("before")}
                        className="text-indigo-600 focus:ring-0 bg-slate-900 border-slate-800"
                      />
                      Before Media
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-400">
                      <input
                        type="radio"
                        name="mediaType"
                        checked={mediaType === "after"}
                        onChange={() => setMediaType("after")}
                        className="text-indigo-600 focus:ring-0 bg-slate-900 border-slate-800"
                      />
                      After Media
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 items-stretch mb-3">
                    <input
                      type="url"
                      placeholder="Paste image/video URL here..."
                      value={mediaUrlInput}
                      onChange={(e) => setMediaUrlInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-250 focus:outline-none focus:border-indigo-550"
                    />
                    <Button
                      type="button"
                      onClick={handleAddMediaLink}
                      className="bg-indigo-600 hover:bg-indigo-500 text-xs px-4"
                    >
                      Add URL
                    </Button>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleAddMediaFile}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <Button
                        type="button"
                        className="bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 w-full text-xs"
                      >
                        Upload Local
                      </Button>
                    </div>
                  </div>

                  {/* Render preview list of before/after media */}
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Before Photos ({beforeMedia.length})</span>
                      <div className="flex flex-wrap gap-1.5 border border-slate-900 p-2 rounded-lg bg-slate-900/10 min-h-[50px]">
                        {beforeMedia.map((m) => (
                          <div key={m.id} className="relative group/media h-10 w-10 border border-slate-800 rounded overflow-hidden">
                            <img src={m.url} alt="Before" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveMedia("before", m.id)}
                              className="absolute inset-0 bg-black/60 items-center justify-center hidden group-hover/media:flex text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">After Photos ({afterMedia.length})</span>
                      <div className="flex flex-wrap gap-1.5 border border-slate-900 p-2 rounded-lg bg-slate-900/10 min-h-[50px]">
                        {afterMedia.map((m) => (
                          <div key={m.id} className="relative group/media h-10 w-10 border border-slate-800 rounded overflow-hidden">
                            <img src={m.url} alt="After" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveMedia("after", m.id)}
                              className="absolute inset-0 bg-black/60 items-center justify-center hidden group-hover/media:flex text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Resolution Summary generator */}
                <div className="border border-indigo-900/40 rounded-2xl p-4 bg-indigo-950/10 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      AI Audit Summary Generation (Gemini 3.1 Flash Lite)
                    </span>
                    <Button
                      type="button"
                      onClick={handleGenerateAISummary}
                      disabled={isGeneratingAI || !resNotes.trim()}
                      className="bg-indigo-650 hover:bg-indigo-600 text-xs px-3 py-1.5 text-white"
                    >
                      {isGeneratingAI ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Auditing...
                        </>
                      ) : (
                        "Generate AI Summary"
                      )}
                    </Button>
                  </div>

                  {aiSummary && (
                    <div className="flex flex-col gap-3 text-xs bg-slate-950 border border-slate-850 p-3.5 rounded-xl">
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">AI Resolution Summary (Editable)</label>
                        <input
                          type="text"
                          value={aiSummary.summary}
                          onChange={(e) => setAiSummary({ ...aiSummary, summary: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">AI Work Completed Description (Editable)</label>
                        <textarea
                          value={aiSummary.workCompleted}
                          onChange={(e) => setAiSummary({ ...aiSummary, workCompleted: e.target.value })}
                          className="w-full h-16 p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs resize-none focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">AI Citizen-Friendly Explanation (Editable)</label>
                        <textarea
                          value={aiSummary.citizenExplanation}
                          onChange={(e) => setAiSummary({ ...aiSummary, citizenExplanation: e.target.value })}
                          className="w-full h-16 p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs resize-none focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 border-t border-slate-850 pt-4 mt-2">
                  <Button
                    type="button"
                    onClick={() => setShowResolveForm(false)}
                    variant="ghost"
                    className="flex-1 text-slate-400 border border-slate-800 hover:bg-slate-900"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !resNotes.trim() || !aiSummary}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Close Incident"}
                  </Button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* Fullscreen view modal */}
        {fullscreenUrl && (
          <div
            className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-6 cursor-zoom-out"
            onClick={() => setFullscreenUrl(null)}
          >
            {fullscreenUrl.toLowerCase().endsWith(".mp4") || fullscreenUrl.includes("video") ? (
              <video src={fullscreenUrl} className="max-w-full max-h-full rounded" controls autoPlay />
            ) : (
              <img src={fullscreenUrl} alt="Fullscreen View" className="max-w-full max-h-full object-contain rounded" />
            )}
          </div>
        )}
      </div>
    </RouteGuard>
  );
}
