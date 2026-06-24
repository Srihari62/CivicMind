/**
 * @file src/app/(dashboard)/officer/reports/[reportId]/page.tsx
 * @description Officer-facing incident lifecycle management and resolution panel.
 */

"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { RouteGuard } from "@/features/auth/components/route-guard";
import { useAuth } from "@/providers/auth-provider";
import { ReportService } from "@/features/reports/services/report.service";
import { CivicReport } from "@/types";
import { Button } from "@/components/ui/button";
import {
  acceptAssignmentAction,
  rejectAssignmentAction,
  startInvestigationAction,
  resolveReportAction,
  addInternalNotesAction,
} from "@/app/actions/officer.actions";
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Activity,
  Send,
  Loader2,
} from "lucide-react";

export default function OfficerReportDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const reportId = params?.reportId as string;

  const [report, setReport] = useState<CivicReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Workflow states
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  
  // Resolution form states
  const [resNotes, setResNotes] = useState("");
  const [resCategory, setResCategory] = useState("completed");
  const [resProofUrl, setResProofUrl] = useState("");
  const [showResolveForm, setShowResolveForm] = useState(false);

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
      setError(err instanceof Error ? err.message : "Failed to load report details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

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

  const handleAddNote = async () => {
    if (!report || !profile?.uid || !internalNote.trim()) return;
    setSubmitting(true);
    try {
      const res = await addInternalNotesAction(report.id, profile.uid, internalNote);
      if (res.success) {
        setInternalNote("");
        await fetchReport();
      } else {
        alert(res.error || "Failed to append internal notes.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report || !profile?.uid) return;
    if (!resNotes.trim()) {
      alert("Please provide resolution action details.");
      return;
    }
    setSubmitting(true);
    try {
      const media = resProofUrl ? [{
        id: "proof_" + Date.now(),
        url: resProofUrl,
        type: "image" as const,
        storagePath: "resolutions/" + Date.now() + ".jpg",
        mimeType: "image/jpeg",
        size: 0,
        uploadedAt: new Date().toISOString()
      }] : [];
      const res = await resolveReportAction(
        report.id,
        profile.uid,
        resNotes,
        media,
        resCategory,
        resProofUrl
      );
      if (res.success) {
        setShowResolveForm(false);
        setResNotes("");
        setResProofUrl("");
        await fetchReport();
      } else {
        alert(res.error || "Failed to resolve report.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Resolved</span>;
      case "in_progress":
        return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">In Progress</span>;
      case "investigating":
        return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Investigating</span>;
      case "assigned":
        return <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Assigned</span>;
      case "submitted":
        return <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Submitted</span>;
      case "rejected":
        return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Rejected</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">{status}</span>;
    }
  };

  return (
    <RouteGuard allowedRoles={["officer"]}>
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 pb-20">
        {/* Top Header */}
        <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/officer" className="flex items-center gap-2 text-sm text-slate-400 hover:text-indigo-400 transition-colors font-medium">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 text-sm">
                CIVICMIND
              </span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-1.5 py-0.5 rounded border border-indigo-500/30">
                Staff Console
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-6xl w-full mx-auto px-6 py-10">
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <span className="text-sm text-slate-400">Loading incident lifecycle file...</span>
            </div>
          ) : error || !report ? (
            <div className="py-24 text-center border border-slate-800 rounded-2xl bg-slate-950/40 p-8">
              <p className="text-rose-450 font-bold mb-4">{error || "Report details unavailable."}</p>
              <Link href="/officer">
                <Button variant="outline" className="border-slate-800 text-slate-300">Go Back</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Details & Verification */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* Main Incident Card */}
                <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <span className="text-xs font-mono text-slate-550">#{report.id}</span>
                    {getStatusBadge(report.status)}
                  </div>
                  <h1 className="text-2xl font-extrabold text-slate-100 mb-2">{report.metadata.title}</h1>
                  <p className="text-sm text-slate-300 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 leading-relaxed whitespace-pre-wrap mb-6">
                    {report.metadata.description}
                  </p>

                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Location Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-slate-800/60 p-4 rounded-xl bg-slate-900/20 text-xs">
                    <div>
                      <span className="text-slate-450 block mb-0.5">Address</span>
                      <strong className="text-slate-200 text-sm font-semibold">{report.location.formattedAddress}</strong>
                    </div>
                    <div>
                      <span className="text-slate-450 block mb-0.5">Region / City</span>
                      <strong className="text-slate-200 text-sm font-semibold">{report.location.city || "N/A"}, {report.location.state || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-450 block mb-0.5">Coordinates</span>
                      <strong className="text-slate-200 font-mono">Lat: {report.location.latitude.toFixed(6)}, Lng: {report.location.longitude.toFixed(6)}</strong>
                    </div>
                    <div>
                      <span className="text-slate-450 block mb-0.5">Created At</span>
                      <strong className="text-slate-200">{new Date(report.timestamps.createdAt).toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                {/* AI Auditing and Verification Analytics */}
                <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-6 backdrop-blur-sm">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
                    <ShieldCheck className="h-5 w-5 text-indigo-400" />
                    Automated AI Triage Audit
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="border border-slate-800/80 rounded-xl bg-slate-900/30 p-4 flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Classification</span>
                      <strong className="text-slate-200 capitalize font-bold text-base">
                        {report.metadata.category.replace("_", " ")}
                      </strong>
                    </div>
                    <div className="border border-slate-800/80 rounded-xl bg-slate-900/30 p-4 flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Severity Status</span>
                      <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded self-start mt-1 ${
                        (report.ai?.assistant?.severity || "medium") === "critical"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : (report.ai?.assistant?.severity || "medium") === "high"
                            ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}>
                        {report.ai?.assistant?.severity || "medium"}
                      </span>
                    </div>
                    <div className="border border-slate-800/80 rounded-xl bg-slate-900/30 p-4 flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Urgency Priority</span>
                      <strong className="text-slate-200 capitalize font-bold text-base">
                        {report.ai?.verification?.priority || "Medium"}
                      </strong>
                    </div>
                  </div>

                  {/* Fake Media analysis */}
                  <div className="border border-slate-800/80 rounded-xl bg-slate-900/20 p-4 mb-4">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <span className="text-xs font-bold text-slate-350 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Fake Media Risk Probability
                      </span>
                      <span className={`text-xs font-bold ${
                        (report.ai?.verification?.fakeMediaProbability || 0) > 0.6
                          ? "text-red-400"
                          : (report.ai?.verification?.fakeMediaProbability || 0) > 0.3
                            ? "text-amber-400"
                            : "text-emerald-400"
                      }`}>
                        {Math.round((report.ai?.verification?.fakeMediaProbability || 0) * 100)}% Risk
                      </span>
                    </div>
                    {report.ai?.verification?.fakeMediaReason && (
                      <p className="text-xs text-slate-400 leading-relaxed italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                        &ldquo;{report.ai.verification.fakeMediaReason}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* AI Generated Summary */}
                  {report.ai?.verification?.summary && (
                    <div className="flex flex-col gap-2 text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Automated AI Overview Summary</span>
                      <p className="text-slate-300 leading-relaxed bg-slate-905 p-3 rounded-lg border border-slate-800">
                        {report.ai.verification.summary}
                      </p>
                    </div>
                  )}
                </div>

                {/* Evidence media gallery */}
                {report.evidence.media && report.evidence.media.length > 0 && (
                  <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-6 backdrop-blur-sm">
                    <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider mb-4">Uploaded Media Evidence</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {report.evidence.media.map((asset) => {
                        const isVid = asset.type === "video";
                        return (
                          <div key={asset.id} className="aspect-square border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/80 flex items-center justify-center relative group transition-transform hover:scale-[1.02]">
                            {isVid ? (
                              <video src={asset.url} className="object-cover w-full h-full" controls preload="metadata" />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={asset.url}
                                alt="Evidence"
                                className="object-cover w-full h-full cursor-zoom-in"
                                onClick={() => window.open(asset.url, "_blank")}
                              />
                            )}
                            <span className="absolute top-2 left-2 bg-slate-900/90 text-[8px] font-bold text-slate-300 px-1.5 py-0.5 rounded border border-slate-800">
                              {asset.type.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Case Workflow Lifecycle & Resolution Form */}
              <div className="flex flex-col gap-6">
                
                {/* LifeCycle Panel */}
                <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-6 backdrop-blur-sm flex flex-col gap-4">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
                    <Activity className="h-5 w-5 text-indigo-400" />
                    Case Actions Panel
                  </h2>

                  {/* Accept assignment action */}
                  {(report.status === "submitted") && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-slate-400">Accept this incident case workload to transition its status to Investigating.</p>
                      <Button
                        onClick={handleAccept}
                        disabled={submitting}
                        className="w-full bg-indigo-650 hover:bg-indigo-600 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Accept Incident Case
                      </Button>
                      
                      <Button
                        onClick={() => setShowRejectForm(!showRejectForm)}
                        variant="ghost"
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs py-1"
                      >
                        {showRejectForm ? "Cancel Reject" : "Reject Assignment"}
                      </Button>

                      {showRejectForm && (
                        <div className="flex flex-col gap-2 border border-slate-800/80 p-3 rounded-lg bg-slate-900/40 mt-2">
                          <label className="text-[10px] uppercase font-bold text-slate-400 block">Rejection Reason</label>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="State reason for rejecting case assignment..."
                            className="w-full h-20 p-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-650 focus:outline-none focus:border-rose-500 resize-none"
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
                  {report.status === "investigating" && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-slate-400">Initiate on-site investigation. This transitions case status to In Progress.</p>
                      <Button
                        onClick={handleStartInvestigation}
                        disabled={submitting}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                        Start Active Investigation
                      </Button>
                    </div>
                  )}

                  {/* In Progress actions */}
                  {report.status === "in_progress" && (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs text-slate-400">Work is currently in progress. You can append internal notes or resolve the incident when completed.</p>
                      
                      <Button
                        onClick={() => setShowResolveForm(!showResolveForm)}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Resolve Incident Case
                      </Button>

                      {/* Internal note form */}
                      <div className="border border-slate-800/80 p-3 rounded-lg bg-slate-900/20 flex flex-col gap-2 mt-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 block">Add Case Progress Note</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={internalNote}
                            onChange={(e) => setInternalNote(e.target.value)}
                            placeholder="Append status update note..."
                            className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                          <Button
                            onClick={handleAddNote}
                            disabled={submitting || !internalNote.trim()}
                            className="bg-indigo-650 hover:bg-indigo-600 p-2 rounded-lg"
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Resolved Summary State */}
                  {report.status === "resolved" && (
                    <div className="border border-emerald-500/20 rounded-xl bg-emerald-500/5 p-4 flex flex-col gap-3">
                      <span className="text-xs font-bold text-emerald-450 uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4" />
                        Resolution Logged
                      </span>
                      {report.resolution ? (
                        <div className="flex flex-col gap-2 text-xs">
                          <div>
                            <span className="text-slate-450 block">Resolution Category</span>
                            <strong className="text-slate-200 capitalize">{report.resolution.category}</strong>
                          </div>
                          <div>
                            <span className="text-slate-450 block">Action Details / Notes</span>
                            <p className="text-slate-355 italic bg-slate-950/40 p-2 rounded border border-slate-900">{report.resolution.notes}</p>
                          </div>
                          {report.resolution.proofPhotoUrl && (
                            <div>
                              <span className="text-slate-450 block mb-1">Proof of Work Photo</span>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={report.resolution.proofPhotoUrl}
                                alt="Proof of Resolution"
                                className="object-cover w-full h-24 rounded border border-slate-800 cursor-zoom-in"
                                onClick={() => window.open(report.resolution?.proofPhotoUrl, "_blank")}
                              />
                            </div>
                          )}
                          <span className="text-[10px] text-slate-500">
                            Resolved on {new Date(report.resolution.resolvedAt).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No resolution payload logged on record.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Resolution Overlay / Form */}
                {showResolveForm && report.status === "in_progress" && (
                  <form onSubmit={handleResolve} className="border border-slate-800 rounded-2xl bg-slate-950/80 p-6 backdrop-blur-md flex flex-col gap-4">
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-400" />
                      Incident Resolution Report
                    </h3>

                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Resolution Category</label>
                      <select
                        value={resCategory}
                        onChange={(e) => setResCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="completed">Completed / Work Done</option>
                        <option value="duplicate">Duplicate Report</option>
                        <option value="false_alarm">False Alarm / Invalid</option>
                        <option value="referred">Referred to Third Party</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Resolution Action Taken Notes</label>
                      <textarea
                        value={resNotes}
                        onChange={(e) => setResNotes(e.target.value)}
                        placeholder="Provide details on the actions taken to resolve this incident..."
                        className="w-full h-28 p-3 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-550 focus:outline-none focus:border-indigo-500 resize-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-400 block mb-1">Proof of Work Image URL (Optional)</label>
                      <input
                        type="url"
                        value={resProofUrl}
                        onChange={(e) => setResProofUrl(e.target.value)}
                        placeholder="https://example.com/resolved_image.jpg"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-550 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
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
                        disabled={submitting || !resNotes.trim()}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Resolution"}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Timeline Feed */}
                <div className="border border-slate-800 rounded-2xl bg-slate-950/40 p-6 backdrop-blur-sm flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider pb-2 border-b border-slate-800">
                    Incident Case History / Timeline
                  </h3>
                  <div className="flex flex-col gap-4">
                    {report.timeline && report.timeline.length > 0 ? (
                      report.timeline.map((event, idx) => (
                        <div key={idx} className="flex gap-3 text-xs relative">
                          {idx !== (report.timeline?.length || 0) - 1 && (
                            <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-slate-800" />
                          )}
                          <div className="h-5 w-5 rounded-full bg-indigo-950 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 font-mono text-[9px]">
                            {idx + 1}
                          </div>
                          <div className="flex flex-col gap-1">
                            <strong className="text-slate-200">{event.action}</strong>
                            {event.note && (
                              <p className="text-slate-400 bg-slate-900/40 p-2 rounded border border-slate-900/60 leading-relaxed font-sans">{event.note}</p>
                            )}
                            <span className="text-[10px] text-slate-500">
                              By {event.actorRole} • {new Date(event.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-555 italic">No timeline event recordings.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </RouteGuard>
  );
}
