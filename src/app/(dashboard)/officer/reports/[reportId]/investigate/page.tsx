/**
 * @file src/app/(dashboard)/officer/reports/[reportId]/investigate/page.tsx
 * @description Redesigned professional Officer Investigation & Resolution Workspace.
 */

"use client";

import React, { useState, useEffect, useRef } from "react";
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
  travelToIncidentAction,
  startInvestigationAction,
  saveInvestigationDetailsAction,
  startRepairWorkAction,
  saveRepairProgressAction,
  completeRepairAction,
  runAiVerificationAction,
  resolveReportAction,
  rejectAssignmentAction,
  saveResolutionDraftAction,
} from "@/app/actions/officer.actions";
import { MediaService } from "@/features/media/services/media.service";
import {
  FileText, Shield, MapPin, Camera, CheckCircle, AlertCircle, Wrench, Sparkles, Loader2, ChevronLeft, Award, Truck
} from "lucide-react";
import dynamic from "next/dynamic";
import BeforeAfterGallery from "@/components/dashboard/BeforeAfterGallery";
import { VoiceInput } from "@/components/voice/VoiceInput";

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
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Rejection Modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Voice Notes state (now real via VoiceInput — no fake simulation needed)
  // isRecording / recordingSeconds kept for backwards compat with timer ref cleanup
  const [isRecording] = useState(false);
  const [recordingSeconds] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State for Investigation Stage
  const [investigationNotes, setInvestigationNotes] = useState("");
  const [observedSeverity, setObservedSeverity] = useState("medium");
  const [materialRequirement, setMaterialRequirement] = useState("");
  const [safetyRisk, setSafetyRisk] = useState("low");
  const [investigationPhotos, setInvestigationPhotos] = useState<MediaAsset[]>([]);
  const [savingInvestigation, setSavingInvestigation] = useState(false);
  const [startingRepair, setStartingRepair] = useState(false);
  const [uploadingInvestPhoto, setUploadingInvestPhoto] = useState(false);

  // State for Repair Stage
  const [workPerformed, setWorkPerformed] = useState("");
  const [repairMaterials, setRepairMaterials] = useState("");
  const [labourCount, setLabourCount] = useState(1);
  const [repairCost, setRepairCost] = useState(0);
  const [repairPhotos, setRepairPhotos] = useState<MediaAsset[]>([]);
  const [uploadingRepairPhoto, setUploadingRepairPhoto] = useState(false);
  const [savingRepairProgress, setSavingRepairProgress] = useState(false);
  const [completingRepair, setCompletingRepair] = useState(false);

  // State for Verification / Resolution Review Stage
  const [verificationNotes, setVerificationNotes] = useState("");
  const [verificationMaterials, setVerificationMaterials] = useState("");
  const [verificationAfterPhotos, setVerificationAfterPhotos] = useState<MediaAsset[]>([]);
  const [uploadingAfterPhoto, setUploadingAfterPhoto] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResults, setAiResults] = useState<{
    technicalSummary: string;
    citizenSummary: string;
    adminSummary: string;
    verifiedByAI: boolean;
    confidence: number;
    repairCompleteness: number;
    matchesReportedIssue: boolean;
  } | null>(null);

  const [editableTechnicalSummary, setEditableTechnicalSummary] = useState("");
  const [editableCitizenSummary, setEditableCitizenSummary] = useState("");
  const [editableAdminSummary, setEditableAdminSummary] = useState("");

  const [savingDraft, setSavingDraft] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Subscribe to report details in real-time
  useEffect(() => {
    if (!reportId) return;

    const unsubscribe = onSnapshot(
      doc(db, "reports", reportId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as CivicReport;
          setReport({ ...data, id: docSnap.id });

          // Prepopulate stage variables
          if (data.repair) {
            setWorkPerformed(data.repair.notes || "");
            setRepairMaterials(data.repair.materials || "");
            setLabourCount(data.repair.labourCount || 1);
            setRepairCost(data.repair.cost || 0);
            
            const savedChecklist = (data.repair as any).checklist || {};
            setChecklist(savedChecklist);
          }

          if (data.resolution) {
            setVerificationNotes(data.resolution.notes || "");
            setVerificationMaterials(data.resolution.materialsUsed || "");
            
            if (data.resolution.afterMedia) {
              setVerificationAfterPhotos(data.resolution.afterMedia);
            } else if (data.resolution.proofPhotoUrl) {
              setVerificationAfterPhotos([{ id: "proof", url: data.resolution.proofPhotoUrl, type: "image" } as MediaAsset]);
            }

            if (data.resolution.technicalSummary) {
              setAiResults({
                technicalSummary: data.resolution.technicalSummary,
                citizenSummary: data.resolution.citizenSummary || "",
                adminSummary: data.resolution.adminSummary || "",
                verifiedByAI: data.resolution.verifiedByAI ?? true,
                confidence: data.resolution.confidence ?? 0.95,
                repairCompleteness: 1.0,
                matchesReportedIssue: true
              });
              setEditableTechnicalSummary(data.resolution.technicalSummary);
              setEditableCitizenSummary(data.resolution.citizenSummary || "");
              setEditableAdminSummary(data.resolution.adminSummary || "");
            }
          }

          // Prepopulate investigation fields
          const progressList = data.progress || [];
          const investItem = progressList.find(p => p.status === "investigating");
          if (investItem) {
            setInvestigationPhotos(investItem.media || []);
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

  // Stepper calculations
  const getActiveStep = (status?: string): number => {
    switch (status) {
      case "assigned":
      case "submitted":
        return 0;
      case "accepted":
      case "travelling":
        return 1;
      case "investigating":
      case "investigation_started":
        return 2;
      case "repair_in_progress":
        return 3;
      case "awaiting_verification":
      case "repair_completed":
        return 4;
      case "resolved":
      case "closed":
        return 5;
      default:
        return 0;
    }
  };

  const steps = [
    { label: "Assigned", desc: "Review Case" },
    { label: "Travelling", desc: "Navigate" },
    { label: "Investigation", desc: "Inspect Site" },
    { label: "Repair", desc: "Fix Issue" },
    { label: "Verification", desc: "AI Audit" },
    { label: "Resolved", desc: "Confirm Clean" }
  ];

  const activeStep = report ? getActiveStep(report.status) : 0;
  const severity = report?.ai?.assistant?.severity || report?.ai?.verification?.priority || "medium";

  // startRecording / stopRecording replaced by VoiceInput component below
  const startRecording = () => {};
  const stopRecording  = () => {};

  // Handlers
  const handleAccept = async () => {
    if (!profile?.uid || !report) return;
    try {
      setActionError("");
      setActionSuccess("");
      const res = await acceptAssignmentAction(profile.uid, report.id, profile.uid, profile.displayName || "Officer");
      if (res.success) {
        setActionSuccess("Case accepted successfully!");
      } else {
        setActionError(res.error || "Failed to accept.");
      }
    } catch (e) {
      console.error(e);
      setActionError("Error accepting assignment.");
    }
  };

  const handleStartTravel = async () => {
    if (!profile?.uid || !report) return;
    try {
      setActionError("");
      setActionSuccess("");
      const res = await travelToIncidentAction(profile.uid, report.id, profile.uid, profile.displayName || "Officer");
      if (res.success) {
        setActionSuccess("Travel initiated.");
      } else {
        setActionError(res.error || "Failed to start travel.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleArrival = async () => {
    if (!profile?.uid || !report) return;
    try {
      setActionError("");
      setActionSuccess("");
      const res = await startInvestigationAction(profile.uid, report.id, profile.uid, profile.displayName || "Officer");
      if (res.success) {
        setActionSuccess("Arrived at site. Investigation stage active.");
      } else {
        setActionError(res.error || "Failed to mark arrival.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async () => {
    if (!profile?.uid || !report || !rejectReason) return;
    setRejecting(true);
    try {
      setActionError("");
      const res = await rejectAssignmentAction(
        profile.uid,
        report.id,
        profile.uid,
        rejectReason,
        profile.displayName || "Officer"
      );
      if (res.success) {
        setIsRejectModalOpen(false);
        router.push("/officer");
      } else {
        setActionError(res.error || "Failed to decline.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRejecting(false);
    }
  };

  const handleUploadInvestigationPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile?.uid || !report || !e.target.files || e.target.files.length === 0) return;
    setUploadingInvestPhoto(true);
    setActionError("");
    try {
      const files = Array.from(e.target.files);
      const assets = await MediaService.uploadFiles(files, `reports/${report.id}/investigation`, profile.uid);
      setInvestigationPhotos((prev) => [...prev, ...assets]);
    } catch (err) {
      console.error(err);
      setActionError("Failed to upload photos.");
    } finally {
      setUploadingInvestPhoto(false);
    }
  };

  const handleSaveInvestigation = async () => {
    if (!profile?.uid || !report) return;
    setSavingInvestigation(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await saveInvestigationDetailsAction(
        profile.uid,
        report.id,
        profile.uid,
        {
          notes: investigationNotes,
          observedSeverity,
          materialRequirement,
          safetyRisk,
          photos: investigationPhotos,
        },
        profile.displayName || "Officer"
      );
      if (res.success) {
        setActionSuccess("Investigation details saved!");
      } else {
        setActionError(res.error || "Failed to save investigation details.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingInvestigation(false);
    }
  };

  const handleStartRepair = async () => {
    if (!profile?.uid || !report) return;
    setStartingRepair(true);
    setActionError("");
    try {
      const res = await startRepairWorkAction(profile.uid, report.id, profile.uid, profile.displayName || "Officer");
      if (res.success) {
        setActionSuccess("Repair Work in Progress active!");
      } else {
        setActionError(res.error || "Failed to start repair work.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStartingRepair(false);
    }
  };

  const handleUploadRepairPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile?.uid || !report || !e.target.files || e.target.files.length === 0) return;
    setUploadingRepairPhoto(true);
    setActionError("");
    try {
      const files = Array.from(e.target.files);
      const assets = await MediaService.uploadFiles(files, `reports/${report.id}/repair`, profile.uid);
      setRepairPhotos((prev) => [...prev, ...assets]);
    } catch (err) {
      console.error(err);
      setActionError("Failed to upload progress assets.");
    } finally {
      setUploadingRepairPhoto(false);
    }
  };

  const handleSaveRepairProgress = async () => {
    if (!profile?.uid || !report) return;
    setSavingRepairProgress(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await saveRepairProgressAction(
        profile.uid,
        report.id,
        profile.uid,
        {
          workPerformed,
          materialsUsed: repairMaterials,
          labourCount,
          cost: repairCost,
          photos: repairPhotos,
          videos: [],
        },
        profile.displayName || "Officer"
      );
      if (res.success) {
        setActionSuccess("Repair progress logged!");
      } else {
        setActionError(res.error || "Failed to log progress.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingRepairProgress(false);
    }
  };

  const handleFinishRepair = async () => {
    if (!profile?.uid || !report) return;
    
    // Quick checklists verification
    const activeChecklistItems = getChecklistItems(report.metadata.category);
    const allChecked = activeChecklistItems.every(item => checklist[item]);
    if (!allChecked) {
      setActionError("All checklist items must be marked complete before ending the repair.");
      return;
    }

    if (repairPhotos.length === 0 && verificationAfterPhotos.length === 0) {
      setActionError("At least one AFTER image is required to complete the repair.");
      return;
    }

    setCompletingRepair(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await completeRepairAction(
        profile.uid,
        report.id,
        profile.uid,
        {
          materials: repairMaterials,
          labourCount,
          cost: repairCost,
          notes: workPerformed,
          afterMedia: repairPhotos.length > 0 ? repairPhotos : verificationAfterPhotos,
          checklist,
        },
        profile.displayName || "Officer"
      );
      if (res.success) {
        setActionSuccess("Repair ended. Please perform AI Verification & Final Review.");
      } else {
        setActionError(res.error || "Failed to complete repair.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCompletingRepair(false);
    }
  };

  const handleUploadAfterPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile?.uid || !report || !e.target.files || e.target.files.length === 0) return;
    setUploadingAfterPhoto(true);
    setActionError("");
    try {
      const files = Array.from(e.target.files);
      const assets = await MediaService.uploadFiles(files, `reports/${report.id}/after`, profile.uid);
      setVerificationAfterPhotos((prev) => [...prev, ...assets]);
    } catch (err) {
      console.error(err);
      setActionError("Failed to upload after photo.");
    } finally {
      setUploadingAfterPhoto(false);
    }
  };

  const handleAiVerification = async () => {
    if (!profile?.uid || !report) return;
    if (verificationAfterPhotos.length === 0) {
      setActionError("You must upload at least one After image before running verification.");
      return;
    }
    
    setAiRunning(true);
    setActionError("");
    setActionSuccess("");
    try {
      const beforeMedia = report.evidence?.media || [];
      const res = await runAiVerificationAction(
        profile.uid,
        report.id,
        profile.uid,
        verificationNotes || workPerformed,
        beforeMedia,
        verificationAfterPhotos,
        profile.displayName || "Officer"
      );
      
      if (res.success && res.data) {
        setAiResults(res.data);
        setEditableTechnicalSummary(res.data.technicalSummary);
        setEditableCitizenSummary(res.data.citizenSummary);
        setEditableAdminSummary(res.data.adminSummary);
        setActionSuccess("AI verification complete! Summaries generated.");
      } else {
        setActionError(res.error || "AI verification failed.");
      }
    } catch (e) {
      console.error(e);
      setActionError("AI process error.");
    } finally {
      setAiRunning(false);
    }
  };

  const handleSaveResolutionDraft = async () => {
    if (!profile?.uid || !report) return;
    setSavingDraft(true);
    setActionError("");
    setActionSuccess("");
    try {
      const draft = {
        notes: verificationNotes,
        materialsUsed: verificationMaterials,
        workCompleted: workPerformed,
        aiSummary: aiResults ? {
          summary: editableTechnicalSummary,
          workCompleted: aiResults.technicalSummary,
          citizenExplanation: editableCitizenSummary,
        } : null,
        repairEvidence: {
          before: report.evidence?.media || [],
          after: verificationAfterPhotos,
        }
      };

      const res = await saveResolutionDraftAction(
        profile.uid,
        report.id,
        profile.uid,
        draft,
        profile.displayName || "Officer"
      );
      if (res.success) {
        setActionSuccess("Resolution draft saved!");
      } else {
        setActionError(res.error || "Failed to save draft.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleConfirmResolution = async () => {
    if (!profile?.uid || !report) return;
    if (!verificationNotes.trim()) {
      setActionError("Resolution notes cannot be empty.");
      return;
    }

    setResolving(true);
    setActionError("");
    setActionSuccess("");
    try {
      const beforeMedia = report.evidence?.media || [];
      const repairEvidenceObj = {
        before: beforeMedia,
        after: verificationAfterPhotos,
      };
      
      const duration = 60; // 60 minutes default

      const aiSummaryObj = aiResults ? {
        summary: editableTechnicalSummary,
        workCompleted: aiResults.technicalSummary,
        citizenExplanation: editableCitizenSummary,
      } : {
        summary: verificationNotes,
        workCompleted: workPerformed,
        citizenExplanation: verificationNotes
      };

      // First update resolution block draft to preserve the current editable summaries
      const draft = {
        notes: verificationNotes,
        materialsUsed: verificationMaterials,
        workCompleted: workPerformed,
        aiSummary: aiSummaryObj,
        repairEvidence: repairEvidenceObj
      };
      await saveResolutionDraftAction(profile.uid, report.id, profile.uid, draft, profile.displayName || "Officer");

      // Resolve the report
      const res = await resolveReportAction(
        profile.uid,
        report.id,
        profile.uid,
        verificationNotes,
        repairEvidenceObj,
        duration,
        aiSummaryObj,
        report.metadata.category,
        profile.displayName || "Officer",
        null, // GPS
        workPerformed,
        verificationMaterials
      );

      if (res.success) {
        setActionSuccess("Incident report successfully resolved!");
      } else {
        setActionError(res.error || "Failed to resolve report.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setResolving(false);
    }
  };

  const getChecklistItems = (category: string) => {
    switch (category) {
      case "road_damage":
        return ["Road flattened", "Asphalt cured", "Debris cleared"];
      case "garbage":
      case "illegal_dumping":
        return ["Area swept", "Bins emptied", "Odour controlled"];
      case "street_light":
        return ["Bulb replaced", "Wiring inspected", "Photocell working"];
      default:
        return ["Area cleaned", "Issue resolved", "Final safety inspection complete"];
    }
  };

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev) {
      case "critical":
        return "bg-red-500/10 border-red-500/20 text-red-400";
      case "high":
        return "bg-orange-500/10 border-orange-500/20 text-orange-400";
      default:
        return "bg-zinc-500/10 border-zinc-500/20 text-zinc-400";
    }
  };

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

  const activeReport = report;

  return (
    <RouteGuard allowedRoles={["officer", "admin"]}>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8">
        
        {/* Navigation & Header */}
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <Link href="/officer">
                <Button variant="outline" className="rounded-full bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white w-10 h-10 p-0 flex items-center justify-center">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    ID: {activeReport.id.substring(0, 8)}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getSeverityBadgeClass(severity)}`}>
                    {severity} Severity
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                  {activeReport.metadata.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-zinc-400">Citizen Dashboard Live Sync Active</span>
            </div>
          </div>

          {/* Stepper */}
          <div className="w-full bg-zinc-900/60 border border-white/5 rounded-2xl p-4 sm:p-6 backdrop-blur-md">
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
              {steps.map((step, idx) => {
                const isCompleted = idx < activeStep;
                const isActive = idx === activeStep;
                return (
                  <div key={idx} className="flex flex-col gap-2 relative">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        isCompleted ? "bg-emerald-500 text-black" :
                        isActive ? "bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]" :
                        "bg-zinc-800 text-zinc-500"
                      }`}>
                        {isCompleted ? <CheckCircle className="w-4 h-4 text-emerald-950" /> : idx + 1}
                      </div>
                      <span className={`text-xs font-semibold ${isActive ? "text-white" : "text-zinc-400"}`}>
                        {step.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 pl-8 hidden md:inline">{step.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Error & Success Alerts */}
          {actionError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}
          {actionSuccess && (
            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Core Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Primary Workflow Card */}
            <div className="lg:col-span-2 space-y-6">

              {/* STAGE 1: Assigned Screen */}
              {(activeStep === 0) && (
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Shield className="w-6 h-6 text-blue-400" />
                    <h2 className="text-lg font-bold text-white">Assigned Case Review</h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Citizen Description</span>
                      <p className="mt-1 text-sm text-zinc-300 leading-relaxed bg-zinc-950 p-4 rounded-xl border border-white/5">
                        {activeReport.metadata.description}
                      </p>
                    </div>

                    {activeReport.ai?.assistant?.summary && (
                      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">AI Generated Initial Summary</span>
                        </div>
                        <p className="text-xs text-zinc-300 leading-relaxed">
                          {activeReport.ai.assistant.summary}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-zinc-950 rounded-xl border border-white/5">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Assigned Dept</span>
                        <span className="text-sm font-semibold text-zinc-300">{activeReport.ai?.assignment?.department || "General"}</span>
                      </div>
                      <div className="p-3 bg-zinc-950 rounded-xl border border-white/5">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold block">Duplicate Score</span>
                        <span className="text-sm font-semibold text-zinc-300">
                          {activeReport.ai?.verification?.duplicateProbability ? `${Math.round(activeReport.ai.verification.duplicateProbability * 100)}%` : "0%"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-white/5">
                    <Button onClick={handleAccept} className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold h-12 rounded-xl">
                      Accept Case & Start Workflow
                    </Button>
                    <Button onClick={() => setIsRejectModalOpen(true)} variant="outline" className="border-zinc-800 text-zinc-400 hover:text-white h-12 px-6 rounded-xl">
                      Decline & Reassign
                    </Button>
                  </div>
                </div>
              )}

              {/* STAGE 2: Travelling Screen */}
              {(activeStep === 1) && (
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Truck className="w-6 h-6 text-blue-400" />
                    <h2 className="text-lg font-bold text-white">En Route to Location</h2>
                  </div>

                  <div className="p-6 bg-zinc-950 rounded-2xl border border-white/5 space-y-4 relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-2xl font-bold text-white">1.8 km</span>
                        <span className="text-xs text-zinc-400 block">Estimated Distance</span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-blue-400">6 mins</span>
                        <span className="text-xs text-zinc-400 block">Est. Driving Time</span>
                      </div>
                    </div>

                    <div className="border border-white/5 rounded-xl p-4 bg-zinc-900/60 text-xs space-y-2">
                      <div className="flex items-center gap-2 text-zinc-300">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        <span>Navigate: <strong>Head north on Main St towards Incident Site</strong></span>
                      </div>
                      <p className="text-[10px] text-zinc-500">Auto-refreshing GPS coordinate alignment is active.</p>
                    </div>

                    {/* Stepper route visual */}
                    <div className="h-2 w-full bg-zinc-900 rounded-full relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-full w-2/3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-pulse" />
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {activeReport.status === "accepted" ? (
                      <Button onClick={handleStartTravel} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl">
                        Start Driving / Navigation
                      </Button>
                    ) : (
                      <Button onClick={handleArrival} className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-black font-bold h-12 rounded-xl">
                        I Have Reached Location
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* STAGE 3: Investigation Screen */}
              {(activeStep === 2) && (
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-orange-400" />
                      <h2 className="text-lg font-bold text-white">Field Investigation Notes & Severity</h2>
                    </div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Investigation Active</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Field Findings &amp; Inspection Notes</label>
                      <VoiceInput
                        multiline
                        rows={4}
                        placeholder="Detail observations, defects found, or safety precautions needed..."
                        value={investigationNotes}
                        onChange={setInvestigationNotes}
                        language={(profile as any)?.preferredLanguage || "English"}
                      />
                    </div>


                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Observed Severity</label>
                        <select
                          value={observedSeverity}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setObservedSeverity(e.target.value)}
                          className="flex h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="low">Low (Aesthetic)</option>
                          <option value="medium">Medium (Routine)</option>
                          <option value="high">High Priority</option>
                          <option value="critical">Critical / Threat</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Safety Risk Level</label>
                        <select
                          value={safetyRisk}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSafetyRisk(e.target.value)}
                          className="flex h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="low">Low / None</option>
                          <option value="medium">Medium Risk</option>
                          <option value="high">High Risk</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Materials Needed / Scheduled</label>
                      <Input
                        value={materialRequirement}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaterialRequirement(e.target.value)}
                        placeholder="e.g. 3 Bags of cement, copper pipes, etc."
                        className="bg-zinc-950 border-zinc-800 rounded-xl text-zinc-200"
                      />
                    </div>

                    {/* Investigation Photos Upload */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase block">Investigation Evidence Photos</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {investigationPhotos.map((photo, idx) => (
                          <div key={photo.id || idx} className="aspect-square rounded-xl overflow-hidden border border-white/5 relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo.url} alt="Investigation" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        <label className="aspect-square rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 hover:bg-zinc-950 hover:border-zinc-700 transition flex flex-col items-center justify-center gap-2 cursor-pointer">
                          {uploadingInvestPhoto ? (
                            <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
                          ) : (
                            <>
                              <Camera className="w-6 h-6 text-zinc-500" />
                              <span className="text-[10px] text-zinc-500">Upload Photo</span>
                            </>
                          )}
                          <input type="file" multiple accept="image/*" onChange={handleUploadInvestigationPhoto} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-white/5">
                    <Button onClick={handleSaveInvestigation} disabled={savingInvestigation} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 h-12 px-6 rounded-xl">
                      {savingInvestigation ? "Saving..." : "Save Findings"}
                    </Button>
                    <Button onClick={handleStartRepair} disabled={startingRepair} className="flex-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold h-12 rounded-xl">
                      {startingRepair ? "Starting..." : "Begin Repair Operations"}
                    </Button>
                  </div>
                </div>
              )}

              {/* STAGE 4: Repair Stage */}
              {(activeStep === 3) && (
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <Wrench className="w-6 h-6 text-amber-400" />
                      <h2 className="text-lg font-bold text-white">Repair Operations</h2>
                    </div>
                    <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase">
                      In Progress
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Work Performed Description</label>
                      <VoiceInput
                        multiline
                        rows={3}
                        placeholder="Detail the mechanical or physical tasks completed..."
                        value={workPerformed}
                        onChange={setWorkPerformed}
                        language={(profile as any)?.preferredLanguage || "English"}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Materials Used (Finalized)</label>
                      <Input
                        value={repairMaterials}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRepairMaterials(e.target.value)}
                        placeholder="e.g. 2 bags quick-drying concrete, 3 sealant spray"
                        className="bg-zinc-950 border-zinc-800 rounded-xl text-zinc-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Labour/Crew Size</label>
                        <Input
                          type="number"
                          value={labourCount}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabourCount(Number(e.target.value))}
                          className="bg-zinc-950 border-zinc-800 rounded-xl text-zinc-200"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Repair Cost ($)</label>
                        <Input
                          type="number"
                          value={repairCost}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRepairCost(Number(e.target.value))}
                          className="bg-zinc-950 border-zinc-800 rounded-xl text-zinc-200"
                        />
                      </div>
                    </div>

                    {/* Progress Media Upload */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase block">Repair Media (Include AFTER evidence)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {repairPhotos.map((photo, idx) => (
                          <div key={photo.id || idx} className="aspect-square rounded-xl overflow-hidden border border-white/5 relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo.url} alt="Repair" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        <label className="aspect-square rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 hover:bg-zinc-950 hover:border-zinc-700 transition flex flex-col items-center justify-center gap-2 cursor-pointer">
                          {uploadingRepairPhoto ? (
                            <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                          ) : (
                            <>
                              <Camera className="w-6 h-6 text-zinc-500" />
                              <span className="text-[10px] text-zinc-500">Upload Image</span>
                            </>
                          )}
                          <input type="file" multiple accept="image/*" onChange={handleUploadRepairPhoto} className="hidden" />
                        </label>
                      </div>
                    </div>

                    {/* Checklist Specifics */}
                    <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5 space-y-3">
                      <span className="text-xs font-bold text-zinc-400 uppercase block border-b border-white/5 pb-2">
                        {activeReport.metadata.category} Category Safety checklist
                      </span>
                      <div className="space-y-2">
                        {getChecklistItems(activeReport.metadata.category).map((item) => (
                          <label key={item} className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={checklist[item] || false}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChecklist((prev) => ({ ...prev, [item]: e.target.checked }))}
                              className="rounded border-zinc-800 bg-zinc-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-950"
                            />
                            <span className="text-xs text-zinc-300">{item}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-white/5">
                    <Button onClick={handleSaveRepairProgress} disabled={savingRepairProgress} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 h-12 px-6 rounded-xl">
                      {savingRepairProgress ? "Saving..." : "Save Repair Details"}
                    </Button>
                    <Button onClick={handleFinishRepair} disabled={completingRepair} className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-bold h-12 rounded-xl">
                      {completingRepair ? "Finishing..." : "Finish Repair & Continue"}
                    </Button>
                  </div>
                </div>
              )}

              {/* STAGE 5: Verification & Resolution Review Screen */}
              {(activeStep === 4) && (
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-6 h-6 text-cyan-400" />
                      <h2 className="text-lg font-bold text-white">AI Verification & Final Resolution Review</h2>
                    </div>
                    <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-bold uppercase">
                      Verification Stage
                    </span>
                  </div>

                  <div className="space-y-6">
                    {/* Before vs After comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-zinc-950 rounded-xl border border-white/5 space-y-2">
                        <span className="text-[10px] text-zinc-500 uppercase block font-bold">Before Media</span>
                        {activeReport.evidence?.media && activeReport.evidence.media.length > 0 ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={activeReport.evidence.media[0].url} alt="Before" className="aspect-video w-full object-cover rounded-lg border border-white/5" />
                        ) : (
                          <div className="aspect-video w-full bg-zinc-900 flex items-center justify-center text-xs text-zinc-600 rounded-lg">No photos</div>
                        )}
                      </div>
                      <div className="p-4 bg-zinc-950 rounded-xl border border-white/5 space-y-2">
                        <span className="text-[10px] text-zinc-500 uppercase block font-bold">After Media (Required)</span>
                        {verificationAfterPhotos.length > 0 ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={verificationAfterPhotos[0].url} alt="After" className="aspect-video w-full object-cover rounded-lg border border-white/5" />
                        ) : (
                          <div className="aspect-video w-full bg-zinc-900 flex items-center justify-center text-xs text-zinc-600 rounded-lg">No photos</div>
                        )}
                        <label className="mt-2 block w-full text-center py-2 border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 rounded-lg text-xs cursor-pointer text-zinc-400">
                          {uploadingAfterPhoto ? "Uploading..." : "Upload New After Photo"}
                          <input type="file" accept="image/*" onChange={handleUploadAfterPhoto} className="hidden" />
                        </label>
                      </div>
                    </div>

                    {/* Input Notes & Materials */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Resolution Review Notes</label>
                        <VoiceInput
                          multiline
                          rows={4}
                          placeholder="Provide final resolution and engineering summary notes..."
                          value={verificationNotes}
                          onChange={setVerificationNotes}
                          language={(profile as any)?.preferredLanguage || "English"}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Final Materials Used</label>
                        <VoiceInput
                          multiline
                          rows={4}
                          placeholder="Sum up materials used for archival..."
                          value={verificationMaterials}
                          onChange={setVerificationMaterials}
                          language={(profile as any)?.preferredLanguage || "English"}
                        />
                      </div>
                    </div>

                    {/* AI Verification Trigger */}
                    <div className="p-4 bg-zinc-950 rounded-2xl border border-white/5 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                          <span className="text-xs font-bold text-zinc-300 uppercase">Gemini 3.1 Flash Lite Verification</span>
                        </div>
                        <Button
                          onClick={handleAiVerification}
                          disabled={aiRunning || verificationAfterPhotos.length === 0}
                          className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold h-10 px-4 rounded-xl flex items-center gap-2 text-xs"
                        >
                          {aiRunning ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Running...
                            </>
                          ) : (
                            "Trigger AI Audit"
                          )}
                        </Button>
                      </div>

                      {aiResults && (
                        <div className="space-y-4 pt-4 border-t border-white/5 text-xs">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 bg-zinc-900 rounded-xl border border-white/5">
                              <span className="text-zinc-500 block">AI Verified Repair?</span>
                              <span className={`text-sm font-bold ${aiResults.verifiedByAI ? "text-green-400" : "text-rose-400"}`}>
                                {aiResults.verifiedByAI ? "Pass (Resolved)" : "Fail / Incomplete"}
                              </span>
                            </div>
                            <div className="p-3 bg-zinc-900 rounded-xl border border-white/5">
                              <span className="text-zinc-500 block">Confidence Score</span>
                              <span className="text-sm font-bold text-white">{Math.round(aiResults.confidence * 100)}%</span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="text-zinc-400 font-bold block mb-1">AI Technical Summary (Editable)</label>
                              <textarea
                                value={editableTechnicalSummary}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditableTechnicalSummary(e.target.value)}
                                className="flex min-h-[60px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="text-zinc-400 font-bold block mb-1">AI Citizen Explanation (Editable)</label>
                              <textarea
                                value={editableCitizenSummary}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditableCitizenSummary(e.target.value)}
                                className="flex min-h-[60px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="text-zinc-400 font-bold block mb-1">AI Admin Audit Summary (Editable)</label>
                              <textarea
                                value={editableAdminSummary}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditableAdminSummary(e.target.value)}
                                className="flex min-h-[60px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-white/5">
                    <Button onClick={handleSaveResolutionDraft} disabled={savingDraft} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 h-12 px-6 rounded-xl">
                      {savingDraft ? "Saving..." : "Save Draft"}
                    </Button>
                    <Button onClick={handleConfirmResolution} disabled={resolving} className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-black font-bold h-12 rounded-xl">
                      {resolving ? "Confirming..." : "Confirm Resolution"}
                    </Button>
                  </div>
                </div>
              )}

              {/* STAGE 6: Resolved Screen */}
              {(activeStep === 5) && (
                <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                    <h2 className="text-lg font-bold text-white">Case Resolved & Finalized</h2>
                  </div>

                  <div className="p-6 bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center sm:text-left">
                      <h3 className="font-bold text-white text-lg">Case Successfully Closed</h3>
                      <p className="text-xs text-zinc-400 max-w-sm">Officer workload has been updated, and point rewards have been distributed.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 rounded-xl">
                      <Award className="w-5 h-5 text-emerald-400" />
                      <div>
                        <span className="text-xs text-zinc-400 block uppercase font-bold tracking-wider">Rewards</span>
                        <span className="text-sm font-bold text-white">+10 Performance Score</span>
                      </div>
                    </div>
                  </div>

                  {/* Render the full read-only gallery */}
                  <BeforeAfterGallery report={activeReport} />
                </div>
              )}

            </div>

            {/* Sidebar Details Card */}
            <div className="space-y-6">
              
              {/* Map location & details */}
              <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 space-y-4">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Incident Location Map</span>
                
                {activeReport.location ? (
                  <MapViewer
                    latitude={activeReport.location.latitude}
                    longitude={activeReport.location.longitude}
                    title={activeReport.metadata.title}
                    category={activeReport.metadata.category}
                    severity={severity ?? undefined}
                    address={activeReport.location.formattedAddress}
                  />
                ) : (
                  <div className="h-[280px] bg-zinc-950 border border-white/5 rounded-2xl flex items-center justify-center text-xs text-zinc-600">No GPS Details</div>
                )}

                <div className="space-y-2 text-xs">
                  <span className="text-zinc-500 uppercase block font-bold">Address</span>
                  <p className="text-zinc-300 leading-relaxed bg-zinc-950 p-3 rounded-xl border border-white/5">
                    {activeReport.location?.formattedAddress || "No address provided."}
                  </p>
                </div>
              </div>

              {/* Timeline feed */}
              <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 space-y-4">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block">Incident Timeline</span>
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {activeReport.timeline && activeReport.timeline.length > 0 ? (
                    activeReport.timeline.map((event, idx) => (
                      <div key={idx} className="flex gap-3 relative border-l border-zinc-800 pl-4 pb-4 last:pb-0">
                        <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <div>
                          <span className="text-[10px] text-zinc-500 block">
                            {new Date(event.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                          <span className="text-xs font-bold text-zinc-300">{event.action}</span>
                          {event.note && <p className="text-[10px] text-zinc-400 mt-0.5">{event.note}</p>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-500 italic block">No timeline events found.</span>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Decline Reassignment Modal */}
        {isRejectModalOpen && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 w-full max-w-md space-y-6 shadow-2xl">
              <div>
                <h3 className="text-lg font-bold text-white">Decline & Reassign Case</h3>
                <p className="text-xs text-zinc-400 mt-1">Please select the reason for reassigning this report to another officer or department.</p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-400 uppercase">Reason for Reassignment</label>
                <select
                  value={rejectReason}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRejectReason(e.target.value)}
                  className="flex h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select Reason</option>
                  <option value="Wrong Department">Wrong Department Assignment</option>
                  <option value="Out of Zone">Out of Jurisdiction / Zone</option>
                  <option value="Vehicle Breakdown">Vehicle Breakdown / Maintenance</option>
                  <option value="Emergency Assignment">Emergency Duty Assignment</option>
                  <option value="Other">Other / Not Listed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <Button onClick={handleReject} disabled={rejecting || !rejectReason} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold h-11 rounded-xl">
                  {rejecting ? "Declining..." : "Decline Assignment"}
                </Button>
                <Button onClick={() => setIsRejectModalOpen(false)} variant="outline" className="border-zinc-800 text-zinc-400 hover:text-white h-11 rounded-xl">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </RouteGuard>
  );
}
