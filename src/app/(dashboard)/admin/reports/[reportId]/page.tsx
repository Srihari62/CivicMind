/**
 * @file src/app/(dashboard)/admin/reports/[reportId]/page.tsx
 * @description Administrative Incident Override & Investigation Console.
 */

"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { doc, onSnapshot, collection } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase/firestore";
import { CivicReport } from "@/types";
import { FirestoreUserProfile } from "@/features/auth/repositories/user.repository";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  User,
  Users,
  Building,
  AlertOctagon,
  Sparkles,
  Download,
  Check,
  X,
  FileText
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

// Server Actions
import {
  adminAssignOfficerAction,
  adminChangeDepartmentAction,
  adminMarkPriorityAction,
  adminRejectReportAction,
  adminApproveReportAction
} from "@/app/actions/admin.actions";

// Reuse existing widgets
import ReportTimeline from "@/components/dashboard/ReportTimeline";
import AIAnalysisCard from "@/components/dashboard/AIAnalysisCard";
import VerificationProgress from "@/components/dashboard/VerificationProgress";
import BeforeAfterGallery from "@/components/dashboard/BeforeAfterGallery";

const MapViewer = dynamic(() => import("@/components/maps/MapViewer"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] bg-zinc-950/60 animate-pulse rounded-2xl flex items-center justify-center border border-white/5">
      <span className="text-xs text-zinc-500">Initializing mapping engine...</span>
    </div>
  ),
});

