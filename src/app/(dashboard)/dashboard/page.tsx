/**
 * @file src/app/(dashboard)/dashboard/page.tsx
 * @description Citizen Dashboard page.
 * Displays user profile attributes, sign-out controls, and a real-time list of reports.
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
import { Clock, CheckCircle2, XCircle, AlertCircle, ArrowRight } from "lucide-react";
import { ISSUE_CATEGORIES } from "@/constants";

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

  const renderStatusBadge = (status: string) => {
    const lowerStatus = String(status || "").toLowerCase().trim();

    if (lowerStatus === "processing") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500">
          <Clock className="w-3.5 h-3.5 animate-pulse" />
          Processing AI Verification...
        </span>
      );
    }
    if (lowerStatus === "verified" || lowerStatus === "processed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Verified
        </span>
      );
    }
    if (lowerStatus === "rejected") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500">
          <XCircle className="w-3.5 h-3.5" />
          Rejected
        </span>
      );
    }
    if (lowerStatus === "requires_review" || lowerStatus === "requires review" || lowerStatus === "flagged") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
          <AlertCircle className="w-3.5 h-3.5" />
          Requires Review
        </span>
      );
    }
    if (lowerStatus === "failed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500">
          <XCircle className="w-3.5 h-3.5" />
          Verification Failed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500">
        <Clock className="w-3.5 h-3.5 animate-pulse" />
        Processing AI Verification...
      </span>
    );
  };

  return (
    <RouteGuard allowedRoles={["citizen"]}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        {/* Navigation Bar */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <span className="font-bold text-primary text-lg">CivicMind</span>
            <div className="flex items-center gap-4">
              <Link href="/reports/new">
                <Button size="sm">Report Issue</Button>
              </Link>
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
                {profile?.email} ({profile?.role})
              </span>
              <Button variant="outline" size="sm" onClick={() => logout()}>
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Area */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              Welcome back, {profile?.displayName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Report local municipal issues or track active resolution processes in your neighborhood.
            </p>
          </div>

          {/* Profile Row */}
          <div className="border border-border rounded-lg p-6 bg-card flex flex-col gap-4 shadow-sm">
            <h2 className="text-lg font-bold text-foreground">Active Citizen Profile</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Display Name</span>
                <span className="font-medium">{profile?.displayName}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Contact Phone</span>
                <span className="font-medium">{profile?.phoneNumber || "Not provided"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">System Privilege</span>
                <span className="font-medium capitalize">{profile?.role}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Account Created</span>
                <span className="font-medium">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* My Reports List */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-foreground">My Reports</h2>
              <span className="text-xs text-muted-foreground font-semibold bg-secondary/80 px-2.5 py-1 rounded-full">
                {reports.length} {reports.length === 1 ? "report" : "reports"}
              </span>
            </div>

            {loading ? (
              <div className="border border-dashed border-border rounded-lg p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-sm text-muted-foreground font-medium">Loading reports...</span>
              </div>
            ) : reports.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-12 text-center flex flex-col items-center justify-center gap-4 bg-muted/20">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-lg">
                  📋
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-foreground text-sm">No reports submitted yet</span>
                  <span className="text-xs text-muted-foreground max-w-xs">
                    You haven&apos;t submitted any civic issue reports. Get started by clicking &quot;Report Issue&quot; above.
                  </span>
                </div>
                <Link href="/reports/new">
                  <Button size="sm" variant="outline">Report Your First Issue</Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {reports.map((report) => (
                  <Link
                    key={report.id}
                    href={`/reports/${report.id}`}
                    className="group border border-border rounded-lg p-5 bg-card hover:bg-muted/30 transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                  >
                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded">
                          {getCategoryLabel(report.ai?.assistant?.category || report.metadata.category)}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {report.timestamps?.createdAt ? new Date(report.timestamps.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }) : "Date N/A"}
                        </span>
                      </div>
                      <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors truncate">
                        {report.ai?.assistant?.title || report.metadata.title || "Untitled Report"}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {report.ai?.assistant?.description || report.metadata.description || "No description provided."}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                          Verification Status
                        </span>
                        {renderStatusBadge(report.ai?.verification?.status || "processing")}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-secondary/50 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-200 flex items-center justify-center text-muted-foreground">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </RouteGuard>
  );
}
