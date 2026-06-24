/**
 * @file src/app/(dashboard)/dashboard/page.tsx
 * @description Citizen Dashboard page.
 * Displays user profile metrics, stats summaries, realtime notifications,
 * and a realtime list of reports with animated card transitions.
 */

"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { CivicReport } from "@/types";
import { Clock, CheckCircle2, XCircle, AlertCircle, ArrowRight, ShieldAlert, Wrench } from "lucide-react";
import { ISSUE_CATEGORIES } from "@/constants";
import { motion, AnimatePresence } from "framer-motion";

// Custom Sprint 9 components
import CitizenStatsCard from "@/components/dashboard/CitizenStatsCard";
import NotificationCenter from "@/components/dashboard/NotificationCenter";

export const dynamic = "force-dynamic";

export default function CitizenDashboardPage() {
  const { profile, logout } = useAuth();
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, COLLECTIONS.REPORTS),
      where("metadata.createdBy", "==", profile.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const reportsList: CivicReport[] = [];
        snapshot.forEach((docSnap) => {
          reportsList.push({ id: docSnap.id, ...docSnap.data() } as CivicReport);
        });
        
        // Sort in memory by createdAt descending
        reportsList.sort((a, b) => {
          const timeA = new Date(a.timestamps?.createdAt || 0).getTime();
          const timeB = new Date(b.timestamps?.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setReports(reportsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to reports snapshot:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile?.uid]);

  const getCategoryLabel = (value: string) => {
    const matched = ISSUE_CATEGORIES.find((c) => c.value === value);
    return matched ? matched.label : value;
  };

  const renderStatusBadge = (status: string, duplicateReportIds?: string[] | null) => {
    const lowerStatus = String(status || "").toLowerCase().trim();

    if (duplicateReportIds && duplicateReportIds.length > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
          <AlertCircle className="w-3.5 h-3.5" />
          Linked Repost
        </span>
      );
    }

    if (lowerStatus === "processing") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <Clock className="w-3.5 h-3.5 animate-pulse" />
          Processing AI...
        </span>
      );
    }
    if (lowerStatus === "verified" || lowerStatus === "processed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Verified
        </span>
      );
    }
    if (lowerStatus === "accepted") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <ShieldAlert className="w-3.5 h-3.5" />
          Accepted
        </span>
      );
    }
    if (lowerStatus === "in_progress") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
          <Wrench className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
          Investigating
        </span>
      );
    }
    if (lowerStatus === "resolved") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Resolved
        </span>
      );
    }
    if (lowerStatus === "rejected") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <XCircle className="w-3.5 h-3.5" />
          Rejected
        </span>
      );
    }
    if (lowerStatus === "requires_review" || lowerStatus === "requires review" || lowerStatus === "flagged") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <AlertCircle className="w-3.5 h-3.5" />
          Review Required
        </span>
      );
    }
    if (lowerStatus === "failed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <XCircle className="w-3.5 h-3.5" />
          Verification Failed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
        <Clock className="w-3.5 h-3.5 animate-pulse" />
        Processing AI...
      </span>
    );
  };

  return (
    <RouteGuard allowedRoles={["citizen"]}>
      <div className="flex min-h-screen flex-col bg-zinc-950 text-white selection:bg-blue-600/30 selection:text-white">
        {/* Navigation Bar */}
        <header className="border-b border-white/10 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <span className="font-bold text-blue-500 tracking-wider flex items-center gap-1.5 select-none">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              CivicMind
            </span>
            <div className="flex items-center gap-4">
              {/* Notification Center component integrated */}
              <NotificationCenter reports={reports} />
              
              <Link href="/reports/new">
                <Button size="sm">Report Issue</Button>
              </Link>
              <span className="text-xs text-zinc-400 font-mono hidden sm:inline-block">
                {profile?.email}
              </span>
              <Button variant="outline" size="sm" onClick={() => logout()}>
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Area */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 flex flex-col gap-8">
          {/* Welcome Title */}
          <div className="flex flex-col gap-2 border-b border-white/5 pb-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Welcome, {profile?.displayName}
            </h1>
            <p className="text-sm text-zinc-400">
              Report local municipal issues or track active resolution processes in your neighborhood in real time.
            </p>
          </div>

          {/* 6. Citizen Impact Stats Card */}
          {!loading && <CitizenStatsCard reports={reports} />}

          {/* Active Citizen Profile Card */}
          <div className="border border-white/10 rounded-2xl p-6 bg-black/40 backdrop-blur-md flex flex-col gap-4 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Citizen Registry Profile
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-sans">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Display Name</span>
                <span className="font-bold text-zinc-200">{profile?.displayName}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Contact Phone</span>
                <span className="font-bold text-zinc-200">{profile?.phoneNumber || "Not provided"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">System Role</span>
                <span className="font-bold text-blue-400 capitalize">{profile?.role}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Account Created</span>
                <span className="font-bold text-zinc-200">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* My Reports List */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                My Incident Submissions
              </h2>
              <span className="text-xs text-zinc-300 font-semibold bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700">
                {reports.length} {reports.length === 1 ? "report" : "reports"}
              </span>
            </div>

            {loading ? (
              /* Premium Skeleton Loaders */
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-white/5 rounded-2xl p-5 bg-black/20 animate-pulse flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-24 bg-zinc-800 rounded" />
                      <div className="h-4 w-16 bg-zinc-800 rounded" />
                    </div>
                    <div className="h-6 w-1/2 bg-zinc-800 rounded" />
                    <div className="h-4 w-3/4 bg-zinc-800 rounded" />
                  </div>
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-4 bg-black/20 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 text-lg">
                  📋
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-white text-sm">No reports submitted yet</span>
                  <span className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                    You haven&apos;t submitted any civic issue reports. Get started by clicking &quot;Report Issue&quot; above.
                  </span>
                </div>
                <Link href="/reports/new">
                  <Button size="sm" variant="outline">Report Your First Issue</Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <AnimatePresence mode="popLayout">
                  {reports.map((report, idx) => (
                    <motion.div
                      key={report.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25, delay: Math.min(idx * 0.05, 0.3) }}
                    >
                      <Link
                        href={`/reports/${report.id}`}
                        className="group border border-white/10 rounded-2xl p-5 bg-black/40 hover:bg-white/5 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg backdrop-blur-sm relative overflow-hidden"
                      >
                        {/* Interactive glow border on hover */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-blue-500 transition-all duration-200" />
                        
                        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                              {getCategoryLabel(report.ai?.assistant?.category || report.metadata.category)}
                            </span>
                            <span className="text-xs text-zinc-400 font-mono">
                              {report.timestamps?.createdAt ? new Date(report.timestamps.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }) : "Date N/A"}
                            </span>
                          </div>
                          <h3 className="font-bold text-white text-base group-hover:text-blue-400 transition-colors truncate">
                            {report.ai?.assistant?.title || report.metadata.title || "Untitled Report"}
                          </h3>
                          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                            {report.ai?.assistant?.description || report.metadata.description || "No description provided."}
                          </p>
                          {report.ai?.verification?.duplicateReportIds && report.ai.verification.duplicateReportIds.length > 0 && (
                            <p className="text-xs text-amber-400/90 font-semibold mt-1 flex items-center gap-1.5 bg-amber-500/5 border border-amber-500/10 px-2 py-1 rounded w-fit">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Linked Repost of #{report.ai.verification.duplicateReportIds[0]}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider font-mono">
                              Verification Status
                            </span>
                            {renderStatusBadge(
                              report.ai?.verification?.status || "processing",
                              report.ai?.verification?.duplicateReportIds
                            )}
                          </div>
                          <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 group-hover:bg-blue-500/10 group-hover:border-blue-500/20 group-hover:text-blue-400 transition-all duration-200 flex items-center justify-center text-zinc-400">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </main>
      </div>
    </RouteGuard>
  );
}
