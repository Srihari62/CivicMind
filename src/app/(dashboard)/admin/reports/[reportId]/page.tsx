/**
 * @file src/app/(dashboard)/admin/reports/[reportId]/page.tsx
 * @description Administrative Incident Override & Investigation Console.
 */

"use client";

import React, { useEffect, useState } from"react";
import { useParams, useRouter } from"next/navigation";
import { useAuth } from"@/providers/auth-provider";
import { doc, onSnapshot, collection } from"firebase/firestore";
import { db, COLLECTIONS } from"@/services/firebase/firestore";
import { CivicReport } from"@/types";
import { FirestoreUserProfile } from"@/features/auth/repositories/user.repository";
import { Button } from"@/components/ui/button";
import { Input } from"@/components/ui/input";
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
} from"lucide-react";
import Link from"next/link";
import dynamic from"next/dynamic";
import { motion, AnimatePresence } from"framer-motion";

// Server Actions
import {
 adminAssignOfficerAction,
 adminChangeDepartmentAction,
 adminMarkPriorityAction,
 adminRejectReportAction,
 adminApproveReportAction
} from"@/app/actions/admin.actions";

// Reuse existing widgets
import ReportTimeline from"@/components/dashboard/ReportTimeline";
import AIAnalysisCard from"@/components/dashboard/AIAnalysisCard";
import VerificationProgress from"@/components/dashboard/VerificationProgress";
import BeforeAfterGallery from"@/components/dashboard/BeforeAfterGallery";

