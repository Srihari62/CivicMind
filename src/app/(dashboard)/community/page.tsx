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
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { CivicReport } from "@/types";
import { Clock, CheckCircle2, AlertCircle, ArrowRight, ShieldAlert, Wrench, MapPin, Eye, Camera, ThumbsUp, ThumbsDown, ShieldCheck, Loader2 } from "lucide-react";
import { ISSUE_CATEGORIES } from "@/constants";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { ReportVerificationService } from "@/features/reports/services/verification.service";
import { MediaService } from "@/features/media/services/media.service";
import { NotificationService } from "@/features/reports/services/notification.service";

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

  // 1. Get user geolocation on mount
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Geolocation failed or denied, using center default (San Francisco).", error);
          setUserCoords({ latitude: 37.7749, longitude: -122.4194 });
        }
      );
    }
  }, []);

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

  // Helper to prioritize sorting
  const getPriorityWeight = (priority?: string | null) => {
    const lower = String(priority || "").toLowerCase().trim();
    if (lower === "critical") return 5;
    if (lower === "high") return 4;
    if (lower === "medium") return 3;
    if (lower === "low") return 2;
    return 1;
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
      const pA = getPriorityWeight(a.ai?.verification?.priority);
      const pB = getPriorityWeight(b.ai?.verification?.priority);
      if (pA !== pB) return pB - pA;
      // Secondary fallback to recency
      return new Date(b.timestamps?.createdAt || 0).getTime() - new Date(a.timestamps?.createdAt || 0).getTime();
    }
    // Default recency
    return new Date(b.timestamps?.createdAt || 0).getTime() - new Date(a.timestamps?.createdAt || 0).getTime();
  });

  // Action: Verify
  const handleVerify = async (reportId: string) => {
    if (!profile?.uid) return;
    try {
      await ReportVerificationService.verifyReport(reportId, profile.uid, "verify");
      setSessionVotes((prev) => ({ ...prev, [reportId]: "verify" }));
    } catch (e) {
      console.error("Verification failed:", e);
    }
  };

  // Action: Report Inaccurate
  const handleInaccurate = async (reportId: string) => {
    if (!profile?.uid) return;
    try {
      await ReportVerificationService.verifyReport(reportId, profile.uid, "inaccurate");
      setSessionVotes((prev) => ({ ...prev, [reportId]: "inaccurate" }));
    } catch (e) {
      console.error("Flag inaccuracy failed:", e);
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
                    const hasVoted = sessionVotes[report.id] || (report.ai?.verification as any)?.receivedVotes !== undefined && (report.ai?.verification as any)?.receivedVotes > 0;
                    
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
                              <img src={firstImage} alt="Incident" className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-zinc-950 text-zinc-700">
                                <Camera className="w-8 h-8" />
                              </div>
                            )}
                          </div>

                          {/* Content Column */}
                          <div className="flex-1 flex flex-col justify-between min-w-0">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/10">
                                  {getCategoryLabel(report.ai?.assistant?.category || report.metadata.category)}
                                </span>
                                {renderStatusBadge(report.status)}
                                <span className="text-xs text-zinc-500 font-semibold font-mono">
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

                            <div className="flex items-center gap-6 mt-4 pt-3 border-t border-white/5 text-xs text-zinc-400">
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                Trust Score: <strong className="text-emerald-400 font-bold">{Math.round((report.ai?.verification?.trustScore ?? 0.5) * 100)}%</strong>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <ThumbsUp className="w-4 h-4 text-blue-400" />
                                Verifications: <strong className="text-blue-400 font-bold">{(report.ai?.verification as any)?.receivedVotes ?? 0}</strong>
                              </span>
                              <span className="flex items-center gap-1 ml-auto font-mono text-[10px] text-zinc-500">
                                {new Date(report.timestamps?.createdAt || 0).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Drawer */}
                        {profile?.role === "citizen" && (
                          <div className="px-5 py-3 bg-black/30 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!!hasVoted}
                                onClick={() => handleVerify(report.id)}
                                className="text-xs h-8 border-white/10 hover:bg-emerald-500/10 hover:text-emerald-400"
                              >
                                <ThumbsUp className="w-3.5 h-3.5 mr-1" /> Confirm exists
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!!hasVoted}
                                onClick={() => handleInaccurate(report.id)}
                                className="text-xs h-8 border-white/10 hover:bg-rose-500/10 hover:text-rose-400"
                              >
                                <ThumbsDown className="w-3.5 h-3.5 mr-1" /> Mark Inaccurate
                              </Button>
                            </div>

                            <div className="flex items-center gap-3">
                              {uploadingReportId === report.id ? (
                                <span className="text-xs text-zinc-400 flex items-center gap-1">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                                </span>
                              ) : (
                                <label className="text-xs h-8 px-3 rounded-lg border border-white/10 hover:bg-zinc-800 text-zinc-300 font-semibold cursor-pointer flex items-center gap-1.5 transition">
                                  <Camera className="w-3.5 h-3.5" />
                                  Add Image
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleAddImage(report.id, e)}
                                  />
                                </label>
                              )}

                              <Link href={`/reports/${report.id}`}>
                                <Button size="sm" variant="ghost" className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/5">
                                  Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        )}
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
    </RouteGuard>
  );
}
