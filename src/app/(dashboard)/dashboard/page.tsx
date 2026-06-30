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
import { Clock, CheckCircle2, XCircle, AlertCircle, ArrowRight, Sparkles, ShieldAlert, Wrench,
  Zap,
  LayoutDashboard,
  User,
  LogOut,
  MessageSquare
} from "lucide-react";
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
        <span className="clay-chip clay-chip-orange text-[10px] gap-1 px-3 py-1">
          <AlertCircle className="w-3.5 h-3.5" />
          Linked Repost
        </span>
      );
    }

    if (lowerStatus === "processing") {
      return (
        <span className="clay-chip clay-chip-blue text-[10px] gap-1 px-3 py-1 animate-pulse">
          <Clock className="w-3.5 h-3.5" />
          Processing AI...
        </span>
      );
    }
    if (lowerStatus === "verified" || lowerStatus === "processed") {
      return (
        <span className="clay-chip clay-chip-green text-[10px] gap-1 px-3 py-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Verified
        </span>
      );
    }
    if (lowerStatus === "accepted") {
      return (
        <span className="clay-chip clay-chip-purple text-[10px] gap-1 px-3 py-1">
          <ShieldAlert className="w-3.5 h-3.5" />
          Accepted
        </span>
      );
    }
    if (lowerStatus === "in_progress") {
      return (
        <span className="clay-chip clay-chip-purple text-[10px] gap-1 px-3 py-1">
          <Wrench className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
          Investigating
        </span>
      );
    }
    if (lowerStatus === "resolved") {
      return (
        <span className="clay-chip clay-chip-green text-[10px] gap-1 px-3 py-1 shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Resolved
        </span>
      );
    }
    if (lowerStatus === "rejected") {
      return (
        <span className="clay-chip clay-chip-red text-[10px] gap-1 px-3 py-1">
          <XCircle className="w-3.5 h-3.5" />
          Rejected
        </span>
      );
    }
    if (lowerStatus === "requires_review" || lowerStatus === "requires review" || lowerStatus === "flagged") {
      return (
        <span className="clay-chip clay-chip-yellow text-[10px] gap-1 px-3 py-1">
          <AlertCircle className="w-3.5 h-3.5" />
          Review Required
        </span>
      );
    }
    if (lowerStatus === "failed") {
      return (
        <span className="clay-chip clay-chip-red text-[10px] gap-1 px-3 py-1">
          <XCircle className="w-3.5 h-3.5" />
          Verification Failed
        </span>
      );
    }

    return (
      <span className="clay-chip clay-chip-blue text-[10px] gap-1 px-3 py-1 animate-pulse">
        <Clock className="w-3.5 h-3.5" />
        Processing AI...
      </span>
    );
  };

  return (
    <RouteGuard allowedRoles={["citizen"]}>
      <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800 selection:bg-indigo-500/20 selection:text-slate-900 relative overflow-x-hidden">
        {/* Ambient Background Data Stream Effects */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-65">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-200/30 blur-[120px] animate-blob" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-200/20 blur-[150px] animate-blob animation-delay-2000" />
        </div>

        {/* Floating Glassmorphic Navigation Bar */}
        <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 py-3.5 max-w-6xl mx-auto bg-white/80 border border-white/60 backdrop-blur-2xl rounded-full mt-6 mx-auto w-[92%] shadow-[0_8px_30px_rgb(163,177,198,0.2)] transition-transform duration-200">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-extrabold text-blue-600 tracking-wider flex items-center gap-1.5 select-none text-base">
              <span className="hidden sm:flex w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="hidden sm:inline">CivicMind</span>
              <span className="sm:hidden w-8 h-8 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white shadow-md text-sm font-black tracking-normal">CM</span>
            </Link>
            
            {/* Desktop Navbar */}
            <nav className="hidden md:flex bg-slate-100/80 p-1.5 rounded-full border border-slate-200/50 items-center gap-1 text-[10px] font-black uppercase tracking-widest relative">
              <Link href="/dashboard" className="relative px-4 py-2 rounded-full transition-all text-blue-600">
                <motion.div
                  layoutId="nav-indicator-dashboard"
                  className="absolute inset-0 bg-white shadow-sm border border-slate-200/50 rounded-full"
                />
                <span className="relative z-10">Dashboard</span>
              </Link>
              <Link href="/community" className="relative px-4 py-2 rounded-full transition-all text-slate-500 hover:text-slate-800">
                <span className="relative z-10">Community Feed</span>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notification Center component integrated */}
            <NotificationCenter />
            
            <Link href="/reports/new" className="hidden sm:block">
              <Button size="sm" variant="primary">Report Issue</Button>
            </Link>
            
            <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition" title="View Profile">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full border border-white/80 object-cover shadow-sm" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 text-xs font-bold font-mono">
                  {profile?.displayName?.[0]?.toUpperCase() || "C"}
                </div>
              )}
            </Link>

            <Button variant="ghost" size="icon" onClick={() => logout()} className="text-slate-500 hover:bg-slate-100 rounded-full">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Dashboard Area */}
        <main className="flex-1 max-w-6xl w-[92%] mx-auto pt-36 pb-24 flex flex-col gap-8 relative z-10">
          {/* Welcome Title */}
          <div className="flex flex-col gap-2 pb-2">
            <h1 className="text-4xl font-black tracking-tight text-slate-800">
              Welcome, {profile?.displayName}
            </h1>
            <p className="text-sm font-semibold text-slate-400">
              Report local municipal issues or track active resolution processes in your neighborhood in real time.
            </p>
          </div>

          {/* 6. Citizen Impact Stats Card */}
          {!loading && <CitizenStatsCard reports={reports} stats={(profile as any)?.gamification} />}

          {/* Active Citizen Profile Card */}
          <div className="clay-card p-6 flex flex-col gap-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              Citizen Registry Profile
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm font-sans">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Display Name</span>
                <span className="font-extrabold text-slate-700">{profile?.displayName}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Contact Phone</span>
                <span className="font-extrabold text-slate-700">{profile?.phoneNumber || "Not provided"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">System Role</span>
                <span className="font-extrabold text-blue-650 capitalize">{profile?.role}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Account Created</span>
                <span className="font-extrabold text-slate-700">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* My Reports List */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black tracking-tight text-slate-800 flex items-center gap-2">
                My Incident Submissions
              </h2>
              <span className="text-xs text-blue-650 font-black bg-blue-100/70 border border-blue-200/50 px-4 py-1.5 rounded-full">
                {reports.length} {reports.length === 1 ? "report" : "reports"}
              </span>
            </div>

            {loading ? (
              /* Premium Skeleton Loaders */
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="clay-card p-5 animate-pulse flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-24 bg-slate-200 rounded" />
                      <div className="h-4 w-16 bg-slate-200 rounded" />
                    </div>
                    <div className="h-6 w-1/2 bg-slate-200 rounded" />
                    <div className="h-4 w-3/4 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="clay-card p-12 text-center flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-lg">
                  📋
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-slate-800 text-sm">No reports submitted yet</span>
                  <span className="text-xs text-slate-400 max-w-xs leading-relaxed font-semibold">
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
                        className="group clay-card p-5 hover:bg-white/95 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
                      >
                        {/* Interactive glow border on hover */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-transparent group-hover:bg-blue-500 transition-all duration-200" />
                        
                        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-650 bg-blue-100/70 border border-blue-200/50 px-2 py-0.5 rounded">
                              {getCategoryLabel(report.ai?.assistant?.category || report.metadata.category)}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">
                              {report.timestamps?.createdAt ? new Date(report.timestamps.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }) : "Date N/A"}
                            </span>
                          </div>
                          <h3 className="font-extrabold text-slate-800 text-base group-hover:text-blue-650 transition-colors truncate">
                            {report.ai?.assistant?.title || report.metadata.title || "Untitled Report"}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                            {report.ai?.assistant?.description || report.metadata.description || "No description provided."}
                          </p>
                          {report.ai?.verification?.duplicateReportIds && report.ai.verification.duplicateReportIds.length > 0 && (
                            <p className="text-xs text-amber-600 font-extrabold mt-1 flex items-center gap-1.5 bg-amber-50 border border-amber-100 px-2 py-1 rounded w-fit">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Linked Repost of #{report.ai.verification.duplicateReportIds[0]}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest font-mono">
                              Verification Status
                            </span>
                            {renderStatusBadge(
                              report.ai?.verification?.status || "processing",
                              report.ai?.verification?.duplicateReportIds
                            )}
                          </div>
                          <div className="w-8.5 h-8.5 rounded-full bg-slate-100 border border-slate-200 group-hover:bg-blue-500 group-hover:text-white transition-all duration-200 flex items-center justify-center text-slate-400">
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
        
        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-slate-200/80 bg-white/90 backdrop-blur-2xl py-2 px-6 flex justify-around items-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 p-2 text-blue-600">
            <div className="relative">
              <LayoutDashboard className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider">Dashboard</span>
          </Link>
          <Link href="/community" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Feed</span>
          </Link>
          <Link href="/reports/new" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 transition-colors relative -top-3">
            <div className="bg-blue-600 text-white p-3 rounded-full shadow-lg shadow-blue-500/30">
              <AlertCircle className="w-6 h-6" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider mt-1 text-slate-500">Report</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <User className="w-5 h-5" />
            <span className="text-[9px] font-black uppercase tracking-wider">Profile</span>
          </Link>
        </div>
      </div>
    </RouteGuard>
  );
}
