/**
 * @file src/app/(dashboard)/reports/[reportId]/page.tsx
 * @description Report details screen.
 * Displays details of a specific issue report, including media evidence,
 * nested location details, and a success banner upon redirect from submission.
 * Integrated with real-time listeners and interactive tracking widgets.
 */

"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { CivicReport } from "@/types";
import { Button } from "@/components/ui/button";
import { ISSUE_CATEGORIES, REPORT_STATUSES } from "@/constants";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";

// Import custom Sprint 9 citizen dashboard components
import ReportTimeline from "@/components/dashboard/ReportTimeline";
import AIAnalysisCard from "@/components/dashboard/AIAnalysisCard";
import VerificationProgress from "@/components/dashboard/VerificationProgress";
import BeforeAfterGallery from "@/components/dashboard/BeforeAfterGallery";

export default function ReportDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const reportId = params?.reportId as string;
  const isSuccess = searchParams?.get("success") === "true";

  const [report, setReport] = useState<CivicReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;

    setLoading(true);
    setError(null);

    const docRef = doc(db, COLLECTIONS.REPORTS, reportId);
    
    // Real-time Firestore document listener
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setReport({ id: docSnap.id, ...docSnap.data() } as CivicReport);
        } else {
          setError("The requested report could not be found.");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to report details:", err);
        setError("Failed to stream report updates in real time.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [reportId]);

  // Helper to map category value to label
  const getCategoryLabel = (val: string) => {
    return ISSUE_CATEGORIES.find((cat) => cat.value === val)?.label || val;
  };

  // Helper to get status details
  const getStatusDetails = (val: string) => {
    return REPORT_STATUSES.find((stat) => stat.value === val) || { label: val, badgeVariant: "secondary" };
  };

  return (
    <RouteGuard requireAuth={true}>
      <div className="flex min-h-screen flex-col bg-zinc-950 text-white font-sans selection:bg-blue-600/30 selection:text-white">
        {/* Navigation Bar */}
        <header className="border-b border-white/10 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <span className="font-bold text-blue-500 tracking-wider flex items-center gap-1.5 select-none">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              CivicMind
            </span>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-xs text-zinc-400 hover:text-white font-semibold transition-colors flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10 flex flex-col gap-8">
          {/* Success Banner */}
          {isSuccess && (
            <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm animate-fade-in shadow-xl backdrop-blur-md">
              <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-white">Report submitted successfully.</span>
                <span className="text-xs text-zinc-300">
                  Your report has been successfully recorded in the municipal queue. AI triage agents will begin automatic categorization and priority routing.
                </span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
              <span className="text-sm font-semibold text-zinc-400">Streaming live report data...</span>
            </div>
          ) : error || !report ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <span className="text-sm text-rose-400 font-bold">{error || "Report not found."}</span>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">Go to Dashboard</Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Header Info */}
              <div className="flex flex-col gap-4 border-b border-white/10 pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {getCategoryLabel(report.ai?.assistant?.category || report.metadata.category)}
                  </span>
                  <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Status: {getStatusDetails(report.status).label}
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                  {report.ai?.assistant?.title || report.metadata.title}
                </h1>
                <p className="text-xs text-zinc-400 font-mono">
                  Report ID: {report.id} • Filed on {new Date(report.timestamps.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Repost Banner */}
              {report.ai?.verification?.duplicateReportIds && report.ai.verification.duplicateReportIds.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl text-sm shadow-lg backdrop-blur-md">
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-white">Linked Repost</span>
                    <span className="text-xs text-zinc-300 leading-relaxed">
                      This report has been identified as a duplicate of an existing active issue (Report ID:{" "}
                      <Link href={`/reports/${report.ai.verification.duplicateReportIds[0]}`} className="underline font-bold font-mono text-amber-300">
                        {report.ai.verification.duplicateReportIds[0]}
                      </Link>
                      ). The reported count for the original issue has been updated.
                    </span>
                  </div>
                </div>
              )}

              {/* 1. Report Lifecycle Tracker */}
              <ReportTimeline report={report} />

              {/* Live AI Verification Diagnostics Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {/* Live AI Progress during analysis */}
                  {report.ai?.verification?.status === "processing" && (
                    <VerificationProgress report={report} />
                  )}

                  {/* Description */}
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider select-none">
                      Reported Description
                    </h3>
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed border border-white/10 p-5 rounded-2xl bg-black/40 backdrop-blur-md">
                      {report.metadata.description}
                    </p>
                  </div>

                  {/* Meta details grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-white/10 p-5 rounded-2xl bg-black/40 backdrop-blur-md text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider select-none font-semibold">Address / Location</span>
                      <span className="font-semibold text-zinc-200">{report.location.formattedAddress}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider select-none font-semibold">Coordinates</span>
                      <span className="font-medium text-xs font-mono text-zinc-300">
                        Lat: {report.location.latitude.toFixed(6)}, Lng: {report.location.longitude.toFixed(6)}
                      </span>
                    </div>
                    {report.location.city && (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-zinc-500 uppercase tracking-wider select-none font-semibold">Region / City / State</span>
                        <span className="font-semibold text-zinc-200">
                          {report.location.city}, {report.location.state} {report.location.postalCode}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-500 uppercase tracking-wider select-none font-semibold">Initial Urgency Priority</span>
                      <span className="font-bold text-xs bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded border border-zinc-700 inline-block w-fit capitalize">
                        {report.ai?.verification?.priority || report.ai?.assistant?.initialPriority || "unknown"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. AI Explainability Panel */}
                <div className="flex flex-col">
                  <AIAnalysisCard report={report} />
                </div>
              </div>

              {/* 5. Before / After Gallery for Resolved incidents */}
              {report.status === "resolved" && (
                <BeforeAfterGallery report={report} />
              )}

              {/* Previews grid */}
              {report.evidence.media && report.evidence.media.length > 0 && report.status !== "resolved" && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider select-none">
                    Uploaded Evidence Media ({report.evidence.media.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {report.evidence.media.map((asset) => {
                      const isVid = asset.type === "video";
                      return (
                        <div key={asset.id} className="aspect-square border border-white/10 rounded-2xl overflow-hidden bg-zinc-900 flex items-center justify-center relative group">
                          {isVid ? (
                            <video
                              src={asset.url}
                              className="object-cover w-full h-full"
                              controls
                              preload="metadata"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={asset.url}
                              alt="Evidence item"
                              className="object-cover w-full h-full cursor-zoom-in group-hover:scale-105 transition duration-300"
                              onClick={() => window.open(asset.url, "_blank")}
                            />
                          )}
                          <div className="absolute top-2 left-2 bg-black/70 border border-white/10 text-[8px] text-white px-2 py-0.5 rounded font-mono select-none">
                            {asset.type.toUpperCase()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation Back */}
              <div className="flex items-center justify-end border-t border-white/10 pt-6 mt-4">
                <Link href="/dashboard">
                  <Button size="sm">Return to Dashboard</Button>
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </RouteGuard>
  );
}
