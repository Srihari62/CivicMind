/**
 * @file src/app/(dashboard)/reports/[reportId]/page.tsx
 * @description Report details screen.
 * Displays details of a specific issue report, including media evidence,
 * nested location details, and a success banner upon redirect from submission.
 */

"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { ReportService } from "@/features/reports/services/report.service";
import { CivicReport } from "@/types";
import { Button } from "@/components/ui/button";
import { ISSUE_CATEGORIES, REPORT_STATUSES } from "@/constants";

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

    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await ReportService.getReport(reportId);
        if (!data) {
          setError("The requested report could not be found.");
        } else {
          setReport(data);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load report details.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
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
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        {/* Navigation Bar */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <span className="font-bold text-primary">CivicMind</span>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 flex flex-col gap-6">
          {/* Success Banner */}
          {isSuccess && (
            <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-sm animate-fade-in">
              <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold">Success! Issue Report Submitted</span>
                <span className="text-xs opacity-90">
                  Your report has been successfully recorded in the municipal queue. AI triage agents will begin automatic categorization and priority routing.
                </span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs text-muted-foreground">Loading report details...</span>
            </div>
          ) : error || !report ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <span className="text-sm text-destructive font-medium">{error || "Report not found."}</span>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">Go to Dashboard</Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Header Info */}
              <div className="flex flex-col gap-3 border-b border-border pb-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-semibold px-2 py-1 rounded bg-muted text-muted-foreground border border-border">
                    {getCategoryLabel(report.metadata.category)}
                  </span>
                  <span className="text-xs uppercase tracking-wider font-semibold px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                    Status: {getStatusDetails(report.status).label}
                  </span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {report.metadata.title}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Report ID: {report.id} • Filed on {new Date(report.timestamps.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
                  Description
                </h3>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed border border-border p-4 rounded-md bg-card">
                  {report.metadata.description}
                </p>
              </div>

              {/* Meta details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-border p-5 rounded-md bg-card text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider select-none font-semibold">Address / Location</span>
                  <span className="font-medium">{report.location.formattedAddress}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider select-none font-semibold">Coordinates</span>
                  <span className="font-medium text-xs font-mono">
                    Lat: {report.location.latitude.toFixed(6)}, Lng: {report.location.longitude.toFixed(6)}
                  </span>
                </div>
                {report.location.city && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider select-none font-semibold">Region / City / State</span>
                    <span className="font-medium">
                      {report.location.city}, {report.location.state} {report.location.postalCode}
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider select-none font-semibold">Initial Urgency Priority</span>
                  <span className="font-medium capitalize text-xs bg-muted/60 px-1.5 py-0.5 rounded border border-border inline-block w-fit">
                    {report.ai.verification?.priority || "unknown"}
                  </span>
                </div>
              </div>

              {/* Previews grid */}
              {report.evidence.media && report.evidence.media.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
                    Uploaded Evidence Media ({report.evidence.media.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {report.evidence.media.map((asset) => {
                      const isVid = asset.type === "video";
                      return (
                        <div key={asset.id} className="aspect-square border border-border rounded-md overflow-hidden bg-muted flex items-center justify-center relative group">
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
                              className="object-cover w-full h-full cursor-zoom-in"
                              onClick={() => window.open(asset.url, "_blank")}
                            />
                          )}
                          <div className="absolute top-1 left-1 bg-black/60 text-[8px] text-white px-1 py-0.5 rounded font-mono select-none">
                            {asset.type.toUpperCase()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation Back */}
              <div className="flex items-center justify-end border-t border-border pt-6 mt-4">
                <Link href="/dashboard">
                  <Button variant="primary">Return to Dashboard</Button>
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </RouteGuard>
  );
}