const MapViewer = dynamic(() => import("@/components/maps/MapViewer"), {
 ssr: false,
 loading: () => (
 <div className="h-[280px] bg-slate-50/60 animate-pulse rounded-2xl flex items-center justify-center border border-slate-200">
 <span className="text-xs text-slate-500">Initializing mapping engine...</span>
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
 const [toast, setToast] = useState<{ message: string; type:"success" |"error" } | null>(null);

 const showToast = (message: string, type:"success" |"error") => {
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
 setSelectedDept(rep.ai?.assignment?.department || rep.ai?.verification?.assignedDepartment ||"");
 setSelectedOfficerId(rep.ai?.assignment?.officerId ||"");
 setSelectedPriority(rep.ai?.verification?.priority ||"unknown");
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
 <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">Streaming Incident Diagnostics...</span>
 </div>
);
 }

 if (error || !report) {
 return (
 <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
 <span className="text-sm text-red-400 font-bold">{error ||"Report details unavailable."}</span>
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
 if (u.role !=="officer") return false;
 if (!selectedDept) return true;
 return (u.department ||"").toLowerCase() === selectedDept.toLowerCase();
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
 showToast("Officer assignment updated successfully.","success");
 } else {
 showToast(res.error ||"Failed to update assignment.","error");
 }
 } catch (err: any) {
 showToast(err.message ||"Error occurred.","error");
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
 showToast("Assigned department updated successfully.","success");
 } else {
 showToast(res.error ||"Failed to update department.","error");
 }
 } catch (err: any) {
 showToast(err.message ||"Error occurred.","error");
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
 showToast("Priority level updated successfully.","success");
 } else {
 showToast(res.error ||"Failed to update priority.","error");
 }
 } catch (err: any) {
 showToast(err.message ||"Error occurred.","error");
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
 showToast("Report status updated to Accepted.","success");
 } else {
 showToast(res.error ||"Failed to approve report.","error");
 }
 } catch (err: any) {
 showToast(err.message ||"Error occurred.","error");
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
 showToast("Report has been rejected.","success");
 setIsRejectOpen(false);
 setRejectReason("");
 } else {
 showToast(res.error ||"Failed to reject report.","error");
 }
 } catch (err: any) {
 showToast(err.message ||"Error occurred.","error");
 } finally {
 setActionLoading(false);
 }
 };

 const priorityWeight = report.ai?.verification?.priority ||"unknown";

 return (
 <div className="flex flex-col gap-6">
 {/* Toast Alert */}
 <AnimatePresence>
 {toast && (
 <motion.div
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-full border text-xs font-bold shadow-lg backdrop-blur-md flex items-center gap-2 ${
 toast.type ==="success"
 ?"bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
 :"bg-rose-500/10 border-rose-500/30 text-rose-600"
 }`}
 >
 {toast.type ==="success" ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-rose-550" />}
 {toast.message}
 </motion.div>
)}
 </AnimatePresence>

 {/* Back button */}
 <div>
 <Link href="/admin/reports" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors font-bold uppercase tracking-widest font-mono">
 <ArrowLeft className="h-4 w-4" /> Back to registry
 </Link>
 </div>

 {/* Header Title Area */}
 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
 <div>
 <div className="flex flex-wrap items-center gap-2 mb-2">
 <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
 {report.ai?.assistant?.category || report.metadata?.category}
 </span>
 <span
 className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
 report.status ==="resolved"
 ?"bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
 : report.status ==="rejected"
 ?"bg-rose-500/10 text-rose-600 border-rose-500/20"
 :"bg-amber-500/10 text-amber-600 border-amber-500/20"
 }`}
 >
 Status: {report.status.replace("_","")}
 </span>
 <span
 className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
 priorityWeight ==="critical"
 ?"bg-rose-500/10 text-rose-600 border-rose-500/20 animate-pulse"
 : priorityWeight ==="high"
 ?"bg-amber-500/10 text-amber-600 border-amber-500/20"
 :"bg-slate-100 text-slate-400 border-slate-200"
 }`}
 >
 Urgency: {priorityWeight}
 </span>
 </div>
 <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 leading-tight">
 {report.ai?.assistant?.title || report.metadata?.title}
 </h1>
 <p className="text-[10px] text-slate-400 font-mono mt-1">
 Report ID: {report.id} • Filed: {new Date(report.timestamps.createdAt).toLocaleString()}
 </p>
 </div>

 {/* Top override status controls */}
 {report.status !=="resolved" && report.status !=="rejected" && (
 <div className="flex items-center gap-2">
 <Button
 onClick={handleApprove}
 disabled={actionLoading}
 className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-800 font-bold text-xs uppercase tracking-wider px-5 h-9 rounded-full flex items-center gap-1.5 shadow-sm"
 >
 <Check className="h-4 w-4" /> Approve Report
 </Button>
 <Button
 onClick={() => setIsRejectOpen(true)}
 disabled={actionLoading}
 variant="outline"
 className="border-rose-250 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs uppercase tracking-wider px-5 h-9 rounded-full flex items-center gap-1.5 shadow-sm"
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
 <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Report Description</label>
 <p className="text-sm text-slate-700 bg-white/70 border border-slate-200 p-4 rounded-2xl leading-relaxed whitespace-pre-wrap">
 {report.metadata.description}
 </p>
 </div>

 {/* Verification diagnostics */}
 {report.ai?.verification?.status ==="processing" && (
 <VerificationProgress report={report} />
)}

 {/* Previews evidence */}
 {report.evidence?.media && report.evidence.media.length > 0 && (
 <div className="flex flex-col gap-2">
 <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
 Submitted Evidence Media ({report.evidence.media.length})
 </label>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {report.evidence.media.map((asset) => (
 <div key={asset.id} className="aspect-square border border-slate-200 rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center relative group">
 {asset.type ==="video" ? (
 <video src={asset.url} className="object-cover w-full h-full" controls preload="metadata" />
) : (
 // eslint-disable-next-line @next/next/no-img-element
 <img src={asset.url} alt="Evidence" className="object-cover w-full h-full" />
)}
 <div className="absolute top-2 left-2 bg-black/75 border border-slate-200 text-[8px] text-slate-800 px-2 py-0.5 rounded font-mono select-none uppercase">
 {asset.type}
 </div>
 </div>
))}
 </div>
 </div>
)}

 {/* Before After resolution details */}
 {report.status ==="resolved" && (
 <BeforeAfterGallery report={report} />
)}

 {/* Map details */}
 <div className="flex flex-col gap-2">
 <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Geographic Telemetry Map</label>
 <div className="bg-white/80 border border-slate-200 rounded-3xl p-4 flex flex-col gap-3">
 <div className="text-xs text-slate-600 flex items-center gap-1.5">
 <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
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
 {report.status !=="resolved" && report.status !=="rejected" && (
 <div className="bg-white/80 border border-slate-200 rounded-3xl p-5 backdrop-blur-md shadow-sm flex flex-col gap-4">
 <h3 className="text-xs font-black uppercase tracking-widest text-indigo-650 flex items-center gap-1.5 pb-2 border-b border-slate-100">
 <Shield className="h-4 w-4 text-indigo-600" /> Administrative Override
 </h3>

 {/* Priority override */}
 <div className="flex flex-col gap-1.5">
 <label className="text-[10px] uppercase font-bold text-slate-400">Urgency Override</label>
 <div className="flex gap-2">
 <select
 value={selectedPriority}
 onChange={(e) => setSelectedPriority(e.target.value)}
 className="flex-1 bg-slate-50 border border-slate-200 rounded-xl text-xs h-9 px-3 text-slate-700 font-semibold focus:outline-none cursor-pointer"
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
 className="h-9 px-3.5 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs"
 >
 Set
 </Button>
 </div>
 </div>

 {/* Department override */}
 <div className="flex flex-col gap-1.5">
 <label className="text-[10px] uppercase font-bold text-slate-400">Dispatch Department</label>
 <div className="flex gap-2">
 <select
 value={selectedDept}
 onChange={(e) => {
 setSelectedDept(e.target.value);
 setSelectedOfficerId(""); // Clear officer selection when dept changes
 }}
 className="flex-1 bg-slate-50 border border-slate-200 rounded-xl text-xs h-9 px-3 text-slate-700 font-semibold focus:outline-none cursor-pointer"
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
 className="h-9 px-3.5 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs"
 >
 Route
 </Button>
 </div>
 </div>

 {/* Officer dispatch */}
 <div className="flex flex-col gap-1.5">
 <label className="text-[10px] uppercase font-bold text-slate-400">Officer Dispatch</label>
 <div className="flex flex-col gap-2">
 <select
 value={selectedOfficerId}
 onChange={(e) => setSelectedOfficerId(e.target.value)}
 className="bg-slate-50 border border-slate-200 rounded-xl text-xs h-9 px-3 text-slate-700 font-semibold focus:outline-none cursor-pointer"
 >
 <option value="">Unassigned Officer</option>
 {availableOfficers.map((o) => (
 <option key={o.uid} value={o.uid}>
 {o.displayName} ({o.availability ||"offline"})
 </option>
))}
 </select>
 <Button
 onClick={handleAssignOfficer}
 disabled={actionLoading}
 className="bg-gradient-to-r from-indigo-650 to-purple-650 hover:from-indigo-700 hover:to-purple-700 text-slate-800 font-extrabold text-xs uppercase tracking-wider h-10 rounded-full shadow-lg"
 >
 Dispatch Officer
 </Button>
 </div>
 </div>
 </div>
)}

 {/* Reporter details */}
 <div className="bg-white/80 border border-slate-200 rounded-3xl p-5 backdrop-blur-md shadow-sm flex flex-col gap-3">
 <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
 <User className="h-4 w-4 text-indigo-550" /> Reporter Info
 </h3>
 {reporterUser ? (
 <div className="flex flex-col gap-2.5 text-xs">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs overflow-hidden shrink-0">
 {reporterUser.photoURL || reporterUser.photo ? (
 /* eslint-disable-next-line @next/next/no-img-element */
 <img src={reporterUser.photoURL || reporterUser.photo} alt={reporterUser.displayName} className="object-cover h-full w-full" />
) : (
 (reporterUser.displayName || reporterUser.email ||"C").charAt(0).toUpperCase()
)}
 </div>
 <div className="flex flex-col">
 <span className="font-extrabold text-slate-800">{reporterUser.displayName}</span>
 <span className="text-[10px] font-mono text-slate-400">{reporterUser.email}</span>
 </div>
 </div>
 {reporterUser.phone && (
 <div className="flex justify-between border-t border-slate-100 pt-2">
 <span className="text-slate-400">Contact</span>
 <span className="font-mono text-slate-700 font-bold">{reporterUser.phone}</span>
 </div>
)}
 <div className="flex justify-between border-t border-slate-100 pt-2">
 <span className="text-slate-400">Role</span>
 <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 text-[9px] uppercase font-black tracking-wider">
 {reporterUser.role}
 </span>
 </div>
 </div>
) : (
 <span className="text-xs text-slate-400 italic">User details unavailable.</span>
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
 className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl z-10 p-6 flex flex-col gap-4 text-slate-800"
 >
 <div className="flex items-center justify-between border-b border-slate-100 pb-3">
 <h3 className="font-extrabold text-sm uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
 <AlertOctagon className="h-4 w-4 text-rose-500" /> Reject Incident Report
 </h3>
 <button onClick={() => setIsRejectOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
 <X className="h-4 w-4" />
 </button>
 </div>

 <form onSubmit={handleReject} className="flex flex-col gap-3">
 <div className="flex flex-col gap-1.5">
 <label className="text-[10px] uppercase font-bold text-slate-400">Rejection Reason Note</label>
 <textarea
 required
 value={rejectReason}
 onChange={(e) => setRejectReason(e.target.value)}
 placeholder="Provide rejection reason to display in the report timeline..."
 rows={4}
 className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-550 leading-normal"
 />
 </div>

 <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setIsRejectOpen(false)}
 className="border-slate-200 hover:bg-slate-50 text-slate-500 text-xs rounded-full"
 >
 Cancel
 </Button>
 <Button
 type="submit"
 disabled={actionLoading}
 className="bg-rose-600 hover:bg-rose-700 text-slate-800 font-bold text-xs rounded-full px-5"
 >
 {actionLoading ?"Processing..." :"Reject Report"}
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