export default function AdminReportDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params?.reportId as string;
  const { profile } = useAuth();

  // Firestore streamed data
  const [report, setReport] = useState<CivicReport | null>(null);
  const [users, setUsers] = useState<FirestoreUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Override States
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedOfficerId, setSelectedOfficerId] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // 1. Subscribe to report details and all users
  useEffect(() => {
    if (!reportId) return;

    const unsubReport = onSnapshot(
      doc(db, COLLECTIONS.REPORTS, reportId),
      (docSnap) => {
        if (docSnap.exists()) {
          const rep = { id: docSnap.id, ...docSnap.data() } as CivicReport;
          setReport(rep);
          setSelectedDept(rep.ai?.assignment?.department || rep.ai?.verification?.assignedDepartment || "");
          setSelectedOfficerId(rep.ai?.assignment?.officerId || "");
          setSelectedPriority(rep.ai?.verification?.priority || "unknown");
        } else {
          setError("Report not found in system database.");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching report:", err);
        setError("Failed to stream report details.");
        setLoading(false);
      }
    );

    const unsubUsers = onSnapshot(collection(db, COLLECTIONS.USERS), (snap) => {
      const uList: FirestoreUserProfile[] = [];
      snap.forEach((doc) => {
        uList.push({ uid: doc.id, ...doc.data() } as FirestoreUserProfile);
      });
      setUsers(uList);
    });

    return () => {
      unsubReport();
      unsubUsers();
    };
  }, [reportId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
        <span className="text-xs text-zinc-400 font-semibold uppercase tracking-widest">Streaming Incident Diagnostics...</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <span className="text-sm text-red-400 font-bold">{error || "Report details unavailable."}</span>
        <Link href="/admin/reports">
          <Button variant="outline" size="sm">Return to Incident List</Button>
        </Link>
      </div>
    );
  }

  // Reporter and Assigned Officer profile lookups
  const reporterUser = users.find((u) => u.uid === report.metadata?.createdBy);
  const assignedOfficer = users.find((u) => u.uid === report.ai?.assignment?.officerId);

  // List of officers inside the currently selected department (or all officers if no department matches)
  const availableOfficers = users.filter((u) => {
    if (u.role !== "officer") return false;
    if (!selectedDept) return true;
    return (u.department || "").toLowerCase() === selectedDept.toLowerCase();
  });

  // Extract all distinct departments from the user base for department overrides
  const departmentsList = Array.from(
    new Set(users.map((u) => u.department).filter(Boolean))
  ) as string[];

  // Administrative handlers
  const handleAssignOfficer = async () => {
    if (!profile?.uid) return;
    setActionLoading(true);
    try {
      const res = await adminAssignOfficerAction(
        profile.uid,
        report.id,
        selectedOfficerId || null,
        selectedDept
      );
      if (res.success) {
        showToast("Officer assignment updated successfully.", "success");
      } else {
        showToast(res.error || "Failed to update assignment.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error occurred.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateDept = async () => {
    if (!profile?.uid) return;
    setActionLoading(true);
    try {
      const res = await adminChangeDepartmentAction(profile.uid, report.id, selectedDept);
      if (res.success) {
        showToast("Assigned department updated successfully.", "success");
      } else {
        showToast(res.error || "Failed to update department.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error occurred.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePriority = async () => {
    if (!profile?.uid) return;
    setActionLoading(true);
    try {
      const res = await adminMarkPriorityAction(profile.uid, report.id, selectedPriority as any);
      if (res.success) {
        showToast("Priority level updated successfully.", "success");
      } else {
        showToast(res.error || "Failed to update priority.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error occurred.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!profile?.uid) return;
    setActionLoading(true);
    try {
      const res = await adminApproveReportAction(profile.uid, report.id);
      if (res.success) {
        showToast("Report status updated to Accepted.", "success");
      } else {
        showToast(res.error || "Failed to approve report.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error occurred.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid) return;
    setActionLoading(true);
    try {
      const res = await adminRejectReportAction(profile.uid, report.id, rejectReason);
      if (res.success) {
        showToast("Report has been rejected.", "success");
        setIsRejectOpen(false);
        setRejectReason("");
      } else {
        showToast(res.error || "Failed to reject report.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Error occurred.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const priorityWeight = report.ai?.verification?.priority || "unknown";

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border text-sm font-semibold shadow-lg backdrop-blur-md flex items-center gap-2 ${
              toast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {toast.type === "success" ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back button */}
      <div>
        <Link href="/admin/reports" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-bold uppercase tracking-widest">
          <ArrowLeft className="h-4 w-4" /> Back to registry
        </Link>
      </div>

      {/* Header Title Area */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-850 border border-white/5 text-zinc-400">
              {report.ai?.assistant?.category || report.metadata?.category}
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                report.status === "resolved"
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                  : report.status === "rejected"
                    ? "bg-red-500/15 text-red-400 border-red-500/25"
                    : "bg-amber-500/15 text-amber-400 border-amber-500/25"
              }`}
            >
              Status: {report.status.replace("_", " ")}
            </span>
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                priorityWeight === "critical"
                  ? "bg-rose-500/25 text-rose-400 border-rose-500/35 animate-pulse"
                  : priorityWeight === "high"
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/25"
                    : "bg-zinc-800 text-zinc-500 border-white/5"
              }`}
            >
              Urgency: {priorityWeight}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white leading-tight">
            {report.ai?.assistant?.title || report.metadata?.title}
          </h1>
          <p className="text-[10px] text-zinc-500 font-mono mt-1">
            Report ID: {report.id} • Filed: {new Date(report.timestamps.createdAt).toLocaleString()}
          </p>
        </div>

        {/* Top override status controls */}
        {report.status !== "resolved" && report.status !== "rejected" && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleApprove}
              disabled={actionLoading}
              className="bg-emerald-650 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-4 h-9 flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" /> Approve Report
            </Button>
            <Button
              onClick={() => setIsRejectOpen(true)}
              disabled={actionLoading}
              variant="outline"
              className="border-red-550/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs uppercase tracking-wider px-4 h-9 flex items-center gap-1.5"
            >
              <X className="h-4 w-4" /> Reject Report
            </Button>
          </div>
        )}
      </div>

      {/* Main Grid content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left columns: details & analysis */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Timeline tracker */}
          <ReportTimeline report={report} />

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Report Description</label>
            <p className="text-sm text-zinc-200 bg-zinc-900/30 border border-white/5 p-4 rounded-xl leading-relaxed whitespace-pre-wrap">
              {report.metadata.description}
            </p>
          </div>

          {/* Verification diagnostics */}
          {report.ai?.verification?.status === "processing" && (
            <VerificationProgress report={report} />
          )}

          {/* Previews evidence */}
          {report.evidence?.media && report.evidence.media.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                Submitted Evidence Media ({report.evidence.media.length})
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {report.evidence.media.map((asset) => (
                  <div key={asset.id} className="aspect-square border border-white/10 rounded-xl overflow-hidden bg-zinc-950 flex items-center justify-center relative group">
                    {asset.type === "video" ? (
                      <video src={asset.url} className="object-cover w-full h-full" controls preload="metadata" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.url} alt="Evidence" className="object-cover w-full h-full" />
                    )}
                    <div className="absolute top-2 left-2 bg-black/75 border border-white/10 text-[8px] text-white px-2 py-0.5 rounded font-mono select-none uppercase">
                      {asset.type}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Before After resolution details */}
          {report.status === "resolved" && (
            <BeforeAfterGallery report={report} />
          )}

          {/* Map details */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Geographic Telemetry Map</label>
            <div className="bg-zinc-900/20 border border-white/5 rounded-xl p-3 flex flex-col gap-3">
              <div className="text-xs text-zinc-350 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-zinc-500 shrink-0" />
                <span>{report.location.formattedAddress}</span>
              </div>
              <MapViewer
                latitude={report.location.latitude}
                longitude={report.location.longitude}
                title={report.ai?.assistant?.title || report.metadata.title}
                category={report.ai?.assistant?.category || report.metadata.category}
                severity={(report.ai?.assistant?.severity || report.ai?.verification?.priority) ?? undefined}
                address={report.location.formattedAddress}
              />
            </div>
          </div>
        </div>

        {/* Right column: Admin Overrides and Reporter Info */}
        <div className="flex flex-col gap-6">
          {/* Administrative Override Panel */}
          {report.status !== "resolved" && report.status !== "rejected" && (
            <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex flex-col gap-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-red-450 flex items-center gap-1.5 pb-2 border-b border-white/5">
                <Shield className="h-4 w-4 text-red-400" /> Administrative Override
              </h3>

              {/* Priority override */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400">Urgency Override</label>
                <div className="flex gap-2">
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="flex-1 bg-black/45 border border-white/10 rounded-lg text-xs h-9 px-3 text-zinc-300 font-semibold focus:outline-none"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="unknown">Unknown</option>
                  </select>
                  <Button
                    onClick={handleUpdatePriority}
                    disabled={actionLoading}
                    variant="outline"
                    className="h-9 px-3 border-white/10 text-zinc-300"
                  >
                    Set
                  </Button>
                </div>
              </div>

              {/* Department override */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400">Dispatch Department</label>
                <div className="flex gap-2">
                  <select
                    value={selectedDept}
                    onChange={(e) => {
                      setSelectedDept(e.target.value);
                      setSelectedOfficerId(""); // Clear officer selection when dept changes
                    }}
                    className="flex-1 bg-black/45 border border-white/10 rounded-lg text-xs h-9 px-3 text-zinc-300 font-semibold focus:outline-none"
                  >
                    <option value="">Unassigned Department</option>
                    {departmentsList.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={handleUpdateDept}
                    disabled={actionLoading}
                    variant="outline"
                    className="h-9 px-3 border-white/10 text-zinc-300"
                  >
                    Route
                  </Button>
                </div>
              </div>

              {/* Officer dispatch */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400">Officer Dispatch</label>
                <div className="flex flex-col gap-2">
                  <select
                    value={selectedOfficerId}
                    onChange={(e) => setSelectedOfficerId(e.target.value)}
                    className="bg-black/45 border border-white/10 rounded-lg text-xs h-9 px-3 text-zinc-300 font-semibold focus:outline-none"
                  >
                    <option value="">Unassigned Officer</option>
                    {availableOfficers.map((o) => (
                      <option key={o.uid} value={o.uid}>
                        {o.displayName} ({o.availability || "offline"})
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={handleAssignOfficer}
                    disabled={actionLoading}
                    className="bg-red-500 hover:bg-red-650 text-white font-extrabold text-xs uppercase tracking-wider h-9"
                  >
                    Dispatch Officer
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Reporter details */}
          <div className="bg-zinc-900/20 border border-white/5 rounded-2xl p-5 backdrop-blur-sm shadow-xl flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <User className="h-4 w-4 text-zinc-500" /> Reporter Info
            </h3>
            {reporterUser ? (
              <div className="flex flex-col gap-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-zinc-300 text-xs overflow-hidden shrink-0">
                    {reporterUser.photoURL || reporterUser.photo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={reporterUser.photoURL || reporterUser.photo} alt={reporterUser.displayName} className="object-cover h-full w-full" />
                    ) : (
                      (reporterUser.displayName || reporterUser.email || "C").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-extrabold text-zinc-200">{reporterUser.displayName}</span>
                    <span className="text-[10px] font-mono text-zinc-500">{reporterUser.email}</span>
                  </div>
                </div>
                {reporterUser.phone && (
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <span className="text-zinc-500">Contact</span>
                    <span className="font-mono text-zinc-300">{reporterUser.phone}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-white/5 pt-2">
                  <span className="text-zinc-500">Role</span>
                  <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded border border-white/5 text-[9px] uppercase font-black tracking-wider">
                    {reporterUser.role}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-xs text-zinc-500 italic">User details unavailable.</span>
            )}
          </div>

          {/* AI Analysis Explainability Card */}
          <div className="flex flex-col">
            <AIAnalysisCard report={report} />
          </div>
        </div>
      </div>

      {/* Reject Reason Modal overlay */}
      <AnimatePresence>
        {isRejectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRejectOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-10 p-6 flex flex-col gap-4 text-slate-100"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-red-450 flex items-center gap-1.5">
                  <AlertOctagon className="h-4 w-4 text-red-500" /> Reject Incident Report
                </h3>
                <button onClick={() => setIsRejectOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleReject} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-400">Rejection Reason Note</label>
                  <textarea
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Provide rejection reason to display in the report timeline..."
                    rows={4}
                    className="bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500 leading-normal"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-white/5 pt-3 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRejectOpen(false)}
                    className="border-white/10 hover:bg-zinc-950 text-zinc-400 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="bg-red-550 hover:bg-red-700 text-white font-bold text-xs"
                  >
                    {actionLoading ? "Processing..." : "Reject Report"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
