/**
 * @file src/app/(dashboard)/community/page.tsx
 * @description Citizen Community Feed page.
 * Displays nearby verified reports within a configurable radius, with sorting, maps, and citizen verification controls.
 */

"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { CivicReport } from "@/types";
import { Clock, CheckCircle2, AlertCircle, ArrowRight, ShieldAlert, Wrench, MapPin, Eye, Camera, ThumbsUp, ThumbsDown, ShieldCheck, Loader2, MessageSquare, Cpu, Check } from "lucide-react";
import { ISSUE_CATEGORIES } from "@/constants";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { ReportVerificationService } from "@/features/reports/services/verification.service";
import { MediaService } from "@/features/media/services/media.service";
import { NotificationService } from "@/features/reports/services/notification.service";
import { verifyVerificationPhoto } from "@/app/actions/ai.actions";
import ReporterBadge from "@/components/dashboard/ReporterBadge";

// Load Leaflet map dynamically without SSR
const CommunityMap = dynamic(() => import("@/components/maps/CommunityMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-zinc-900 flex items-center justify-center border border-white/5 rounded-2xl">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="text-zinc-500 font-semibold text-xs tracking-wider uppercase">Loading Map...</span>
      </div>
    </div>
  )
});

// Haversine Distance Formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CommunityFeedPage() {
  const { profile, logout } = useAuth();
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState<number>(3); // 3 km default
  const [sortBy, setSortBy] = useState<"distance" | "priority" | "recency">("recency");
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [uploadingReportId, setUploadingReportId] = useState<string | null>(null);
  
  // Local storage cache for voted reports to prevent duplicate voting in same session
  const [sessionVotes, setSessionVotes] = useState<Record<string, "verify" | "inaccurate">>({});

  // Verification Modal States
  const [verifyingReport, setVerifyingReport] = useState<CivicReport | null>(null);
  const [verificationDecision, setVerificationDecision] = useState<"support" | "not_found" | null>(null);
  const [verificationComment, setVerificationComment] = useState<string>("");
  const [verificationPhoto, setVerificationPhoto] = useState<string | null>(null);
  const [uploadingVerificationPhoto, setUploadingVerificationPhoto] = useState<boolean>(false);
  const [submittingVerification, setSubmittingVerification] = useState<boolean>(false);
  const [loadingExisting, setLoadingExisting] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // 1. Get user coordinates from profile homeLocation first, then fall back to geolocation
  useEffect(() => {
    if (profile?.homeLocation?.latitude && profile?.homeLocation?.longitude) {
      setUserCoords({
        latitude: profile.homeLocation.latitude,
        longitude: profile.homeLocation.longitude,
      });
      return;
    }

    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Geolocation failed or denied, using Bengaluru center coordinates.", error);
          setUserCoords({ latitude: 12.9716, longitude: 77.5946 });
        }
      );
    }
  }, [profile]);

  // 2. Real-time reports subscription
  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.REPORTS),
      where("status", "!=", "draft")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reportsList: CivicReport[] = [];
        const activeStatuses = [
          "submitted",
          "processing",
          "verified",
          "waiting_assignment",
          "assigned",
          "accepted",
          "travelling",
          "investigating",
          "repair_in_progress",
          "awaiting_verification",
          "reopened"
        ];
        snapshot.forEach((docSnap) => {
          const r = { id: docSnap.id, ...docSnap.data() } as CivicReport;
          if (activeStatuses.includes(r.status)) {
            reportsList.push(r);
          }
        });
        setReports(reportsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error subscribing to reports:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getCategoryLabel = (value: string) => {
    const matched = ISSUE_CATEGORIES.find((c) => c.value === value);
    return matched ? matched.label : value;
  };

  // Helper to prioritize sorting based on Distance, Severity, Trust, Verifications, and Resolution
  const getReportRankScore = (report: any) => {
    // 1. Resolution status: active/unresolved issues MUST appear before resolved/closed issues
    const isResolvedOrClosed = ["resolved", "closed"].includes(report.status);
    const statusScore = isResolvedOrClosed ? 0 : 10000;

    // 2. Severity: critical = 1000, high = 500, medium = 200, low = 50, unknown = 0
    const severityStr = (report.ai?.assistant?.severity || report.ai?.verification?.priority || "low").toLowerCase().trim();
    let severityScore = 50;
    if (severityStr === "critical") severityScore = 1000;
    else if (severityStr === "high") severityScore = 500;
    else if (severityStr === "medium") severityScore = 200;

    // 3. Distance: closer is better (lower distance = higher rank)
    const distanceScore = Math.max(0, radius - (report.distance || 0)) * 100;

    // 4. Trust: prioritize reports with higher AI trust scores (0.0 to 1.0)
    const trustScore = (report.ai?.verification?.trustScore || 0.5) * 200;

    // 5. Verifications: prioritize reports with more community support (supportCount - notFoundCount)
    const netVerifications = (report.supportCount || 0) - (report.notFoundCount || 0);
    const verificationsScore = netVerifications * 50;

    return statusScore + severityScore + distanceScore + trustScore + verificationsScore;
  };

  // 3. Process, Filter, and Sort Reports
  const centerLat = userCoords?.latitude ?? 37.7749;
  const centerLon = userCoords?.longitude ?? -122.4194;

  const filteredReports = reports
    .map((report) => {
      const repLat = report.location?.latitude || 0;
      const repLon = report.location?.longitude || 0;
      const distance = calculateDistance(centerLat, centerLon, repLat, repLon);
      return { ...report, distance };
    })
    .filter((report) => report.distance <= radius);

  // Apply sorting
  const sortedReports = [...filteredReports].sort((a, b) => {
    if (sortBy === "distance") {
      return a.distance - b.distance;
    }
    if (sortBy === "priority") {
      const scoreA = getReportRankScore(a);
      const scoreB = getReportRankScore(b);
      if (scoreA !== scoreB) return scoreB - scoreA;
      // Secondary fallback to recency
      return new Date(b.timestamps?.createdAt || 0).getTime() - new Date(a.timestamps?.createdAt || 0).getTime();
    }
    // Default recency
    return new Date(b.timestamps?.createdAt || 0).getTime() - new Date(a.timestamps?.createdAt || 0).getTime();
  });

  // Action: Open Verification Modal and load existing verification if any
  const handleOpenVerifyModal = async (report: CivicReport) => {
    setVerifyingReport(report);
    setVerificationDecision(null);
    setVerificationComment("");
    setVerificationPhoto(null);
    setVerificationError(null);
    if (!profile?.uid) return;

    setLoadingExisting(true);
    try {
      const docRef = doc(db, COLLECTIONS.REPORTS, report.id, "reportVerifications", profile.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setVerificationDecision(data.verificationDecision || null);
        setVerificationComment(data.verificationComment || "");
        setVerificationPhoto(data.verificationPhoto || null);
      }
    } catch (err) {
      console.error("Error loading existing verification:", err);
    } finally {
      setLoadingExisting(false);
    }
  };

  // Action: Upload verification photo to Cloudinary
  const handleVerificationPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile?.uid || !verifyingReport || !event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    setUploadingVerificationPhoto(true);
    try {
      const uploadedAssets = await MediaService.uploadFiles(
        [file],
        `reports/${verifyingReport.id}/verification`,
        profile.uid
      );
      if (uploadedAssets.length > 0) {
        setVerificationPhoto(uploadedAssets[0].url);
      }
    } catch (err) {
      console.error("Verification photo upload failed:", err);
    } finally {
      setUploadingVerificationPhoto(false);
    }
  };

  // Action: Submit civic verification
  const handleSubmitVerification = async () => {
    if (!profile?.uid || !verifyingReport || !verificationDecision) return;
    setSubmittingVerification(true);
    setVerificationError(null);
    try {
      if (verificationPhoto) {
        const aiCheck = await verifyVerificationPhoto(
          profile.uid,
          verifyingReport.id,
          verificationPhoto,
          verificationComment
        );
        if (!aiCheck.success || !aiCheck.matches) {
          setVerificationError(aiCheck.reason || "The uploaded verification photo does not seem to match the reported issue.");
          setSubmittingVerification(false);
          return;
        }
      }

      await ReportVerificationService.submitVerification(
        verifyingReport.id,
        profile.uid,
        verificationDecision,
        verificationComment,
        verificationPhoto || undefined
      );
      setVerifyingReport(null);
    } catch (err) {
      console.error("Failed to submit verification:", err);
      setVerificationError("Failed to submit verification: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmittingVerification(false);
    }
  };

  // Action: Add Supporting Image
  const handleAddImage = async (reportId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile?.uid || !event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    
    setUploadingReportId(reportId);
    try {
      const uploadedAssets = await MediaService.uploadFiles(
        [file],
        `reports/${reportId}/evidence`,
        profile.uid
      );
      
      if (uploadedAssets.length > 0) {
        const newAsset = uploadedAssets[0];
        const reportRef = doc(db, "reports", reportId);
        await updateDoc(reportRef, {
          "evidence.media": arrayUnion(newAsset),
          "timestamps.updatedAt": new Date().toISOString()
        });

        // Trigger Notification
        await NotificationService.notifyCitizenAddedEvidence(reportId);
      }
    } catch (e) {
      console.error("Failed to upload supporting evidence:", e);
    } finally {
      setUploadingReportId(null);
    }
  };

  const renderStatusBadge = (status: string) => {
    const lowerStatus = String(status || "").toLowerCase().trim();
    if (lowerStatus === "resolved") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          Resolved
        </span>
      );
    }
    if (lowerStatus === "in_progress") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
          Investigating
        </span>
      );
    }
    if (lowerStatus === "verified" || lowerStatus === "accepted" || lowerStatus === "processed") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
          Verified
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400">
        Submitted
      </span>
    );
  };

  const renderSeverityBadge = (severity?: string) => {
    const sev = String(severity || "low").toLowerCase().trim();
    if (sev === "critical") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded bg-red-500/10 border border-red-500/20 text-red-400 uppercase tracking-wider">
          Critical
        </span>
      );
    }
    if (sev === "high") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 uppercase tracking-wider">
          High
        </span>
      );
    }
    if (sev === "medium") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-wider">
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase tracking-wider">
        Low
      </span>
    );
  };

  const renderAiBadge = (status?: string) => {
    const st = String(status || "processing").toLowerCase().trim();
    if (st === "verified") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wider" title="Gemini Verified Integrity">
          <Cpu className="w-2.5 h-2.5" /> AI Verified
        </span>
      );
    }
    if (st === "requires_review") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-wider" title="AI Flagged for Review">
          <AlertCircle className="w-2.5 h-2.5" /> AI Review
        </span>
      );
    }
    if (st === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold rounded bg-red-500/10 border border-red-500/20 text-red-400 uppercase tracking-wider" title="AI Flagged Fake Media">
          <AlertCircle className="w-2.5 h-2.5" /> AI Fake
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-bold rounded bg-zinc-800 border border-zinc-700 text-zinc-400 uppercase tracking-wider" title="AI verification queue">
        <Cpu className="w-2.5 h-2.5 animate-pulse text-blue-400" /> AI Triage
      </span>
    );
  };

  return (
    <RouteGuard allowedRoles={["citizen", "officer", "admin"]}>
      <div className="flex min-h-screen flex-col bg-zinc-950 text-white font-sans selection:bg-blue-600/30">
        {/* Navigation Bar */}
        <header className="border-b border-white/10 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="font-bold text-blue-500 tracking-wider flex items-center gap-1.5 select-none">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                CivicMind
              </span>
              <nav className="hidden md:flex items-center gap-4 text-sm font-semibold">
                <Link href={profile?.role === "officer" ? "/officer" : profile?.role === "admin" ? "/admin" : "/dashboard"} className="text-zinc-400 hover:text-white transition">
                  Dashboard
                </Link>
                <Link href="/community" className="text-white border-b-2 border-blue-500 pb-1">
                  Community Feed
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition" title="View Profile">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold font-mono">
                    {profile?.displayName?.[0]?.toUpperCase() || "C"}
                  </div>
                )}
                <span className="text-xs text-zinc-300 font-semibold hidden md:inline-block">
                  {profile?.displayName}
                </span>
              </Link>
              <Button variant="outline" size="sm" onClick={() => logout()} className="border-white/10 hover:bg-zinc-900 text-zinc-300">
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
          {/* Left panel: Filters & Feed Cards */}
          <div className="flex-1 flex flex-col gap-6 max-h-[82vh] overflow-y-auto pr-2">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Citizen Community Feed
              </h1>
              <p className="text-sm text-zinc-400 mt-1">
                Explore, verify, and track reports submitted in your neighborhood in real-time.
              </p>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/50 border border-white/5 rounded-2xl p-4 backdrop-blur-md">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex flex-col gap-1 w-full md:w-48">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">Radius Limit ({radius}km)</span>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider font-mono mr-2">Sort By</span>
                {(["recency", "distance", "priority"] as const).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={sortBy === mode ? "primary" : "outline"}
                    onClick={() => setSortBy(mode)}
                    className={`capitalize text-xs ${sortBy === mode ? "bg-blue-600 hover:bg-blue-500 text-white" : "border-white/5 hover:bg-zinc-800 text-zinc-300"}`}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>

            {/* Feed Cards list */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              </div>
            ) : sortedReports.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 bg-zinc-950/20 backdrop-blur-sm">
                <MapPin className="w-10 h-10 text-zinc-600 animate-pulse" />
                <div>
                  <h3 className="font-bold text-white text-sm">No verified reports nearby</h3>
                  <p className="text-xs text-zinc-500 max-w-xs mt-1 leading-relaxed">
                    No active incident reports match your configurable radius of {radius}km.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <AnimatePresence mode="popLayout">
                  {sortedReports.map((report) => {
                    const firstImage = report.evidence?.media?.[0]?.url;
                    const mediaCount = report.evidence?.media?.length || 0;
                    
                    return (
                      <motion.div
                        key={report.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group border border-white/10 rounded-2xl bg-zinc-900/35 hover:bg-zinc-900/60 transition-all duration-350 overflow-hidden relative shadow-lg"
                      >
                        {/* Glow indicator line */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-blue-500 transition-all" />

                        <div className="p-5 flex flex-col md:flex-row gap-5">
                          {/* Image Column */}
                          <div className="w-full md:w-36 h-28 bg-zinc-950 rounded-xl overflow-hidden relative border border-white/5 shrink-0">
                            {firstImage ? (
                              <>
                                <img src={firstImage} alt="Incident" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                {mediaCount > 1 && (
                                  <span className="absolute bottom-1.5 right-1.5 bg-black/75 backdrop-blur-sm px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-zinc-350 border border-white/10">
                                    +{mediaCount - 1} photos
                                  </span>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-zinc-700">
                                <Camera className="w-8 h-8" />
                              </div>
                            )}
                          </div>

                          {/* Content Column */}
                          <div className="flex-1 flex flex-col justify-between min-w-0">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/10">
                                  {getCategoryLabel(report.ai?.assistant?.category || report.metadata.category)}
                                </span>
                                {renderStatusBadge(report.status)}
                                {renderSeverityBadge(report.ai?.assistant?.severity || report.ai?.verification?.priority || undefined)}
                                {renderAiBadge(report.ai?.verification?.status)}
                                {report.metadata.createdBy && (
                                  <ReporterBadge userId={report.metadata.createdBy} />
                                )}
                                <span className="text-[11px] text-zinc-500 font-bold font-mono ml-auto">
                                  {report.distance.toFixed(1)} km away
                                </span>
                              </div>
                              <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition truncate mt-1">
                                {report.ai?.assistant?.title || report.metadata.title}
                              </h3>
                              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                {report.ai?.assistant?.description || report.metadata.description}
                              </p>
                            </div>

                            <div className="flex items-center gap-5 mt-4 pt-3 border-t border-white/5 text-xs text-zinc-400">
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                                Trust: <strong className="text-emerald-400 font-bold">{Math.round((report.ai?.verification?.trustScore ?? 0.5) * 100)}%</strong>
                              </span>
                              <span className="flex items-center gap-1.5" title="Community verifications (Confirm vs Not Found)">
                                <ThumbsUp className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                Verifications: <strong className="text-blue-400 font-bold">{report.supportCount || 0}</strong>
                                <span className="text-zinc-600">/</span>
                                <strong className="text-rose-400 font-bold">{report.notFoundCount || 0}</strong>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                Comments: <strong className="text-zinc-300 font-bold">{report.commentsCount || 0}</strong>
                              </span>
                              <span className="flex items-center gap-1 ml-auto font-mono text-[10px] text-zinc-500">
                                {new Date(report.timestamps?.createdAt || 0).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Drawer */}
                        <div className="px-5 py-3 bg-black/35 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {profile?.role === "citizen" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenVerifyModal(report)}
                                className="text-xs h-8 border-white/10 hover:bg-blue-500/10 hover:text-blue-400 bg-zinc-900/60"
                              >
                                <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-blue-400 shrink-0" /> Verify Report
                              </Button>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <Link href={`/reports/${report.id}`}>
                              <Button size="sm" variant="ghost" className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/5">
                                Details & Comments ({report.commentsCount || 0}) <ArrowRight className="w-3.5 h-3.5 ml-1" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Right panel: Geospatial Map View */}
          <div className="w-full lg:w-[480px] h-[300px] lg:h-[82vh] rounded-3xl overflow-hidden border border-white/10 bg-zinc-900/20 backdrop-blur-md relative shadow-2xl shrink-0">
            <CommunityMap
              center={[centerLat, centerLon]}
              reports={sortedReports}
              radiusKm={radius}
            />
          </div>
        </main>
      </div>

      {verifyingReport && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="font-extrabold text-lg text-white">Civic Verification</h3>
              <button
                onClick={() => setVerifyingReport(null)}
                className="text-zinc-550 hover:text-zinc-350 transition text-xs font-bold"
              >
                Close
              </button>
            </div>

            {loadingExisting ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="text-xs text-zinc-500">Checking your verification history...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                    Target Incident
                  </span>
                  <p className="text-sm font-bold text-white truncate">
                    {verifyingReport.ai?.assistant?.title || verifyingReport.metadata.title}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    {verifyingReport.location?.formattedAddress}
                  </p>
                </div>

                {/* Decision Choice */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                    Your Decision *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setVerificationDecision("support")}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all text-xs font-bold ${
                        verificationDecision === "support"
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-400"
                          : "bg-zinc-950/45 border-white/5 text-zinc-400 hover:bg-zinc-950 hover:border-emerald-500/20"
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4 shrink-0" />
                      <span>Confirm Issue Exists</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerificationDecision("not_found")}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all text-xs font-bold ${
                        verificationDecision === "not_found"
                          ? "bg-rose-500/15 border-rose-500 text-rose-400"
                          : "bg-zinc-950/45 border-white/5 text-zinc-400 hover:bg-zinc-950 hover:border-rose-500/20"
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4 shrink-0" />
                      <span>Issue Not Found</span>
                    </button>
                  </div>
                </div>

                {/* Comment Textarea */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">
                    Verification Comment (Optional)
                  </label>
                  <textarea
                    value={verificationComment}
                    onChange={(e) => setVerificationComment(e.target.value)}
                    placeholder="Describe current status, changes, or extra info..."
                    className="w-full px-3 py-2 bg-zinc-950 border border-white/5 rounded-xl text-xs text-white placeholder-zinc-650 outline-none focus:border-blue-500/30 transition-all h-20 resize-none font-medium"
                  />
                </div>

                {/* Required Photo Attachment */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block">
                    Attach Current Photo (Required)
                  </label>

                  {verificationPhoto ? (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10 group/img bg-zinc-950">
                      <img src={verificationPhoto} alt="Verification" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setVerificationPhoto(null)}
                        className="absolute top-2 right-2 bg-black/80 hover:bg-black px-2.5 py-1 rounded-md text-[10px] text-zinc-400 hover:text-white transition"
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-20 border border-dashed border-white/10 hover:border-blue-500/30 rounded-xl cursor-pointer bg-zinc-950/20 hover:bg-zinc-950/40 transition">
                      <div className="flex flex-col items-center justify-center pt-2 pb-2">
                        {uploadingVerificationPhoto ? (
                          <>
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin mb-1" />
                            <p className="text-[10px] text-zinc-500 font-semibold">Uploading photo...</p>
                          </>
                        ) : (
                          <>
                            <Camera className="w-5 h-5 text-zinc-500 mb-1" />
                            <p className="text-[10px] text-zinc-500 font-semibold">Upload current scene photo</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingVerificationPhoto}
                        onChange={handleVerificationPhotoUpload}
                      />
                    </label>
                  )}
                </div>

                {verificationError && (
                  <div className="p-3 text-[11px] bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl leading-relaxed font-sans">
                    <span className="font-bold block mb-0.5 text-rose-300">AI Verification Check Failed</span>
                    {verificationError}
                  </div>
                )}

                {/* Submit / Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => setVerifyingReport(null)}
                    variant="outline"
                    className="flex-1 border-white/10 hover:bg-zinc-800 text-zinc-350 font-semibold text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitVerification}
                    disabled={!verificationDecision || !verificationPhoto || submittingVerification || uploadingVerificationPhoto}
                    isLoading={submittingVerification}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                  >
                    Submit
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </RouteGuard>
  );
}
